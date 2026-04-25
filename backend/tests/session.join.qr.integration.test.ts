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

describe('Session join QR endpoints', () => {
  let adminUserId = '';
  let providerUserId = '';
  let patientUserId = '';
  let patientProfileId = '';
  let sessionId = '';
  let adminToken = '';
  let joinUniqueId = '';
  let joinQrCode = '';

  beforeAll(async () => {
    await connectDatabase();

    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destination_url" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "owner_id" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_dynamic" BOOLEAN NOT NULL DEFAULT true');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3)');

    const unique = randomUUID().replace(/-/g, '').slice(0, 10);
    const patientPhone = `91${String(Date.now()).slice(-10)}`;

    const [admin, provider, patient] = await Promise.all([
      prisma.user.create({
        data: {
          email: `join-admin-${unique}@test.local`,
          firstName: 'Admin',
          lastName: 'Join',
          name: 'Admin Join',
          role: 'ADMIN',
          provider: 'LOCAL',
          emailVerified: true,
          passwordHash: 'irrelevant',
        },
      }),
      prisma.user.create({
        data: {
          email: `join-provider-${unique}@test.local`,
          firstName: 'Join',
          lastName: 'Therapist',
          name: 'Join Therapist',
          role: 'THERAPIST',
          provider: 'LOCAL',
          emailVerified: true,
          passwordHash: 'irrelevant',
        },
      }),
      prisma.user.create({
        data: {
          email: `join-patient-${unique}@test.local`,
          firstName: 'Join',
          lastName: 'Patient',
          name: 'Join Patient',
          role: 'PATIENT',
          provider: 'LOCAL',
          emailVerified: true,
          passwordHash: 'irrelevant',
          phone: patientPhone,
          phoneVerified: true,
        },
      }),
    ]);

    adminUserId = admin.id;
    providerUserId = provider.id;
    patientUserId = patient.id;

    const profile = await prisma.patientProfile.create({
      data: {
        userId: patientUserId,
        age: 30,
        gender: 'female',
        emergencyContact: { name: 'EC', relation: 'Parent', phone: '+910000000002' },
      },
    });
    patientProfileId = profile.id;

    const slot = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = await prisma.therapySession.create({
      data: {
        bookingReferenceId: `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-JOIN`,
        patientProfileId,
        therapistProfileId: providerUserId,
        dateTime: slot,
        status: 'CONFIRMED',
      },
    });
    sessionId = session.id;

    adminToken = createAccessToken({ sub: adminUserId, sessionId: randomUUID(), jti: randomUUID() });
    await acceptPendingLegalDocuments(adminToken);
  });

  afterAll(async () => {
    if (joinQrCode) {
      await prisma.qrScan.deleteMany({ where: { qrCodeCode: joinQrCode } }).catch(() => null);
      await prisma.qrConversion.deleteMany({ where: { qrCodeCode: joinQrCode } }).catch(() => null);
      await prisma.qrCode.deleteMany({ where: { code: joinQrCode } }).catch(() => null);
    }

    await prisma.therapySession.deleteMany({ where: { id: sessionId } }).catch(() => null);
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } }).catch(() => null);
    await prisma.authSession.deleteMany({ where: { userId: { in: [adminUserId, providerUserId, patientUserId] } } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, providerUserId, patientUserId] } } }).catch(() => null);
    await disconnectDatabase();
  });

  test('admin can generate session join QR and public tracker redirects', async () => {
    const response = await request(app)
      .post('/api/v1/admin/qr/join/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sessionId })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.qrCode).toBeDefined();
    expect(response.body.data.qrCode.qrType).toBe('join');
    expect(response.body.data.sessionId).toBe(sessionId);
    expect(response.body.data.sessionJoinUrl).toContain(`/video-session/${sessionId}`);
    expect(response.body.data.qrImageAvailable).toBe(true);

    joinUniqueId = String(response.body.data.uniqueId || '');
    joinQrCode = String(response.body.data.qrCode.code || '');
    expect(joinUniqueId).toBeTruthy();
    expect(joinQrCode.startsWith('JOIN_')).toBe(true);

    const redirectRes = await request(app)
      .get(`/api/q/join/${joinUniqueId}`)
      .expect(302);

    expect(String(redirectRes.headers.location || '')).toContain(`/video-session/${sessionId}`);
    expect(String(redirectRes.headers.location || '')).toContain(`qr=${joinQrCode}`);
    expect(String(redirectRes.headers.location || '')).toContain('sid=');

    await prisma.qrCode.update({
      where: { code: joinQrCode },
      data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) },
    });

    await request(app)
      .get(`/api/q/join/${joinUniqueId}`)
      .expect(410);
  });
});
