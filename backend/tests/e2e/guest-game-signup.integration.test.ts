import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/db';

describe('Guest game signup flow (e2e)', () => {
  jest.setTimeout(30000);

  it('should allow a guest to get a public-roll token and claim it on signup', async () => {
    const phone = `+919900${Date.now().toString().slice(-6)}`;

    // 1) Signup (request OTP)
    const signupRes = await request(app)
      .post('/api/v1/auth/signup/phone')
      .send({ phone });

    // Signup may return 201 (created)
    expect([200, 201]).toContain(signupRes.status);
    const devOtp = signupRes.body?.data?.devOtp;
    expect(devOtp).toBeDefined();

    // 2) Get public-roll token
    const rollRes = await request(app).get('/api/v1/game/public-roll');
    expect(rollRes.status).toBe(200);
    const token = rollRes.body?.data?.token;
    expect(token).toBeDefined();

    // 3) Verify phone with guestGameToken and accept terms
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify/phone-otp')
      .send({ phone, otp: String(devOtp), acceptedTerms: true, guestGameToken: token });

    expect(verifyRes.status).toBe(200);
    const user = verifyRes.body?.data?.user;
    expect(user).toBeDefined();
    expect(user.phone).toBe(phone);
    // phoneVerified flag may be present on server-side; if available assert true
    expect(user.phoneVerified === true || user.phoneVerified === undefined).toBeTruthy();

    // DB side-effects: dailyGamePlay record and wallet credit
    const play = await prisma.dailyGamePlay.findFirst({ where: { userId: String(user.id) } });
    expect(play).not.toBeNull();

    const wallet = await prisma.userWallet.findUnique({ where: { userId: String(user.id) } });
    expect(wallet).not.toBeNull();

    const txn = await prisma.userWalletTransaction.findFirst({ where: { walletId: wallet?.id, transactionType: 'CREDIT' } });
    expect(txn).not.toBeNull();
  });
});
