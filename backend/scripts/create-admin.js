#!/usr/bin/env node
/*
  One-off script to create a SUPER_ADMIN user for local/testing.
  Usage:
    ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMeNow! node backend/scripts/create-admin.js
  If not provided, defaults will be used.
*/

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function run() {
  const email = (process.env.ADMIN_EMAIL || 'admin@local.manas360.test').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMeNow!123';

  console.log('Creating admin with email:', email);

  const passwordHash = await bcrypt.hash(password, 12);

  // Create or update user
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        firstName: 'Platform',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
        isDeleted: false,
      },
    });
    console.log('Updated existing user id:', updated.id);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        firstName: 'Platform',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
        isDeleted: false,
      },
    });
    console.log('Created user id:', user.id);
  }

  console.log('\nADMIN CREDENTIALS:');
  console.log('  email:', email);
  console.log('  password:', password);
  console.log('\nPlease change the password after first login.');

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('Seeding admin failed:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
