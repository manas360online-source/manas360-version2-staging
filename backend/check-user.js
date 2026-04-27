const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const phone = '+919000000001';
  const user = await prisma.user.findFirst({
    where: { phone }
  });
  console.log('User check for', phone);
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

checkUser();
