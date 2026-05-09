import { prisma } from '../config/db';
import { redis } from '../config/redis';

type AdminSummaryStat = {
  label: string;
  value: string;
  note?: string;
};

type AdminSummaryItem = {
  title: string;
  subtitle: string;
  meta?: string;
};

export type AdminModuleSummary = {
  module: string;
  stats: AdminSummaryStat[];
  items: AdminSummaryItem[];
  refreshedAt: string;
};

const db = prisma as any;
const ADMIN_MODULE_CACHE_TTL_SECONDS = 45;

const buildCacheKey = (module: string): string => `admin:module-summary:${module.toLowerCase()}`;

const readJsonCache = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch {
    return null;
  }
};

const writeJsonCache = async (key: string, payload: unknown): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(payload), ADMIN_MODULE_CACHE_TTL_SECONDS);
  } catch {
    // Best-effort cache write.
  }
};

const formatCurrencyINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatNumber = (value: number): string => new Intl.NumberFormat('en-IN').format(value);

const titleFromModule = (module: string): string =>
  module
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getAdminModuleSummary = async (module: string): Promise<AdminModuleSummary> => {
  const moduleKey = module.toLowerCase();
  const cacheKey = buildCacheKey(moduleKey);
  const cached = await readJsonCache<AdminModuleSummary>(cacheKey);
  if (cached) return cached;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalTherapists,
      verifiedTherapists,
      newUsers7d,
      completedSessions,
      sessions7d,
      activeSubscriptions,
      newSubscriptions7d,
      revenueAgg,
      latestUsers,
      latestSubscriptions,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'THERAPIST' } }),
      db.user.count({ where: { role: 'THERAPIST', isTherapistVerified: true } }),
      db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.therapySession.count({ where: { status: 'COMPLETED' } }),
      db.therapySession.count({ where: { status: 'COMPLETED', createdAt: { gte: sevenDaysAgo } } }),
      db.marketplaceSubscription.count({ where: { status: 'ACTIVE' } }),
      db.marketplaceSubscription.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.revenueLedger.aggregate({ _sum: { grossAmountMinor: true } }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
      }),
      db.marketplaceSubscription.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    const grossMinor = Number(revenueAgg?._sum?.grossAmountMinor ?? 0);
    const grossRevenue = grossMinor / 100;

    const baseStats: AdminSummaryStat[] = [
      { label: 'Users', value: formatNumber(totalUsers), note: `${formatNumber(newUsers7d)} new in last 7d` },
      { label: 'Therapists', value: formatNumber(totalTherapists), note: `${formatNumber(verifiedTherapists)} verified` },
      { label: 'Completed Sessions', value: formatNumber(completedSessions), note: `${formatNumber(sessions7d)} in last 7d` },
      { label: 'Revenue', value: formatCurrencyINR(grossRevenue), note: 'From revenue ledger' },
      { label: 'Active Subscriptions', value: formatNumber(activeSubscriptions), note: `${formatNumber(newSubscriptions7d)} new in last 7d` },
    ];

    const userItems: AdminSummaryItem[] = latestUsers.map((user: any) => ({
      title: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || user.id,
      subtitle: `${String(user.role || '').toLowerCase()} · ${user.email || 'no email'}`,
      meta: `Created ${new Date(user.createdAt).toLocaleDateString('en-IN')}`,
    }));

    const subscriptionItems: AdminSummaryItem[] = latestSubscriptions.map((sub: any) => {
      const displayName = `${sub.user?.firstName ?? ''} ${sub.user?.lastName ?? ''}`.trim() || sub.user?.email || 'Subscription';
      return {
        title: displayName,
        subtitle: `${String(sub.plan || '').toLowerCase()} · ${String(sub.status || '').toLowerCase()}`,
        meta: `Started ${new Date(sub.createdAt).toLocaleDateString('en-IN')}`,
      };
    });

    const financeModules = new Set(['revenue', 'payouts', 'invoices']);
    const userModules = new Set(['user-approvals', 'users', 'roles', 'user-growth', 'therapist-performance']);

    const items = financeModules.has(moduleKey)
      ? subscriptionItems
      : userModules.has(moduleKey)
        ? userItems
        : [...userItems.slice(0, 3), ...subscriptionItems.slice(0, 2)];

    const payload = {
      module: titleFromModule(moduleKey),
      stats: baseStats,
      items,
      refreshedAt: now.toISOString(),
    };

    await writeJsonCache(cacheKey, payload);
    return payload;
  } catch {
    const payload = {
      module: titleFromModule(moduleKey),
      stats: [
        { label: 'Users', value: '0', note: 'Backend summary unavailable' },
        { label: 'Therapists', value: '0', note: 'Backend summary unavailable' },
        { label: 'Completed Sessions', value: '0', note: 'Backend summary unavailable' },
        { label: 'Revenue', value: '₹0', note: 'Backend summary unavailable' },
        { label: 'Active Subscriptions', value: '0', note: 'Backend summary unavailable' },
      ],
      items: [
        {
          title: `${titleFromModule(moduleKey)} data unavailable`,
          subtitle: 'Loaded from backend fallback while the live summary query recovers',
          meta: new Date().toISOString(),
        },
      ],
      refreshedAt: new Date().toISOString(),
    };

    await writeJsonCache(cacheKey, payload);
    return payload;
  }
};
