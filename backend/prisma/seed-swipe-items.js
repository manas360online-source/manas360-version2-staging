import { prisma } from '../config/db';

const SWIPE_ITEMS = [
  {
    serviceId: 'THERAPY_PSY_50',
    serviceName: 'Individual Therapy Session — Psychologist (50 min)',
    baseRateMinor: 69899,
    sacCode: '999312',
    category: 'Therapy Sessions',
  },
  {
    serviceId: 'PSYCHIATRIST_50',
    serviceName: 'Psychiatrist Consultation (50 min)',
    baseRateMinor: 100000,
    sacCode: '999312',
    category: 'Therapy Sessions',
  },
  {
    serviceId: 'NLP_COACH_50',
    serviceName: 'NLP Coach Session (50 min)',
    baseRateMinor: 100000,
    sacCode: '999312',
    category: 'Therapy Sessions',
  },
  {
    serviceId: 'COUPLE_THERAPY_60',
    serviceName: 'Couple Therapy Session (60 min)',
    baseRateMinor: 149900,
    sacCode: '999312',
    category: 'Therapy Sessions',
  },
  {
    serviceId: 'SLEEP_THERAPY_50',
    serviceName: 'Sleep Therapy Session (50 min)',
    baseRateMinor: 149900,
    sacCode: '999312',
    category: 'Therapy Sessions',
  },
  {
    serviceId: 'WELLNESS_EXECUTIVE_50',
    serviceName: 'Executive Wellness Session (50 min)',
    baseRateMinor: 199901,
    sacCode: '999312',
    category: 'Therapy Sessions',
  },
  {
    serviceId: 'NRI_PSY_50',
    serviceName: 'NRI — Psychologist Session (50 min)',
    baseRateMinor: 299901,
    sacCode: '999312',
    category: 'NRI Sessions',
  },
  {
    serviceId: 'NRI_PSYCHIATRIST_50',
    serviceName: 'NRI — Psychiatrist Session (50 min)',
    baseRateMinor: 349899,
    sacCode: '999312',
    category: 'NRI Sessions',
  },
  {
    serviceId: 'NRI_THERAPIST_50',
    serviceName: 'NRI — Therapist Session (50 min)',
    baseRateMinor: 359900,
    sacCode: '999312',
    category: 'NRI Sessions',
  },
  {
    serviceId: 'PLATFORM_ACCESS_MONTHLY',
    serviceName: 'Platform Access — Monthly',
    baseRateMinor: 9900,
    sacCode: '999312',
    category: 'Patient Subscriptions',
  },
  {
    serviceId: 'PLATFORM_ACCESS_QUARTERLY',
    serviceName: 'Platform Access — Quarterly',
    baseRateMinor: 27900,
    sacCode: '999312',
    category: 'Patient Subscriptions',
  },
  {
    serviceId: 'PREMIUM_SUB_MONTHLY',
    serviceName: 'Premium Subscription — Monthly',
    baseRateMinor: 29901,
    sacCode: '999312',
    category: 'Patient Subscriptions',
  },
  {
    serviceId: 'PREMIUM_SUB_ANNUAL',
    serviceName: 'Premium Subscription — Annual',
    baseRateMinor: 299901,
    sacCode: '999312',
    category: 'Patient Subscriptions',
  },
  {
    serviceId: 'PROVIDER_BASIC_LEADS_MONTHLY',
    serviceName: 'Provider — Basic Lead Plan (Monthly)',
    baseRateMinor: 19900,
    sacCode: '998314',
    category: 'Provider Plans',
  },
  {
    serviceId: 'PROVIDER_STANDARD_LEADS_MONTHLY',
    serviceName: 'Provider — Standard Lead Plan (Monthly)',
    baseRateMinor: 29901,
    sacCode: '998314',
    category: 'Provider Plans',
  },
  {
    serviceId: 'PROVIDER_PREMIUM_LEADS_MONTHLY',
    serviceName: 'Provider — Premium Lead Plan (Monthly)',
    baseRateMinor: 39900,
    sacCode: '998314',
    category: 'Provider Plans',
  },
  {
    serviceId: 'PROVIDER_PLATFORM_ACCESS_MONTHLY',
    serviceName: 'Provider — Platform Access (Monthly)',
    baseRateMinor: 9900,
    sacCode: '998314',
    category: 'Provider Plans',
  },
  {
    serviceId: 'MARKETPLACE_LEAD_HOT',
    serviceName: 'Marketplace Lead — Hot',
    baseRateMinor: 29901,
    sacCode: '998314',
    category: 'Marketplace',
  },
  {
    serviceId: 'MARKETPLACE_LEAD_WARM',
    serviceName: 'Marketplace Lead — Warm',
    baseRateMinor: 19900,
    sacCode: '998314',
    category: 'Marketplace',
  },
  {
    serviceId: 'MARKETPLACE_LEAD_COLD',
    serviceName: 'Marketplace Lead — Cold',
    baseRateMinor: 9900,
    sacCode: '998314',
    category: 'Marketplace',
  },
  {
    serviceId: 'ANYTIMEBUDDY_AI_1HR',
    serviceName: 'AnytimeBuddy AI — 1 Hour Pack',
    baseRateMinor: 39900,
    sacCode: '998314',
    category: 'Add-Ons',
  },
  {
    serviceId: 'ANYTIMEBUDDY_AI_3HR',
    serviceName: 'AnytimeBuddy AI — 3 Hour Pack',
    baseRateMinor: 100000,
    sacCode: '998314',
    category: 'Add-Ons',
  },
  {
    serviceId: 'ANYTIMEBUDDY_AI_5HR',
    serviceName: 'AnytimeBuddy AI — 5 Hour Pack',
    baseRateMinor: 170000,
    sacCode: '998314',
    category: 'Add-Ons',
  },
  {
    serviceId: 'CORPORATE_EAP_STARTUP',
    serviceName: 'Corporate EAP — Startup Tier (Annual)',
    baseRateMinor: 20000001,
    sacCode: '999312',
    category: 'Corporate B2B',
  },
  {
    serviceId: 'CORPORATE_EAP_GROWTH',
    serviceName: 'Corporate EAP — Growth Tier (Annual)',
    baseRateMinor: 49999999,
    sacCode: '999312',
    category: 'Corporate B2B',
  },
  {
    serviceId: 'CORPORATE_EAP_ENTERPRISE',
    serviceName: 'Corporate EAP — Enterprise Tier (Annual)',
    baseRateMinor: 119999999,
    sacCode: '999312',
    category: 'Corporate B2B',
  },
  {
    serviceId: 'ASHA_REFERRAL_INCENTIVE',
    serviceName: 'ASHA Referral Incentive',
    baseRateMinor: 19999,
    sacCode: '999312',
    category: 'ASHA Program',
  },
  {
    serviceId: 'PROVIDER_TRAINING_MODULE',
    serviceName: 'Provider Training Module',
    baseRateMinor: 0,
    sacCode: '999293',
    category: 'Training',
  },
  {
    serviceId: 'CBT_CERTIFICATION_FEE',
    serviceName: 'CBT Certification Fee',
    baseRateMinor: 0,
    sacCode: '999293',
    category: 'Training',
  },
  {
    serviceId: 'TRIAL_21_DAY_RUPEE_AUTH',
    serviceName: '21-Day Free Trial — ₹1 Authorization',
    baseRateMinor: 101,
    sacCode: '999312',
    category: 'Trial',
  },
];

async function seedSwipeItems() {
  console.log('🌱 Seeding Swipe Item Mappings...');

  try {
    for (const item of SWIPE_ITEMS) {
      await prisma.swipeItemMapping.upsert({
        where: { serviceId: item.serviceId },
        update: {
          serviceName: item.serviceName,
          baseRateMinor: item.baseRateMinor,
          sacCode: item.sacCode,
          category: item.category,
        },
        create: {
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          swipeItemId: `SWP_PLACEHOLDER_${String(SWIPE_ITEMS.indexOf(item) + 1).padStart(3, '0')}`,
          baseRateMinor: item.baseRateMinor,
          sacCode: item.sacCode,
          category: item.category,
          isActive: true,
        },
      });
    }

    const count = await prisma.swipeItemMapping.count();
    console.log(`✅ Successfully seeded ${count} Swipe items`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seedSwipeItems()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
