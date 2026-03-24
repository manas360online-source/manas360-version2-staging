import crypto from 'crypto';
import { createClient } from 'redis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;
const redis = createClient({ url: env.redisUrl });
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
	redis.on('error', (error) => {
		console.warn('[subscription.service] Redis unavailable, continuing with degraded idempotency cache', error);
	});
	void redis.connect().catch(() => undefined);
}

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

