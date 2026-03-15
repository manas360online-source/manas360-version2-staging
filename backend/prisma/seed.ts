import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  BookingStatus,
  OnboardingStatus,
  PlanActivityFrequency,
  PlanActivityType,
  ProviderDocumentType,
  PrismaClient,
  ProviderType,
  RegistrationType,
  UserProvider,
  UserRole,
  UserStatus,
} from '@prisma/client';

type SeedUser = {
  firstName: string;
  lastName: string;
  email: string;
};

type AssignmentMap = Map<
  string,
  {
    therapist: string;
    coach: string;
    psychologist: string;
    psychiatrist: string;
  }
>;

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Manas@123';
const EMAIL_DOMAIN = process.env.SEED_EMAIL_DOMAIN || 'manas360.com';
const NOW = new Date();

const patientSeeds: SeedUser[] = [
  { firstName: 'Test', lastName: 'Patient Alpha', email: `test.patient.alpha@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Beta', email: `test.patient.beta@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Gamma', email: `test.patient.gamma@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Delta', email: `test.patient.delta@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Epsilon', email: `test.patient.epsilon@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Zeta', email: `test.patient.zeta@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Eta', email: `test.patient.eta@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Theta', email: `test.patient.theta@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Iota', email: `test.patient.iota@${EMAIL_DOMAIN}` },
  { firstName: 'Test', lastName: 'Patient Kappa', email: `test.patient.kappa@${EMAIL_DOMAIN}` },
];

const therapistSeeds: SeedUser[] = [
  { firstName: 'Aarav', lastName: 'Sharma', email: `dr.aarav.sharma.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Maya', lastName: 'Menon', email: `dr.maya.menon.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Rhea', lastName: 'Kapoor', email: `dr.rhea.kapoor.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Nikhil', lastName: 'Verma', email: `dr.nikhil.verma.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Anika', lastName: 'Joshi', email: `dr.anika.joshi.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Dev', lastName: 'Iyer', email: `dr.dev.iyer.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Priya', lastName: 'Rao', email: `dr.priya.rao.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Rahul', lastName: 'Dutta', email: `dr.rahul.dutta.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Isha', lastName: 'Gupta', email: `dr.isha.gupta.therapist@${EMAIL_DOMAIN}` },
  { firstName: 'Kabir', lastName: 'Seth', email: `dr.kabir.seth.therapist@${EMAIL_DOMAIN}` },
];

const coachSeeds: SeedUser[] = [
  { firstName: 'Neha', lastName: 'Bedi', email: `coach.neha.bedi@${EMAIL_DOMAIN}` },
  { firstName: 'Arjun', lastName: 'Nair', email: `coach.arjun.nair@${EMAIL_DOMAIN}` },
  { firstName: 'Sneha', lastName: 'Pillai', email: `coach.sneha.pillai@${EMAIL_DOMAIN}` },
  { firstName: 'Varun', lastName: 'Khatri', email: `coach.varun.khatri@${EMAIL_DOMAIN}` },
  { firstName: 'Meera', lastName: 'Saini', email: `coach.meera.saini@${EMAIL_DOMAIN}` },
  { firstName: 'Tara', lastName: 'Mishra', email: `coach.tara.mishra@${EMAIL_DOMAIN}` },
  { firstName: 'Vikram', lastName: 'Arora', email: `coach.vikram.arora@${EMAIL_DOMAIN}` },
  { firstName: 'Leena', lastName: 'Bose', email: `coach.leena.bose@${EMAIL_DOMAIN}` },
  { firstName: 'Karan', lastName: 'Gill', email: `coach.karan.gill@${EMAIL_DOMAIN}` },
  { firstName: 'Ritu', lastName: 'Chawla', email: `coach.ritu.chawla@${EMAIL_DOMAIN}` },
];

const psychologistSeeds: SeedUser[] = [
  { firstName: 'Amelia', lastName: 'Smith', email: `dr.amelia.smith.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Noah', lastName: 'Brown', email: `dr.noah.brown.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Olivia', lastName: 'Taylor', email: `dr.olivia.taylor.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Liam', lastName: 'Clark', email: `dr.liam.clark.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Sophia', lastName: 'Wilson', email: `dr.sophia.wilson.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Ethan', lastName: 'Martin', email: `dr.ethan.martin.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Ava', lastName: 'Walker', email: `dr.ava.walker.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Mason', lastName: 'Young', email: `dr.mason.young.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Mia', lastName: 'Hall', email: `dr.mia.hall.psychologist@${EMAIL_DOMAIN}` },
  { firstName: 'Lucas', lastName: 'Allen', email: `dr.lucas.allen.psychologist@${EMAIL_DOMAIN}` },
];

const psychiatristSeeds: SeedUser[] = [
  { firstName: 'Elena', lastName: 'Reed', email: `dr.elena.reed.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Daniel', lastName: 'King', email: `dr.daniel.king.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Grace', lastName: 'Scott', email: `dr.grace.scott.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Henry', lastName: 'Green', email: `dr.henry.green.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Nora', lastName: 'Baker', email: `dr.nora.baker.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Owen', lastName: 'Adams', email: `dr.owen.adams.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Chloe', lastName: 'Nelson', email: `dr.chloe.nelson.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Logan', lastName: 'Carter', email: `dr.logan.carter.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'Ella', lastName: 'Mitchell', email: `dr.ella.mitchell.psychiatrist@${EMAIL_DOMAIN}` },
  { firstName: 'James', lastName: 'Perez', email: `dr.james.perez.psychiatrist@${EMAIL_DOMAIN}` },
];

const providerTypeByRole: Partial<Record<UserRole, ProviderType>> = {
  [UserRole.COACH]: ProviderType.COACH,
  [UserRole.THERAPIST]: ProviderType.THERAPIST,
  [UserRole.PSYCHOLOGIST]: ProviderType.PSYCHOLOGIST,
  [UserRole.PSYCHIATRIST]: ProviderType.PSYCHIATRIST,
};

const providerRoleList: UserRole[] = [
  UserRole.COACH,
  UserRole.THERAPIST,
  UserRole.PSYCHOLOGIST,
  UserRole.PSYCHIATRIST,
];

const specialtiesByRole: Record<UserRole, string[]> = {
  [UserRole.COACH]: ['habit-building', 'stress management', 'sleep hygiene'],
  [UserRole.THERAPIST]: ['cbt', 'anxiety care', 'trauma-informed therapy'],
  [UserRole.PSYCHOLOGIST]: ['clinical assessment', 'behavioral therapy', 'diagnostic planning'],
  [UserRole.PSYCHIATRIST]: ['medication management', 'acute care', 'mood disorders'],
  [UserRole.PATIENT]: [],
  [UserRole.ADMIN]: [],
  [UserRole.SUPER_ADMIN]: [],
};

const languagePools = [
  ['English', 'Hindi'],
  ['English', 'Tamil'],
  ['English', 'Kannada'],
  ['English', 'Bengali'],
  ['English', 'Marathi'],
];

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const ageFor = (index: number): number => 23 + (index % 16);

const displayName = (firstName: string, lastName: string): string => `${firstName} ${lastName}`.trim();

const userPayload = (seed: SeedUser, role: UserRole, passwordHash: string) => {
  const providerType = providerTypeByRole[role] ?? null;
  const isProvider = Boolean(providerType);
  const fullName = displayName(seed.firstName, seed.lastName);

  return {
    name: fullName,
    firstName: seed.firstName,
    lastName: seed.lastName,
    role,
    providerType,
    status: UserStatus.ACTIVE,
    provider: UserProvider.LOCAL,
    passwordHash,
    emailVerified: true,
    phoneVerified: false,
    isTherapistVerified: isProvider,
    therapistVerifiedAt: isProvider ? NOW : null,
    onboardingStatus: isProvider ? OnboardingStatus.COMPLETED : null,
    failedLoginAttempts: 0,
    lockUntil: null,
    isDeleted: false,
    deletedAt: null,
  };
};

const upsertRoleUsers = async (role: UserRole, seeds: SeedUser[], passwordHash: string) => {
  const users = [];
  for (let i = 0; i < seeds.length; i += 1) {
    const seed = seeds[i];
    const payload = userPayload(seed, role, passwordHash);
    const user = await prisma.user.upsert({
      where: { email: seed.email.toLowerCase() },
      update: payload,
      create: {
        email: seed.email.toLowerCase(),
        ...payload,
      },
    });

    users.push(user);
  }

  return users;
};

const ensurePatientProfiles = async (patientUsers: Array<{ id: string }>) => {
  for (let i = 0; i < patientUsers.length; i += 1) {
    const patient = patientUsers[i];
    await prisma.patientProfile.upsert({
      where: { userId: patient.id },
      update: {
        age: ageFor(i),
        gender: i % 2 === 0 ? 'female' : 'male',
        medicalHistory: i % 3 === 0 ? 'Mild anxiety history.' : 'No major medical history reported.',
        emergencyContact: {
          name: `Emergency Contact ${i + 1}`,
          relation: 'Sibling',
          phone: `+91990000${String(i + 1).padStart(4, '0')}`,
          carrier: 'Airtel',
        },
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        userId: patient.id,
        age: ageFor(i),
        gender: i % 2 === 0 ? 'female' : 'male',
        medicalHistory: i % 3 === 0 ? 'Mild anxiety history.' : 'No major medical history reported.',
        emergencyContact: {
          name: `Emergency Contact ${i + 1}`,
          relation: 'Sibling',
          phone: `+91990000${String(i + 1).padStart(4, '0')}`,
          carrier: 'Airtel',
        },
      },
    });
  }
};

const ensureProviderProfiles = async (providersByRole: Record<UserRole, Array<{ id: string; firstName: string; lastName: string }>>) => {
  for (const role of providerRoleList) {
    const providers = providersByRole[role] || [];
    for (let i = 0; i < providers.length; i += 1) {
      const provider = providers[i];
      const registrationPrefix = role === UserRole.PSYCHIATRIST ? 'NMC' : 'RCI';
      const registrationNum = `${registrationPrefix}-${role}-${String(i + 1).padStart(4, '0')}`;
      const profileDisplayName = `Dr. ${displayName(provider.firstName, provider.lastName)}`;
      const professionalType = String(role).toUpperCase();

      const profile = await prisma.therapistProfile.upsert({
        where: { userId: provider.id },
        update: {
          displayName: profileDisplayName,
          professionalType,
          registrationType: role === UserRole.PSYCHIATRIST ? RegistrationType.NMC : RegistrationType.RCI,
          registrationNum,
          contactEmail: `${provider.firstName.toLowerCase()}.${provider.lastName.toLowerCase()}.${role.toLowerCase()}@${EMAIL_DOMAIN}`,
          education: role === UserRole.PSYCHIATRIST ? 'MBBS, MD (Psychiatry)' : 'M.Phil (Clinical Psychology)',
          highestQual: role === UserRole.PSYCHIATRIST ? 'MD (Psychiatry)' : 'M.Phil (Clinical Psychology)',
          licenseRci: role === UserRole.PSYCHIATRIST ? null : `RCI-LIC-${String(i + 1).padStart(4, '0')}`,
          licenseNmc: role === UserRole.PSYCHIATRIST ? `NMC-LIC-${String(i + 1).padStart(4, '0')}` : null,
          bio: `${profileDisplayName} is a ${role.toLowerCase()} focused on evidence-based outcomes and continuity of care.`,
          clinicalCategories: ['Anxiety Disorders', 'Depression & Mood Disorders', 'Sleep & Stress Disorders'],
          specializations: specialtiesByRole[role],
          languages: languagePools[i % languagePools.length],
          corporateReady: i % 2 === 0,
          shiftPreferences: i % 3 === 0 ? ['MORNING', 'EVENING'] : ['EVENING'],
          yearsExperience: 4 + (i % 12),
          yearsOfExperience: 4 + (i % 12),
          hourlyRate: 90000 + i * 5000,
          consultationFee: 90000 + i * 5000,
          bankDetails: {
            accountName: profileDisplayName,
            accountNumber: `00012233${String(i + 1).padStart(4, '0')}`,
            ifsc: `HDFC000${String(i + 100).padStart(4, '0')}`,
            bankName: 'HDFC Bank',
            upiId: `${provider.firstName.toLowerCase()}.${provider.lastName.toLowerCase()}@okhdfcbank`,
          },
          tagline: role === UserRole.PSYCHIATRIST ? 'Medication and therapy aligned for measurable outcomes' : 'Trauma-informed and evidence-based therapy support',
          digitalSignature: profileDisplayName,
          onboardingCompleted: true,
          isVerified: true,
          verifiedAt: NOW,
          verifiedByUserId: provider.id,
          averageRating: 4.2 + (i % 5) * 0.1,
          availability: [
            { dayOfWeek: 1, startMinute: 600, endMinute: 900, isAvailable: true },
            { dayOfWeek: 3, startMinute: 780, endMinute: 1020, isAvailable: true },
            { dayOfWeek: 5, startMinute: 660, endMinute: 900, isAvailable: true },
          ],
          isDeleted: false,
          deletedAt: null,
        },
        create: {
          userId: provider.id,
          displayName: profileDisplayName,
          professionalType,
          registrationType: role === UserRole.PSYCHIATRIST ? RegistrationType.NMC : RegistrationType.RCI,
          registrationNum,
          contactEmail: `${provider.firstName.toLowerCase()}.${provider.lastName.toLowerCase()}.${role.toLowerCase()}@${EMAIL_DOMAIN}`,
          education: role === UserRole.PSYCHIATRIST ? 'MBBS, MD (Psychiatry)' : 'M.Phil (Clinical Psychology)',
          highestQual: role === UserRole.PSYCHIATRIST ? 'MD (Psychiatry)' : 'M.Phil (Clinical Psychology)',
          licenseRci: role === UserRole.PSYCHIATRIST ? null : `RCI-LIC-${String(i + 1).padStart(4, '0')}`,
          licenseNmc: role === UserRole.PSYCHIATRIST ? `NMC-LIC-${String(i + 1).padStart(4, '0')}` : null,
          bio: `${profileDisplayName} is a ${role.toLowerCase()} focused on evidence-based outcomes and continuity of care.`,
          clinicalCategories: ['Anxiety Disorders', 'Depression & Mood Disorders', 'Sleep & Stress Disorders'],
          specializations: specialtiesByRole[role],
          languages: languagePools[i % languagePools.length],
          corporateReady: i % 2 === 0,
          shiftPreferences: i % 3 === 0 ? ['MORNING', 'EVENING'] : ['EVENING'],
          yearsExperience: 4 + (i % 12),
          yearsOfExperience: 4 + (i % 12),
          hourlyRate: 90000 + i * 5000,
          consultationFee: 90000 + i * 5000,
          bankDetails: {
            accountName: profileDisplayName,
            accountNumber: `00012233${String(i + 1).padStart(4, '0')}`,
            ifsc: `HDFC000${String(i + 100).padStart(4, '0')}`,
            bankName: 'HDFC Bank',
            upiId: `${provider.firstName.toLowerCase()}.${provider.lastName.toLowerCase()}@okhdfcbank`,
          },
          tagline: role === UserRole.PSYCHIATRIST ? 'Medication and therapy aligned for measurable outcomes' : 'Trauma-informed and evidence-based therapy support',
          digitalSignature: profileDisplayName,
          onboardingCompleted: true,
          isVerified: true,
          verifiedAt: NOW,
          verifiedByUserId: provider.id,
          averageRating: 4.2 + (i % 5) * 0.1,
          availability: [
            { dayOfWeek: 1, startMinute: 600, endMinute: 900, isAvailable: true },
            { dayOfWeek: 3, startMinute: 780, endMinute: 1020, isAvailable: true },
            { dayOfWeek: 5, startMinute: 660, endMinute: 900, isAvailable: true },
          ],
        },
      });

      const documentBaseUrl = `https://assets.manas360.test/provider-docs/${provider.id}`;
      await prisma.providerDocument.upsert({
        where: { providerProfileId_documentType: { providerProfileId: profile.id, documentType: ProviderDocumentType.DEGREE } },
        update: { url: `${documentBaseUrl}/degree.pdf`, userId: provider.id },
        create: {
          providerProfileId: profile.id,
          userId: provider.id,
          documentType: ProviderDocumentType.DEGREE,
          url: `${documentBaseUrl}/degree.pdf`,
        },
      });

      await prisma.providerDocument.upsert({
        where: { providerProfileId_documentType: { providerProfileId: profile.id, documentType: ProviderDocumentType.LICENSE } },
        update: { url: `${documentBaseUrl}/license.pdf`, userId: provider.id },
        create: {
          providerProfileId: profile.id,
          userId: provider.id,
          documentType: ProviderDocumentType.LICENSE,
          url: `${documentBaseUrl}/license.pdf`,
        },
      });
    }
  }
};

const buildRolePools = (providersByRole: Record<UserRole, Array<{ id: string }>>) => {
  return {
    therapist: shuffle(providersByRole[UserRole.THERAPIST] || []),
    coach: shuffle(providersByRole[UserRole.COACH] || []),
    psychologist: shuffle(providersByRole[UserRole.PSYCHOLOGIST] || []),
    psychiatrist: shuffle(providersByRole[UserRole.PSYCHIATRIST] || []),
  };
};

const upsertCareConnection = async (patientId: string, providerId: string, status: string, assignedAt: Date, revokedAt: Date | null) => {
  await prisma.careTeamAssignment.upsert({
    where: { patientId_providerId: { patientId, providerId } },
    update: {
      status,
      accessScope: {
        canViewProgress: true,
        canReviewAssessments: true,
        canMessage: true,
        source: 'seed-ts',
      },
      assignedAt,
      revokedAt,
    },
    create: {
      patientId,
      providerId,
      assignedById: providerId,
      status,
      accessScope: {
        canViewProgress: true,
        canReviewAssessments: true,
        canMessage: true,
        source: 'seed-ts',
      },
      assignedAt,
      revokedAt,
    },
  });
};

const createConnections = async (
  patientUsers: Array<{ id: string }>,
  providersByRole: Record<UserRole, Array<{ id: string }>>,
): Promise<{ connectedPatients: Array<{ id: string }>; assignmentMap: AssignmentMap }> => {
  const connectedPatients = shuffle(patientUsers).slice(0, 5);
  const rolePools = buildRolePools(providersByRole);
  const assignmentMap: AssignmentMap = new Map();

  for (let i = 0; i < connectedPatients.length; i += 1) {
    const patient = connectedPatients[i];
    const therapist = rolePools.therapist[i % rolePools.therapist.length];
    const coach = rolePools.coach[i % rolePools.coach.length];
    const psychologist = rolePools.psychologist[i % rolePools.psychologist.length];
    const psychiatrist = rolePools.psychiatrist[i % rolePools.psychiatrist.length];

    assignmentMap.set(patient.id, {
      therapist: therapist.id,
      coach: coach.id,
      psychologist: psychologist.id,
      psychiatrist: psychiatrist.id,
    });

    await upsertCareConnection(patient.id, therapist.id, 'ACTIVE', new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 3), null);
    await upsertCareConnection(patient.id, coach.id, 'ACTIVE', new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 10), null);
    await upsertCareConnection(patient.id, psychologist.id, 'ACTIVE', new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 5), null);
    await upsertCareConnection(patient.id, psychiatrist.id, 'ACTIVE', new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 18), null);
  }

  if (connectedPatients.length >= 2) {
    const handoverPatients = [connectedPatients[0], connectedPatients[1]];
    for (const patient of handoverPatients) {
      const assignment = assignmentMap.get(patient.id);
      if (!assignment) continue;

      await upsertCareConnection(
        patient.id,
        assignment.psychiatrist,
        'INACTIVE',
        new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 40),
        new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 7),
      );

      await upsertCareConnection(
        patient.id,
        assignment.therapist,
        'ACTIVE',
        new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 6),
        null,
      );
    }
  }

  return { connectedPatients, assignmentMap };
};

