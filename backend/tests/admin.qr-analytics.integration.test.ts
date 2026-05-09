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

describe('Admin QR analytics endpoints', () => {
  let adminUserId = '';
  let adminToken = '';
  let screenCode = '';
  let providerCode = '';

  beforeAll(async () => {
    await connectDatabase();

    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destination_url" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "owner_id" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_dynamic" BOOLEAN NOT NULL DEFAULT true');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3)');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "qr_scans" (
        "id" TEXT NOT NULL,
        "qr_code_code" TEXT NOT NULL,
        "scan_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "device_type" TEXT,
        "device_os" TEXT,
        "ip_address" TEXT,
        "session_id" TEXT,
        "user_agent" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "qr_conversions" (
        "id" TEXT NOT NULL,
        "qr_code_code" TEXT NOT NULL,
        "qr_scan_id" TEXT,
        "session_id" TEXT,
        "conversion_type" TEXT NOT NULL,
        "attributed_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "conversion_data" JSONB,
        "conversion_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "qr_conversions_pkey" PRIMARY KEY ("id")
      )
    `);

    const admin = await prisma.user.create({
      data: {
        email: `qr-admin-${Date.now()}@test.local`,
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

    screenCode = `SCREEN_${Date.now()}`;
    providerCode = `PROVIDER_${Date.now()}`;

    await prisma.qrCode.createMany({
      data: [
        {
          code: screenCode,
          redirectUrl: 'https://manas360.example/screen',
          destinationUrl: 'https://manas360.example/screen',
          qrType: 'screen',
          ownerId: null,
          isDynamic: true,
          isActive: true,
          scanCount: 4,
          createdById: adminUserId,
        },
        {
          code: providerCode,
          redirectUrl: 'https://manas360.example/provider',
          destinationUrl: 'https://manas360.example/provider',
          qrType: 'provider',
          ownerId: adminUserId,
          isDynamic: true,
          isActive: true,
          scanCount: 2,
          createdById: adminUserId,
        },
      ],
    }).catch(() => null);

    await prisma.qrScan.create({
      data: { qrCodeCode: screenCode, sessionId: 'screen-session-1', scanTimestamp: new Date() },
    });
    await prisma.qrScan.create({
      data: { qrCodeCode: screenCode, sessionId: 'screen-session-2', scanTimestamp: new Date() },
    });
    await prisma.qrScan.create({
      data: { qrCodeCode: providerCode, sessionId: 'provider-session-1', scanTimestamp: new Date() },
    });

    await prisma.qrConversion.create({
      data: {
        qrCodeCode: screenCode,
        sessionId: 'screen-session-1',
        conversionType: 'assessment_completed',
        attributedRevenue: 0,
        conversionAt: new Date(),
      },
    });
    await prisma.qrConversion.create({
      data: {
        qrCodeCode: screenCode,
        sessionId: 'screen-session-1',
        conversionType: 'session_booked',
        attributedRevenue: 699,
        conversionAt: new Date(),
      },
    });
    await prisma.qrConversion.create({
      data: {
        qrCodeCode: providerCode,
        sessionId: 'provider-session-1',
        conversionType: 'session_booked',
        attributedRevenue: 699,
        conversionAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.qrConversion.deleteMany({ where: { qrCodeCode: { in: [screenCode, providerCode] } } }).catch(() => null);
    await prisma.qrScan.deleteMany({ where: { qrCodeCode: { in: [screenCode, providerCode] } } }).catch(() => null);
    await prisma.qrCode.deleteMany({ where: { code: { in: [screenCode, providerCode] } } }).catch(() => null);
    await prisma.authSession.deleteMany({ where: { userId: adminUserId } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: adminUserId } }).catch(() => null);
    await disconnectDatabase();
  });

  test('returns QR analytics by type and by source', async () => {
    const byTypeRes = await request(app)
      .get('/api/v1/admin/qr/analytics/by-type')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(byTypeRes.body.success).toBe(true);
    expect(Array.isArray(byTypeRes.body.data.breakdown)).toBe(true);
    expect(byTypeRes.body.data.totals.qrCount).toBeGreaterThanOrEqual(2);

    const bySourceRes = await request(app)
      .get('/api/v1/admin/qr/analytics/by-source')
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(bySourceRes.body.success).toBe(true);
    expect(Array.isArray(bySourceRes.body.data.breakdown)).toBe(true);
    expect(bySourceRes.body.data.breakdown[0]?.conversionRate).toBeGreaterThanOrEqual(bySourceRes.body.data.breakdown[1]?.conversionRate || 0);
    expect(bySourceRes.body.data.totals.revenue).toBeGreaterThanOrEqual(699);
  });
});