import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMdc() {
  const clinics = await prisma.clinic.findMany();
  console.log('Clinics:', JSON.stringify(clinics, null, 2));
  
  const clinicUsers = await prisma.clinicUser.findMany({
    include: { clinic: true }
  });
  console.log('Clinic Users:', JSON.stringify(clinicUsers, null, 2));
  
  await prisma.$disconnect();
}

checkMdc().catch(console.error);
