const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const email = 'mock.psychiatrist@manas360.local';
  const password = 'Psych@123';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerified: true,
      role: 'PSYCHIATRIST',
      provider: 'LOCAL',
      firstName: 'Mock',
      lastName: 'Psychiatrist',
      name: 'Mock Psychiatrist',
      isDeleted: false,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      email,
      passwordHash,
      emailVerified: true,
      role: 'PSYCHIATRIST',
      provider: 'LOCAL',
      firstName: 'Mock',
      lastName: 'Psychiatrist',
      name: 'Mock Psychiatrist',
    },
  });

  console.log(JSON.stringify({ ok: true, id: user.id, email, password }, null, 2));
}

run()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
