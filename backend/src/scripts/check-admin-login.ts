import { prisma } from '../config/db';

async function checkAdmin() {
  console.log('🔍 Checking Platform Admin Login logic...');
  try {
    const admin = await prisma.user.findFirst({
      where: {
        role: { in: ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'] }
      }
    });

    if (!admin) {
      console.log('⚠️ No platform admin found in DB.');
    } else {
      console.log('✅ Found admin:', admin.email || admin.phone);
      console.log('Role:', admin.role);
    }

    console.log('✨ Prisma check completed.');
  } catch (error: any) {
    console.error('❌ Prisma Error:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
