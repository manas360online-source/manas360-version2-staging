import { prisma } from '../config/db';

async function checkUserFields() {
  console.log('🔍 Checking User fields at runtime...');
  try {
    const user = await prisma.user.findFirst();
    if (user) {
      console.log('✅ Found a user. Fields:', Object.keys(user));
      console.log('Role value:', user.role);
    } else {
      console.log('⚠️ No users in DB.');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserFields();
