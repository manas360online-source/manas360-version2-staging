import { renderPrescriptionPdfBuffer } from '../src/services/documents.service';

describe('documents.service renderPrescriptionPdfBuffer', () => {
  it('renders a non-empty PDF buffer with %PDF header', async () => {
    const fakePres = {
      id: 'test-pres-123',
      drugName: 'Testamol',
      dosage: '1 tablet twice daily',
      instructions: 'Take with food',
      warnings: ['Do not drive'],
      refillsRemaining: 2,
    } as any;

    const buf = await renderPrescriptionPdfBuffer(fakePres, 'Dr. Test', 'Patient Zero');
    expect(buf).toBeInstanceOf(Buffer);
    const header = buf.slice(0, 4).toString('utf8');
    expect(header).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(1000);
  }, 20000);
});
