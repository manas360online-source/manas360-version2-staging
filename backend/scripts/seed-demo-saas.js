const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('Seed script starting...');

const DEMO_PASSWORD = 'Manas@123';

async function upsertUser({ email, role, firstName, lastName }, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      failedLoginAttempts: 0,
      lockUntil: null,
      isDeleted: false,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
    },
    create: {
      email,
      passwordHash,
      role,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
    },
    select: { id: true, email: true, role: true },
  });
}

async function ensurePatientProfile(userId) {
  return prisma.patientProfile.upsert({
    where: { userId },
    update: {
      isDeleted: false,
      deletedAt: null,
      emergencyContact: {
        name: 'Emergency Contact',
        relation: 'Sibling',
        phone: '+919999999999',
        carrier: 'Airtel',
      },
    },
    create: {
      userId,
      age: 28,
      gender: 'female',
      medicalHistory: 'No major medical history reported.',
      emergencyContact: {
        name: 'Emergency Contact',
        relation: 'Sibling',
        phone: '+919999999999',
        carrier: 'Airtel',
      },
    },
    select: { id: true, userId: true },
  });
}

async function ensureTherapistProfile(userId, firstName, lastName) {
  return prisma.therapistProfile.upsert({
    where: { userId },
    update: {
      displayName: `${firstName} ${lastName}`,
      bio: 'Demo therapist profile for local SaaS smoke testing.',
      specializations: ['Anxiety', 'CBT'],
      languages: ['English', 'Hindi'],
      yearsOfExperience: 5,
      consultationFee: 1500,
      availability: ['Mon-Fri 10:00-18:00'],
    },
    create: {
      userId,
      displayName: `${firstName} ${lastName}`,
      bio: 'Demo therapist profile for local SaaS smoke testing.',
      specializations: ['Anxiety', 'CBT'],
      languages: ['English', 'Hindi'],
      yearsOfExperience: 5,
      consultationFee: 1500,
      availability: ['Mon-Fri 10:00-18:00'],
    },
  });
}

async function ensureCareTeam(patientUserId, providerUserId) {
  await prisma.careTeamAssignment.upsert({
    where: {
      patientId_providerId: {
        patientId: patientUserId,
        providerId: providerUserId,
      },
    },
    update: {
      status: 'ACTIVE',
      accessScope: {
        role: 'therapist',
        permissions: ['read_patient', 'write_assessment', 'write_plan'],
      },
    },
    create: {
      patientId: patientUserId,
      providerId: providerUserId,
      assignedById: null,
      status: 'ACTIVE',
      accessScope: {
        role: 'therapist',
        permissions: ['read_patient', 'write_assessment', 'write_plan'],
      },
    },
  }).catch(() => null);
}

async function ensureBaselineAssessment(patientProfileId) {
  const latest = await prisma.patientAssessment.findFirst({
    where: { patientId: patientProfileId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (latest) return latest;

  return prisma.patientAssessment.create({
    data: {
      patientId: patientProfileId,
      type: 'PHQ-9',
      answers: [1, 2, 2, 1, 1, 2, 1, 1, 1],
      totalScore: 12,
      severityLevel: 'Moderate',
    },
    select: { id: true },
  });
}

async function ensureSubscription(userId) {
  return prisma.patientSubscription.upsert({
    where: { userId },
    update: {
      planName: 'Premium Plan',
      price: 2499,
      billingCycle: 'monthly',
      status: 'active',
      autoRenew: true,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId,
      planName: 'Premium Plan',
      price: 2499,
      billingCycle: 'monthly',
      status: 'active',
      autoRenew: true,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  }).catch(() => null);
}

async function run() {
  console.log('Starting seed script...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  console.log('Password hashed');

  console.log('Creating patient user...');
  const patient = await upsertUser(
    { email: 'patient@manas360.local', role: 'PATIENT', firstName: 'Priya', lastName: 'Kumar' },
    passwordHash,
  );
  console.log('Patient created:', patient);

  console.log('Creating admin user...');
  const admin = await upsertUser(
    { email: 'admin@manas360.local', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
    passwordHash,
  );
  console.log('Admin created:', admin);

  console.log('Creating therapist user...');
  const therapist = await upsertUser(
    { email: 'therapist@manas360.local', role: 'THERAPIST', firstName: 'Rohan', lastName: 'Sharma' },
    passwordHash,
  );
  console.log('Therapist created:', therapist);

  const patientProfile = await ensurePatientProfile(patient.id);
  await ensureTherapistProfile(therapist.id, 'Rohan', 'Sharma');
  await ensureCareTeam(patient.id, therapist.id);
  await ensureBaselineAssessment(patientProfile.id);
  await ensureSubscription(patient.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        credentials: {
          patient: { email: 'patient@manas360.local', password: DEMO_PASSWORD },
          therapist: { email: 'therapist@manas360.local', password: DEMO_PASSWORD },
          admin: { email: 'admin@manas360.local', password: DEMO_PASSWORD },
        },
        notes: [
          'Deterministic SaaS demo state ensured.',
          'Patient has profile + baseline PHQ-9 assessment + active subscription.',
          'Therapist profile and care-team assignment ensured for provider connection flow.',
        ],
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
