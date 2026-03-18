import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock providers into the database...');

  const providers = [
    {
      role: 'THERAPIST',
      providerType: 'THERAPIST',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'mock.therapist@manas360.local',
      specializations: ['CBT', 'Anxiety', 'Depression'],
      bio: 'Licensed clinical therapist with over 8 years of experience helping young adults manage anxiety.',
      yearsOfExperience: 8,
      consultationFee: 150000, // 1500 INR
    },
    {
      role: 'PSYCHOLOGIST',
      providerType: 'PSYCHOLOGIST',
      firstName: 'David',
      lastName: 'Chen',
      email: 'mock.psychologist@manas360.local',
      specializations: ['Clinical Psychology', 'Trauma', 'PTSD'],
      bio: 'Specialized clinical psychologist focusing on trauma recovery and advanced cognitive evaluations.',
      yearsOfExperience: 12,
      consultationFee: 250000, 
    },
    {
      role: 'PSYCHIATRIST',
      providerType: 'PSYCHIATRIST',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'mock.psychiatrist@manas360.local',
      specializations: ['Psychiatry', 'Medication Management', 'Bipolar Disorder'],
      bio: 'Board-certified psychiatrist offering comprehensive psychiatric evaluations and ongoing medication management.',
      yearsOfExperience: 15,
      consultationFee: 300000, 
    }
  ];

  for (const p of providers) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      create: {
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        role: p.role as any,
        providerType: p.providerType as any,
        status: 'ACTIVE',
        provider: 'LOCAL',
        passwordHash: 'dummy_hash',
      },
      update: {
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`,
        role: p.role as any,
        providerType: p.providerType as any,
        status: 'ACTIVE',
        isDeleted: false,
      },
    });

    await prisma.therapistProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: `${p.firstName} ${p.lastName}`,
        bio: p.bio,
        specializations: p.specializations,
        languages: ['English', 'Hindi'],
        yearsOfExperience: p.yearsOfExperience,
        consultationFee: p.consultationFee,
        averageRating: 4.9,
      },
      update: {
        displayName: `${p.firstName} ${p.lastName}`,
        bio: p.bio,
        specializations: p.specializations,
        languages: ['English', 'Hindi'],
        yearsOfExperience: p.yearsOfExperience,
        consultationFee: p.consultationFee,
        averageRating: 4.9,
      },
    });

    console.log(`Upserted ${p.role}: ${p.firstName} ${p.lastName}`);
  }

  console.log('Provider seeding complete (3 mock providers)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
