const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllUsers() {
  const phone = '+919000000001';
  const users = await prisma.user.findMany({
    where: { phone }
  });
  console.log('All Users with phone', phone);
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

checkAllUsers();
