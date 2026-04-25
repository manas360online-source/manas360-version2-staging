const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createCorporateAdmin() {
  const email = 'corp-admin@test.local';
  const phone = '+919999999997';
  const password = 'Corp@12345';
  const companyKey = 'ACME';

  console.log('Creating corporate admin user...');
  
  try {
    // Generate password hash
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        phone,
        phoneVerified: true,
        role: 'PATIENT',
        companyKey,
        isCompanyAdmin: true,
        passwordHash,
        failedLoginAttempts: 0,
        lockUntil: null,
        isDeleted: false,
      },
      create: {
        email,
        phone,
        phoneVerified: true,
        role: 'PATIENT',
        companyKey,
        isCompanyAdmin: true,
        passwordHash,
        failedLoginAttempts: 0,
        isDeleted: false,
      },
    });

    console.log('✅ Corporate Admin Created Successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Phone:', phone);
    console.log('Company Key:', companyKey);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('User ID:', user.id);
    console.log('Role:', user.role);
    console.log('Is Company Admin:', user.isCompanyAdmin);
    console.log('Company Key:', user.companyKey);

  } catch (error) {
    console.error('Error creating corporate admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCorporateAdmin();
