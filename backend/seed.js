const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const patientSeeds = [
  { email: 'patient1@manas360.local', firstName: 'Priya', lastName: 'Kumar' },
  { email: 'patient2@manas360.local', firstName: 'Asha', lastName: 'Nair' },
  { email: 'patient3@manas360.local', firstName: 'Rohan', lastName: 'Mehta' },
];

const therapistSeeds = [
  { email: 'therapist1@manas360.local', firstName: 'Anita', lastName: 'Sharma' },
  { email: 'therapist2@manas360.local', firstName: 'Vikram', lastName: 'Rao' },
];

const psychiatristSeeds = [
  { email: 'psychiatrist1@manas360.local', firstName: 'Meera', lastName: 'Kapoor' },
  { email: 'psychiatrist2@manas360.local', firstName: 'Arjun', lastName: 'Menon' },
];

const plusDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const createPatientTablesIfMissing = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "patient_subscriptions" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "planName" TEXT NOT NULL,
      "price" INTEGER NOT NULL,
      "billingCycle" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "autoRenew" BOOLEAN NOT NULL DEFAULT true,
      "renewalDate" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "patient_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "patient_payment_methods" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "cardLast4" TEXT NOT NULL,
      "cardBrand" TEXT NOT NULL,
      "expiryMonth" INTEGER NOT NULL,
      "expiryYear" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "patient_payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "patient_invoices" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "status" TEXT NOT NULL,
      "invoiceUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "patient_invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "patient_exercises" (
      "id" TEXT PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "assignedBy" TEXT NOT NULL,
      "duration" INTEGER NOT NULL,
      "status" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "patient_exercises_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "patient_progress" (
      "id" TEXT PRIMARY KEY,
      "patientId" TEXT NOT NULL UNIQUE,
      "sessionsCompleted" INTEGER NOT NULL DEFAULT 0,
      "totalSessions" INTEGER NOT NULL DEFAULT 0,
      "exercisesCompleted" INTEGER NOT NULL DEFAULT 0,
      "totalExercises" INTEGER NOT NULL DEFAULT 0,
      "phqStart" INTEGER,
      "phqCurrent" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "patient_progress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
};

async function upsertUser({ email, firstName, lastName, role }, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      provider: 'LOCAL',
      emailVerified: true,
      failedLoginAttempts: 0,
      lockUntil: null,
      isDeleted: false,
      passwordHash,
    },
    create: {
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      provider: 'LOCAL',
      emailVerified: true,
      passwordHash,
    },
  });
}