const upsertTherapySessions = async (
  patientProfilesByUserId: Map<string, { id: string }>,
  connectedPatients: Array<{ id: string }>,
  assignmentMap: AssignmentMap,
) => {
  for (const patient of connectedPatients) {
    const profile = patientProfilesByUserId.get(patient.id);
    const assignment = assignmentMap.get(patient.id);
    if (!profile || !assignment) continue;

    const completedRef = `seed-ts-${patient.id}-completed`;
    const upcomingRef = `seed-ts-${patient.id}-upcoming`;

    await prisma.therapySession.upsert({
      where: { bookingReferenceId: completedRef },
      update: {
        patientProfileId: profile.id,
        therapistProfileId: assignment.therapist,
        dateTime: new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 8),
        durationMinutes: 50,
        sessionFeeMinor: BigInt(120000),
        paymentStatus: 'PAID',
        status: BookingStatus.COMPLETED,
        transcript: 'Session completed with structured CBT discussion and progress review.',
      },
      create: {
        bookingReferenceId: completedRef,
        patientProfileId: profile.id,
        therapistProfileId: assignment.therapist,
        dateTime: new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 8),
        durationMinutes: 50,
        isLocked: true,
        sessionFeeMinor: BigInt(120000),
        paymentStatus: 'PAID',
        status: BookingStatus.COMPLETED,
        transcript: 'Session completed with structured CBT discussion and progress review.',
      },
    });

    await prisma.therapySession.upsert({
      where: { bookingReferenceId: upcomingRef },
      update: {
        patientProfileId: profile.id,
        therapistProfileId: assignment.therapist,
        dateTime: new Date(NOW.getTime() + 1000 * 60 * 60 * 24 * 3),
        durationMinutes: 50,
        sessionFeeMinor: BigInt(120000),
        paymentStatus: 'UNPAID',
        status: BookingStatus.CONFIRMED,
        transcript: null,
      },
      create: {
        bookingReferenceId: upcomingRef,
        patientProfileId: profile.id,
        therapistProfileId: assignment.therapist,
        dateTime: new Date(NOW.getTime() + 1000 * 60 * 60 * 24 * 3),
        durationMinutes: 50,
        isLocked: true,
        sessionFeeMinor: BigInt(120000),
        paymentStatus: 'UNPAID',
        status: BookingStatus.CONFIRMED,
      },
    });
  }
};

