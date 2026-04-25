#!/usr/bin/env node
const axios = require('axios');
require('dotenv').config();

const ZOHO_URL = process.env.ZOHO_FLOW_WEBHOOK_URL;
const ZOHO_SECRET = process.env.ZOHO_FLOW_WEBHOOK_SECRET || '';

if (!ZOHO_URL) {
  console.error('Missing ZOHO_FLOW_WEBHOOK_URL in environment. Set it in backend/.env or export it.');
  process.exit(2);
}

const arg = (name, fallback) => {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
};

const eventType = arg('--event', 'USER_REGISTERED');

const samples = {
  USER_REGISTERED: {
    event: 'USER_REGISTERED',
    timestamp: new Date().toISOString(),
    source: 'MANAS360',
    data: { userId: 'u_local_test', name: 'Local Test', phone: '919999999999', email: 'test@local' }
  },
  THERAPIST_APPROVED: {
    event: 'THERAPIST_APPROVED',
    timestamp: new Date().toISOString(),
    source: 'MANAS360',
    data: { therapistId: 't_1001', therapistName: 'Dr. Meera Rao', phone: '919999991111', email: 'meera@example.com', approvedBy: 'admin_01', approvalStatus: 'approved' }
  },
  SESSION_BOOKED: {
    event: 'SESSION_BOOKED',
    timestamp: new Date().toISOString(),
    source: 'MANAS360',
    data: { sessionId: 'sess_2001', patientName: 'Chandu', patientPhone: '919999999999', therapistName: 'Dr. Meera Rao', sessionDateTime: new Date(Date.now()+3600*1000).toISOString(), meetingLink: 'https://meet.example/sess_2001' }
  },
  CRISIS_ALERT: {
    event: 'CRISIS_ALERT',
    timestamp: new Date().toISOString(),
    source: 'MANAS360',
    data: { alertId: 'alert_local_1', userId: 'u_1001', userName: 'Local User', severity: 'CRITICAL', message: 'Test crisis', location: 'Local' }
  }
};

const payload = samples[eventType] || samples.USER_REGISTERED;

(async () => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (ZOHO_SECRET) headers['x-zoho-flow-secret'] = ZOHO_SECRET;

    console.log('Sending event', payload.event, 'to', ZOHO_URL);
    const res = await axios.post(ZOHO_URL, payload, { headers, timeout: 15000 });
    console.log('Status:', res.status);
    console.log('Response data:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
    } else {
      console.error('Request error:', err.message);
    }
    process.exit(1);
  }
})();
