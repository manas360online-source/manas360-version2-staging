import { redis } from '../config/redis';

const DASHBOARD_VERSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const therapistDashboardVersionKey = (therapistId: string) => `therapist:dashboard:version:${therapistId}`;

const getTherapistDashboardVersion = async (therapistId: string): Promise<number> => {
  try {
    const raw = await redis.get(therapistDashboardVersionKey(therapistId));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
};

export const getTherapistDashboardCacheKey = async (
  scope: string,
  therapistId: string,
  query: unknown = '',
): Promise<string> => {
  const version = await getTherapistDashboardVersion(therapistId);
  return `therapist:dashboard:v${version}:${scope}:${therapistId}:${JSON.stringify(query)}`;
};

export const invalidateTherapistDashboardCache = async (therapistId: string): Promise<void> => {
  if (!therapistId) return;

  try {
    const version = await getTherapistDashboardVersion(therapistId);
    await redis.set(therapistDashboardVersionKey(therapistId), String(version + 1), DASHBOARD_VERSION_TTL_SECONDS);
  } catch {
    // Best-effort invalidation.
  }
};
