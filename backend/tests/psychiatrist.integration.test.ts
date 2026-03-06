import request from 'supertest';
import app from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/db';
import { createAccessToken } from '../src/utils/jwt';
import { randomUUID } from 'crypto';

describe('Psychiatrist module integration', () => {
  let psychiatristUserId = '';
  let therapistUserId = '';
  let patientUserId = '';
  let patientProfileId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();

    const unique = Date.now();

    const psychiatrist = await prisma.user.create({
      data: {
        email: `psychiatrist-int-${unique}@test.local`,
        firstName: 'Psy',
        lastName: 'Doctor',
        name: 'Psy Doctor',
        role: 'PSYCHIATRIST',
        provider: 'LOCAL',
        emailVerified: true,
        passwordHash: 'irrelevant',
      },
    });
    psychiatristUserId = psychiatrist.id;

    const therapist = await prisma.user.create({
      data: {
        email: `therapist-int-${unique}@test.local`,
        firstName: 'Thera',
        lastName: 'Pist',
        name: 'Thera Pist',
        role: 'THERAPIST',
        provider: 'LOCAL',
        emailVerified: true,
        passwordHash: 'irrelevant',
      },
    });
    therapistUserId = therapist.id;

    const patientUser = await prisma.user.create({
      data: {
        email: `patient-int-${unique}@test.local`,
        firstName: 'Pat',
        lastName: 'Ient',
        name: 'Pat Ient',
        role: 'PATIENT',
        provider: 'LOCAL',
        emailVerified: true,
        passwordHash: 'irrelevant',
      },
    });
    patientUserId = patientUser.id;

    const patientProfile = await prisma.patientProfile.create({
      data: {
        userId: patientUser.id,
        age: 29,
        gender: 'female',
        emergencyContact: {
          name: 'Emergency',
          relationship: 'Sibling',
          phone: '+910000000000',
        },
      },
    });
    patientProfileId = patientProfile.id;
  });

  afterAll(async () => {
    if (psychiatristUserId) {
      await prisma.$executeRawUnsafe(`DELETE FROM psychiatric_assessments WHERE psychiatrist_id = $1`, psychiatristUserId).catch(() => null);
      await prisma.$executeRawUnsafe(`DELETE FROM prescriptions WHERE psychiatrist_id = $1`, psychiatristUserId).catch(() => null);
      await prisma.$executeRawUnsafe(`DELETE FROM drug_interactions WHERE psychiatrist_id = $1`, psychiatristUserId).catch(() => null);
      await prisma.$executeRawUnsafe(`DELETE FROM medication_history WHERE psychiatrist_id = $1`, psychiatristUserId).catch(() => null);
    }

    if (patientProfileId) {
      await prisma.$executeRawUnsafe(`DELETE FROM patient_vitals WHERE patient_id = $1`, patientProfileId).catch(() => null);
      await prisma.$executeRawUnsafe(`DELETE FROM psychologist_wellness_plans WHERE patient_id = $1`, patientProfileId).catch(() => null);
      await prisma.therapySession.deleteMany({ where: { patientProfileId } }).catch(() => null);
      await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } }).catch(() => null);
    }

    if (patientUserId) await prisma.user.deleteMany({ where: { id: patientUserId } }).catch(() => null);
    if (therapistUserId) await prisma.user.deleteMany({ where: { id: therapistUserId } }).catch(() => null);
    if (psychiatristUserId) await prisma.user.deleteMany({ where: { id: psychiatristUserId } }).catch(() => null);

    await disconnectDatabase();
  });

  test('forbids therapist role on psychiatrist endpoints', async () => {
    const token = createAccessToken({ sub: therapistUserId, sessionId: randomUUID(), jti: randomUUID() });

    await request(app)
      .get('/api/v1/psychiatrist/me/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  test('supports psychiatrist assessment/prescription flow', async () => {
    const token = createAccessToken({ sub: psychiatristUserId, sessionId: randomUUID(), jti: randomUUID() });

    const dashboardRes = await request(app)
      .get('/api/v1/psychiatrist/me/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashboardRes.body).toHaveProperty('success', true);

    const assessmentRes = await request(app)
      .post('/api/v1/psychiatrist/me/assessments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: patientProfileId,
        chiefComplaint: 'Persistent low mood and lack of motivation',
        symptoms: [
          { name: 'Low Mood', severity: 7 },
          { name: 'Sleep Issues', severity: 6 },
        ],
        durationWeeks: 6,
        clinicalImpression: 'Major Depressive Disorder',
        severity: 'Moderate',
      })
      .expect(201);

    expect(assessmentRes.body).toHaveProperty('success', true);

    const prescriptionRes = await request(app)
      .post('/api/v1/psychiatrist/me/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: patientProfileId,
        drugName: 'Sertraline',
        startingDose: '50mg',
        frequency: 'once daily in the morning',
        duration: '8 weeks',
      })
      .expect(201);

    expect(prescriptionRes.body.data.instructions).toContain('Sertraline');

    const interactionRes = await request(app)
      .post('/api/v1/psychiatrist/me/drug-interactions/check')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: patientProfileId,
        medications: ['Sertraline'],
        herbals: ['Ashwagandha'],
      })
      .expect(200);

    expect(interactionRes.body.data.level).toBe('CAUTION');

    const patientDashboardRes = await request(app)
      .get(`/api/v1/psychiatrist/me/dashboard?patientId=${patientProfileId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(patientDashboardRes.body.data.patientSelected).toBe(true);
  }, 30000);
});
