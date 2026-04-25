import cron from 'node-cron';
import { distributeWeeklyLeads, expireUnclaimedLeads, auditLeadConsistency, resetWeeklyLeadCounters } from '../services/lead-distribution.service';
import { logger } from '../utils/logger';
import { prisma } from '../config/db';
import { getPatientSubscriptionsDueForReminder } from '../services/patient-v1.service';
import { getEffectiveSubscriptionStatus } from '../services/subscription.helper';

/**
 * Auto-lock subscriptions that have exceeded their grace period
 */
const autoLockExpiredGraceSubscriptions = async () => {
  const now = new Date();
  const expiredGraceSubscriptions = await prisma.providerSubscription.findMany({
    where: {
      status: 'grace',
      metadata: {
        path: ['graceEndDate'],
        not: null,
      },
    },
		select: { id: true, providerId: true, status: true, metadata: true },
  });

  let lockedCount = 0;
  for (const sub of expiredGraceSubscriptions) {
		const effectiveStatus = getEffectiveSubscriptionStatus({
			status: sub.status,
			metadata: sub.metadata,
		});
		if (effectiveStatus === 'locked') {
      await prisma.providerSubscription.update({
        where: { id: sub.id },
        data: { status: 'locked' },
      });
      lockedCount++;
      logger.info(`[CRON] Auto-locked provider subscription ${sub.id} for provider ${sub.providerId}`);
    }
  }

  return { locked: lockedCount };
};

const sendSubscriptionReminder = async (subscription: {
	id: string;
	userId?: string;
	providerId?: string;
	planName: string;
	priceMinor: number;
	endsAt: string;
}) => {
	const targetUserId = String(subscription.userId || subscription.providerId || '');
	if (!targetUserId) return;

	const amountInr = Math.max(0, Math.round(Number(subscription.priceMinor || 0) / 100));
	const message = `Your ${subscription.planName} ends in 48 hours. Rs.${amountInr} will be auto-charged. Manage plan ->`;

	await prisma.notification.create({
		data: {
			userId: targetUserId,
			type: 'SUBSCRIPTION_RENEWAL_REMINDER',
			title: 'Subscription renewal reminder',
			message,
			payload: {
				subscriptionId: subscription.id,
				planName: subscription.planName,
				priceMinor: subscription.priceMinor,
				endsAt: subscription.endsAt,
				action: 'manage-plan',
			},
			sentAt: new Date(),
		},
	}).catch((err) => {
		logger.error('[CRON] Failed to create subscription reminder notification', {
			subscriptionId: subscription.id,
			error: err,
		});
	});
};

const send48HourSubscriptionReminders = async () => {
	const now = new Date();
	const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

	const providerSubscriptions = await prisma.providerSubscription.findMany({
		where: {
			status: { in: ['active', 'trial', 'grace'] },
			plan: { notIn: ['free'] as any },
		},
		select: {
			id: true,
			providerId: true,
			plan: true,
			price: true,
			status: true,
			expiryDate: true,
			metadata: true,
		},
	});

	const dueProviderSubscriptions = providerSubscriptions.filter((sub: any) => {
		const trialEndDate = sub?.metadata?.trialEndDate ? new Date(sub.metadata.trialEndDate) : null;
		const endDate = trialEndDate || (sub.expiryDate ? new Date(sub.expiryDate) : null);
		if (!endDate || Number.isNaN(endDate.getTime())) return false;
		return endDate.getTime() > now.getTime() && endDate.getTime() <= windowEnd.getTime();
	});

	const patientSubscriptions = await getPatientSubscriptionsDueForReminder(48);
	for (const sub of dueProviderSubscriptions) {
		const trialEndDate = sub?.metadata?.trialEndDate ? new Date(sub.metadata.trialEndDate) : null;
		const endDate = trialEndDate || (sub.expiryDate ? new Date(sub.expiryDate) : null);
		await sendSubscriptionReminder({
			id: String(sub.id),
			providerId: String(sub.providerId),
			planName: String(sub.plan || 'Plan'),
			priceMinor: Number((sub as any).price || 0),
			endsAt: endDate ? endDate.toISOString() : new Date().toISOString(),
		});
	}
	for (const sub of patientSubscriptions) {
		const detail = await prisma.patientSubscription.findUnique({
			where: { id: String(sub.id) },
			select: { id: true, userId: true, planName: true, price: true, renewalDate: true, metadata: true },
		});
		if (!detail) continue;
		const trialEndDate = detail?.metadata?.trialEndDate ? new Date(detail.metadata.trialEndDate) : null;
		const endDate = trialEndDate || (detail.renewalDate ? new Date(detail.renewalDate) : null);
		await sendSubscriptionReminder({
			id: String(detail.id),
			userId: String(detail.userId),
			planName: String(detail.planName || 'Plan'),
			priceMinor: Number(detail.price || 0),
			endsAt: endDate ? endDate.toISOString() : new Date().toISOString(),
		});
	}

	return {
		providersReminded: dueProviderSubscriptions.length,
		patientsReminded: patientSubscriptions.length,
	};
};

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
			const reset = await resetWeeklyLeadCounters();
			logger.info(`[CRON] Reset weekly lead counters for ${reset.reset} providers.`);
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

	// Daily grace period auto-lock: Every day at 03:00
	cron.schedule('0 3 * * *', async () => {
		try {
			const result = await autoLockExpiredGraceSubscriptions();
			logger.info(`[CRON] Auto-locked ${result.locked} expired grace period subscriptions.`);
		} catch (err) {
			logger.error('[CRON] Auto-lock grace subscriptions failed:', { error: err });
		}
	});

	// Daily 48-hour subscription reminders: Every day at 04:00
	cron.schedule('0 4 * * *', async () => {
		try {
			const result = await send48HourSubscriptionReminders();
			logger.info(`[CRON] Sent subscription reminders. Providers: ${result.providersReminded}, Patients: ${result.patientsReminded}.`);
		} catch (err) {
			logger.error('[CRON] Subscription reminder cron failed:', { error: err });
		}
	});

	logger.info('[CRON] Provider lead CRON jobs initialized.');
};
