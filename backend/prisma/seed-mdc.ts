import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MDC Feature Catalog...');

  const features = [
    {
      name: 'Patient Database',
      slug: 'patient-database',
      category: 'core',
      pricing: {
        solo: 499,
        small: 699,
        large: 999,
      },
    },
    {
      name: 'Session Notes & Templates',
      slug: 'session-notes',
      category: 'core',
      pricing: {
        solo: 249,
        small: 349,
        large: 449,
      },
    },
    {
      name: 'Scheduling & SMS Reminders',
      slug: 'scheduling',
      category: 'core',
      pricing: {
        solo: 199,
        small: 249,
        large: 299,
      },
    },
    {
      name: 'Progress Tracking (PHQ-9, GAD-7)',
      slug: 'progress-tracking',
      category: 'clinical',
      pricing: {
        solo: 199,
        small: 299,
        large: 399,
      },
    },
    {
      name: 'Prescriptions & Homework',
      slug: 'prescriptions',
      category: 'clinical',
      pricing: {
        solo: 249,
        small: 349,
        large: 449,
      },
    },
    {
      name: 'AI Buddy (ChitC1)',
      slug: 'ai-buddy',
      category: 'addon',
      pricing: {
        solo: 499,
        small: 799,
        large: 999,
      },
    },
    {
      name: 'Bulk Patient Import (CSV)',
      slug: 'bulk-import',
      category: 'admin',
      pricing: {
        solo: 299,
        small: 449,
        large: 599,
      },
    },
  ];

  for (const f of features) {
    const catalogItem = await prisma.mDCFeatureCatalog.upsert({
      where: { slug: f.slug },
      update: { name: f.name, category: f.category },
      create: {
        name: f.name,
        slug: f.slug,
        category: f.category,
      },
    });

    for (const [tier, price] of Object.entries(f.pricing)) {
      await prisma.mDCTierPricing.upsert({
        where: {
          featureId_clinicTier: {
            featureId: catalogItem.id,
            clinicTier: tier,
          },
        },
        update: {
          monthlyPrice: price,
          quarterlyPrice: Math.round(price * 3 * 0.9),
        },
        create: {
          featureId: catalogItem.id,
          clinicTier: tier,
          monthlyPrice: price,
          quarterlyPrice: Math.round(price * 3 * 0.9),
        },
      });
    }
  }

  console.log('MDC Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
