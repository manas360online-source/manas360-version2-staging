const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function debugLogin() {
  const email = 'admin@manas360.local';
  const plainPassword = 'Admin@123';

  console.log('=== DEBUG LOGIN ===');

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      companyKey: true,
      isCompanyAdmin: true,
      failedLoginAttempts: true,
      lockUntil: true,
      isDeleted: true,
    },
  });

  console.log('User found:', !!user);
  if (!user) return;

  console.log('Fields present:', Object.keys(user));
  console.log('role:', user.role);
  console.log('companyKey:', user.companyKey);
  console.log('isCompanyAdmin:', user.isCompanyAdmin);
  console.log('failedLoginAttempts:', user.failedLoginAttempts);
  console.log('lockUntil:', user.lockUntil);
  console.log('isDeleted:', user.isDeleted);
  console.log('Password hash length:', user.passwordHash ? user.passwordHash.length : 'missing');

  if (user.passwordHash) {
    const match = await bcrypt.compare(plainPassword, user.passwordHash);
    console.log('Compare with passwordHash:', match ? 'MATCH' : 'NO MATCH');
  }
}

debugLogin()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
