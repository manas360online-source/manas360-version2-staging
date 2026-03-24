import { prisma } from '../config/db';
import { checkPhonePeStatus } from '../services/phonepe.service';
import {
	recordPaymentFailedMetric,
	recordPaymentRetryAttemptMetric,
	checkPaymentFailureAlert,
	checkRetryAttemptAlert,
	checkZeroSuccessAlert,
} from '../services/payment-metrics.service';
import { markSubscriptionPastDue } from '../services/payment-notification.service';
import { processPhonePeWebhook } from '../services/payment.service';
import { logger } from '../utils/logger';

/**
 * PhonePe Reconciliation Worker
 *
 * PhonePe MANDATES a specific polling schedule for PENDING payments:
 * - First check at 20-25s after initiation
 * - Then: 3s intervals (30s), 6s intervals (60s), 10s, 30s, 60s, 10min
 * - This worker runs every 30s via CRON and processes all stale PENDING payments.
 *
 * Any transaction pending >2 min gets polled. After 8 failed checks, it's marked FAILED.
 */

const MAX_RECONCILIATION_ATTEMPTS = 8;
const MAX_FAILED_RETRIES = 3;
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const EXPIRE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const RETRY_BASE_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const RETRY_MAX_DELAY_MS = 60 * 60 * 1000; // 60 minutes

const computeNextRetryAt = (retryCount: number): Date => {
	const boundedRetry = Math.max(0, retryCount);
	const delay = Math.min(RETRY_BASE_DELAY_MS * (2 ** boundedRetry), RETRY_MAX_DELAY_MS);
	return new Date(Date.now() + delay);
};

