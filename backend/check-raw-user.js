const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRawUser() {
  const phone = '+919000000001';
  const users = await prisma.$queryRawUnsafe('SELECT id, phone, "phoneVerified", "is_company_admin", "company_key" FROM users WHERE phone = $1', phone);
  console.log('Raw User Check:');
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

checkRawUser();
