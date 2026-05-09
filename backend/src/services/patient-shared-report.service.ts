import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { deleteFileFromS3, getSignedS3ObjectUrl, s3Client } from './s3.service';

const db = prisma as any;
const SHARED_REPORT_TTL_HOURS = 24;
const LOCAL_REPORT_DIR = path.resolve(process.cwd(), 'tmp', 'patient-shared-reports');

const isProviderRole = (role: string): boolean => {
  const normalized = String(role || '').toLowerCase();
  return ['therapist', 'psychologist', 'psychiatrist', 'coach'].includes(normalized);
};

const renderPdfBuffer = async (write: (doc: any) => void): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    write(doc);
    doc.end();
  });

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const ensurePatientSharedReportTables = async (): Promise<void> => {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychologist_patient_reports (
      id TEXT PRIMARY KEY,
      source_report_id TEXT NOT NULL REFERENCES psychologist_reports(id) ON DELETE CASCADE,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      diagnosis_observations TEXT,
      behavioral_analysis TEXT,
      cognitive_findings TEXT,
      recommendations TEXT,
      attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft',
      shared_timestamp TIMESTAMP,
      expires_at TIMESTAMP,
      file_path TEXT,
      s3_object_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS psychologist_patient_reports_psychologist_idx ON psychologist_patient_reports(psychologist_id, updated_at DESC);',
  );
  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS psychologist_patient_reports_patient_idx ON psychologist_patient_reports(patient_id, updated_at DESC);',
  );
  await db.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS psychologist_patient_reports_expiry_idx ON psychologist_patient_reports(status, shared_timestamp, expires_at);',
  );
};

const assertProvider = async (userId: string): Promise<void> => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, isDeleted: true } });
  if (!user || user.isDeleted) throw new AppError('Provider not found', 404);
  if (!isProviderRole(String(user.role || ''))) throw new AppError('Provider role required', 403);
};

const assertPatientAccess = async (userId: string): Promise<{ patientProfileId: string }> => {
  const profile = await db.patientProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile?.id) throw new AppError('Patient profile not found', 404);
  return { patientProfileId: String(profile.id) };
};

const getSourceReportForProvider = async (providerId: string, reportId: string) => {
  const rows = await db.$queryRawUnsafe(
    `SELECT id, psychologist_id, patient_id, title, diagnosis_observations, behavioral_analysis, cognitive_findings, recommendations, attachments, status
     FROM psychologist_reports
     WHERE id = $1 AND psychologist_id = $2
     LIMIT 1`,
    reportId,
    providerId,
  );

  const report = (rows as any[])[0];
  if (!report) throw new AppError('Source report not found', 404);
  return report;
};

const getPatientCloneForProvider = async (providerId: string, patientReportId: string) => {
  const rows = await db.$queryRawUnsafe(
    `SELECT id, source_report_id, psychologist_id, patient_id, title, diagnosis_observations, behavioral_analysis, cognitive_findings, recommendations, attachments, status, shared_timestamp, expires_at, file_path, s3_object_key, created_at, updated_at
     FROM psychologist_patient_reports
     WHERE id = $1 AND psychologist_id = $2
     LIMIT 1`,
    patientReportId,
    providerId,
  );

  const report = (rows as any[])[0];
  if (!report) throw new AppError('Patient report clone not found', 404);
  return report;
};

const buildPatientReportPdf = async (report: any): Promise<Buffer> => {
  const createdAt = toDate(report.shared_timestamp) || new Date();
  return renderPdfBuffer((doc) => {
    doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Patient Clinical Report', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Shared: ${createdAt.toLocaleString()}`, { align: 'right' });
    doc.fillColor('#000');

    doc.moveDown(0.6);
    doc.fontSize(14).font('Helvetica-Bold').text(String(report.title || 'Clinical Report'));

    const sections = [
      { label: 'Diagnosis Observations', value: report.diagnosis_observations },
      { label: 'Behavioral Analysis', value: report.behavioral_analysis },
      { label: 'Cognitive Findings', value: report.cognitive_findings },
      { label: 'Recommendations', value: report.recommendations },
    ];

    for (const section of sections) {
      doc.moveDown(0.8);
      doc.fontSize(12).font('Helvetica-Bold').text(section.label);
      doc.fontSize(10).font('Helvetica').text(String(section.value || 'Not provided by provider yet.'));
    }
  });
};

