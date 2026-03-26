const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensurePatientProfile(userId) {
  return prisma.patientProfile.upsert({
    where: { userId },
    update: {
      isDeleted: false,
      deletedAt: null,
    },
    create: {
      userId,
      age: 28,
      gender: 'female',
      medicalHistory: 'No major medical history reported.',
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Sibling',
        phone: '+919999999999',
      },
    },
    select: { id: true, userId: true },
  });
}

async function run() {
  // Patient will use phone+OTP; admin remains email+password
  const patientEmail = null;
  const patientPhone = '+917000100111';
  const adminEmail = 'admin@manas360.local';
  const adminPhone = '+917000600111';
  const password = 'Manas@123';
  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert patient by phone (phone-first); do not set a password for phone-based accounts
  const patient = await prisma.user.upsert({
    where: { phone: patientPhone },
    update: {
      phone: patientPhone,
      role: 'PATIENT',
      provider: 'LOCAL',
      emailVerified: false,
      phoneVerified: true,
      failedLoginAttempts: 0,
      lockUntil: null,
      isDeleted: false,
      firstName: 'Priya',
      lastName: 'Kumar',
      name: 'Priya Kumar',
    },
    create: {
      email: null,
      phone: patientPhone,
      role: 'PATIENT',
      provider: 'LOCAL',
      emailVerified: false,
      phoneVerified: true,
      firstName: 'Priya',
      lastName: 'Kumar',
      name: 'Priya Kumar',
    },
    select: { id: true, email: true, phone: true, role: true, emailVerified: true },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      phone: adminPhone,
      role: 'ADMIN',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: true,
      failedLoginAttempts: 0,
      lockUntil: null,
      isDeleted: false,
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
    },
    create: {
      email: adminEmail,
      phone: adminPhone,
      passwordHash,
      role: 'ADMIN',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: true,
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
    },
    select: { id: true, email: true, phone: true, role: true, emailVerified: true },
  });

  const patientProfile = await ensurePatientProfile(patient.id);

  const existing = await prisma.user.findUnique({
    where: { email: 'chandu3548@gmail.com' },
    select: { id: true, role: true },
  });

  let existingPatientProfile = null;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        emailVerified: true,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    if (String(existing.role) === 'PATIENT') {
      existingPatientProfile = await ensurePatientProfile(existing.id);
    }
  }

  return {
    ok: true,
    patient,
    patientProfile,
    admin,
    updatedExistingPatient: Boolean(existing),
    existingPatientProfileCreatedOrUpdated: Boolean(existingPatientProfile),
    credentials: {
      patient: { phone: patientPhone, loginMethod: 'PHONE_OTP' },
      admin: { email: adminEmail, password, loginMethod: 'EMAIL_PASSWORD' },
    },
  };
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
