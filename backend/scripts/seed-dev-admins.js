const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function upsertAdmin(email, phone, firstName, lastName, password) {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      email,
      phone,
      passwordHash,
      role: 'ADMIN',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: true,
      isDeleted: false,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      email,
      phone,
      passwordHash,
      role: 'ADMIN',
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: true,
      isDeleted: false,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
    },
    select: { id: true, email: true, phone: true, role: true },
  });
}

async function run() {
  // Dev password for seeded admins
  const password = process.env.DEV_ADMIN_PASSWORD || 'Admin@123';

  const admins = [
    { email: 'superadmin@manas360.com', phone: 'superadmin@manas360.com', firstName: 'Super', lastName: 'Admin' },
    { email: 'finance@manas360.com', phone: 'finance@manas360.com', firstName: 'Finance', lastName: 'Manager' },
    { email: 'clinical@manas360.com', phone: 'clinical@manas360.com', firstName: 'Clinical', lastName: 'Director' },
    { email: 'compliance@manas360.com', phone: 'compliance@manas360.com', firstName: 'Compliance', lastName: 'Officer' },
  ];

  const results = [];
  for (const a of admins) {
    // try upsert by email; also ensure phone is present
    const res = await upsertAdmin(a.email, a.phone, a.firstName, a.lastName, password);
    results.push(res);
  }

  console.log('Seeded dev admins:', results);
  return results;
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
