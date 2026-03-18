const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

if (process.argv.length < 3) {
  console.error('Usage: node patient_listener.js <patientId> [secret]');
  process.exit(2);
}
const patientId = process.argv[2];
const secret = process.argv[3] || process.env.JWT_ACCESS_SECRET || 'change-access-secret';
const token = jwt.sign({ sub: patientId, role: 'patient' }, secret, { expiresIn: '1h' });

console.log('Using token for patient', patientId);
const socket = io('http://localhost:3000', { auth: { token }, path: '/socket.io', transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('join_inbox');
});

socket.on('inbox_joined', (d) => console.log('inbox_joined', d));

socket.on('patient:document:new', (payload) => {
  console.log('patient:document:new', JSON.stringify(payload, null, 2));
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('connect_error', err && err.message ? err.message : err);
  process.exit(3);
});

setTimeout(() => {
  console.error('timeout waiting for event');
  process.exit(4);
}, 20000);
