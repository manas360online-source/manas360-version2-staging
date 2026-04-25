const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  // Prefer explicit legacy-column checks when available.
  let platformAdmins = [];
  let legacyCompanyAdmins = [];

  try {
    platformAdmins = await prisma.$queryRawUnsafe(`
      SELECT id, email
      FROM users
      WHERE role = 'ADMIN'
        AND COALESCE(isDeleted, false) = false
        AND (company_key IS NULL OR TRIM(company_key) = '')
    `);

    legacyCompanyAdmins = await prisma.$queryRawUnsafe(`
      SELECT id, email
      FROM users
      WHERE COALESCE(isDeleted, false) = false
        AND COALESCE(is_company_admin, false) = true
    `);
  } catch {
    // Fallback for environments missing legacy columns.
    platformAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
      },
    });
    legacyCompanyAdmins = [];
  }

  const errors = [];

  if (platformAdmins.length !== 1) {
    errors.push(
      `Expected exactly 1 platform admin, found ${platformAdmins.length}. Current: ${platformAdmins
        .map((u) => u.email)
        .join(', ') || 'none'}`,
    );
  }

  if (legacyCompanyAdmins.length > 0) {
    errors.push(
      `Legacy is_company_admin=true accounts detected: ${legacyCompanyAdmins.map((u) => u.email).join(', ')}`,
    );
  }

  if (errors.length > 0) {
    console.error('[single-admin-guard] FAILED');
    for (const message of errors) {
      console.error(`- ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[single-admin-guard] OK');
  console.log(`- Platform admin: ${platformAdmins[0].email}`);
  console.log('- Legacy company-admin flags: none');
}

run()
  .catch((error) => {
    console.error('[single-admin-guard] ERROR', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
