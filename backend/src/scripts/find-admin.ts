import { prisma } from '../config/db';

async function findAdmin() {
  console.log('🔍 Searching for any Admin in DB...');
  try {
    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'ADMIN' as any },
          { role: 'SUPER_ADMIN' as any }
        ]
      }
    });
    if (admin) {
      console.log('✅ Found Admin:', admin.email || admin.phone);
      console.log('Role:', admin.role);
    } else {
      console.log('❌ No admin found.');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findAdmin();