const upsertTherapyPlans = async (
  patientProfilesByUserId: Map<string, { id: string }>,
  connectedPatients: Array<{ id: string }>,
  assignmentMap: AssignmentMap,
) => {
  for (const patient of connectedPatients) {
    const profile = patientProfilesByUserId.get(patient.id);
    const assignment = assignmentMap.get(patient.id);
    if (!profile || !assignment) continue;

    await prisma.therapyPlan.deleteMany({
      where: {
        patientId: profile.id,
        providerNote: { contains: '[seed-ts]' },
      },
    });

    const plan = await prisma.therapyPlan.create({
      data: {
        patientId: profile.id,
        therapistId: assignment.therapist,
        title: 'My Recovery Plan',
        providerNote: '[seed-ts] Personalized plan for assessment continuity and CBT milestones.',
        startDate: new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 2),
        endDate: new Date(NOW.getTime() + 1000 * 60 * 60 * 24 * 28),
        status: 'ACTIVE',
      },
    });

    await prisma.therapyPlanActivity.createMany({
      data: [
        {
          id: randomUUID(),
          planId: plan.id,
          title: 'Complete PHQ-9 Check-in',
          frequency: PlanActivityFrequency.WEEKLY_MILESTONE,
          activityType: PlanActivityType.CLINICAL_ASSESSMENT,
          estimatedMinutes: 10,
          orderIndex: 1,
          weekNumber: 1,
          isPublished: true,
          category: 'assessment',
          status: 'PENDING',
        },
        {
          id: randomUUID(),
          planId: plan.id,
          title: 'CBT Module: Thought Reframing',
          frequency: PlanActivityFrequency.WEEKLY_MILESTONE,
          activityType: PlanActivityType.EXERCISE,
          estimatedMinutes: 20,
          orderIndex: 2,
          weekNumber: 1,
          isPublished: true,
          category: 'cbt',
          status: 'COMPLETED',
          completedAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 24),
        },
      ],
    });
  }
};

