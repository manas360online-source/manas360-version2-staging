const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Demo@12345';

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];

const plusDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const providerTypeByRole = {
  THERAPIST: 'THERAPIST',
  PSYCHOLOGIST: 'PSYCHOLOGIST',
  PSYCHIATRIST: 'PSYCHIATRIST',
  COACH: 'COACH',
};

const providerProfileDefaults = {
  THERAPIST: {
    bio: 'Seeded therapist profile for QA and provider browse flows.',
    specializations: ['CBT', 'Stress Recovery'],
    languages: ['English', 'Hindi'],
    yearsOfExperience: 6,
    consultationFee: 69900,
    averageRating: 4.7,
    availability: [
      { dayOfWeek: 1, startMinute: 600, endMinute: 1080, isAvailable: true },
      { dayOfWeek: 3, startMinute: 600, endMinute: 1080, isAvailable: true },
    ],
  },
  PSYCHOLOGIST: {
    bio: 'Seeded psychologist profile for assessments and care-team testing.',
    specializations: ['Clinical Psychology', 'Behavioral Assessment'],
    languages: ['English', 'Tamil'],
    yearsOfExperience: 8,
    consultationFee: 99900,
    averageRating: 4.8,
    availability: [
      { dayOfWeek: 2, startMinute: 660, endMinute: 1140, isAvailable: true },
      { dayOfWeek: 4, startMinute: 660, endMinute: 1140, isAvailable: true },
    ],
  },
  PSYCHIATRIST: {
    bio: 'Seeded psychiatrist profile for medication-pathway and urgent support testing.',
    specializations: ['Clinical Psychiatry', 'Medication Management'],
    languages: ['English', 'Hindi'],
    yearsOfExperience: 10,
    consultationFee: 149900,
    averageRating: 4.9,
    availability: [
      { dayOfWeek: 1, startMinute: 720, endMinute: 1020, isAvailable: true },
      { dayOfWeek: 5, startMinute: 720, endMinute: 1020, isAvailable: true },
    ],
  },
  COACH: {
    bio: 'Seeded coach profile for wellness planning and habit-building flows.',
    specializations: ['Wellness Coaching', 'Habit Building'],
    languages: ['English'],
    yearsOfExperience: 5,
    consultationFee: 49900,
    averageRating: 4.6,
    availability: [
      { dayOfWeek: 0, startMinute: 600, endMinute: 960, isAvailable: true },
      { dayOfWeek: 6, startMinute: 600, endMinute: 960, isAvailable: true },
    ],
  },
};

const createUsersByRole = ({ role, count, predefined = [] }) => {
  const generated = [...predefined];
  const needed = Math.max(0, count - predefined.length);

  for (let index = 1; index <= needed; index += 1) {
    const suffix = `${role.toLowerCase()}${index}`;
    generated.push({
      email: `${suffix}@demo.com`,
      firstName: role.slice(0, 1) + role.slice(1).toLowerCase(),
      lastName: `User${index}`,
      role,
    });
  }

  return generated.slice(0, count);
};

