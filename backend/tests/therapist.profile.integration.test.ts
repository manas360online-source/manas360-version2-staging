import request from 'supertest';
import app from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/db';
import { createAccessToken } from '../src/utils/jwt';
import { randomUUID } from 'crypto';

describe('Therapist profile integration', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
  });

  afterAll(async () => {
    await prisma.therapistProfile.deleteMany({ where: { displayName: { contains: 'Test Therapist' } } }).catch(() => null);
    await prisma.user.deleteMany({ where: { email: { contains: 'int-test-therapist' } } }).catch(() => null);
    await disconnectDatabase();
  });

  test('create and fetch therapist profile', async () => {
    // create user
    const email = `int-test-therapist+${Date.now()}@test.local`;
    const user = await prisma.user.create({
      data: {
        email,
        firstName: 'Test',
        lastName: 'Therapist',
        name: 'Test Therapist',
        role: 'THERAPIST',
        provider: 'LOCAL',
        emailVerified: true,
        passwordHash: 'irrelevant-for-test',
      },
    });

    // prepare token
    const sessionId = randomUUID();
    const access = createAccessToken({ sub: user.id, sessionId, jti: randomUUID() });

    // POST to create/update profile
    const profilePayload = {
      bio: 'Integration test bio',
      specializations: ['CBT', 'Anxiety'],
      languages: ['en', 'hi'],
      yearsOfExperience: 5,
      consultationFee: 1500,
      availabilitySlots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00', isAvailable: true }],
    };

    const createRes = await request(app)
      .post('/api/v1/therapist/profile')
      .set('Authorization', `Bearer ${access}`)
      .send(profilePayload);

    if (createRes.status !== 200 && createRes.status !== 201) {
      // expose validation errors for debugging
      // eslint-disable-next-line no-console
      console.error('createRes', createRes.status, JSON.stringify(createRes.body, null, 2));
      throw new Error(`expected 200 but got ${createRes.status}`);
    }

    expect(createRes.body).toHaveProperty('success', true);
    expect(createRes.body.data).toHaveProperty('displayName');

    // fetch profile
    const fetchRes = await request(app).get('/api/v1/therapist/me/profile').set('Authorization', `Bearer ${access}`).expect(200);
    expect(fetchRes.body).toHaveProperty('success', true);
    const data = fetchRes.body.data;
    expect(data).toMatchObject({ bio: 'Integration test bio', consultationFee: 1500 });
    expect(Array.isArray(data.specializations)).toBe(true);
    expect(data.specializations).toContain('CBT');
  }, 20000);
});
