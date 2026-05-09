import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Connected successfully!');
    
    console.log('Testing query...');
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Query successful:', result);
    
    console.log('Checking User table...');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
  } catch (error) {
    console.error('Database connection failed!');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
