import { prisma } from '../config/db';
import PDFDocument from 'pdfkit';
import { s3Client } from './s3.service';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

export async function renderPrescriptionPdfBuffer(prescription: any, providerName: string, patientName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      // Clinic header
      doc.fontSize(18).text('Manas360 Clinic', { align: 'center' });
      doc.fontSize(10).text('123 Wellness Ave, Suite 100, New Delhi', { align: 'center' });
      doc.moveDown(0.5);

      // Document title
      doc.fontSize(16).text('Clinical Prescription', { align: 'center' });
      doc.moveDown();

      // Metadata
      doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Patient: ${patientName}`);
      doc.text(`Prescribed by: ${providerName}`);
      if (prescription.providerRegNumber) doc.text(`Provider Reg: ${prescription.providerRegNumber}`);
      doc.moveDown();

      // Medication block
      doc.rect(doc.x - 2, doc.y - 2, 500, 0).strokeOpacity(0.05);
      doc.fontSize(14).text(`${prescription.drugName}`, { underline: true });
      doc.fontSize(12).text(`Dosage: ${prescription.dosage}`);
      if (prescription.instructions) {
        doc.moveDown();
        doc.fontSize(12).text('Instructions:');
        doc.fontSize(11).text(prescription.instructions);
      }
      if (prescription.warnings && prescription.warnings.length) {
        doc.moveDown();
        doc.fontSize(12).text('Warnings:');
        prescription.warnings.forEach((w: string) => doc.fontSize(11).text(`- ${w}`));
      }
      if (prescription.refillsRemaining !== undefined) {
        doc.moveDown();
        doc.fontSize(12).text(`Refills remaining: ${prescription.refillsRemaining}`);
      }

      doc.moveDown(2);
      // Signature block
      doc.fontSize(10).text('Signature: ____________________________', { align: 'left' });

      // Simple barcode placeholder (prescription id)
      try {
        const code = String(prescription.id || '').slice(0, 20);
        const x = doc.x;
        const y = doc.y + 20;
        for (let i = 0; i < code.length; i++) {
          const w = (code.charCodeAt(i) % 3) + 1;
          doc.rect(x + i * 6, y, w, 30).fillColor('#000').fill();
        }
        doc.fillColor('#000');
        doc.moveDown(4);
        doc.fontSize(9).text(`ID: ${code}`);
      } catch (e) {
        // ignore barcode errors
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export const publishPrescriptionDocument = async (prescriptionId: string): Promise<void> => {
  // fetch prescription with provider and patient data
  const pres = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      provider: { select: { id: true, firstName: true, lastName: true, name: true } },
      patient: { select: { id: true, firstName: true, lastName: true, name: true } },
    },
  });
  if (!pres) throw new Error('Prescription not found');

  const providerName = pres.provider ? `${pres.provider.firstName || ''} ${pres.provider.lastName || ''}`.trim() || pres.provider.name || 'Provider' : 'Provider';
  const patientName = pres.patient ? `${pres.patient.firstName || ''} ${pres.patient.lastName || ''}`.trim() || pres.patient.name || 'Patient' : 'Patient';
  const patientUserId = pres.patient?.id || pres.patientId;

  const buffer = await renderPrescriptionPdfBuffer(pres, providerName, patientName);

  const fileName = `prescription-${prescriptionId}-${Date.now()}.pdf`;
  const objectKey = `patient-documents/${patientUserId}/${fileName}`;

  await s3Client.send(new PutObjectCommand(Object.assign({ Bucket: env.awsS3Bucket, Key: objectKey, Body: buffer, ContentType: 'application/pdf' }, env.awsS3DisableServerSideEncryption ? {} : { ServerSideEncryption: 'AES256' })));

  const created = await prisma.patientDocument.create({ data: { patientId: patientUserId, title: `Prescription — ${pres.drugName}`, category: 'prescription', source: 'prescription', sourceId: prescriptionId, s3ObjectKey: objectKey } });

  try {
    const { notifyPatientDocument } = await import('../routes/gps.routes');
    notifyPatientDocument(String(patientUserId), { id: created.id, title: created.title, date: created.createdAt, category: 'prescription', s3ObjectKey: created.s3ObjectKey });
  } catch (e) {
    console.warn('notify patient failed', e);
  }
};

export default {
  publishPrescriptionDocument,
};
