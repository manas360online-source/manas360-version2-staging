const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const roles = {
  patient: ['read_own_profile', 'book_session', 'view_therapists', 'submit_assessments', 'view_own_sessions'],
  therapist: ['read_own_profile', 'manage_sessions', 'view_earnings', 'build_templates', 'view_assigned_patients'],
  psychologist: ['read_own_profile', 'manage_assessments', 'manage_reports', 'view_assigned_patients', 'manage_risk'],
  psychiatrist: ['read_own_profile', 'manage_sessions', 'view_earnings', 'view_assigned_patients'],
  coach: ['read_own_profile', 'manage_sessions', 'view_earnings', 'view_assigned_patients'],
  admin: ['read_all_profiles', 'manage_users', 'manage_therapists', 'manage_payments', 'view_analytics', 'manage_corporate', 'view_system_logs', 'offers_edit', 'payouts_approve', 'pricing_edit', 'dashboard', 'users_read', 'users_write', 'manage_groups'],
  superadmin: ['read_all_profiles', 'manage_users', 'manage_therapists', 'manage_payments', 'view_analytics', 'manage_corporate', 'view_system_logs', 'manage_roles', 'manage_permissions', 'system_config', 'offers_edit', 'payouts_approve', 'pricing_edit', 'dashboard', 'users_read', 'users_write', 'manage_groups', 'audit_read']
};

async function seed() {
  console.log('Seeding roles...');
  for (const [name, permissions] of Object.entries(roles)) {
    await prisma.role.upsert({
      where: { name },
      update: { permissions },
      create: { name, permissions, description: `Default permissions for ${name}` }
    });
    console.log(`- Role ${name} seeded.`);
  }
  console.log('Seeding completed.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
