import { renderPrescriptionPdfBuffer } from '../src/services/documents.service';

describe('documents.service', () => {
  test('renderPrescriptionPdfBuffer produces a PDF buffer', async () => {
    const mockPres = {
      drugName: 'Amoxicillin',
      dosage: '500mg',
      instructions: 'Take twice daily after food',
      warnings: ['May cause nausea'],
      refillsRemaining: 2,
    } as any;

    const buf = await renderPrescriptionPdfBuffer(mockPres, 'Dr. Test', 'John Doe');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
    const header = buf.slice(0, 4).toString('utf8');
    expect(header.startsWith('%PDF')).toBe(true);
  });
});
import { renderPrescriptionPdfBuffer } from '../src/services/documents.service';

test('renderPrescriptionPdfBuffer returns a non-empty PDF buffer', async () => {
  const dummyPrescription: any = {
    id: 'test-presc-12345678',
    drugName: 'TestDrug 10mg',
    dosage: '10mg once daily',
    instructions: 'Take after food',
    warnings: ['May cause drowsiness'],
    refillsRemaining: 2,
  };

  const buf = await renderPrescriptionPdfBuffer(dummyPrescription, 'Dr Test', 'John Doe');
  expect(buf).toBeInstanceOf(Buffer);
  expect(buf.length).toBeGreaterThan(500);
});
