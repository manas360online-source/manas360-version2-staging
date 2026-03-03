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
  const patientEmail = 'patient@manas360.local';
  const adminEmail = 'admin@manas360.local';
  const password = 'Manas@123';
  const passwordHash = await bcrypt.hash(password, 12);

  const patient = await prisma.user.upsert({
    where: { email: patientEmail },
    update: {
      passwordHash,
      role: 'PATIENT',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      failedLoginAttempts: 0,
      lockUntil: null,
      isDeleted: false,
      firstName: 'Priya',
      lastName: 'Kumar',
      name: 'Priya Kumar',
    },
    create: {
      email: patientEmail,
      passwordHash,
      role: 'PATIENT',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      firstName: 'Priya',
      lastName: 'Kumar',
      name: 'Priya Kumar',
    },
    select: { id: true, email: true, role: true, emailVerified: true },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: 'ADMIN',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      failedLoginAttempts: 0,
      lockUntil: null,
      isDeleted: false,
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
    },
    select: { id: true, email: true, role: true, emailVerified: true },
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
      patient: { email: patientEmail, password },
      admin: { email: adminEmail, password },
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
