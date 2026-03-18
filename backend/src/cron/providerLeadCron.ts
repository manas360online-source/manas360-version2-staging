import cron from 'node-cron';
import { distributeWeeklyLeads, expireUnclaimedLeads, auditLeadConsistency } from '../services/lead-distribution.service';
import { logger } from '../utils/logger';

/**
 * Provider Lead Distribution CRON Jobs
 *
 * 1. Weekly lead distribution — Every Monday at 00:00
 * 2. Daily unclaimed lead expiry — Every day at 01:00
 */
let isDistributing = false;

export const initProviderLeadCron = () => {
	// Weekly lead distribution: Monday 00:00
	cron.schedule('0 0 * * 1', async () => {
		if (isDistributing) {
			logger.warn('[CRON] Lead distribution already running. Skipping duplicate trigger.');
			return;
		}
		isDistributing = true;
		try {
			const result = await distributeWeeklyLeads();
			logger.info(`[CRON] Distributed ${result.distributed} leads to ${result.providers} providers.`);
		} catch (err) {
			logger.error('[CRON] Lead distribution failed:', { error: err });
		} finally {
			isDistributing = false;
		}
	});

	// Daily unclaimed lead expiry: Every day at 01:00
	cron.schedule('0 1 * * *', async () => {
		try {
			const result = await expireUnclaimedLeads();
			logger.info(`[CRON] Expired ${result.expired} unclaimed leads.`);
		} catch (err) {
			logger.error('[CRON] Lead expiry check failed:', { error: err });
		}
	});

	// Daily consistency check: Every day at 02:00
	cron.schedule('0 2 * * *', async () => {
		try {
			const result = await auditLeadConsistency();
			logger.info(`[CRON] Audited ${result.audited} purchases. Fixed ${result.fixed} inconsistencies.`);
		} catch (err) {
			logger.error('[CRON] Consistency audit failed:', { error: err });
		}
	});

	logger.info('[CRON] Provider lead CRON jobs initialized.');
};