const upsertDirectMessages = async (connectedPatients: Array<{ id: string }>, assignmentMap: AssignmentMap) => {
  if (!connectedPatients.length) return;

  const patientId = connectedPatients[0].id;
  const assignment = assignmentMap.get(patientId);
  if (!assignment) return;

  const providerId = assignment.therapist;

  const conversation = await prisma.directConversation.upsert({
    where: { patientId_providerId: { patientId, providerId } },
    update: {
      isSupport: false,
      lastMessageAt: NOW,
      lastMessageText: '[seed-ts] Thanks, I will complete the module before our next session.',
    },
    create: {
      patientId,
      providerId,
      isSupport: false,
      lastMessageAt: NOW,
      lastMessageText: '[seed-ts] Thanks, I will complete the module before our next session.',
    },
  });

  await prisma.directMessage.deleteMany({
    where: {
      conversationId: conversation.id,
      content: { contains: '[seed-ts]' },
    },
  });

  const startAt = new Date(NOW.getTime() - 1000 * 60 * 60 * 30);
  const messages = [
    {
      senderId: providerId,
      senderRole: 'provider',
      content: '[seed-ts] Hi, checking in after your last session. How are you feeling today?',
      createdAt: new Date(startAt.getTime() + 1000 * 60 * 2),
    },
    {
      senderId: patientId,
      senderRole: 'patient',
      content: '[seed-ts] Better than last week. Sleep improved a bit, but mornings are still tough.',
      createdAt: new Date(startAt.getTime() + 1000 * 60 * 7),
    },
    {
      senderId: providerId,
      senderRole: 'provider',
      content: '[seed-ts] That is progress. Please complete the PHQ-9 and the CBT reframing activity before Friday.',
      createdAt: new Date(startAt.getTime() + 1000 * 60 * 12),
    },
    {
      senderId: patientId,
      senderRole: 'patient',
      content: '[seed-ts] Sure, I will do that tonight and share updates here.',
      createdAt: new Date(startAt.getTime() + 1000 * 60 * 16),
    },
    {
      senderId: patientId,
      senderRole: 'patient',
      content: '[seed-ts] Thanks, I will complete the module before our next session.',
      createdAt: new Date(startAt.getTime() + 1000 * 60 * 22),
    },
  ];

  await prisma.directMessage.createMany({
    data: messages.map((message) => ({
      id: randomUUID(),
      conversationId: conversation.id,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      messageType: 'TEXT',
      metadata: { source: 'seed-ts' },
      createdAt: message.createdAt,
    })),
  });

  await prisma.directConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: messages[messages.length - 1].createdAt,
      lastMessageText: messages[messages.length - 1].content,
    },
  });
};

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const [patients, coaches, therapists, psychologists, psychiatrists] = await Promise.all([
    upsertRoleUsers(UserRole.PATIENT, patientSeeds, passwordHash),
    upsertRoleUsers(UserRole.COACH, coachSeeds, passwordHash),
    upsertRoleUsers(UserRole.THERAPIST, therapistSeeds, passwordHash),
    upsertRoleUsers(UserRole.PSYCHOLOGIST, psychologistSeeds, passwordHash),
    upsertRoleUsers(UserRole.PSYCHIATRIST, psychiatristSeeds, passwordHash),
  ]);

  await ensurePatientProfiles(patients);

  const providersByRole: Record<UserRole, any[]> = {
    [UserRole.COACH]: coaches,
    [UserRole.THERAPIST]: therapists,
    [UserRole.PSYCHOLOGIST]: psychologists,
    [UserRole.PSYCHIATRIST]: psychiatrists,
    [UserRole.PATIENT]: [],
    [UserRole.ADMIN]: [],
    [UserRole.SUPER_ADMIN]: [],
  };

  await ensureProviderProfiles(providersByRole as Record<UserRole, Array<{ id: string; firstName: string; lastName: string }>>);

  const { connectedPatients, assignmentMap } = await createConnections(patients, providersByRole as Record<UserRole, Array<{ id: string }>>);

  const connectedPatientProfiles = await prisma.patientProfile.findMany({
    where: { userId: { in: connectedPatients.map((patient) => patient.id) } },
    select: { id: true, userId: true },
  });

  const patientProfilesByUserId = new Map(connectedPatientProfiles.map((profile) => [profile.userId, profile]));

  await upsertTherapySessions(patientProfilesByUserId, connectedPatients, assignmentMap);
  await upsertTherapyPlans(patientProfilesByUserId, connectedPatients, assignmentMap);
  await upsertDirectMessages(connectedPatients, assignmentMap);

  const handoverPatients = connectedPatients.slice(0, 2);

  console.log('Seed complete for mock-vs-real API validation');
  console.log('Password for seeded users:', DEFAULT_PASSWORD);
  console.log('Counts by role:', {
    patients: patients.length,
    coaches: coaches.length,
    therapists: therapists.length,
    psychologists: psychologists.length,
    psychiatrists: psychiatrists.length,
  });
  console.log('Connected patients:', connectedPatients.length);
  console.log('Handover patient names:', handoverPatients.map((patient) => {
    const user = patients.find((candidate) => candidate.id === patient.id);
    return user ? user.name || `${user.firstName} ${user.lastName}` : patient.id;
  }));
  console.log('Sample verification names:', [
    'Test Patient Alpha',
    'Test Patient Beta',
    'Dr. Amelia Smith',
  ]);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
