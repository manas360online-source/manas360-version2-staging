import { redis } from '../config/redis';

const DASHBOARD_VERSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const dashboardCacheVersionKey = (therapistId: string) => `provider:dashboard:version:${therapistId}`;

const getDashboardCacheVersion = async (therapistId: string): Promise<number> => {
  try {
    const raw = await redis.get(dashboardCacheVersionKey(therapistId));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
};

export const getProviderDashboardCacheKey = async (
  scope: string,
  therapistId: string,
  query: unknown = '',
): Promise<string> => {
  const version = await getDashboardCacheVersion(therapistId);
  return `provider:dashboard:v${version}:${scope}:${therapistId}:${JSON.stringify(query)}`;
};

export const invalidateProviderDashboardCache = async (therapistId: string): Promise<void> => {
  if (!therapistId) return;

  try {
    const version = await getDashboardCacheVersion(therapistId);
    await redis.set(dashboardCacheVersionKey(therapistId), String(version + 1), DASHBOARD_VERSION_TTL_SECONDS);
  } catch {
    // Best-effort invalidation.
  }
};
