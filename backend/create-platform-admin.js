const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createPlatformAdmin() {
  const email = 'admin@manas360.local';
  const password = 'Admin@123';

  console.log('Creating platform admin user...');
  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        phoneVerified: false,
        isDeleted: false,
      },
      create: {
        email,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        phoneVerified: false,
        isDeleted: false,
      },
    });

    console.log('✅ Platform Admin Created/Updated');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', user.id);
    console.log('Role:', user.role);
  } catch (error) {
    console.error('Error creating platform admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPlatformAdmin();
