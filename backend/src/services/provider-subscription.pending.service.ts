import { prisma } from '../config/db';

const db = prisma as any;

type PendingInput = {
  providerId: string;
  leadPlanKey: string;
  platformCycle: 'monthly' | 'quarterly';
  addons: { hot: number; warm: number; cold: number };
  merchantTransactionId: string;
  metadata?: Record<string, unknown>;
};

export const createPendingSubscriptionComponents = async (input: PendingInput) => {
  const now = new Date();
  const expiryMonthly = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiryQuarterly = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const bundleExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const platformPending = db.platformAccessPending
    ? await db.platformAccessPending.create({
        data: {
          providerId: input.providerId,
          billingCycle: input.platformCycle,
          amountMinor: input.platformCycle === 'quarterly' ? 27900 : 9900,
          paymentId: input.merchantTransactionId,
          expiryDate: input.platformCycle === 'quarterly' ? expiryQuarterly : expiryMonthly,
          metadata: input.metadata || {},
        },
      }).catch(() => null)
    : null;

  const leadPlanPending = db.leadPlanPending
    ? await db.leadPlanPending.create({
        data: {
          providerId: input.providerId,
          planKey: input.leadPlanKey,
          billingCycle: input.platformCycle,
          amountMinor: 0,
          leadsPerWeek: 0,
          paymentId: input.merchantTransactionId,
          renewalDate: input.platformCycle === 'quarterly' ? expiryQuarterly : expiryMonthly,
          metadata: input.metadata || {},
        },
      }).catch(() => null)
    : null;

  const hasAddons = (input.addons.hot || 0) + (input.addons.warm || 0) + (input.addons.cold || 0) > 0;
  const marketplacePending = db.marketplaceLeadBundlePending && hasAddons
    ? await db.marketplaceLeadBundlePending.create({
        data: {
          providerId: input.providerId,
          bundleKey: `hot:${input.addons.hot}_warm:${input.addons.warm}_cold:${input.addons.cold}`,
          hotLeads: input.addons.hot || 0,
          warmLeads: input.addons.warm || 0,
          coldLeads: input.addons.cold || 0,
          amountMinor: 0,
          paymentId: input.merchantTransactionId,
          expiryDate: bundleExpiry,
          metadata: input.metadata || {},
        },
      }).catch(() => null)
    : null;

  const createdCount = [platformPending, leadPlanPending, marketplacePending].filter(Boolean).length;
  return { createdCount, platformPending, leadPlanPending, marketplacePending };
};

export const activateAllPendingComponents = async (input: { providerId: string; merchantTransactionId: string }) => {
  let platformActivated = 0;
  let leadPlanActivated = 0;
  let marketplaceActivated = 0;

  if (db.platformAccessPending) {
    const r = await db.platformAccessPending.updateMany({
      where: { providerId: input.providerId, paymentId: input.merchantTransactionId, status: 'pending' },
      data: { status: 'activated', activatedAt: new Date() },
    }).catch(() => ({ count: 0 }));
    platformActivated = Number(r.count || 0);
  }

  if (db.leadPlanPending) {
    const r = await db.leadPlanPending.updateMany({
      where: { providerId: input.providerId, paymentId: input.merchantTransactionId, status: 'pending' },
      data: { status: 'activated', activatedAt: new Date() },
    }).catch(() => ({ count: 0 }));
    leadPlanActivated = Number(r.count || 0);
  }

  if (db.marketplaceLeadBundlePending) {
    const r = await db.marketplaceLeadBundlePending.updateMany({
      where: { providerId: input.providerId, paymentId: input.merchantTransactionId, status: 'pending' },
      data: { status: 'activated', activatedAt: new Date() },
    }).catch(() => ({ count: 0 }));
    marketplaceActivated = Number(r.count || 0);
  }

  return {
    platformActivated,
    leadPlanActivated,
    marketplaceActivated,
    totalActivated: platformActivated + leadPlanActivated + marketplaceActivated,
  };
};

export const expirePendingComponents = async (input: { providerId: string; merchantTransactionId: string; reason?: string }) => {
  if (db.platformAccessPending) {
    await db.platformAccessPending.updateMany({
      where: { providerId: input.providerId, paymentId: input.merchantTransactionId, status: 'pending' },
      data: { status: 'expired', metadata: { reason: input.reason || 'payment_failed' } },
    }).catch(() => undefined);
  }

  if (db.leadPlanPending) {
    await db.leadPlanPending.updateMany({
      where: { providerId: input.providerId, paymentId: input.merchantTransactionId, status: 'pending' },
      data: { status: 'expired', metadata: { reason: input.reason || 'payment_failed' } },
    }).catch(() => undefined);
  }

  if (db.marketplaceLeadBundlePending) {
    await db.marketplaceLeadBundlePending.updateMany({
      where: { providerId: input.providerId, paymentId: input.merchantTransactionId, status: 'pending' },
      data: { status: 'expired', metadata: { reason: input.reason || 'payment_failed' } },
    }).catch(() => undefined);
  }

  return { expired: true };
};
