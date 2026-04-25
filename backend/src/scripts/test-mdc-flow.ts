import { createClinic } from '../services/mdc-clinic.service';
import { requestLoginOtp, verifyLoginOtp } from '../services/mdc-auth.service';
import { prisma } from '../config/db';

async function runTest() {
  console.log('🚀 Starting MyDigitalClinic Flow Test...');

  try {
    // 1. Create a Clinic
    console.log('\n--- Step 1: Creating Clinic ---');
    const clinic = await createClinic({
      name: 'Test Wellness Clinic',
      phone: '+919999999999',
      email: 'test@clinic.com',
      ownerName: 'Dr. Test Owner',
      address: '123 Health Street'
    });
    console.log('✅ Clinic Created:', clinic.clinicCode);
    
    const loginCode = `${clinic.clinicCode}-ADMIN`;
    console.log('🔑 Admin Login Code:', loginCode);

    // 2. Request OTP
    console.log('\n--- Step 2: Requesting OTP ---');
    const otpResult = await requestLoginOtp(loginCode, '+919999999999');
    console.log('✅ OTP Requested:', otpResult.message);
    const devOtp = otpResult.devOtp;
    console.log('🔢 Dev OTP Received:', devOtp);

    if (!devOtp) {
      throw new Error('No Dev OTP received in non-production mode');
    }

    // 3. Verify OTP
    console.log('\n--- Step 3: Verifying OTP ---');
    const verifyResult = await verifyLoginOtp(loginCode, devOtp);
    console.log('✅ OTP Verified!');
    console.log('👤 Logged in as:', verifyResult.user.fullName);
    console.log('🎫 Tokens issued:', verifyResult.tokens.accessToken.substring(0, 20) + '...');

    // 4. Cleanup (Optional, but good for repeatability)
    // console.log('\n--- Step 4: Cleanup ---');
    // await prisma.clinic.delete({ where: { id: clinic.id } });
    // console.log('✅ Test Data Cleaned Up');

    console.log('\n✨ ALL TESTS PASSED! MDC Login flow is functional.');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
