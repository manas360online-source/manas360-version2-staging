import { prisma } from '../config/db';
import { logger } from '../utils/logger';

const DEFAULT_RETENTION_DAYS = 7;

export const cleanupIdempotencyKeys = async (retentionDays = DEFAULT_RETENTION_DAYS): Promise<number> => {
	const safeRetentionDays = Math.max(1, Math.min(30, Math.floor(Number(retentionDays) || DEFAULT_RETENTION_DAYS)));
	const threshold = new Date(Date.now() - safeRetentionDays * 24 * 60 * 60 * 1000);

	const result = await prisma.idempotencyKey.deleteMany({
		where: {
			createdAt: { lt: threshold },
		},
	});

	if (result.count > 0) {
		logger.info('[Idempotency] Cleanup completed', { retentionDays: safeRetentionDays, deletedCount: result.count });
	}

	return result.count;
};
