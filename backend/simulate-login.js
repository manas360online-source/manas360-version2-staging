const axios = require('axios');

async function simulateLogin() {
  const phone = '+919000000001';
  const baseUrl = 'http://localhost:5001/api'; // Corrected port and prefix

  try {
    console.log('Step 1: Request OTP');
    const signupRes = await axios.post(`${baseUrl}/auth/signup/phone`, { phone });
    const devOtp = signupRes.data.data.devOtp;
    console.log('OTP Received:', devOtp);

    console.log('Step 2: Verify OTP');
    const verifyRes = await axios.post(`${baseUrl}/auth/verify/phone-otp`, {
      phone,
      otp: devOtp
    });
    console.log('Login Success!');
    console.log('User:', JSON.stringify(verifyRes.data.data.user, null, 2));
  } catch (error) {
    console.error('Login Failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

simulateLogin();