const writeBufferToLocalFile = async (reportId: string, buffer: Buffer): Promise<string> => {
  await fs.mkdir(LOCAL_REPORT_DIR, { recursive: true });
  const filePath = path.join(LOCAL_REPORT_DIR, `${reportId}.pdf`);
  await fs.writeFile(filePath, buffer);
  return filePath;
};

const uploadBufferToS3 = async (reportId: string, buffer: Buffer): Promise<string | null> => {
  if (!env.awsS3Bucket) return null;

  const objectKey = `patient-reports/${reportId}/${Date.now()}-${randomUUID()}.pdf`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.awsS3Bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
    }),
  );

  return objectKey;
};

const isExpired = (report: any): boolean => {
  const sharedTimestamp = toDate(report.shared_timestamp);
  if (!sharedTimestamp) return true;
  const expiresAt = toDate(report.expires_at) || new Date(sharedTimestamp.getTime() + SHARED_REPORT_TTL_HOURS * 60 * 60 * 1000);
  return Date.now() > expiresAt.getTime();
};

export const cloneProviderReportToPatientReport = async (providerId: string, sourceReportId: string) => {
  await ensurePatientSharedReportTables();
  await assertProvider(providerId);
  const sourceReport = await getSourceReportForProvider(providerId, sourceReportId);

  const cloneId = randomUUID();
  const now = new Date();

  await db.$executeRawUnsafe(
    `INSERT INTO psychologist_patient_reports (
      id, source_report_id, psychologist_id, patient_id, title,
      diagnosis_observations, behavioral_analysis, cognitive_findings, recommendations,
      attachments, status, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13)`,
    cloneId,
    String(sourceReport.id),
    providerId,
    String(sourceReport.patient_id),
    String(sourceReport.title || 'Patient Report'),
    sourceReport.diagnosis_observations ? String(sourceReport.diagnosis_observations) : null,
    sourceReport.behavioral_analysis ? String(sourceReport.behavioral_analysis) : null,
    sourceReport.cognitive_findings ? String(sourceReport.cognitive_findings) : null,
    sourceReport.recommendations ? String(sourceReport.recommendations) : null,
    JSON.stringify(sourceReport.attachments || []),
    'draft',
    now,
    now,
  );

  return { id: cloneId, status: 'draft' };
};

export const listProviderPatientReportClones = async (providerId: string, patientId?: string) => {
  await ensurePatientSharedReportTables();
  await assertProvider(providerId);

  const wherePatient = patientId ? ' AND patient_id = $2' : '';
  const rows = await db.$queryRawUnsafe(
    `SELECT id, source_report_id, patient_id, title, status, shared_timestamp, expires_at, created_at, updated_at
     FROM psychologist_patient_reports
     WHERE psychologist_id = $1${wherePatient}
     ORDER BY updated_at DESC
     LIMIT 200`,
    ...(patientId ? [providerId, patientId] : [providerId]),
  );

  return { items: rows as any[] };
};

export const shareProviderPatientReportClone = async (providerId: string, patientReportId: string) => {
  await ensurePatientSharedReportTables();
  await assertProvider(providerId);
  const clone = await getPatientCloneForProvider(providerId, patientReportId);

  const sharedTimestamp = new Date();
  const expiresAt = new Date(sharedTimestamp.getTime() + SHARED_REPORT_TTL_HOURS * 60 * 60 * 1000);

  const pdfBuffer = await buildPatientReportPdf({ ...clone, shared_timestamp: sharedTimestamp });
  const filePath = await writeBufferToLocalFile(patientReportId, pdfBuffer);
  const s3ObjectKey = await uploadBufferToS3(patientReportId, pdfBuffer);

  await db.$executeRawUnsafe(
    `UPDATE psychologist_patient_reports
     SET status = 'shared', shared_timestamp = $1, expires_at = $2, file_path = $3, s3_object_key = $4, updated_at = $5
     WHERE id = $6 AND psychologist_id = $7`,
    sharedTimestamp,
    expiresAt,
    filePath,
    s3ObjectKey,
    new Date(),
    patientReportId,
    providerId,
  );

  return {
    id: patientReportId,
    status: 'shared',
    sharedTimestamp,
    expiresAt,
    sharePath: `/patient/reports/shared/${encodeURIComponent(patientReportId)}`,
  };
};

