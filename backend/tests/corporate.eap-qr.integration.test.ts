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

describe('Corporate EAP QR endpoints', () => {
  let userId = '';
  let companyId = '';
  let companyKey = '';
  let token = '';
  let qrCode = '';
  let uniqueId = '';

  beforeAll(async () => {
    await connectDatabase();

    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destination_url" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "owner_id" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_dynamic" BOOLEAN NOT NULL DEFAULT true');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3)');

    companyKey = `corp-${randomUUID().slice(0, 8)}`;
    companyId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "companies" (
        "id", "companyKey", "name", "employeeLimit", "sessionQuota", "ssoProvider", "privacyPolicy", "supportEmail", "supportPhone", "supportSla", "createdAt", "updatedAt"
      ) VALUES (
        ${companyId}, ${companyKey}, ${'Acme Wellness Ltd'}, 300, 200, ${'Google Workspace'}, ${'Only aggregate analytics are visible to HR.'}, ${'support@example.com'}, ${'+91-0000000000'}, ${'Priority support.'}, NOW(), NOW()
      )`;

    const user = await prisma.user.create({
      data: {
        email: `corp-eap-${Date.now()}@test.local`,
        firstName: 'Corporate',
        lastName: 'Member',
        name: 'Corporate Member',
        role: 'PATIENT',
        provider: 'LOCAL',
        emailVerified: true,
        passwordHash: 'irrelevant',
      },
    });

    userId = user.id;
    await prisma.$executeRaw`UPDATE "users" SET company_key = ${companyKey}, is_company_admin = false, "updatedAt" = NOW() WHERE id = ${userId}`;

    token = createAccessToken({ sub: userId, sessionId: randomUUID(), jti: randomUUID() });
    await acceptPendingLegalDocuments(token);
  });

  afterAll(async () => {
    if (qrCode) {
      await prisma.qrConversion.deleteMany({ where: { qrCodeCode: qrCode } }).catch(() => null);
      await prisma.qrScan.deleteMany({ where: { qrCodeCode: qrCode } }).catch(() => null);
      await prisma.qrCode.deleteMany({ where: { code: qrCode } }).catch(() => null);
    }

    await prisma.authSession.deleteMany({ where: { userId } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => null);
    await prisma.$executeRaw`DELETE FROM "companies" WHERE "id" = ${companyId}`.catch(() => null);
    await disconnectDatabase();
  });

  test('corporate member can generate EAP QR and track scans', async () => {
    const createRes = await request(app)
      .post('/api/v1/corporate/qr/eap/generate')
      .query({ companyKey })
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'blr-campus-1' })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.qrCode).toBeDefined();
    expect(createRes.body.data.qrCode.qrType).toBe('eap');
    expect(createRes.body.data.companyKey).toBe(companyKey);
    expect(String(createRes.body.data.destinationUrl || '')).toContain(`/eap/${companyKey}/screen`);

    qrCode = String(createRes.body.data.qrCode.code || '');
    uniqueId = String(createRes.body.data.uniqueId || '');

    const redirectRes = await request(app)
      .get(`/api/q/eap/${uniqueId}`)
      .expect(302);

    expect(String(redirectRes.headers.location || '')).toContain(`/eap/${companyKey}/screen`);

    const analyticsRes = await request(app)
      .get('/api/v1/corporate/qr/eap/analytics')
      .query({ companyKey })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(analyticsRes.body.success).toBe(true);
    expect(analyticsRes.body.data.companyKey).toBe(companyKey);
    expect(analyticsRes.body.data.totals.scans).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(analyticsRes.body.data.breakdown)).toBe(true);
  });
});
