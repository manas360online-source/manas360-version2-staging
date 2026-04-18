const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createCorporateAdmin() {
  const phone = '+919000000001';
  const email = `corp-admin-${Date.now()}@test.local`;
  const companyKey = 'CORP-TEST';
  const name = 'Corporate Admin';

  console.log('Creating corporate admin user...');
  
  try {
    // Hash a simple password for backup login
    const password = 'CorpAdmin@2025';
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with CORPORATE_ADMIN role
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        email,
        phoneVerified: true,
        role: 'PATIENT', // Patient role but with isCompanyAdmin flag
        companyKey,
        isCompanyAdmin: true,
        passwordHash,
        failedLoginAttempts: 0,
        lockUntil: null,
        isDeleted: false,
        name,
        firstName: 'Corporate',
        lastName: 'Admin',
      },
      create: {
        phone,
        email,
        phoneVerified: true,
        role: 'PATIENT',
        companyKey,
        isCompanyAdmin: true,
        passwordHash,
        failedLoginAttempts: 0,
        isDeleted: false,
        name,
        firstName: 'Corporate',
        lastName: 'Admin',
        provider: 'PHONE',
        emailVerified: true,
      },
    });

    console.log('✅ Corporate Admin Created Successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Role:', 'Corporate Admin');
    console.log('Phone:', phone);
    console.log('Email:', email);
    console.log('Password (backup):', password);
    console.log('Company Key:', companyKey);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('User ID:', user.id);
    console.log('Is Company Admin:', user.isCompanyAdmin);
    console.log('Phone Verified:', user.phoneVerified);
    console.log('\n✨ Use phone +919000000001 + OTP to login');

  } catch (error) {
    console.error('Error creating corporate admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createCorporateAdmin();
