#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PROVIDER = {
  phone: '+919900000201',
  email: 'provider.test@manas360.local',
  firstName: 'Test',
  lastName: 'Provider',
  displayName: 'Dr Test Provider',
  password: 'Test@12345',
};

const PATIENTS = [
  {
    phone: '+919900000301',
    email: 'patient.one@manas360.local',
    firstName: 'Patient',
    lastName: 'One',
    age: 26,
    gender: 'female',
  },
  {
    phone: '+919900000302',
    email: 'patient.two@manas360.local',
    firstName: 'Patient',
    lastName: 'Two',
    age: 33,
    gender: 'male',
  },
  {
    phone: '+919900000303',
    email: 'patient.three@manas360.local',
    firstName: 'Patient',
    lastName: 'Three',
    age: 29,
    gender: 'non-binary',
  },
];

const buildProviderAvailability = () => {
  const slots = [];
  // Mon-Fri, 10:00-18:00
  for (let day = 1; day <= 5; day += 1) {
    slots.push({ dayOfWeek: day, startMinute: 600, endMinute: 1080, isAvailable: true });
  }
  return slots;
};

async function upsertUser({ phone, email, firstName, lastName, role, providerType, passwordHash }) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ phone }, { email }],
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        phone,
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        role,
        providerType,
        status: 'ACTIVE',
        provider: 'PHONE',
        phoneVerified: true,
        emailVerified: true,
        isDeleted: false,
        passwordHash,
      },
    });
  }

  return prisma.user.create({
    data: {
      phone,
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      providerType,
      status: 'ACTIVE',
      provider: 'PHONE',
      phoneVerified: true,
      emailVerified: true,
      isDeleted: false,
      passwordHash,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PROVIDER.password, 12);
  const now = new Date();
  const providerExpiry = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const patientRenewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const providerUser = await upsertUser({
    phone: PROVIDER.phone,
    email: PROVIDER.email,
    firstName: PROVIDER.firstName,
    lastName: PROVIDER.lastName,
    role: 'THERAPIST',
    providerType: 'THERAPIST',
    passwordHash,
  });

  await prisma.therapistProfile.upsert({
    where: { userId: providerUser.id },
    update: {
      displayName: PROVIDER.displayName,
      bio: 'Seeded provider for local QA and integration testing.',
      specializations: ['anxiety', 'stress', 'relationships'],
      languages: ['English', 'Hindi'],
      yearsOfExperience: 7,
      consultationFee: 120000,
      availability: buildProviderAvailability(),
      isVerified: true,
      onboardingCompleted: true,
      certifications: ['THERAPIST', 'COUNSELOR'],
      averageRating: 4.8,
    },
    create: {
      userId: providerUser.id,
      displayName: PROVIDER.displayName,
      bio: 'Seeded provider for local QA and integration testing.',
      specializations: ['anxiety', 'stress', 'relationships'],
      languages: ['English', 'Hindi'],
      yearsOfExperience: 7,
      consultationFee: 120000,
      availability: buildProviderAvailability(),
      isVerified: true,
      onboardingCompleted: true,
      certifications: ['THERAPIST', 'COUNSELOR'],
      averageRating: 4.8,
    },
  });

  await prisma.providerSubscription.upsert({
    where: { providerId: providerUser.id },
    update: {
      plan: 'standard',
      price: 2999,
      leadsPerWeek: 100,
      status: 'active',
      autoRenew: true,
      billingCycle: 'monthly',
      expiryDate: providerExpiry,
      weekStartsAt: now,
      processing: false,
    },
    create: {
      providerId: providerUser.id,
      plan: 'standard',
      price: 2999,
      leadsPerWeek: 100,
      status: 'active',
      autoRenew: true,
      billingCycle: 'monthly',
      expiryDate: providerExpiry,
      weekStartsAt: now,
      processing: false,
    },
  });

  const patientProfiles = [];
  for (const patient of PATIENTS) {
    const user = await upsertUser({
      phone: patient.phone,
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      role: 'PATIENT',
      providerType: null,
      passwordHash: null,
    });

    const profile = await prisma.patientProfile.upsert({
      where: { userId: user.id },
      update: {
        age: patient.age,
        gender: patient.gender,
        medicalHistory: 'Seeded QA profile.',
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '+919899999999',
          relationship: 'Family',
        },
      },
      create: {
        userId: user.id,
        age: patient.age,
        gender: patient.gender,
        medicalHistory: 'Seeded QA profile.',
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '+919899999999',
          relationship: 'Family',
        },
      },
    });

    await prisma.patientSubscription.upsert({
      where: { userId: user.id },
      update: {
        price: 999,
        status: 'active',
        autoRenew: true,
        billingCycle: 'monthly',
        planName: 'standard',
        renewalDate: patientRenewal,
        processing: false,
      },
      create: {
        userId: user.id,
        price: 999,
        status: 'active',
        autoRenew: true,
        billingCycle: 'monthly',
        planName: 'standard',
        renewalDate: patientRenewal,
        processing: false,
      },
    });

    await prisma.pHQ9Assessment.deleteMany({ where: { userId: user.id } });
    await prisma.gAD7Assessment.deleteMany({ where: { userId: user.id } });

    await prisma.pHQ9Assessment.create({
      data: {
        userId: user.id,
        answers: [1, 1, 1, 1, 1, 0, 1, 0, 0],
        totalScore: 6,
        q9Score: 0,
        severity: 'MILD',
        riskWeight: 0.35,
        q9CrisisFlag: false,
      },
    });

    await prisma.gAD7Assessment.create({
      data: {
        userId: user.id,
        answers: [1, 1, 1, 1, 0, 0, 0],
        totalScore: 4,
        severity: 'MILD',
        riskWeight: 0.3,
      },
    });

    patientProfiles.push({ user, profile });
  }

  const oneDay = 24 * 60 * 60 * 1000;

  const sessionPayloads = [
    {
      bookingReferenceId: 'TEST-SESS-001',
      patientProfileId: patientProfiles[0].profile.id,
      dateTime: new Date(now.getTime() + oneDay),
      status: 'CONFIRMED',
      durationMinutes: 50,
      sessionFeeMinor: BigInt(69900),
      paymentStatus: 'PAID',
      isLocked: false,
    },
    {
      bookingReferenceId: 'TEST-SESS-002',
      patientProfileId: patientProfiles[1].profile.id,
      dateTime: new Date(now.getTime() - oneDay * 2),
      status: 'COMPLETED',
      durationMinutes: 45,
      sessionFeeMinor: BigInt(99900),
      paymentStatus: 'PAID',
      isLocked: false,
    },
    {
      bookingReferenceId: 'TEST-SESS-003',
      patientProfileId: patientProfiles[2].profile.id,
      dateTime: new Date(now.getTime() + oneDay * 3),
      status: 'PENDING',
      durationMinutes: 50,
      sessionFeeMinor: BigInt(79900),
      paymentStatus: 'UNPAID',
      isLocked: true,
    },
  ];

  for (const payload of sessionPayloads) {
    await prisma.therapySession.upsert({
      where: { bookingReferenceId: payload.bookingReferenceId },
      update: {
        patientProfileId: payload.patientProfileId,
        therapistProfileId: providerUser.id,
        dateTime: payload.dateTime,
        status: payload.status,
        durationMinutes: payload.durationMinutes,
        sessionFeeMinor: payload.sessionFeeMinor,
        paymentStatus: payload.paymentStatus,
        isLocked: payload.isLocked,
      },
      create: {
        bookingReferenceId: payload.bookingReferenceId,
        patientProfileId: payload.patientProfileId,
        therapistProfileId: providerUser.id,
        dateTime: payload.dateTime,
        status: payload.status,
        durationMinutes: payload.durationMinutes,
        sessionFeeMinor: payload.sessionFeeMinor,
        paymentStatus: payload.paymentStatus,
        isLocked: payload.isLocked,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Provider test login:');
  console.log(`  phone: ${PROVIDER.phone}`);
  console.log(`  email: ${PROVIDER.email}`);
  console.log(`  password (email login only): ${PROVIDER.password}`);
  console.log('Patients for OTP login:');
  for (const patient of PATIENTS) {
    console.log(`  ${patient.phone} (${patient.email})`);
  }
  console.log('Created/updated sessions: TEST-SESS-001, TEST-SESS-002, TEST-SESS-003');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
