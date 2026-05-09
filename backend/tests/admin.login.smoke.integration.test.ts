import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/db';

describe('Admin login smoke', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const adminEmail = `admin-smoke-${runId}@test.local`;
  const adminPassword = 'AdminSmoke@123';

  beforeAll(async () => {
    await connectDatabase();

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        isDeleted: false,
        provider: 'LOCAL',
      },
      create: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'Smoke',
        name: 'Admin Smoke',
        emailVerified: true,
        isDeleted: false,
        provider: 'LOCAL',
      },
    });
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: adminEmail } } }).catch(() => null);
    await prisma.user.deleteMany({ where: { email: adminEmail } }).catch(() => null);
    await disconnectDatabase();
  });

  test('admin can login via password and receives cookies + user payload', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminEmail, password: adminPassword })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(adminEmail);
    expect(String(response.body.data.user.role || '').toUpperCase()).toBe('ADMIN');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token='),
        expect.stringContaining('refresh_token='),
      ]),
    );
  });
});