export const reconcilePendingPayments = async (): Promise<{ checked: number; resolved: number; failed: number }> => {
	const db = prisma as any;
	const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
	const now = new Date();

	// Find stale INITIATED payments and FAILED payments due for retry.
	const pendingPayments = await db.financialPayment.findMany({
		where: {
			OR: [
				{
					status: 'INITIATED',
					createdAt: {
						lt: cutoff,
					},
				},
				{
					status: 'FAILED',
					retryCount: { lt: MAX_FAILED_RETRIES },
					nextRetryAt: { lte: now },
				},
			],
		},
		select: {
			id: true,
			merchantTransactionId: true,
			razorpayPaymentId: true,
			status: true,
			retryCount: true,
			nextRetryAt: true,
			failureReason: true,
			createdAt: true,
			metadata: true,
		},
		take: 20, // Process max 20 at a time to avoid overloading PhonePe
	});

	if (pendingPayments.length === 0) {
		return { checked: 0, resolved: 0, failed: 0 };
	}

	let resolved = 0;
	let failed = 0;

	for (const payment of pendingPayments) {
		// Extract merchant transaction id
		const merchantTransactionId = String((payment as any).merchantTransactionId || payment.razorpayPaymentId || payment.id);
		const paymentStatus = String((payment as any).status || '').toUpperCase();

		// Parse metadata to check reconciliation attempt count
		const meta = typeof payment.metadata === 'object' && payment.metadata ? payment.metadata : {};
		const attempts = Number((meta as any).reconciliationAttempts || 0);
		const retryCount = Number((payment as any).retryCount || 0);
		const ageMs = Date.now() - new Date(payment.createdAt).getTime();

		if (paymentStatus === 'FAILED') {
			await recordPaymentRetryAttemptMetric({
				paymentId: String(payment.id),
				transactionId: merchantTransactionId,
				reason: String((payment as any).failureReason || 'scheduled_retry'),
			});
		}

		if (paymentStatus === 'INITIATED' && ageMs >= EXPIRE_THRESHOLD_MS) {
			await db.financialPayment.update({
				where: { id: payment.id },
				data: {
					status: 'EXPIRED',
					failedAt: new Date(),
					failureReason: 'EXPIRED_PENDING_PAYMENT',
					nextRetryAt: null,
					metadata: { ...(meta as any), failedReason: 'EXPIRED_PENDING_PAYMENT', expiredAt: new Date().toISOString() },
				},
			});
			await recordPaymentFailedMetric({
				paymentId: String(payment.id),
				transactionId: merchantTransactionId,
				reason: 'EXPIRED_PENDING_PAYMENT',
				channel: merchantTransactionId.startsWith('SESS_')
					? 'session'
					: merchantTransactionId.startsWith('SUB_')
						? 'patient_subscription'
						: merchantTransactionId.startsWith('PROV_SUB_')
							? 'provider_subscription'
							: 'unknown',
			});
			failed++;
			continue;
		}

		if (paymentStatus === 'INITIATED' && attempts >= MAX_RECONCILIATION_ATTEMPTS) {
			if (retryCount >= MAX_FAILED_RETRIES) {
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						status: 'FAILED',
						failedAt: new Date(),
						failureReason: 'MAX_RECONCILIATION_ATTEMPTS_EXCEEDED',
						nextRetryAt: null,
						metadata: { ...(meta as any), reconciliationAttempts: attempts, failedReason: 'MAX_RECONCILIATION_ATTEMPTS_EXCEEDED' },
					},
				});
				await recordPaymentFailedMetric({
					paymentId: String(payment.id),
					transactionId: merchantTransactionId,
					reason: 'MAX_RECONCILIATION_ATTEMPTS_EXCEEDED',
					channel: merchantTransactionId.startsWith('SESS_')
						? 'session'
						: merchantTransactionId.startsWith('SUB_')
							? 'patient_subscription'
							: merchantTransactionId.startsWith('PROV_SUB_')
								? 'provider_subscription'
								: 'unknown',
				});

				// DEAD-LETTER: Payment exhausted all retries — mark subscription PAST_DUE
				await handlePaymentDeadLetter({
					paymentId: String(payment.id),
					reason: 'MAX_RECONCILIATION_ATTEMPTS_EXCEEDED',
					merchantTransactionId,
					metadata: meta as any,
				});

				failed++;
				continue;
			}

			const nextRetryAt = computeNextRetryAt(retryCount);
			await db.financialPayment.update({
				where: { id: payment.id },
				data: {
					status: 'FAILED',
					retryCount: retryCount + 1,
					nextRetryAt,
					failedAt: new Date(),
					failureReason: 'MAX_RECONCILIATION_ATTEMPTS_EXCEEDED',
					metadata: {
						...(meta as any),
						reconciliationAttempts: attempts,
						failedReason: 'MAX_RECONCILIATION_ATTEMPTS_EXCEEDED',
						retryScheduledAt: new Date().toISOString(),
						nextRetryAt: nextRetryAt.toISOString(),
					},
				},
			});
			logger.warn('[Reconciliation] Payment marked FAILED after max attempts', {
				paymentId: payment.id,
				merchantTransactionId,
				attempts,
				retryCount: retryCount + 1,
				nextRetryAt: nextRetryAt.toISOString(),
			});
			continue;
		}

		try {
			const statusResponse = await checkPhonePeStatus(merchantTransactionId);

			if (!statusResponse) {
				// PhonePe unreachable — increment attempt and schedule retry if this record is already FAILED.
				const nextRetryData = paymentStatus === 'FAILED'
					? {
						retryCount: retryCount + 1,
						nextRetryAt: computeNextRetryAt(retryCount),
						failedAt: new Date(),
						failureReason: 'PHONEPE_UNREACHABLE',
					}
					: {};
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						metadata: { ...(meta as any), reconciliationAttempts: attempts + 1 },
						...nextRetryData,
					},
				});
				continue;
			}

			const state = String(statusResponse?.data?.state || statusResponse?.code || '').toUpperCase();

			if (state === 'COMPLETED' || statusResponse?.code === 'PAYMENT_SUCCESS') {
				// Payment completed — process it
				await processPhonePeWebhook(statusResponse);
				logger.info('[Reconciliation] Pending payment resolved → COMPLETED', {
					paymentId: payment.id,
					merchantTransactionId,
					attempt: attempts + 1,
				});
				resolved++;
			} else if (state === 'FAILED' || state === 'DECLINED' || statusResponse?.code === 'PAYMENT_ERROR') {
				// Payment failed at PhonePe
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						status: 'FAILED',
						failedAt: new Date(),
						failureReason: `PHONEPE_${state || 'PAYMENT_ERROR'}`,
						nextRetryAt: null,
						metadata: { ...(meta as any), reconciliationAttempts: attempts + 1, phonePeState: state },
					},
				});
				if (paymentStatus === 'INITIATED') {
					await recordPaymentFailedMetric({
						paymentId: String(payment.id),
						transactionId: merchantTransactionId,
						reason: `PHONEPE_${state || 'PAYMENT_ERROR'}`,
						channel: merchantTransactionId.startsWith('SESS_')
							? 'session'
							: merchantTransactionId.startsWith('SUB_')
								? 'patient_subscription'
								: merchantTransactionId.startsWith('PROV_SUB_')
									? 'provider_subscription'
									: 'unknown',
					});
				}
				logger.info('[Reconciliation] Pending payment resolved → FAILED', {
					paymentId: payment.id,
					merchantTransactionId,
					state,
				});
				failed++;
			} else {
				// Still PENDING — increment attempt counter, schedule retry when currently in FAILED state.
				const nextRetryData = paymentStatus === 'FAILED'
					? {
						retryCount: retryCount + 1,
						nextRetryAt: computeNextRetryAt(retryCount),
						failedAt: new Date(),
						failureReason: 'PAYMENT_STILL_PENDING',
					}
					: {};
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						metadata: { ...(meta as any), reconciliationAttempts: attempts + 1, lastChecked: new Date().toISOString() },
						...nextRetryData,
					},
				});
			}
		} catch (err) {
			logger.error('[Reconciliation] Error checking payment status', {
				paymentId: payment.id,
				merchantTransactionId,
				error: err,
			});
			// Increment attempt even on error
			const nextRetryData = paymentStatus === 'FAILED'
				? {
					retryCount: retryCount + 1,
					nextRetryAt: computeNextRetryAt(retryCount),
					failedAt: new Date(),
					failureReason: 'RECONCILIATION_ERROR',
				}
				: {};
			await db.financialPayment.update({
				where: { id: payment.id },
				data: {
					metadata: { ...(meta as any), reconciliationAttempts: attempts + 1 },
					...nextRetryData,
				},
			}).catch(() => {});
		}
	}

	logger.info('[Reconciliation] Cycle complete', { checked: pendingPayments.length, resolved, failed });

	// Run alert checks after reconciliation cycle completes
	await checkPaymentFailureAlert();
	await checkRetryAttemptAlert();
	await checkZeroSuccessAlert();

	return { checked: pendingPayments.length, resolved, failed };
};