async function upsertUser(userInput, passwordHash) {
  const { email, firstName, lastName, role } = userInput;
  const providerType = providerTypeByRole[role] || null;
  const providerFlags = providerType
    ? {
        onboardingStatus: 'COMPLETED',
        isTherapistVerified: true,
        therapistVerifiedAt: new Date(),
        therapistVerifiedByUserId: null,
      }
    : {
        onboardingStatus: null,
        isTherapistVerified: false,
        therapistVerifiedAt: null,
        therapistVerifiedByUserId: null,
      };

  return prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      providerType,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      isDeleted: false,
      status: 'ACTIVE',
      passwordHash,
      failedLoginAttempts: 0,
      lockUntil: null,
      ...providerFlags,
    },
    create: {
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      providerType,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      status: 'ACTIVE',
      passwordHash,
      ...providerFlags,
    },
  });
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const patientsSeed = createUsersByRole({
    role: 'PATIENT',
    count: 20,
    predefined: [
      { email: 'patient@demo.com', firstName: 'Patient', lastName: 'Demo', role: 'PATIENT' },
      { email: 'free@demo.com', firstName: 'Free', lastName: 'Plan', role: 'PATIENT' },
      { email: 'basic@demo.com', firstName: 'Basic', lastName: 'Plan', role: 'PATIENT' },
      { email: 'premium@demo.com', firstName: 'Premium', lastName: 'Plan', role: 'PATIENT' },
    ],
  });

  const therapistsSeed = createUsersByRole({
    role: 'THERAPIST',
    count: 10,
    predefined: [{ email: 'therapist@demo.com', firstName: 'Therapist', lastName: 'Demo', role: 'THERAPIST' }],
  });

  const coachesSeed = createUsersByRole({
    role: 'COACH',
    count: 5,
    predefined: [{ email: 'coach@demo.com', firstName: 'Coach', lastName: 'Demo', role: 'COACH' }],
  });

  const psychiatristsSeed = createUsersByRole({
    role: 'PSYCHIATRIST',
    count: 3,
    predefined: [{ email: 'psychiatrist@demo.com', firstName: 'Psychiatrist', lastName: 'Demo', role: 'PSYCHIATRIST' }],
  });

  const psychologistsSeed = createUsersByRole({
    role: 'PSYCHOLOGIST',
    count: 4,
    predefined: [{ email: 'psychologist@demo.com', firstName: 'Psychologist', lastName: 'Demo', role: 'PSYCHOLOGIST' }],
  });

  const adminsSeed = createUsersByRole({
    role: 'ADMIN',
    count: 1,
    predefined: [
      { email: 'admin@demo.com', firstName: 'Admin', lastName: 'Demo', role: 'ADMIN' },
    ],
  });

  const allUsers = [...patientsSeed, ...therapistsSeed, ...coachesSeed, ...psychiatristsSeed, ...psychologistsSeed, ...adminsSeed];
  const persistedUsers = [];
  for (const userData of allUsers) {
    persistedUsers.push(await upsertUser(userData, passwordHash));
  }

  const usersByEmail = new Map(persistedUsers.map((user) => [String(user.email).toLowerCase(), user]));
  const patientUsers = patientsSeed.map((row) => usersByEmail.get(row.email.toLowerCase())).filter(Boolean);
  const therapistUsers = therapistsSeed.map((row) => usersByEmail.get(row.email.toLowerCase())).filter(Boolean);
  const coachUsers = coachesSeed.map((row) => usersByEmail.get(row.email.toLowerCase())).filter(Boolean);
  const psychiatristUsers = psychiatristsSeed.map((row) => usersByEmail.get(row.email.toLowerCase())).filter(Boolean);
  const psychologistUsers = psychologistsSeed.map((row) => usersByEmail.get(row.email.toLowerCase())).filter(Boolean);
  const providerUsers = [...therapistUsers, ...coachUsers, ...psychiatristUsers, ...psychologistUsers].filter(Boolean);

  // Ensure TherapistProfile rows exist for all seeded provider roles
  for (const provider of providerUsers) {
    const displayName = `${provider.firstName} ${provider.lastName}`.trim();
    const defaults = providerProfileDefaults[provider.role] || providerProfileDefaults.THERAPIST;
    await prisma.therapistProfile.upsert({
      where: { userId: provider.id },
      update: {
        displayName,
        bio: defaults.bio,
        specializations: defaults.specializations,
        languages: defaults.languages,
        yearsOfExperience: defaults.yearsOfExperience,
        consultationFee: defaults.consultationFee,
        averageRating: defaults.averageRating,
        availability: defaults.availability,
        onboardingCompleted: true,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedByUserId: null,
      },
      create: {
        userId: provider.id,
        displayName,
        bio: defaults.bio,
        specializations: defaults.specializations,
        languages: defaults.languages,
        yearsOfExperience: defaults.yearsOfExperience,
        consultationFee: defaults.consultationFee,
        averageRating: defaults.averageRating,
        availability: defaults.availability,
        onboardingCompleted: true,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedByUserId: null,
      },
    }).catch(() => null);
  }

  const profileByUserId = new Map();
  for (const patient of patientUsers) {
    const profile = await prisma.patientProfile.upsert({
      where: { userId: patient.id },
      update: {
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        userId: patient.id,
        age: 20 + Math.floor(Math.random() * 25),
        gender: randomItem(['female', 'male', 'non-binary']),
        medicalHistory: 'Seeded for staging QA',
        emergencyContact: {
          name: 'Emergency Contact',
          relationship: 'Family',
          phone: '+910000000000',
        },
      },
    });
    profileByUserId.set(patient.id, profile);
  }

  // Assign patients to psychologists for role-specific dashboard and APIs
  for (let idx = 0; idx < patientUsers.length; idx += 1) {
    const patient = patientUsers[idx];
    const psychologist = psychologistUsers[idx % psychologistUsers.length];
    if (!patient || !psychologist) continue;

    await prisma.careTeamAssignment.upsert({
      where: {
        patientId_providerId: {
          patientId: patient.id,
          providerId: psychologist.id,
        },
      },
      update: {
        status: 'ACTIVE',
        accessScope: {
          role: 'psychologist',
          permissions: ['read_patient', 'write_assessment', 'write_report', 'request_testing'],
        },
      },
      create: {
        patientId: patient.id,
        providerId: psychologist.id,
        assignedById: null,
        status: 'ACTIVE',
        accessScope: {
          role: 'psychologist',
          permissions: ['read_patient', 'write_assessment', 'write_report', 'request_testing'],
        },
      },
    }).catch(() => null);
  }

  const featuredProviders = [
    therapistUsers[0],
    psychologistUsers[0],
    psychiatristUsers[0],
    coachUsers[0],
  ].filter(Boolean);

  for (const patient of patientUsers) {
    for (const provider of featuredProviders) {
      await prisma.careTeamAssignment.upsert({
        where: {
          patientId_providerId: {
            patientId: patient.id,
            providerId: provider.id,
          },
        },
        update: {
          status: 'ACTIVE',
          revokedAt: null,
          accessScope: {
            role: String(provider.role).toLowerCase(),
            permissions: ['read_patient', 'write_assessment', 'message_patient', 'book_session'],
          },
        },
        create: {
          patientId: patient.id,
          providerId: provider.id,
          assignedById: null,
          status: 'ACTIVE',
          accessScope: {
            role: String(provider.role).toLowerCase(),
            permissions: ['read_patient', 'write_assessment', 'message_patient', 'book_session'],
          },
        },
      }).catch(() => null);
    }
  }

  const planByEmail = {
    'free@demo.com': { planName: 'Free Plan', price: 0, billingCycle: 'monthly', status: 'active' },
    'basic@demo.com': { planName: 'Basic Plan', price: 999, billingCycle: 'monthly', status: 'active' },
    'premium@demo.com': { planName: 'Premium Plan', price: 2499, billingCycle: 'monthly', status: 'active' },
  };

  for (const patient of patientUsers) {
    const email = String(patient.email || '').toLowerCase();
    const plan = planByEmail[email] || { planName: randomItem(['Free Plan', 'Basic Plan', 'Premium Plan']), price: randomItem([0, 999, 2499]), billingCycle: 'monthly', status: 'active' };

    await prisma.patientSubscription.upsert({
      where: { userId: patient.id },
      update: {
        planName: plan.planName,
        price: plan.price,
        billingCycle: plan.billingCycle,
        status: plan.status,
        autoRenew: plan.price > 0,
        renewalDate: plusDays(30),
      },
      create: {
        userId: patient.id,
        planName: plan.planName,
        price: plan.price,
        billingCycle: plan.billingCycle,
        status: plan.status,
        autoRenew: plan.price > 0,
        renewalDate: plusDays(30),
      },
    });
  }

  // Seed psychologist assessments and reports in module-specific tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychologist_assessments (
      id TEXT PRIMARY KEY,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      assessment_type TEXT NOT NULL,
      title TEXT,
      observations TEXT,
      findings JSONB NOT NULL DEFAULT '{}'::jsonb,
      score NUMERIC,
      status TEXT NOT NULL DEFAULT 'completed',
      evaluated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychologist_reports (
      id TEXT PRIMARY KEY,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      diagnosis_observations TEXT,
      behavioral_analysis TEXT,
      cognitive_findings TEXT,
      recommendations TEXT,
      attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const psychologicalAssessmentTypes = ['cognitive', 'personality', 'behavioral'];
  for (let idx = 0; idx < patientUsers.length; idx += 1) {
    const patient = patientUsers[idx];
    const profile = profileByUserId.get(patient.id);
    const psychologist = psychologistUsers[idx % psychologistUsers.length];
    if (!profile || !psychologist) continue;

    await prisma.$executeRawUnsafe(
      `DELETE FROM psychologist_assessments WHERE psychologist_id = $1 AND patient_id = $2`,
      psychologist.id,
      profile.id,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM psychologist_reports WHERE psychologist_id = $1 AND patient_id = $2`,
      psychologist.id,
      profile.id,
    );

    for (let i = 0; i < 2; i += 1) {
      const type = psychologicalAssessmentTypes[(idx + i) % psychologicalAssessmentTypes.length];
      await prisma.$executeRawUnsafe(
        `INSERT INTO psychologist_assessments (id, psychologist_id, patient_id, assessment_type, title, observations, findings, score, status, evaluated_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)`,
        `psy-assess-${idx + 1}-${i + 1}`,
        psychologist.id,
        profile.id,
        type,
        `${type} assessment`,
        'Seeded psychological observations for QA dashboard views',
        JSON.stringify({ moodStability: randomItem(['low', 'moderate', 'high']), attentionSpan: randomItem(['low', 'moderate', 'high']) }),
        55 + ((idx + i) % 35),
        'completed',
        plusDays(-(idx + i + 1)),
        plusDays(-(idx + i + 1)),
        plusDays(-(idx + i + 1)),
      );
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO psychologist_reports (id, psychologist_id, patient_id, title, diagnosis_observations, behavioral_analysis, cognitive_findings, recommendations, attachments, status, submitted_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`,
      `psy-report-${idx + 1}`,
      psychologist.id,
      profile.id,
      'Psychological Evaluation Report',
      'Seeded diagnostic observations',
      'Seeded behavioral trend analysis',
      'Seeded cognitive findings',
      'Continue structured assessments and follow-up',
      JSON.stringify([]),
      idx % 2 === 0 ? 'submitted' : 'draft',
      idx % 2 === 0 ? plusDays(-idx) : null,
      plusDays(-(idx + 1)),
      plusDays(-idx),
    );
  }

  const patientIds = patientUsers.map((user) => user.id);
  const patientProfileIds = [...profileByUserId.values()].map((profile) => profile.id);
  const moodLogModel = prisma.moodLog;
  const patientMoodEntryModel = prisma.patientMoodEntry;
  const patientExerciseModel = prisma.patientExercise;
  const patientAssessmentModel = prisma.patientAssessment;
  const patientProgressModel = prisma.patientProgress;

  if (moodLogModel) {
    await moodLogModel.deleteMany({ where: { userId: { in: patientIds }, source: 'seed' } });
  }
  if (patientMoodEntryModel) {
    await patientMoodEntryModel.deleteMany({ where: { patientId: { in: patientProfileIds }, note: { startsWith: '[seed]' } } });
  }
  await prisma.notification.deleteMany({ where: { userId: { in: patientIds }, type: { startsWith: 'SEED_' } } });
  if (patientExerciseModel) {
    await patientExerciseModel.deleteMany({ where: { patientId: { in: patientProfileIds }, assignedBy: 'seed-system' } });
  }
  if (patientAssessmentModel) {
    await patientAssessmentModel.deleteMany({ where: { patientId: { in: patientProfileIds }, type: { startsWith: 'SEED_' } } });
  }

  for (const patient of patientUsers) {
    const profile = profileByUserId.get(patient.id);
    if (!profile) continue;

    for (let i = 0; i < 14; i += 1) {
      const mood = Math.max(1, Math.min(10, 5 + Math.round(Math.sin(i / 2) * 2) - Math.floor(i / 8)));
      const date = plusDays(-i);
      if (moodLogModel) {
        await moodLogModel.create({
          data: {
            userId: patient.id,
            moodValue: mood,
            note: '[seed] Mood check-in for staging QA',
            source: 'seed',
            loggedAt: date,
          },
        });
      }

      if (patientMoodEntryModel) {
        await patientMoodEntryModel.create({
          data: {
            patientId: profile.id,
            moodScore: Math.max(1, Math.min(5, Math.round(mood / 2))),
            note: '[seed] Legacy mood entry for dashboard QA',
            date,
          },
        });
      }
    }

    await prisma.notification.create({
      data: {
        userId: patient.id,
        type: 'SEED_WELCOME',
        title: 'Welcome to Staging',
        message: 'This account is seeded for QA testing.',
        payload: { seeded: true },
      },
    });

    const exercises = [
      { title: 'Breathing Reset', duration: 10, status: 'COMPLETED' },
      { title: 'Thought Journal', duration: 15, status: 'COMPLETED' },
      { title: 'Sleep Hygiene Check', duration: 12, status: 'IN_PROGRESS' },
      { title: 'Behavioral Activation', duration: 20, status: 'PENDING' },
    ];

    if (patientExerciseModel) {
      for (const exercise of exercises) {
        await patientExerciseModel.create({
          data: {
            patientId: profile.id,
            title: exercise.title,
            assignedBy: 'seed-system',
            duration: exercise.duration,
            status: exercise.status,
          },
        });
      }
    }

    const assessments = [
      { type: 'SEED_PHQ9', totalScore: 16, answers: [2, 2, 1, 2, 2, 2, 2, 2, 1], severityLevel: 'Moderate' },
      { type: 'SEED_PHQ9', totalScore: 13, answers: [1, 2, 1, 2, 2, 1, 2, 1, 1], severityLevel: 'Moderate' },
      { type: 'SEED_PHQ9', totalScore: 10, answers: [1, 1, 1, 2, 1, 1, 1, 1, 1], severityLevel: 'Mild' },
    ];

    if (patientAssessmentModel) {
      for (const assessment of assessments) {
        await patientAssessmentModel.create({
          data: {
            patientId: profile.id,
            type: assessment.type,
            answers: assessment.answers,
            totalScore: assessment.totalScore,
            severityLevel: assessment.severityLevel,
          },
        });
      }
    }
  }

  for (let patientIndex = 0; patientIndex < patientUsers.length; patientIndex += 1) {
    const patient = patientUsers[patientIndex];
    const profile = profileByUserId.get(patient.id);
    const therapist = therapistUsers[patientIndex % therapistUsers.length];
    if (!profile || !therapist) continue;

    const sessions = [
      { offset: -5, status: 'COMPLETED', paymentStatus: 'PAID' },
      { offset: -1, status: 'COMPLETED', paymentStatus: 'PAID' },
      { offset: 2, status: 'CONFIRMED', paymentStatus: 'PAID' },
    ];

    for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex += 1) {
      const session = sessions[sessionIndex];
      const bookingReferenceId = `SEED-${patientIndex + 1}-${sessionIndex + 1}`;
      await prisma.therapySession.upsert({
        where: { bookingReferenceId },
        update: {
          patientProfileId: profile.id,
          therapistProfileId: therapist.id,
          dateTime: plusDays(session.offset),
          durationMinutes: 50,
          sessionFeeMinor: BigInt(249900),
          paymentStatus: session.paymentStatus,
          status: session.status,
        },
        create: {
          bookingReferenceId,
          patientProfileId: profile.id,
          therapistProfileId: therapist.id,
          dateTime: plusDays(session.offset),
          durationMinutes: 50,
          sessionFeeMinor: BigInt(249900),
          paymentStatus: session.paymentStatus,
          status: session.status,
        },
      });
    }
  }

  for (const patient of patientUsers) {
    const profile = profileByUserId.get(patient.id);
    if (!profile) continue;

    const [allSessions, allExercises, firstAssessment, latestAssessment] = await Promise.all([
      prisma.therapySession.findMany({ where: { patientProfileId: profile.id }, select: { status: true } }),
      patientExerciseModel ? patientExerciseModel.findMany({ where: { patientId: profile.id }, select: { status: true } }) : Promise.resolve([]),
      patientAssessmentModel
        ? patientAssessmentModel.findFirst({ where: { patientId: profile.id }, orderBy: { createdAt: 'asc' }, select: { totalScore: true } })
        : Promise.resolve(null),
      patientAssessmentModel
        ? patientAssessmentModel.findFirst({ where: { patientId: profile.id }, orderBy: { createdAt: 'desc' }, select: { totalScore: true } })
        : Promise.resolve(null),
    ]);

    const totalSessions = allSessions.length;
    const sessionsCompleted = allSessions.filter((item) => String(item.status) === 'COMPLETED').length;
    const totalExercises = allExercises.length;
    const exercisesCompleted = allExercises.filter((item) => String(item.status).toUpperCase() === 'COMPLETED').length;

    if (patientProgressModel) {
      await patientProgressModel.upsert({
        where: { patientId: profile.id },
        update: {
          sessionsCompleted,
          totalSessions,
          exercisesCompleted,
          totalExercises,
          phqStart: firstAssessment?.totalScore ?? null,
          phqCurrent: latestAssessment?.totalScore ?? null,
        },
        create: {
          patientId: profile.id,
          sessionsCompleted,
          totalSessions,
          exercisesCompleted,
          totalExercises,
          phqStart: firstAssessment?.totalScore ?? null,
          phqCurrent: latestAssessment?.totalScore ?? null,
        },
      });
    }
  }

  console.log('Seed complete ✅');
  console.log(`Default password for seeded users: ${DEFAULT_PASSWORD}`);
}

seed()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
