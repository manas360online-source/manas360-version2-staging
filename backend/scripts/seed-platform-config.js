/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const readPricingTables = async () => {
  const plans = await prisma.$queryRawUnsafe('SELECT * FROM platform_subscription WHERE active = TRUE');
  const sessions = await prisma.$queryRawUnsafe('SELECT * FROM session_pricing WHERE active = TRUE');
  const addons = await prisma.$queryRawUnsafe('SELECT * FROM product_addons WHERE active = TRUE');
  const settings = await prisma.$queryRawUnsafe("SELECT * FROM system_settings WHERE key = 'preferred_time_surcharge'");

  const surchargePercent = Number(settings?.[0]?.value || 20);

  return {
    platformFee:
      plans
        .filter((p) => String(p.plan_key) === 'monthly')
        .map((p) => ({
          planName: p.plan_name,
          monthlyFee: p.price,
          description: p.description ?? null,
          active: Boolean(p.active),
        }))[0] || null,
    platformPlans: plans.map((p) => ({
      planKey: p.plan_key,
      planName: p.plan_name,
      price: Number(p.price),
      billingCycle: p.billing_cycle,
      description: p.description ?? null,
      active: Boolean(p.active),
    })),
    sessionPricing: sessions.map((s) => ({
      providerType: s.provider_type,
      durationMinutes: s.duration_minutes,
      price: Number(s.price),
      providerShare: Number(s.provider_share),
      platformShare: Number(s.platform_share),
      active: Boolean(s.active),
    })),
    premiumBundles: addons.map((a) => ({
      bundleName: a.addon_name,
      minutes: Number(a.minutes || 0),
      price: Number(a.price),
      active: Boolean(a.active),
    })),
    surchargePercent,
  };
};

const upsertConfig = async (key, value) => {
  const existing = await prisma.platformConfig.findUnique({ where: { key } });
  if (existing) {
    await prisma.platformConfig.update({
      where: { key },
      data: {
        value,
        version: existing.version + 1,
      },
    });
    console.log(`[seed-platform-config] Updated ${key} (v${existing.version + 1})`);
    return;
  }

  await prisma.platformConfig.create({
    data: {
      key,
      value,
      version: 1,
    },
  });
  console.log(`[seed-platform-config] Created ${key} (v1)`);
};

const run = async () => {
  try {
    const pricing = await readPricingTables().catch(() => null);
    if (pricing) {
      await upsertConfig('pricing', pricing);
    }

    await upsertConfig('commission', {
      default: {
        platformPercent: 40,
        providerPercent: 60,
      },
      providers: {},
    });

    await upsertConfig('featureFlags', {
      pricingEdit: true,
      payouts: true,
      crisisConsole: true,
      complianceCenter: true,
    });

    await upsertConfig('limits', {
      maxProvidersPerCompany: 100,
      maxSessionsPerDay: 1000,
    });

    await upsertConfig('compliance', {
      policyVersion: 1,
      requiredReaccept: false,
    });
  } catch (error) {
    console.error('[seed-platform-config] Failed', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
