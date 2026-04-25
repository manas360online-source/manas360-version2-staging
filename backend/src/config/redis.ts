import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

// Memory fallback to ensure functionality without Redis
const memoryCache: Record<string, string> = {};

let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

if (process.env.NODE_ENV !== 'test') {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', (err) => {
    logger.warn('[Redis] Connection error. Falling back to memory cache.', { error: err.message });
    isRedisConnected = false;
  });

  redisClient.on('connect', () => {
    logger.info('[Redis] Connected successfully.');
    isRedisConnected = true;
  });

  redisClient.connect().catch((err) => {
    logger.error('[Redis] Failed to connect initially.', { error: err.message });
  });
}

export const redis = {
  /**
   * Set a key in Redis or memory fallback.
   */
  async set(key: string, value: string, ttl?: number) {
    logger.info(`[Cache] SET ${key}`);
    memoryCache[key] = value;
    
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, value);
        if (ttl) await redisClient.expire(key, ttl);
      } catch (err) {
        logger.warn(`[Redis] SET failed for ${key}`);
      }
    }
  },

  /**
   * Get a key from Redis or memory fallback.
   */
  async get(key: string): Promise<string | null> {
    if (isRedisConnected && redisClient) {
      try {
        const val = await redisClient.get(key);
        if (val !== null) return val;
      } catch (err) {
        logger.warn(`[Redis] GET failed for ${key}`);
      }
    }
    return memoryCache[key] || null;
  },

  /**
   * Delete a key.
   */
  async del(key: string) {
    delete memoryCache[key];
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(key);
      } catch (err) {
        logger.warn(`[Redis] DEL failed for ${key}`);
      }
    }
  }
};
