const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MOCK_PATIENT_EMAIL = 'mock.patient@manas360.local';
const MOCK_THERAPIST_EMAIL = 'mock.therapist@manas360.local';

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function run() {
  const patientUser = await prisma.user.findUnique({ where: { email: MOCK_PATIENT_EMAIL } });
  if (!patientUser) {
    throw new Error(`Patient user not found: ${MOCK_PATIENT_EMAIL}. Run seed:users:mock first.`);
  }

  const therapistUser = await prisma.user.findUnique({ where: { email: MOCK_THERAPIST_EMAIL } });
  if (!therapistUser) {
    throw new Error(`Therapist user not found: ${MOCK_THERAPIST_EMAIL}. Run seed:users:mock first.`);
  }

  const patientProfile = await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {
      isDeleted: false,
      deletedAt: null,
      medicalHistory: 'Seeded profile for local dashboard testing',
    },
    create: {
      userId: patientUser.id,
      age: 29,
      gender: 'female',
      medicalHistory: 'Seeded profile for local dashboard testing',
      emergencyContact: {
        name: 'Local QA Contact',
        relationship: 'Sibling',
        phone: '+910000000001',
      },
    },
  });

  await prisma.patientProgress.upsert({
    where: { patientId: patientProfile.id },
    update: {
      sessionsCompleted: 3,
      totalSessions: 5,
      exercisesCompleted: 4,
      totalExercises: 6,
      phqStart: 16,
      phqCurrent: 9,
    },
    create: {
      patientId: patientProfile.id,
      sessionsCompleted: 3,
      totalSessions: 5,
      exercisesCompleted: 4,
      totalExercises: 6,
      phqStart: 16,
      phqCurrent: 9,
    },
  });

  await prisma.patientAssessment.create({
    data: {
      patientId: patientProfile.id,
      type: 'SEED_PHQ9',
      answers: [2, 2, 1, 1, 1, 1, 0, 1, 0],
      totalScore: 9,
      severityLevel: 'Mild',
    },
  });

  await prisma.patientMoodEntry.createMany({
    data: [
      { patientId: patientProfile.id, moodScore: 3, note: 'Seeded mood log - 3 days ago', date: addDays(-3) },
      { patientId: patientProfile.id, moodScore: 4, note: 'Seeded mood log - 2 days ago', date: addDays(-2) },
      { patientId: patientProfile.id, moodScore: 4, note: 'Seeded mood log - yesterday', date: addDays(-1) },
      { patientId: patientProfile.id, moodScore: 5, note: 'Seeded mood log - today', date: new Date() },
    ],
  });

  await prisma.patientExercise.createMany({
    data: [
      { patientId: patientProfile.id, title: 'Breathing Reset', assignedBy: 'seed-system', duration: 10, status: 'COMPLETED' },
      { patientId: patientProfile.id, title: 'Thought Journal', assignedBy: 'seed-system', duration: 15, status: 'IN_PROGRESS' },
      { patientId: patientProfile.id, title: 'Sleep Hygiene Check', assignedBy: 'seed-system', duration: 12, status: 'PENDING' },
    ],
  });

  const sessionIdPast = 'seed-past-' + Date.now();
  const sessionIdUpcoming = 'seed-upcoming-' + Date.now();

  await prisma.therapySession.createMany({
    data: [
      {
        bookingReferenceId: sessionIdPast,
        patientProfileId: patientProfile.id,
        therapistProfileId: therapistUser.id,
        dateTime: addDays(-2),
        durationMinutes: 50,
        sessionFeeMinor: 150000,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        agoraChannel: 'seed-channel-past',
      },
      {
        bookingReferenceId: sessionIdUpcoming,
        patientProfileId: patientProfile.id,
        therapistProfileId: therapistUser.id,
        dateTime: addDays(2),
        durationMinutes: 45,
        sessionFeeMinor: 150000,
        paymentStatus: 'UNPAID',
        status: 'CONFIRMED',
        agoraChannel: 'seed-channel-upcoming',
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        patientUserId: patientUser.id,
        patientProfileId: patientProfile.id,
        therapistUserId: therapistUser.id,
        seeded: {
          assessments: 1,
          moods: 4,
          exercises: 3,
          sessions: 2,
          progress: true,
        },
      },
      null,
      2,
    ),
  );
}

run()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
