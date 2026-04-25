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

describe('Admin screening QR generation', () => {
  let adminUserId = '';
  let adminToken = '';
  let generatedCode = '';

  beforeAll(async () => {
    await connectDatabase();

    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destination_url" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "owner_id" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_dynamic" BOOLEAN NOT NULL DEFAULT true');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3)');

    const unique = Date.now();

    const admin = await prisma.user.create({
      data: {
        email: `admin-qr-screen-${unique}@test.local`,
        firstName: 'Admin',
        lastName: 'QR',
        name: 'Admin QR',
        role: 'ADMIN',
        provider: 'LOCAL',
        emailVerified: true,
        passwordHash: 'irrelevant',
      },
    });

    adminUserId = admin.id;
    adminToken = createAccessToken({ sub: adminUserId, sessionId: randomUUID(), jti: randomUUID() });
    await acceptPendingLegalDocuments(adminToken);
  });

  afterAll(async () => {
    if (generatedCode) {
      await prisma.qrScan.deleteMany({ where: { qrCodeCode: generatedCode } }).catch(() => null);
      await prisma.qrConversion.deleteMany({ where: { qrCodeCode: generatedCode } }).catch(() => null);
      await prisma.qrCode.deleteMany({ where: { code: generatedCode } }).catch(() => null);
    }

    await prisma.authSession.deleteMany({ where: { userId: adminUserId } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: adminUserId } }).catch(() => null);
    await disconnectDatabase();
  });

  test('creates screening QR with typed tracking path', async () => {
    const sourceId = `std-kle-${Date.now()}`;
    const response = await request(app)
      .post('/api/v1/admin/qr/screening/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceId })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.qrCode).toBeDefined();
    expect(response.body.data.qrCode.qrType).toBe('screen');
    expect(response.body.data.sourceId).toBe(sourceId);
    expect(String(response.body.data.trackingPath)).toBe(`/q/screen/${sourceId}`);

    generatedCode = String(response.body.data.qrCode.code);
    expect(generatedCode).toBe(`SCREEN_${sourceId.toUpperCase()}`);

    const created = await prisma.qrCode.findUnique({ where: { code: generatedCode } });
    expect(created).toBeTruthy();
    expect(created?.qrType).toBe('screen');
    expect(String(created?.destinationUrl || '')).toContain('/screen');
  });
});
