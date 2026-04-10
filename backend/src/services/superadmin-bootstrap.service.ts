import bcrypt from 'bcrypt';
import { prisma } from '../config/db';

const VALID_ADMIN_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'CLINICAL_DIRECTOR',
  'FINANCE_MANAGER',
  'COMPLIANCE_OFFICER',
]);

const normalizeRole = (value: string | undefined): string =>
  String(value || 'SUPER_ADMIN')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');

export const ensureSuperadminFromEnv = async (): Promise<void> => {
  const enabled = String(process.env.SUPERADMIN_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) return;

  const email = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SUPERADMIN_PASSWORD || '');
  const role = normalizeRole(process.env.SUPERADMIN_ROLE);

  if (!email) {
    throw new Error('SUPERADMIN_ENABLED=true but SUPERADMIN_EMAIL is missing');
  }

  if (!password) {
    throw new Error('SUPERADMIN_ENABLED=true but SUPERADMIN_PASSWORD is missing');
  }

  if (!VALID_ADMIN_ROLES.has(role)) {
    throw new Error(`SUPERADMIN_ROLE must be one of: ${Array.from(VALID_ADMIN_ROLES).join(', ')}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: role as any,
      emailVerified: true,
      isDeleted: false,
      provider: 'LOCAL',
    },
    create: {
      email,
      passwordHash,
      role: role as any,
      firstName: 'Super',
      lastName: 'Admin',
      name: 'Super Admin',
      emailVerified: true,
      isDeleted: false,
      provider: 'LOCAL',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'ADMIN_BOOTSTRAPPED',
      resource: 'System',
      details: {
        source: 'env',
        email,
        role,
      },
    },
  }).catch(() => undefined);

  console.log(`[Superadmin Bootstrap] ensured admin ${email} with role ${role}`);
};
