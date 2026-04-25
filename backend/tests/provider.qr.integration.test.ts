import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/db';
import { createAccessToken } from '../src/utils/jwt';

const acceptPendingLegalDocuments = async (accessToken: string): Promise<void> => {
  const requiredRes = await request(app)
    .get('/api/v1/auth/legal/required')
    .set('Authorization', `Bearer ${accessToken}`);

  if (requiredRes.status !== 200) {
    throw new Error(`Failed to fetch legal requirements: ${requiredRes.status}`);
  }

  const pendingDocuments = requiredRes.body?.data?.pendingDocuments;
  const documentIds = Array.isArray(pendingDocuments)
    ? pendingDocuments.map((doc: any) => String(doc?.id || '')).filter(Boolean)
    : [];

  if (documentIds.length === 0) {
    return;
  }

  const acceptRes = await request(app)
    .post('/api/v1/auth/legal/accept')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ documentIds });

  if (acceptRes.status !== 200) {
    throw new Error(`Failed to accept legal documents: ${acceptRes.status}`);
  }
};

describe('Provider QR endpoints', () => {
  let providerUserId = '';
  let providerToken = '';
  let qrCode = '';

  beforeAll(async () => {
    await connectDatabase();

    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destination_url" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "owner_id" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_dynamic" BOOLEAN NOT NULL DEFAULT true');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3)');

    const unique = Date.now();
    const provider = await prisma.user.create({
      data: {
        email: `provider-qr-${unique}@test.local`,
        firstName: 'Sindhuja',
        lastName: 'L',
        name: 'Sindhuja L',
        role: 'THERAPIST',
        provider: 'LOCAL',
        emailVerified: true,
        passwordHash: 'irrelevant',
      },
    });

    providerUserId = provider.id;
    providerToken = createAccessToken({ sub: providerUserId, sessionId: randomUUID(), jti: randomUUID() });
    await acceptPendingLegalDocuments(providerToken);
  });

  afterAll(async () => {
    if (qrCode) {
      await prisma.qrConversion.deleteMany({ where: { qrCodeCode: qrCode } }).catch(() => null);
      await prisma.qrScan.deleteMany({ where: { qrCodeCode: qrCode } }).catch(() => null);
      await prisma.qrCode.deleteMany({ where: { code: qrCode } }).catch(() => null);
    }

    await prisma.authSession.deleteMany({ where: { userId: providerUserId } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: providerUserId } }).catch(() => null);
    await disconnectDatabase();
  });

  test('provider can fetch my-qr and analytics', async () => {
    const qrRes = await request(app)
      .get('/api/v1/provider/my-qr')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(qrRes.body.success).toBe(true);
    expect(qrRes.body.data.qrCode).toBeDefined();
    expect(String(qrRes.body.data.trackingPath)).toContain('/q/provider/');

    qrCode = String(qrRes.body.data.qrCode.code || '');
    expect(qrCode.startsWith('PROVIDER_')).toBe(true);

    const analyticsRes = await request(app)
      .get('/api/v1/provider/my-qr/analytics')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(analyticsRes.body.success).toBe(true);
    expect(analyticsRes.body.data.month).toBeDefined();
    expect(typeof analyticsRes.body.data.month.scans).toBe('number');
    expect(typeof analyticsRes.body.data.month.bookings).toBe('number');
  });
});
