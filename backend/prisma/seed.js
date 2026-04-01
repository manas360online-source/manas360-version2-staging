const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

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
    const serial = predefined.length + index;
    const suffix = `${role.toLowerCase()}${index}`;
    const rolePrefixMap = {
      PATIENT: '70001',
      THERAPIST: '70002',
      COACH: '70003',
      PSYCHIATRIST: '70004',
      PSYCHOLOGIST: '70005',
      ADMIN: '70006',
    };
    const rolePrefix = rolePrefixMap[role] || '70009';
    const phone = `+91${rolePrefix}${String(serial).padStart(5, '0')}`;
    generated.push({
      // For most roles the system uses phone+OTP; keep email only for platform admins
      email: role === 'ADMIN' ? `${suffix}@demo.com` : null,
      phone,
      firstName: role.slice(0, 1) + role.slice(1).toLowerCase(),
      lastName: `User${index}`,
      role,
    });
  }

  return generated.slice(0, count);
};

async function upsertUser(userInput, passwordHash) {
  const { email, phone, firstName, lastName, role } = userInput;
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

  // Upsert by email when present, otherwise by phone (phone-first identity)
  const whereClause = email ? { email } : { phone };
  const isPlatformAdmin = role === 'ADMIN';
  const passwordForCreate = isPlatformAdmin ? passwordHash : null;

  return prisma.user.upsert({
    where: whereClause,
    update: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      phone,
      role,
      providerType,
      provider: 'LOCAL',
      // For non-admins prefer phone verification as primary
      emailVerified: isPlatformAdmin && !!email,
      phoneVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
      passwordHash: passwordForCreate,
      failedLoginAttempts: 0,
      lockUntil: null,
      ...providerFlags,
    },
    create: {
      email: email || null,
      phone,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      providerType,
      provider: 'LOCAL',
      emailVerified: isPlatformAdmin && !!email,
      phoneVerified: true,
      status: 'ACTIVE',
      passwordHash: passwordForCreate,
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
      { email: null, phone: '+917000100001', firstName: 'Patient', lastName: 'Demo', role: 'PATIENT' },
      { email: null, phone: '+917000100002', firstName: 'Free', lastName: 'Plan', role: 'PATIENT' },
      { email: null, phone: '+917000100003', firstName: 'Monthly', lastName: 'Plan', role: 'PATIENT' },
      { email: null, phone: '+917000100004', firstName: 'Quarterly', lastName: 'Plan', role: 'PATIENT' },
      { email: null, phone: '+917000100005', firstName: 'Premium', lastName: 'Plan', role: 'PATIENT' },
    ],
  });

  const therapistsSeed = createUsersByRole({
    role: 'THERAPIST',
    count: 10,
    predefined: [{ email: null, phone: '+917000200001', firstName: 'Therapist', lastName: 'Demo', role: 'THERAPIST' }],
  });

  const coachesSeed = createUsersByRole({
    role: 'COACH',
    count: 5,
    predefined: [{ email: null, phone: '+917000300001', firstName: 'Coach', lastName: 'Demo', role: 'COACH' }],
  });

  const psychiatristsSeed = createUsersByRole({
    role: 'PSYCHIATRIST',
    count: 3,
    predefined: [{ email: null, phone: '+917000400001', firstName: 'Psychiatrist', lastName: 'Demo', role: 'PSYCHIATRIST' }],
  });

  const psychologistsSeed = createUsersByRole({
    role: 'PSYCHOLOGIST',
    count: 4,
    predefined: [{ email: null, phone: '+917000500001', firstName: 'Psychologist', lastName: 'Demo', role: 'PSYCHOLOGIST' }],
  });

  const adminsSeed = createUsersByRole({
    role: 'ADMIN',
    count: 1,
    predefined: [
      // Keep platform admin email/password intact
      { email: 'admin@demo.com', phone: '+917000600001', firstName: 'Admin', lastName: 'Demo', role: 'ADMIN' },
    ],
  });

  const allUsers = [...patientsSeed, ...therapistsSeed, ...coachesSeed, ...psychiatristsSeed, ...psychologistsSeed, ...adminsSeed];
  const persistedUsers = [];
  for (const userData of allUsers) {
    persistedUsers.push(await upsertUser(userData, passwordHash));
  }

  // Map persisted users by phone for phone-first lookups. Fall back to email when present.
  const usersByPhone = new Map(persistedUsers.map((user) => [String(user.phone || '').trim(), user]));
  const usersByEmailOrPhone = (row) => {
    if (row.phone) return usersByPhone.get(row.phone);
    if (row.email) return persistedUsers.find((u) => String(u.email || '').toLowerCase() === String(row.email || '').toLowerCase());
    return null;
  };

  const patientUsers = patientsSeed.map((row) => usersByEmailOrPhone(row)).filter(Boolean);
  const therapistUsers = therapistsSeed.map((row) => usersByEmailOrPhone(row)).filter(Boolean);
  const coachUsers = coachesSeed.map((row) => usersByEmailOrPhone(row)).filter(Boolean);
  const psychiatristUsers = psychiatristsSeed.map((row) => usersByEmailOrPhone(row)).filter(Boolean);
  const psychologistUsers = psychologistsSeed.map((row) => usersByEmailOrPhone(row)).filter(Boolean);
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

    // NEW: Grant all seeded providers active platform access for immediate QA testing
    await prisma.platformAccess.upsert({
      where: { providerId: provider.id },
      update: {
        status: 'active',
        expiryDate: plusDays(365),
      },
      create: {
        providerId: provider.id,
        status: 'active',
        expiryDate: plusDays(365),
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

  // Assign plans by phone for seeded patients (email is optional/removed)
  const planByPhone = {
    '+917000100002': { planName: 'Free Plan', price: 0, billingCycle: 'monthly', status: 'active' },
    '+917000100003': { planName: 'Monthly Plan', price: 99, billingCycle: 'monthly', status: 'active' },
    '+917000100004': { planName: 'Quarterly Plan', price: 279, billingCycle: 'quarterly', status: 'active' },
    '+917000100005': { planName: 'Premium Monthly Plan', price: 299, billingCycle: 'monthly', status: 'active' },
  };

  const randomPlans = [
    { planName: 'Free Plan', price: 0, billingCycle: 'monthly', status: 'active' },
    { planName: 'Monthly Plan', price: 99, billingCycle: 'monthly', status: 'active' },
    { planName: 'Quarterly Plan', price: 279, billingCycle: 'quarterly', status: 'active' },
    { planName: 'Premium Monthly Plan', price: 299, billingCycle: 'monthly', status: 'active' },
  ];

  for (const patient of patientUsers) {
    const phone = String(patient.phone || '');
    const plan = planByPhone[phone] || randomItem(randomPlans);

    await prisma.patientSubscription.upsert({
      where: { userId: patient.id },
      update: {
        planName: plan.planName,
        price: plan.price,
        billingCycle: plan.billingCycle,
        status: plan.status,
        // For stable staging QA: prevent auto-renew logic from overriding the seeded plan.
        autoRenew: false,
        // Put renewal far in the future so `ensureSubscriptionRecord()` won't switch plans.
        renewalDate: plusDays(365),
      },
      create: {
        userId: patient.id,
        planName: plan.planName,
        price: plan.price,
        billingCycle: plan.billingCycle,
        status: plan.status,
        // For stable staging QA: prevent auto-renew logic from overriding the seeded plan.
        autoRenew: false,
        // Put renewal far in the future so `ensureSubscriptionRecord()` won't switch plans.
        renewalDate: plusDays(365),
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

  // Seed Group Therapy Sessions
  const groupTherapySessions = [
    {
      title: 'Anxiety Circle - Morning Session',
      topic: 'Anxiety Management',
      description: 'Learn evidence-based techniques to manage anxiety symptoms including breathing exercises, cognitive restructuring, and exposure therapy.',
      mode: 'PUBLIC',
      status: 'PUBLISHED',
      offset: 0, // Today
      durationMinutes: 60,
      maxMembers: 12,
      priceMinor: BigInt(0), // Free
      allowGuestJoin: true,
      requiresPayment: false,
    },
    {
      title: 'Grief & Loss Support Group',
      topic: 'Bereavement & Grief',
      description: 'A compassionate space to process loss and grief with trained facilitators and supportive peers.',
      mode: 'PUBLIC',
      status: 'PUBLISHED',
      offset: 0.2, // 12 minutes from now
      durationMinutes: 90,
      maxMembers: 10,
      priceMinor: BigInt(0), // Free
      allowGuestJoin: true,
      requiresPayment: false,
    },
    {
      title: 'Mindful Parenting Workshop',
      topic: 'Parenting & Family Wellness',
      description: 'Develop mindful parenting skills to create a more peaceful and connected family environment.',
      mode: 'PUBLIC',
      status: 'PUBLISHED',
      offset: 1.08, // 1 hour 35 minutes from now
      durationMinutes: 75,
      maxMembers: 15,
      priceMinor: BigInt(0), // Free
      allowGuestJoin: true,
      requiresPayment: false,
    },
    {
      title: 'Depression Recovery Circle',
      topic: 'Depression Management',
      description: 'Peer-led discussion group focusing on recovery strategies, medication management, and lifestyle changes for depression.',
      mode: 'PUBLIC',
      status: 'PUBLISHED',
      offset: 0.5, // 30 minutes from now
      durationMinutes: 60,
      maxMembers: 8,
      priceMinor: BigInt(0), // Free
      allowGuestJoin: true,
      requiresPayment: false,
    },
    {
      title: 'Trauma-Informed Care Workshop',
      topic: 'Trauma Recovery',
      description: 'Safe and structured environment for trauma survivors to learn healing techniques including EMDR basics and somatic experiencing.',
      mode: 'PUBLIC',
      status: 'PUBLISHED',
      offset: 2, // 2 hours from now
      durationMinutes: 90,
      maxMembers: 10,
      priceMinor: BigInt(0), // Free
      allowGuestJoin: true,
      requiresPayment: false,
    },
  ];

  const adminUser = adminsSeed[0];
  const adminObj = persistedUsers.find(u => u.role === 'ADMIN');

  for (let idx = 0; idx < groupTherapySessions.length; idx++) {
    const sessionData = groupTherapySessions[idx];
    const therapist = therapistUsers[idx % therapistUsers.length];
    if (!therapist) continue;

    const scheduledAt = new Date();
    scheduledAt.setHours(scheduledAt.getHours() + Math.floor(sessionData.offset));
    scheduledAt.setMinutes(scheduledAt.getMinutes() + (sessionData.offset % 1) * 60);

    await prisma.groupTherapySession.upsert({
      where: { id: `group-therapy-seed-${idx}` },
      update: {
        title: sessionData.title,
        status: sessionData.status,
        publishedAt: new Date(),
        approvedAt: new Date(),
        approvedById: adminObj?.id,
      },
      create: {
        id: `group-therapy-seed-${idx}`,
        title: sessionData.title,
        topic: sessionData.topic,
        description: sessionData.description,
        sessionMode: sessionData.mode,
        status: sessionData.status,
        requestedById: therapist.id,
        hostTherapistId: therapist.id,
        approvedById: adminObj?.id,
        scheduledAt,
        durationMinutes: sessionData.durationMinutes,
        maxMembers: sessionData.maxMembers,
        priceMinor: sessionData.priceMinor,
        allowGuestJoin: sessionData.allowGuestJoin,
        requiresAdminGate: false,
        requiresPayment: sessionData.requiresPayment,
        jitsiRoomName: `group-therapy-${idx}-${Date.now()}`,
        publishAt: new Date(),
        publishedAt: new Date(),
        approvedAt: new Date(),
      },
    }).catch(() => null);
  }

  // Add a few enrollments to the first session to show joined counts
  const firstSession = await prisma.groupTherapySession.findFirst({
    where: { id: 'group-therapy-seed-0' },
  });

  if (firstSession) {
    for (let i = 0; i < 5; i++) {
      const patient = patientUsers[i];
      if (!patient) continue;

      await prisma.groupTherapyEnrollment.upsert({
        where: {
          sessionId_patientUserId_guestEmail: {
            sessionId: firstSession.id,
            patientUserId: patient.id,
            guestEmail: null,
          },
        },
        update: {
          status: 'JOINED',
        },
        create: {
          sessionId: firstSession.id,
          patientUserId: patient.id,
          enrolledByAdminId: adminObj?.id,
          status: 'JOINED',
          joinedAt: new Date(),
        },
      }).catch(() => null);
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
  console.log('Patient plan test users (phone + plan):');
  console.log('  +917000100002 -> Free Plan');
  console.log('  +917000100003 -> Monthly Plan (INR 99 / month)');
  console.log('  +917000100004 -> Quarterly Plan (INR 279 / quarter)');
  console.log('  +917000100005 -> Premium Monthly Plan (INR 299 / month)');
}

seed()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
