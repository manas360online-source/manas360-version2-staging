export const therapistName = 'Dr. Meera Krishnan';

export const stats = {
  todaysSessions: { value: '3', note: '1 completed' },
  weeklyEarnings: { value: '₹18,600', note: '+12%' },
  activePatients: { value: '24', note: '3 new this week' },
  avgRating: { value: '4.8', note: 'from 142 reviews' },
};

export const todaySessions = [
  {
    id: '1',
    time: '09:00 AM',
    initials: 'AK',
    patient: 'Arjun K.',
    type: 'Anxiety · Follow-up · 45 min',
    status: 'Completed',
  },
  {
    id: '2',
    time: '11:30 AM',
    initials: 'PS',
    patient: 'Priya S.',
    type: 'Depression · Session #8 · 60 min',
    status: 'In 30 min',
  },
  {
    id: '3',
    time: '03:00 PM',
    initials: 'RV',
    patient: 'Ravi V.',
    type: 'OCD · Initial Consultation · 45 min',
    status: 'Scheduled',
  },
];

export const chartData = {
  labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  therapistShare: [14200, 16800, 18400, 15600, 19200, 18600],
  platformShare: [9467, 11200, 12267, 10400, 12800, 12400],
};

export const patientAlerts = [
  {
    id: 'a1',
    level: 'High Risk — Sanjay M.',
    message: 'PHQ-9 score increased from 14 to 19. Crisis protocol recommended.',
    tone: 'danger' as const,
    action: 'Review Now',
  },
  {
    id: 'a2',
    level: 'Missed Session — Neha R.',
    message: 'Did not attend scheduled session on 1 Mar. No cancellation.',
    tone: 'warning' as const,
    action: 'Send Follow-up',
  },
  {
    id: 'a3',
    level: 'Improvement — Lakshmi T.',
    message: 'PHQ-9 dropped from 16 to 9 over 4 sessions. Good progress.',
    tone: 'success' as const,
    action: 'View Progress',
  },
];

export const recentMessages = [
  { id: 'm1', initials: 'DK', name: 'Deepak K.', text: 'Thank you for the exercise recommendations...', time: '2h ago' },
  { id: 'm2', initials: 'AS', name: 'Anita S.', text: "Can we reschedule Thursday's session?", time: '5h ago' },
  { id: 'm3', initials: 'MS', name: 'Meena S.', text: 'I completed the grounding practice.', time: '1d ago' },
];

export const patientsTable = [
  { id: 'p1', name: 'Arjun K.', concern: 'Anxiety', sessions: 8, status: 'Active' },
  { id: 'p2', name: 'Priya S.', concern: 'Depression', sessions: 12, status: 'Active' },
  { id: 'p3', name: 'Ravi V.', concern: 'OCD', sessions: 1, status: 'New' },
  { id: 'p4', name: 'Neha R.', concern: 'Stress', sessions: 5, status: 'Needs Follow-up' },
];

export const notesTable = [
  { id: 'n1', patient: 'Arjun K.', session: 'Today, 09:00 AM', status: 'Pending' },
  { id: 'n2', patient: 'Meera P.', session: 'Yesterday, 04:30 PM', status: 'Pending' },
  { id: 'n3', patient: 'Lakshmi T.', session: '1 Mar, 11:00 AM', status: 'Submitted' },
];

export const payoutsTable = [
  { id: 'pay1', date: '2026-03-01', amount: '₹12,400', status: 'Processed' },
  { id: 'pay2', date: '2026-02-15', amount: '₹11,800', status: 'Processed' },
  { id: 'pay3', date: '2026-02-01', amount: '₹10,900', status: 'Processed' },
];
