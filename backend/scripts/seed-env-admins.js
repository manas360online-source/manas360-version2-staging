const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const isEnabled = String(process.env.ADMIN_SEED_ENABLED || '').toLowerCase() === 'true';

const parseAdmin = (prefix, role, fallbackEmail) => {
  const email = String(process.env[`${prefix}_EMAIL`] || fallbackEmail || '').trim().toLowerCase();
  const password = String(process.env[`${prefix}_PASSWORD`] || process.env.ADMIN_DEFAULT_PASSWORD || '').trim();
  const firstName = String(process.env[`${prefix}_FIRST_NAME`] || '').trim() || prefix.split('_')[1] || 'Admin';
  const lastName = String(process.env[`${prefix}_LAST_NAME`] || '').trim() || 'User';

  if (!email || !password) return null;

  return { email, phone: email, firstName, lastName, password, role };
};

async function upsertAdmin(admin) {
  const passwordHash = await bcrypt.hash(admin.password, 12);

  return prisma.user.upsert({
    where: { email: admin.email },
    update: {
      email: admin.email,
      phone: admin.phone,
      passwordHash,
      role: admin.role,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: true,
      isDeleted: false,
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: `${admin.firstName} ${admin.lastName}`,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      email: admin.email,
      phone: admin.phone,
      passwordHash,
      role: admin.role,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: true,
      isDeleted: false,
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: `${admin.firstName} ${admin.lastName}`,
    },
    select: { id: true, email: true, role: true },
  });
}

async function run() {
  if (!isEnabled) {
    console.log('[seed-env-admins] Skipped (ADMIN_SEED_ENABLED is not true)');
    return;
  }

  const admins = [
    parseAdmin('ADMIN_SUPER', 'SUPER_ADMIN', 'superadmin@manas360.com'),
    parseAdmin('ADMIN_FINANCE', 'FINANCE_MANAGER', 'finance@manas360.com'),
    parseAdmin('ADMIN_CLINICAL', 'CLINICAL_DIRECTOR', 'clinical@manas360.com'),
    parseAdmin('ADMIN_COMPLIANCE', 'COMPLIANCE_OFFICER', 'compliance@manas360.com'),
  ].filter(Boolean);

  if (!admins.length) {
    console.log('[seed-env-admins] No admin credentials configured; nothing to seed');
    return;
  }

  const results = [];
  for (const admin of admins) {
    const res = await upsertAdmin(admin);
    results.push(res);
  }

  console.log('[seed-env-admins] Upserted admins:', results);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed-env-admins] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
