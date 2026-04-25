import fetch from 'node-fetch';
import { chromium } from 'playwright';
import fs from 'fs';

const API_BASE = 'http://localhost:3000/api';
const APP_URL = 'http://localhost:5173';
const PHONE = '+917000100111';

const loginAndGetCookies = async () => {
  const otpRequest = await fetch(`${API_BASE}/auth/signup/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: PHONE }),
  });

  if (!otpRequest.ok) {
    const txt = await otpRequest.text();
    throw new Error(`OTP request failed: ${otpRequest.status} ${txt}`);
  }

  const otpBody = await otpRequest.json();
  const otp = otpBody?.data?.devOtp;
  if (!otp) {
    throw new Error('Missing devOtp in signup/phone response. Enable non-production OTP dev output.');
  }

  const res = await fetch(`${API_BASE}/auth/verify/phone-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: PHONE, otp }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Phone OTP verify failed: ${res.status} ${txt}`);
  }

  const setCookie = res.headers.raw()['set-cookie'] || [];
  const cookies = setCookie.map((c) => {
    const [pair, ...rest] = c.split(';').map((s) => s.trim());
    const [name, value] = pair.split('=');
    return { name, value, path: '/', domain: 'localhost' };
  });
  return cookies;
};

const run = async () => {
  const cookies = await loginAndGetCookies();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(cookies.map(c => ({...c, sameSite: 'Lax'})));

  const page = await context.newPage();

  const apiCalls = [];
  page.on('response', async (res) => {
    try {
      const url = res.url();
      if (url.includes('/api/patient/')) {
        const body = await res.text();
        apiCalls.push({ url, status: res.status(), body: body.slice(0, 2000) });
      }
    } catch (e) {
      // ignore
    }
  });

  await page.goto(`${APP_URL}/patient/progress`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'tmp/progress_page.png', fullPage: true });
  await fs.promises.writeFile('tmp/progress_api_calls.json', JSON.stringify(apiCalls, null, 2));

  console.log('Saved screenshot to tmp/progress_page.png and network log to tmp/progress_api_calls.json');
  await browser.close();
};

run().catch((err) => {
  console.error('E2E check failed:', err);
  process.exit(1);
});