async function seed() {
  await createPatientTablesIfMissing();

  const passwordHash = await bcrypt.hash('Manas@123', 12);

  const therapists = [];
  for (const therapistSeed of therapistSeeds) {
    const therapist = await upsertUser({ ...therapistSeed, role: 'THERAPIST' }, passwordHash);
    therapists.push(therapist);
  }

  const psychiatrists = [];
  for (const psychiatristSeed of psychiatristSeeds) {
    const psychiatrist = await upsertUser({ ...psychiatristSeed, role: 'PSYCHIATRIST' }, passwordHash);
    psychiatrists.push(psychiatrist);
  }

  // Ensure therapist profiles exist
  for (const therapist of therapists) {
    const displayName = `${therapist.firstName} ${therapist.lastName}`.trim();
    await prisma.therapistProfile.upsert({
      where: { userId: therapist.id },
      update: {
        displayName,
        bio: null,
        specializations: [],
        languages: [],
        yearsOfExperience: 0,
        consultationFee: 0,
        availability: [],
      },
      create: {
        userId: therapist.id,
        displayName,
        bio: null,
        specializations: [],
        languages: [],
        yearsOfExperience: 0,
        consultationFee: 0,
        availability: [],
      },
    }).catch(() => null);
  }

  const patients = [];
  for (const patientSeed of patientSeeds) {
    const patient = await upsertUser({ ...patientSeed, role: 'PATIENT' }, passwordHash);
    patients.push(patient);
  }

  const patientProfiles = [];
  for (const patient of patients) {
    const profile = await prisma.patientProfile.upsert({
      where: { userId: patient.id },
      update: {
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        userId: patient.id,
        age: 28,
        gender: 'female',
        medicalHistory: 'No major medical history reported.',
        emergencyContact: {
          name: 'Emergency Contact',
          relationship: 'Sibling',
          phone: '+919999999999',
        },
      },
    });
    patientProfiles.push(profile);
  }

  for (let index = 0; index < patientProfiles.length; index += 1) {
    const patientProfile = patientProfiles[index];
    const patientUser = patients[index];
    const therapist = therapists[index % therapists.length];

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const moodDate = plusDays(-dayOffset);
      const moodScore = Math.max(1, 5 - (dayOffset % 3));
      await prisma.patientMoodEntry.create({
        data: {
          patientId: patientProfile.id,
          moodScore,
          note: dayOffset % 2 === 0 ? 'Felt calmer after breathing exercise.' : null,
          date: moodDate,
        },
      }).catch(() => null);
    }

    for (let sessionIndex = 0; sessionIndex < 4; sessionIndex += 1) {
      const date = sessionIndex < 2 ? plusDays(-(sessionIndex + 1)) : plusDays(sessionIndex + 1);
      const status = sessionIndex < 2 ? 'COMPLETED' : 'CONFIRMED';
      await prisma.therapySession.create({
        data: {
          id: randomUUID(),
          bookingReferenceId: `BK-SEED-${index + 1}-${sessionIndex + 1}-${Date.now()}`,
          patientProfileId: patientProfile.id,
          therapistProfileId: therapist.id,
          dateTime: date,
          durationMinutes: 50,
          sessionFeeMinor: BigInt(249900),
          paymentStatus: 'PAID',
          status,
        },
      }).catch(() => null);
    }

    const subscriptionStatus = index === 1 ? 'cancelled' : 'active';
    await prisma.$executeRawUnsafe(
      `INSERT INTO "patient_subscriptions" ("id","userId","planName","price","billingCycle","status","autoRenew","renewalDate","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
       ON CONFLICT ("userId") DO UPDATE
       SET "planName"=EXCLUDED."planName","price"=EXCLUDED."price","billingCycle"=EXCLUDED."billingCycle","status"=EXCLUDED."status","autoRenew"=EXCLUDED."autoRenew","renewalDate"=EXCLUDED."renewalDate","updatedAt"=NOW();`,
      randomUUID(),
      patientUser.id,
      index === 2 ? 'Pro Plan' : 'Premium Plan',
      index === 2 ? 4999 : 2499,
      index === 2 ? 'yearly' : 'monthly',
      subscriptionStatus,
      subscriptionStatus === 'active',
      plusDays(30),
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO "patient_payment_methods" ("id","userId","cardLast4","cardBrand","expiryMonth","expiryYear","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT ("userId") DO UPDATE
       SET "cardLast4"=EXCLUDED."cardLast4","cardBrand"=EXCLUDED."cardBrand","expiryMonth"=EXCLUDED."expiryMonth","expiryYear"=EXCLUDED."expiryYear","updatedAt"=NOW();`,
      randomUUID(),
      patientUser.id,
      `${4800 + index}`,
      index % 2 === 0 ? 'Visa' : 'Mastercard',
      10,
      2028,
    );

    for (let invoiceIndex = 0; invoiceIndex < 3; invoiceIndex += 1) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "patient_invoices" ("id","userId","amount","status","invoiceUrl","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT ("id") DO NOTHING;`,
        randomUUID(),
        patientUser.id,
        2499,
        'paid',
        `https://cdn.manas360.local/invoices/${patientUser.id}/${invoiceIndex + 1}.pdf`,
        plusDays(-(invoiceIndex + 1) * 30),
      );
    }

    // NOTE: assignedBy is currently mock therapist reference.
    // Replace with real therapist relation once therapist module is built.
    const exerciseRows = [
      { title: '5-minute grounding breath', duration: 5, status: 'PENDING' },
      { title: 'Thought reframing journal', duration: 10, status: 'COMPLETED' },
      { title: 'Body scan relaxation', duration: 12, status: 'PENDING' },
    ];

    for (const row of exerciseRows) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "patient_exercises" ("id","patientId","title","assignedBy","duration","status","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
         ON CONFLICT ("id") DO NOTHING;`,
        randomUUID(),
        patientProfile.id,
        row.title,
        therapist.id,
        row.duration,
        row.status,
      );
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "patient_progress" ("id","patientId","sessionsCompleted","totalSessions","exercisesCompleted","totalExercises","phqStart","phqCurrent","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
       ON CONFLICT ("patientId") DO UPDATE
       SET "sessionsCompleted"=EXCLUDED."sessionsCompleted","totalSessions"=EXCLUDED."totalSessions","exercisesCompleted"=EXCLUDED."exercisesCompleted","totalExercises"=EXCLUDED."totalExercises","phqStart"=EXCLUDED."phqStart","phqCurrent"=EXCLUDED."phqCurrent","updatedAt"=NOW();`,
      randomUUID(),
      patientProfile.id,
      2,
      4,
      1,
      3,
      14,
      8,
    );
  }

  // Seed a corporate member user for local testing (can login with email+password)
  const corporateSeeds = [
    { email: 'corp.user@manas360.local', firstName: 'Corporate', lastName: 'Member' },
  ];

  const corporatePassword = 'Corporate@123';
  const corporatePasswordHash = await bcrypt.hash(corporatePassword, 12);
  const corporateUsers = [];
  for (const cSeed of corporateSeeds) {
    const corpUser = await upsertUser({ ...cSeed, role: 'PATIENT' }, corporatePasswordHash);

    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS company_key text;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS is_company_admin boolean DEFAULT false;`);
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET company_key = $2, is_company_admin = false WHERE id = $1`,
      corpUser.id,
      'techcorp-india',
    );

    corporateUsers.push(corpUser);
  }

  console.log(JSON.stringify({
    ok: true,
    patients: patients.map((u) => ({ id: u.id, email: u.email })),
    therapists: therapists.map((u) => ({ id: u.id, email: u.email })),
    psychiatrists: psychiatrists.map((u) => ({ id: u.id, email: u.email })),
    corporateUsers: corporateUsers.map((u) => ({ id: u.id, email: u.email })),
    credentials: {
      defaultUserPassword: 'Manas@123',
      psychiatristUsers: psychiatrists.map((u) => ({ email: u.email, password: 'Manas@123' })),
      corporateUser: {
        email: corporateUsers.length ? corporateUsers[0].email : 'corp.user@manas360.local',
        password: corporatePassword,
      },
    },
  }, null, 2));
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
