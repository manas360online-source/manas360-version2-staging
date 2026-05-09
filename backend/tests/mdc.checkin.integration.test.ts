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

describe('MDC check-in + check-in QR', () => {
  let adminUserId = '';
  let providerUserId = '';
  let patientUserId = '';
  let patientProfileId = '';
  let sessionId = '';
  let checkinQrCode = '';
  let adminToken = '';
  let patientPhone = '';

  beforeAll(async () => {
    await connectDatabase();

    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destination_url" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "owner_id" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_dynamic" BOOLEAN NOT NULL DEFAULT true');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3)');

    const unique = randomUUID().replace(/-/g, '').slice(0, 12);
    const uniqueDigits = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    patientPhone = `91${uniqueDigits.slice(-10)}`;
    const [admin, provider, patient] = await Promise.all([
      prisma.user.create({
        data: {
          email: `mdc-admin-${unique}@test.local`,
          firstName: 'Admin',
          lastName: 'MDC',
          name: 'Admin MDC',
          role: 'ADMIN',
          provider: 'LOCAL',
          emailVerified: true,
          passwordHash: 'irrelevant',
        },
      }),
      prisma.user.create({
        data: {
          email: `mdc-provider-${unique}@test.local`,
          firstName: 'Clinic',
          lastName: 'Provider',
          name: 'Clinic Provider',
          role: 'THERAPIST',
          provider: 'LOCAL',
          emailVerified: true,
          passwordHash: 'irrelevant',
        },
      }),
      prisma.user.create({
        data: {
          email: `mdc-patient-${unique}@test.local`,
          firstName: 'Clinic',
          lastName: 'Patient',
          name: 'Clinic Patient',
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
        age: 28,
        gender: 'female',
        emergencyContact: { name: 'EC', relation: 'Parent', phone: '+910000000001' },
      },
    });
    patientProfileId = profile.id;

    const now = new Date();
    const slot = new Date(now);
    slot.setHours(Math.max(8, now.getHours()), 30, 0, 0);

    const session = await prisma.therapySession.create({
      data: {
        bookingReferenceId: `BK-${unique}-MDC`,
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
    if (checkinQrCode) {
      await prisma.qrConversion.deleteMany({ where: { qrCodeCode: checkinQrCode } }).catch(() => null);
      await prisma.qrScan.deleteMany({ where: { qrCodeCode: checkinQrCode } }).catch(() => null);
      await prisma.qrCode.deleteMany({ where: { code: checkinQrCode } }).catch(() => null);
    }

    await prisma.notification.deleteMany({ where: { payload: { path: ['sessionId'], equals: sessionId } } as any }).catch(() => null);
    await prisma.therapySession.deleteMany({ where: { id: sessionId } }).catch(() => null);
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } }).catch(() => null);
    await prisma.authSession.deleteMany({ where: { userId: { in: [adminUserId, providerUserId, patientUserId] } } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, providerUserId, patientUserId] } } }).catch(() => null);
    await disconnectDatabase();
  });

  test('admin can generate check-in QR and patient can check in', async () => {
    const clinicSlug = `clinic-${Date.now()}`;
    const qrRes = await request(app)
      .post('/api/v1/admin/qr/checkin/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ clinicSlug, providerId: providerUserId })
      .expect(201);

    expect(qrRes.body.success).toBe(true);
    expect(qrRes.body.data.qrCode).toBeDefined();
    expect(qrRes.body.data.trackingPath).toBe(`/q/checkin/${clinicSlug}`);

    checkinQrCode = String(qrRes.body.data.qrCode.code || '');

    const checkInRes = await request(app)
      .post('/api/v1/mdc/checkin')
      .send({ qrCode: checkinQrCode, phone: patientPhone.slice(-10) })
      .expect(200);

    expect(checkInRes.body.success).toBe(true);
    expect(checkInRes.body.data.status).toBe('checked_in');
    expect(String(checkInRes.body.data?.session?.id || '')).toBe(sessionId);
  });
});
