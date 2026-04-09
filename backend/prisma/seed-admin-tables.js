#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    name: 'PATIENT',
    description: 'Patient access to personal health records and therapy sessions',
    permissions: ['view_own_records', 'book_sessions', 'view_dashboard'],
  },
  {
    name: 'THERAPIST',
    description: 'Therapist access to patient care, sessions, and clinical tools',
    permissions: ['view_patients', 'manage_sessions', 'prescribe_treatments', 'view_dashboard'],
  },
  {
    name: 'ADMIN',
    description: 'Administrative access to user management and basic analytics',
    permissions: [
      'manage_users',
      'manage_therapists',
      'view_analytics',
      'manage_payments',
      'view_reports',
      'payouts_approve',
      'pricing_edit',
      'offers_edit',
    ],
  },
  {
    name: 'SUPER_ADMIN',
    description: 'Super administrator with full system access',
    permissions: [
      'manage_users',
      'manage_admins',
      'manage_therapists',
      'view_analytics',
      'manage_payments',
      'view_reports',
      'payouts_approve',
      'pricing_edit',
      'offers_edit',
      'system_settings',
      'manage_roles',
      'audit_logs',
    ],
  },
  {
    name: 'PSYCHIATRIST',
    description: 'Psychiatrist with prescribing and advanced clinical access',
    permissions: ['view_patients', 'manage_sessions', 'prescribe_medications', 'order_labs', 'view_dashboard'],
  },
  {
    name: 'COACH',
    description: 'Health coach access to guide patients',
    permissions: ['view_assigned_patients', 'manage_coaching_sessions', 'view_dashboard'],
  },
  {
    name: 'PSYCHOLOGIST',
    description: 'Psychologist access to clinical assessments and interventions',
    permissions: ['view_patients', 'manage_sessions', 'conduct_assessments', 'view_dashboard'],
  },
  {
    name: 'COMPLIANCE_OFFICER',
    description: 'Compliance and regulation oversight',
    permissions: [
      'view_analytics',
      'view_reports',
      'audit_logs',
      'compliance_status',
      'legal_documents',
      'user_acceptances',
    ],
  },
  {
    name: 'CLINICAL_DIRECTOR',
    description: 'Clinical governance and quality oversight',
    permissions: [
      'view_analytics',
      'manage_therapists',
      'view_reports',
      'clinical_approvals',
      'view_dashboard',
    ],
  },
  {
    name: 'FINANCE_MANAGER',
    description: 'Financial operations and reporting',
    permissions: [
      'view_analytics',
      'manage_payments',
      'payouts_approve',
      'view_reports',
      'financial_exports',
    ],
  },
];

async function seedRoles() {
  console.log('🌱 Seeding default roles...');

  for (const role of DEFAULT_ROLES) {
    const existing = await prisma.role.findUnique({
      where: { name: role.name },
    });

    if (existing) {
      console.log(`✓ Role "${role.name}" already exists, skipping`);
      continue;
    }

    await prisma.role.create({
      data: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      },
    });

    console.log(`✓ Created role "${role.name}"`);
  }

  console.log('✓ Roles seeded successfully');
}

async function seedMarqueeOffers() {
  console.log('🌱 Seeding default marquee offers...');

  // Check if any offers already exist
  const existingOffers = await prisma.marqueeOffer.findMany({
    take: 1,
  });

  if (existingOffers.length > 0) {
    console.log('✓ Marquee offers already exist, skipping seed');
    return;
  }

  // Create default offers
  const offers = [
    {
      text: '🎉 Welcome to MANAS360! Start your mental health journey today.',
      linkUrl: '/get-started',
      isActive: true,
      sortOrder: 1,
    },
    {
      text: '📱 Download our mobile app for better therapy tracking',
      linkUrl: '/download-app',
      isActive: true,
      sortOrder: 2,
    },
    {
      text: '🚀 Admin dashboard now available for system administrators',
      linkUrl: '/admin',
      isActive: false,
      sortOrder: 3,
    },
  ];

  for (const offer of offers) {
    await prisma.marqueeOffer.create({
      data: offer,
    });
    console.log(`✓ Created marquee offer: "${offer.text}"`);
  }

  console.log('✓ Marquee offers seeded successfully');
}

async function main() {
  try {
    await seedRoles();
    await seedMarqueeOffers();
    console.log('\n✅ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
