import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Database connected successfully. User count: ${userCount}`);
    
    // Check for some critical tables
    const patientCount = await prisma.patientProfile.count();
    console.log(`Patient profiles: ${patientCount}`);
    
    const providerCount = await prisma.therapistProfile.count();
    console.log(`Provider profiles: ${providerCount}`);

    console.log('Database health check: OK');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
