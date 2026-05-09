import { prisma } from '../config/db';
import PDFDocument from 'pdfkit';
import { createWriteStream, readFileSync } from 'fs';
import fs from 'fs/promises';
import { join } from 'path';
import * as csv from 'fast-csv';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './s3.service';
import { env } from '../config/env';

type ExportOptions = {
  outputPath?: string;
  uploadToS3?: boolean;
  includeDecryptedNotes?: boolean;
  requestorId?: string;
};

type ExportResult = {
  filePath?: string;
  s3Url?: string;
};

class SessionExportService {
  private async getSessionSnapshot(sessionId: string) {
    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      include: {
        patientProfile: {
          select: {
            id: true,
            userId: true,
            age: true,
            gender: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
                email: true,
              },
            },
          },
        },
        therapistSessionNote: {
          select: {
            sessionType: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const therapist = await prisma.user.findUnique({
      where: { id: String(session.therapistProfileId) },
      select: { firstName: true, lastName: true, name: true, email: true },
    });

    return { session, therapist };
  }

  private formatDisplayName(input?: { firstName?: string | null; lastName?: string | null; name?: string | null } | null): string {
    if (!input) return 'Unknown';
    const explicit = String(input.name || '').trim();
    if (explicit) return explicit;
    const joined = `${String(input.firstName || '').trim()} ${String(input.lastName || '').trim()}`.trim();
    return joined || 'Unknown';
  }

  private async ensureExportDir(): Promise<string> {
    const dir = join(process.cwd(), 'exports', 'sessions');
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private async uploadToS3(sessionId: string, fileName: string, filePath: string, contentType: string): Promise<string> {
    if (!env.awsS3Bucket) {
      throw new Error('AWS_S3_BUCKET is required for S3 export');
    }

    const objectKey = `exports/sessions/${sessionId}/${fileName}`;
    const buffer = readFileSync(filePath);

    await s3Client.send(new PutObjectCommand({
      Bucket: env.awsS3Bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
      ...(env.awsS3DisableServerSideEncryption ? {} : { ServerSideEncryption: 'AES256' }),
    } as any));

    return getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: objectKey }),
      { expiresIn: Number(env.exportSignedUrlTtlSeconds || 3600) },
    );
  }

  private async writeExportAudit(sessionId: string, format: string, requestorId?: string): Promise<void> {
    if (!requestorId) return;

    await prisma.exportLog.create({
      data: {
        therapistId: requestorId,
        sessionId,
        exportType: format.toUpperCase(),
      },
    });
  }

  async exportToPDF(sessionId: string, options?: ExportOptions): Promise<ExportResult> {
    const { session, therapist } = await this.getSessionSnapshot(sessionId);
    const exportDir = await this.ensureExportDir();
    const fileName = `therapy-session-${sessionId}-${Date.now()}.pdf`;
    const filePath = options?.outputPath || join(exportDir, fileName);

    const patientName = this.formatDisplayName(session.patientProfile?.user);
    const therapistName = this.formatDisplayName(therapist);

    const doc = new PDFDocument({ margin: 50 });
    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Therapy Session Export', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Session ID: ${session.id}`);
    doc.text(`Booking Reference: ${session.bookingReferenceId}`);
    doc.text(`Status: ${String(session.status)}`);
    doc.text(`Scheduled At: ${session.dateTime.toISOString()}`);
    doc.text(`Duration (mins): ${session.durationMinutes}`);
    doc.moveDown();

    doc.fontSize(12).text(`Patient: ${patientName}`);
    doc.text(`Patient Email: ${session.patientProfile?.user?.email || 'N/A'}`);
    doc.text(`Patient Age: ${session.patientProfile?.age ?? 'N/A'}`);
    doc.text(`Patient Gender: ${session.patientProfile?.gender || 'N/A'}`);
    doc.moveDown();

    doc.text(`Therapist: ${therapistName}`);
    doc.text(`Therapist Email: ${therapist?.email || 'N/A'}`);

    if (session.therapistSessionNote) {
      doc.addPage();
      doc.fontSize(14).text('Clinical Note');
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Session Type: ${session.therapistSessionNote.sessionType}`);
      doc.moveDown(0.5);
      doc.fontSize(12).text('Subjective');
      doc.fontSize(10).text(session.therapistSessionNote.subjective || '');
      doc.moveDown(0.5);
      doc.fontSize(12).text('Objective');
      doc.fontSize(10).text(session.therapistSessionNote.objective || '');
      doc.moveDown(0.5);
      doc.fontSize(12).text('Assessment');
      doc.fontSize(10).text(session.therapistSessionNote.assessment || '');
      doc.moveDown(0.5);
      doc.fontSize(12).text('Plan');
      doc.fontSize(10).text(session.therapistSessionNote.plan || '');
    }

    doc.end();
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    await this.writeExportAudit(sessionId, 'PDF', options?.requestorId || String(session.therapistProfileId));

    if (options?.uploadToS3) {
      const s3Url = await this.uploadToS3(sessionId, fileName, filePath, 'application/pdf');
      return { s3Url };
    }

    return { filePath };
  }

  async exportToCSV(sessionId: string, options?: ExportOptions): Promise<ExportResult> {
    const { session, therapist } = await this.getSessionSnapshot(sessionId);
    const exportDir = await this.ensureExportDir();
    const fileName = `therapy-session-${sessionId}-${Date.now()}.csv`;
    const filePath = options?.outputPath || join(exportDir, fileName);

    const patientName = this.formatDisplayName(session.patientProfile?.user);
    const therapistName = this.formatDisplayName(therapist);

    const ws = createWriteStream(filePath);
    const writer = csv.format({ headers: false });
    writer.pipe(ws);

    writer.write(['Session ID', session.id]);
    writer.write(['Booking Reference', session.bookingReferenceId]);
    writer.write(['Status', String(session.status)]);
    writer.write(['Scheduled At', session.dateTime.toISOString()]);
    writer.write(['Duration Minutes', String(session.durationMinutes)]);
    writer.write(['Patient', patientName]);
    writer.write(['Patient Email', session.patientProfile?.user?.email || '']);
    writer.write(['Therapist', therapistName]);
    writer.write(['Therapist Email', therapist?.email || '']);
    writer.write([]);

    writer.write(['Section', 'Content']);
    if (session.therapistSessionNote) {
      writer.write(['Subjective', session.therapistSessionNote.subjective || '']);
      writer.write(['Objective', session.therapistSessionNote.objective || '']);
      writer.write(['Assessment', session.therapistSessionNote.assessment || '']);
      writer.write(['Plan', session.therapistSessionNote.plan || '']);
    }

    writer.end();
    await new Promise<void>((resolve, reject) => {
      ws.on('finish', () => resolve());
      ws.on('error', reject);
    });

    await this.writeExportAudit(sessionId, 'CSV', options?.requestorId || String(session.therapistProfileId));

    if (options?.uploadToS3) {
      const s3Url = await this.uploadToS3(sessionId, fileName, filePath, 'text/csv');
      return { s3Url };
    }

    return { filePath };
  }

  async exportToJSON(sessionId: string, options?: ExportOptions): Promise<ExportResult> {
    const { session, therapist } = await this.getSessionSnapshot(sessionId);
    const exportDir = await this.ensureExportDir();
    const fileName = `therapy-session-${sessionId}-${Date.now()}.json`;
    const filePath = options?.outputPath || join(exportDir, fileName);

    const payload = {
      exportedAt: new Date().toISOString(),
      session: {
        id: session.id,
        bookingReferenceId: session.bookingReferenceId,
        status: String(session.status),
        scheduledAt: session.dateTime,
        durationMinutes: session.durationMinutes,
      },
      patient: {
        name: this.formatDisplayName(session.patientProfile?.user),
        email: session.patientProfile?.user?.email || null,
        age: session.patientProfile?.age ?? null,
        gender: session.patientProfile?.gender || null,
      },
      therapist: {
        id: session.therapistProfileId,
        name: this.formatDisplayName(therapist),
        email: therapist?.email || null,
      },
      note: session.therapistSessionNote
        ? {
            type: session.therapistSessionNote.sessionType,
            subjective: session.therapistSessionNote.subjective,
            objective: session.therapistSessionNote.objective,
            assessment: session.therapistSessionNote.assessment,
            plan: session.therapistSessionNote.plan,
            updatedAt: session.therapistSessionNote.updatedAt,
          }
        : null,
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    await this.writeExportAudit(sessionId, 'JSON', options?.requestorId || String(session.therapistProfileId));

    if (options?.uploadToS3) {
      const s3Url = await this.uploadToS3(sessionId, fileName, filePath, 'application/json');
      return { s3Url };
    }

    return { filePath };
  }

  async getExportHistory(sessionId: string) {
    return prisma.exportLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

export const sessionExportService = new SessionExportService();

export function sanitizeResponseData(data: any): any {
  if (data == null) return data;

  let copy: any;
  try {
    copy = JSON.parse(JSON.stringify(data));
  } catch {
    return '[UNSERIALIZABLE]';
  }

  const redactKeys = ['encryptedcontent', 'iv', 'authtag', 'auth_tag', 'encrypted', 'sessionnotes', 'notes_provider', 'notes_patient'];

  const walk = (obj: any): any => {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map(walk);
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const lower = key.toLowerCase();
        if (redactKeys.some((token) => lower.includes(token))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = walk(obj[key]);
        }
      }
    }
    return obj;
  };

  return walk(copy);
}
