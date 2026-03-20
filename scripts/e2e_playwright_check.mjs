import fetch from 'node-fetch';
import { chromium } from 'playwright';
import fs from 'fs';

const API_BASE = 'http://localhost:3000/api';
const APP_URL = 'http://localhost:5173';
const EMAIL = 'patient@manas360.local';
const PASS = 'Manas@123';

const loginAndGetCookies = async () => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASS }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Login failed: ${res.status} ${txt}`);
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
