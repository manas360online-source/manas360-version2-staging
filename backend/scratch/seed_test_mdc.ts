import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clinicId = 'test-mdc-clinic-id';
  const clinicCode = 'MDC-TEST-001';

  console.log('--- Seeding Test MDC Clinic ---');

  // 1. Create Clinic with Active Trial
  const clinic = await prisma.clinic.upsert({
    where: { id: clinicId },
    update: { subscriptionStatus: 'trial' },
    create: {
      id: clinicId,
      clinicCode,
      name: 'Test Digital Clinic',
      phone: '+919999999999',
      email: 'test@clinic.com',
      ownerName: 'Test Admin',
      ownerPhone: '+919999999999',
      ownerEmail: 'test@clinic.com',
      tier: 'solo',
      subscriptionStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      maxTherapists: 1,
      maxPatients: 50,
    }
  });

  // 2. Create Active Subscription for trial
  await prisma.clinicSubscription.upsert({
    where: { id: 'test-mdc-sub-id' },
    update: { status: 'trial' },
    create: {
      id: 'test-mdc-sub-id',
      clinicId,
      clinicTier: 'solo',
      billingCycle: 'monthly',
      monthlyTotal: 499,
      billingAmount: 499,
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      selectedFeatures: ['patient-database', 'session-notes', 'scheduling', 'jitsi-session'],
    }
  });

  // 3. Create Admin User
  const admin = await prisma.clinicUser.upsert({
    where: { loginCode: `${clinicCode}-ADMIN` },
    update: {},
    create: {
      clinicId,
      fullName: 'Test Admin',
      role: 'admin',
      loginSuffix: 'ADMIN',
      loginCode: `${clinicCode}-ADMIN`,
      phone: '+919999999999',
      verificationStatus: 'verified',
    }
  });

  // 4. Create Provider User
  const provider = await prisma.clinicUser.upsert({
    where: { loginCode: `${clinicCode}-P1` },
    update: {},
    create: {
      clinicId,
      fullName: 'Dr. Rahul (Provider)',
      role: 'therapist',
      loginSuffix: 'P1',
      loginCode: `${clinicCode}-P1`,
      phone: '+918888888888',
      verificationStatus: 'verified',
    }
  });

  // 5. Create Patient User
  const patient = await prisma.clinicPatient.upsert({
    where: { id: 'test-mdc-patient-id' },
    update: {},
    create: {
      id: 'test-mdc-patient-id',
      clinicId,
      fullName: 'John Doe (Patient)',
      loginSuffix: 'PT1',
      loginCode: `${clinicCode}-PT1`,
      phone: '+917777777777',
      assignedTherapistId: provider.id,
      verificationStatus: 'verified',
    }
  });

  console.log('\n--- Test Credentials ---');
  console.log(`Admin Login: ${admin.loginCode} (Phone: ${admin.phone})`);
  console.log(`Provider Login: ${provider.loginCode} (Phone: ${provider.phone})`);
  console.log(`Patient Login: ${patient.loginCode} (Phone: ${patient.phone})`);
  console.log('------------------------\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