export const getPatientSharedReportMeta = async (patientUserId: string, patientReportId: string) => {
  await ensurePatientSharedReportTables();
  const { patientProfileId } = await assertPatientAccess(patientUserId);

  const rows = await db.$queryRawUnsafe(
    `SELECT id, title, status, shared_timestamp, expires_at, created_at, updated_at
     FROM psychologist_patient_reports
     WHERE id = $1 AND patient_id = $2
     LIMIT 1`,
    patientReportId,
    patientProfileId,
  );

  const report = (rows as any[])[0];
  if (!report) throw new AppError('Report not found', 404);
  if (String(report.status || '').toLowerCase() !== 'shared') throw new AppError('Report not shared', 404);
  if (isExpired(report)) throw new AppError('This report has expired and is no longer available for download.', 404);

  const expiresAt = toDate(report.expires_at) || new Date(toDate(report.shared_timestamp)!.getTime() + SHARED_REPORT_TTL_HOURS * 60 * 60 * 1000);
  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());

  return {
    id: String(report.id),
    title: String(report.title || 'Patient Report'),
    status: 'shared',
    sharedTimestamp: report.shared_timestamp,
    expiresAt,
    expiresInHours: Number((remainingMs / (60 * 60 * 1000)).toFixed(2)),
  };
};

export const getPatientSharedReportDownloadPayload = async (patientUserId: string, patientReportId: string) => {
  await ensurePatientSharedReportTables();
  const { patientProfileId } = await assertPatientAccess(patientUserId);

  const rows = await db.$queryRawUnsafe(
    `SELECT id, title, status, shared_timestamp, expires_at, file_path, s3_object_key
     FROM psychologist_patient_reports
     WHERE id = $1 AND patient_id = $2
     LIMIT 1`,
    patientReportId,
    patientProfileId,
  );

  const report = (rows as any[])[0];
  if (!report) throw new AppError('Report not found', 404);
  if (String(report.status || '').toLowerCase() !== 'shared') throw new AppError('Report not shared', 404);
  if (isExpired(report)) throw new AppError('This report has expired and is no longer available for download.', 404);

  if (report.s3_object_key && env.awsS3Bucket) {
    const signedUrl = await getSignedS3ObjectUrl(String(report.s3_object_key), 300);
    return {
      mode: 'redirect' as const,
      signedUrl,
      fileName: `${String(report.title || 'patient-report').replace(/\s+/g, '-').toLowerCase()}.pdf`,
    };
  }

  const filePath = String(report.file_path || '');
  if (!filePath) throw new AppError('Report file is unavailable', 404);
  const fileBuffer = await fs.readFile(filePath).catch(() => null);
  if (!fileBuffer) throw new AppError('Report file is unavailable', 404);

  return {
    mode: 'buffer' as const,
    buffer: fileBuffer,
    fileName: `${String(report.title || 'patient-report').replace(/\s+/g, '-').toLowerCase()}.pdf`,
  };
};

export const cleanupExpiredPatientSharedReports = async () => {
  await ensurePatientSharedReportTables();
  const rows = await db.$queryRawUnsafe(
    `SELECT id, file_path, s3_object_key
     FROM psychologist_patient_reports
     WHERE status = 'shared'
       AND COALESCE(expires_at, shared_timestamp + interval '24 hours') <= NOW()
     LIMIT 500`,
  );

  const expired = rows as Array<{ id: string; file_path: string | null; s3_object_key: string | null }>;
  if (!expired.length) return { scanned: 0, expired: 0, deletedLocal: 0, deletedS3: 0 };

  let deletedLocal = 0;
  let deletedS3 = 0;

  for (const item of expired) {
    if (item.file_path) {
      const removed = await fs.unlink(String(item.file_path)).then(() => true).catch(() => false);
      if (removed) deletedLocal += 1;
    }

    if (item.s3_object_key && env.awsS3Bucket) {
      const removed = await deleteFileFromS3(String(item.s3_object_key)).then(() => true).catch(() => false);
      if (removed) deletedS3 += 1;
    }

    await db.$executeRawUnsafe(
      `UPDATE psychologist_patient_reports
       SET status = 'expired', file_path = NULL, s3_object_key = NULL, updated_at = NOW()
       WHERE id = $1`,
      item.id,
    );
  }

  return {
    scanned: expired.length,
    expired: expired.length,
    deletedLocal,
    deletedS3,
  };
};