/**
 * Handle dead-letter payment: mark subscription PAST_DUE and trigger notifications
 */
const handlePaymentDeadLetter = async (input: {
	paymentId: string;
	reason: string;
	merchantTransactionId: string;
	metadata?: Record<string, any>;
}): Promise<void> => {
	try {
		const db = prisma as any;

		// Fetch payment details including user/subscription reference
		const payment = await db.financialPayment.findUnique({
			where: { id: input.paymentId },
			select: {
				id: true,
				patientId: true,
				providerId: true,
				metadata: true,
			},
		});

		if (!payment) return;

		const channel = input.merchantTransactionId.startsWith('SESS_')
			? 'session'
			: input.merchantTransactionId.startsWith('SUB_')
				? 'patient_subscription'
				: input.merchantTransactionId.startsWith('PROV_SUB_')
					? 'provider_subscription'
					: 'unknown';

		// For subscription payments, mark subscription PAST_DUE
		if ((channel === 'patient_subscription' || channel === 'provider_subscription') && (payment.patientId || payment.providerId)) {
			const userId = payment.patientId || payment.providerId;

			if (channel === 'patient_subscription' && payment.patientId) {
				// Find active patient subscription
				const subscription = await db.patientSubscription.findFirst({
					where: { patientId: payment.patientId, status: { in: ['ACTIVE', 'RENEWAL_PENDING'] } },
					select: { id: true, patientId: true },
				});

				if (subscription) {
					// Fetch user email for notification
					const user = await db.user.findUnique({
						where: { id: subscription.patientId },
						select: { email: true },
					});

					await markSubscriptionPastDue({
						subscriptionId: subscription.id,
						subscriptionType: 'patient',
						userId: String(subscription.patientId),
						userEmail: user?.email,
						paymentId: input.paymentId,
						reason: input.reason,
					});
				}
			} else if (channel === 'provider_subscription' && payment.providerId) {
				// Find active provider subscription
				const subscription = await db.providerSubscription.findFirst({
					where: { providerId: payment.providerId, status: { in: ['ACTIVE', 'RENEWAL_PENDING'] } },
					select: { id: true, providerId: true },
				});

				if (subscription) {
					// Fetch provider email for notification
					const provider = await db.user.findUnique({
						where: { id: subscription.providerId },
						select: { email: true },
					});

					await markSubscriptionPastDue({
						subscriptionId: subscription.id,
						subscriptionType: 'provider',
						userId: String(subscription.providerId),
						userEmail: provider?.email,
						paymentId: input.paymentId,
						reason: input.reason,
					});
				}
			}
		}

		logger.info('[DeadLetter] Payment dead-letter handling complete', {
			paymentId: input.paymentId,
			reason: input.reason,
			channel,
		});
	} catch (err) {
		logger.error('[DeadLetter] Error handling payment dead-letter', {
			paymentId: input.paymentId,
			error: err,
		});
	}
};
