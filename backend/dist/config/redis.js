"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
// Memory fallback to ensure functionality without Redis
const memoryCache = {};
let redisClient = null;
let isRedisConnected = false;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
if (process.env.NODE_ENV !== 'test') {
    redisClient = (0, redis_1.createClient)({ url: REDIS_URL });
    redisClient.on('error', (err) => {
        logger_1.logger.warn('[Redis] Connection error. Falling back to memory cache.', { error: err.message });
        isRedisConnected = false;
    });
    redisClient.on('connect', () => {
        logger_1.logger.info('[Redis] Connected successfully.');
        isRedisConnected = true;
    });
    redisClient.connect().catch((err) => {
        logger_1.logger.error('[Redis] Failed to connect initially.', { error: err.message });
    });
}
exports.redis = {
    /**
     * Set a key in Redis or memory fallback.
     */
    async set(key, value, ttl) {
        logger_1.logger.info(`[Cache] SET ${key}`);
        memoryCache[key] = value;
        if (isRedisConnected && redisClient) {
            try {
                await redisClient.set(key, value);
                if (ttl)
                    await redisClient.expire(key, ttl);
            }
            catch (err) {
                logger_1.logger.warn(`[Redis] SET failed for ${key}`);
            }
        }
    },
    /**
     * Get a key from Redis or memory fallback.
     */
    async get(key) {
        if (isRedisConnected && redisClient) {
            try {
                const val = await redisClient.get(key);
                if (val !== null)
                    return val;
            }
            catch (err) {
                logger_1.logger.warn(`[Redis] GET failed for ${key}`);
            }
        }
        return memoryCache[key] || null;
    },
    /**
     * Delete a key.
     */
    async del(key) {
        delete memoryCache[key];
        if (isRedisConnected && redisClient) {
            try {
                await redisClient.del(key);
            }
            catch (err) {
                logger_1.logger.warn(`[Redis] DEL failed for ${key}`);
            }
        }
    }
};
