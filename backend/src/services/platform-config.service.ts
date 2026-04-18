import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

export type PlatformConfigRecord = {
  key: string;
  value: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string | null;
};

type CacheEntry = {
  payload: PlatformConfigRecord;
  expiresAt: number;
};

type ListCacheEntry = {
  payload: PlatformConfigRecord[];
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const MEMORY_CACHE = new Map<string, CacheEntry>();
const LIST_MEMORY_CACHE = new Map<string, ListCacheEntry>();
const LIST_CACHE_KEY = 'platform_config:list:all';

let redisClient: RedisClientType | null = null;
let redisReady = false;
let redisInitAttempted = false;
let historyStoreEnsured = false;

const buildCacheKey = (key: string): string => `platform_config:${key}`;

const initRedis = async (): Promise<void> => {
  if (redisInitAttempted) return;
  redisInitAttempted = true;

  try {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on('error', (err) => {
      console.warn('[PlatformConfig] Redis error:', err);
      redisReady = false;
    });
    await redisClient.connect();
    redisReady = true;
  } catch (err) {
    console.warn('[PlatformConfig] Redis unavailable, falling back to memory cache:', err);
    redisReady = false;
  }
};

const getMemoryCache = (key: string): PlatformConfigRecord | null => {
  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.payload;
};

const setMemoryCache = (key: string, payload: PlatformConfigRecord): void => {
  MEMORY_CACHE.set(key, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

const setRedisCache = async (key: string, payload: PlatformConfigRecord): Promise<void> => {
  await initRedis();
  if (!redisReady || !redisClient) return;

  try {
    const cacheKey = buildCacheKey(key);
    await redisClient.set(cacheKey, JSON.stringify(payload), { PX: CACHE_TTL_MS });
  } catch (err) {
    console.warn('[PlatformConfig] Redis cache write failed:', err);
  }
};

const getRedisCache = async (key: string): Promise<PlatformConfigRecord | null> => {
  await initRedis();
  if (!redisReady || !redisClient) return null;

  try {
    const cacheKey = buildCacheKey(key);
    const raw = await redisClient.get(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlatformConfigRecord;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch (err) {
    console.warn('[PlatformConfig] Redis cache read failed:', err);
    return null;
  }
};

const setCache = async (key: string, payload: PlatformConfigRecord): Promise<void> => {
  setMemoryCache(key, payload);
  await setRedisCache(key, payload);
};

const listCachePayloadToRecords = (value: unknown): PlatformConfigRecord[] | null => {
  if (!Array.isArray(value)) return null;
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as PlatformConfigRecord;
      if (!record.key) return null;
      return {
        ...record,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      };
    })
    .filter((item): item is PlatformConfigRecord => item !== null);
};

const getListCache = async (): Promise<PlatformConfigRecord[] | null> => {
  const memoryEntry = LIST_MEMORY_CACHE.get(LIST_CACHE_KEY);
  if (memoryEntry) {
    if (Date.now() <= memoryEntry.expiresAt) return memoryEntry.payload;
    LIST_MEMORY_CACHE.delete(LIST_CACHE_KEY);
  }

  await initRedis();
  if (redisReady && redisClient) {
    try {
      const raw = await redisClient.get(LIST_CACHE_KEY);
      if (!raw) return null;
      return listCachePayloadToRecords(JSON.parse(raw));
    } catch (err) {
      console.warn('[PlatformConfig] Redis list cache read failed:', err);
    }
  }

  return null;
};

const setListCache = async (payload: PlatformConfigRecord[]): Promise<void> => {
  LIST_MEMORY_CACHE.set(LIST_CACHE_KEY, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  await initRedis();
  if (!redisReady || !redisClient) return;
  try {
    await redisClient.set(LIST_CACHE_KEY, JSON.stringify(payload), { PX: CACHE_TTL_MS });
  } catch (err) {
    console.warn('[PlatformConfig] Redis list cache write failed:', err);
  }
};

const clearListCache = async (): Promise<void> => {
  LIST_MEMORY_CACHE.delete(LIST_CACHE_KEY);
  await initRedis();
  if (!redisReady || !redisClient) return;
  try {
    await redisClient.del(LIST_CACHE_KEY);
  } catch (err) {
    console.warn('[PlatformConfig] Redis list cache delete failed:', err);
  }
};

const clearCache = async (key: string): Promise<void> => {
  MEMORY_CACHE.delete(key);
  await initRedis();
  if (!redisReady || !redisClient) return;
  try {
    await redisClient.del(buildCacheKey(key));
  } catch (err) {
    console.warn('[PlatformConfig] Redis cache delete failed:', err);
  }
};

const normalizeRecord = (row: { key: string; value: unknown; version: number; createdAt: Date; updatedAt: Date; updatedById: string | null; }): PlatformConfigRecord => ({
  key: row.key,
  value: row.value,
  version: row.version,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  updatedById: row.updatedById,
});

const ensurePlatformConfigHistoryStore = async (): Promise<void> => {
  if (historyStoreEnsured) return;

  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS platform_config_history (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      version INTEGER NOT NULL,
      value JSONB NOT NULL,
      changed_by_id TEXT NULL,
      operation TEXT NOT NULL,
      changed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  );

  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS idx_platform_config_history_key_version ON platform_config_history(key, version)',
  );

  historyStoreEnsured = true;
};

const randomId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;

const recordHistorySnapshot = async (input: {
  key: string;
  version: number;
  value: unknown;
  changedById?: string | null;
  operation: 'CREATE' | 'UPDATE' | 'ROLLBACK';
}): Promise<void> => {
  await ensurePlatformConfigHistoryStore();
  await prisma.$executeRawUnsafe(
    `INSERT INTO platform_config_history (id, key, version, value, changed_by_id, operation)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    randomId(),
    input.key,
    input.version,
    JSON.stringify(input.value ?? null),
    input.changedById ?? null,
    input.operation,
  );
};

export const getPlatformConfig = async (key: string, options?: { allowMissing?: boolean }): Promise<PlatformConfigRecord | null> => {
  const trimmedKey = key.trim();
  if (!trimmedKey) throw new AppError('Config key is required', 400);

  const cached = getMemoryCache(trimmedKey);
  if (cached) return cached;

  const redisCached = await getRedisCache(trimmedKey);
  if (redisCached) {
    setMemoryCache(trimmedKey, redisCached);
    return redisCached;
  }

  const row = await prisma.platformConfig.findUnique({ where: { key: trimmedKey } });
  if (!row) {
    if (options?.allowMissing) return null;
    throw new AppError('Config not found', 404);
  }

  const payload = normalizeRecord(row);
  await setCache(trimmedKey, payload);
  return payload;
};

export const listPlatformConfigs = async (keys?: string[]): Promise<PlatformConfigRecord[]> => {
  const normalizedKeys = (keys ?? []).map((k) => k.trim()).filter(Boolean);

  if (!normalizedKeys.length) {
    const cached = await getListCache();
    if (cached) return cached;
  }

  const rows = await prisma.platformConfig.findMany({
    where: normalizedKeys.length ? { key: { in: normalizedKeys } } : undefined,
    orderBy: { key: 'asc' },
  });

  if (!normalizedKeys.length) {
    const payload = rows.map((row) => normalizeRecord(row));
    await setListCache(payload);
    return payload;
  }

  return rows.map((row) => normalizeRecord(row));
};

export const upsertPlatformConfig = async (input: {
  key: string;
  value: unknown;
  updatedById?: string | null;
  expectedVersion?: number;
}): Promise<{ config: PlatformConfigRecord; previous: PlatformConfigRecord | null }> => {
  const trimmedKey = input.key.trim();
  if (!trimmedKey) throw new AppError('Config key is required', 400);

  const existing = await prisma.platformConfig.findUnique({ where: { key: trimmedKey } });

  if (input.expectedVersion !== undefined) {
    if (!existing && input.expectedVersion !== 0) {
      throw new AppError('Config version mismatch', 409, { expected: input.expectedVersion, actual: 0 });
    }
    if (existing && existing.version !== input.expectedVersion) {
      throw new AppError('Config version mismatch', 409, { expected: input.expectedVersion, actual: existing.version });
    }
  }

  const previous = existing ? normalizeRecord(existing) : null;

  const updated = existing
    ? await prisma.platformConfig.update({
        where: { key: trimmedKey },
        data: {
          value: input.value as any,
          version: existing.version + 1,
          updatedById: input.updatedById ?? null,
        },
      })
    : await prisma.platformConfig.create({
        data: {
          key: trimmedKey,
          value: input.value as any,
          version: 1,
          updatedById: input.updatedById ?? null,
        },
      });

  const payload = normalizeRecord(updated);
  await setCache(trimmedKey, payload);
  await clearListCache();

  await recordHistorySnapshot({
    key: trimmedKey,
    version: payload.version,
    value: payload.value,
    changedById: input.updatedById ?? null,
    operation: previous ? 'UPDATE' : 'CREATE',
  });

  return { config: payload, previous };
};

export const rollbackPlatformConfig = async (input: {
  key: string;
  targetVersion: number;
  updatedById?: string | null;
  expectedVersion?: number;
}): Promise<{ config: PlatformConfigRecord; previous: PlatformConfigRecord; targetVersion: number }> => {
  const trimmedKey = input.key.trim();
  if (!trimmedKey) throw new AppError('Config key is required', 400);
  if (!Number.isInteger(input.targetVersion) || input.targetVersion < 1) {
    throw new AppError('targetVersion must be a positive integer', 400);
  }

  const current = await prisma.platformConfig.findUnique({ where: { key: trimmedKey } });
  if (!current) {
    throw new AppError('Config not found', 404);
  }

  if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
    throw new AppError('Config version mismatch', 409, { expected: input.expectedVersion, actual: current.version });
  }

  await ensurePlatformConfigHistoryStore();
  const historyRows = (await prisma.$queryRawUnsafe(
    `SELECT value
     FROM platform_config_history
     WHERE key = $1 AND version = $2
     ORDER BY changed_at DESC
     LIMIT 1`,
    trimmedKey,
    input.targetVersion,
  )) as Array<{ value: unknown }>;

  const targetValue = historyRows[0]?.value;
  if (targetValue === undefined) {
    throw new AppError(`Target version ${input.targetVersion} not found in config history`, 404);
  }

  const previous = normalizeRecord(current);
  const updated = await prisma.platformConfig.update({
    where: { key: trimmedKey },
    data: {
      value: targetValue as any,
      version: current.version + 1,
      updatedById: input.updatedById ?? null,
    },
  });

  const payload = normalizeRecord(updated);
  await setCache(trimmedKey, payload);
  await clearListCache();

  await recordHistorySnapshot({
    key: trimmedKey,
    version: payload.version,
    value: payload.value,
    changedById: input.updatedById ?? null,
    operation: 'ROLLBACK',
  });

  return { config: payload, previous, targetVersion: input.targetVersion };
};

export const invalidatePlatformConfig = async (key: string): Promise<void> => {
  await clearCache(key);
  await clearListCache();
};
