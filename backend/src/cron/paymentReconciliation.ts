import { prisma } from '../config/db';
import { checkPhonePeStatus } from '../services/phonepe.service';
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
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export const reconcilePendingPayments = async (): Promise<{ checked: number; resolved: number; failed: number }> => {
	const db = prisma as any;
	const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

	// Find all INITIATED payments older than 2 minutes
	const pendingPayments = await db.financialPayment.findMany({
		where: {
			status: 'INITIATED',
			createdAt: {
				lt: cutoff
			}
		},
		select: {
			id: true,
			razorpayPaymentId: true,
			status: true,
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
		// Extract the merchantTransactionId from the payment record
		const merchantTransactionId = payment.razorpayPaymentId || payment.id;

		// Parse metadata to check reconciliation attempt count
		const meta = typeof payment.metadata === 'object' && payment.metadata ? payment.metadata : {};
		const attempts = Number((meta as any).reconciliationAttempts || 0);

		if (attempts >= MAX_RECONCILIATION_ATTEMPTS) {
			// Mark as failed after max attempts
			await db.financialPayment.update({
				where: { id: payment.id },
				data: {
					status: 'FAILED',
					metadata: { ...(meta as any), reconciliationAttempts: attempts, failedReason: 'MAX_RECONCILIATION_ATTEMPTS_EXCEEDED' },
				},
			});
			logger.warn('[Reconciliation] Payment marked FAILED after max attempts', {
				paymentId: payment.id,
				merchantTransactionId,
				attempts,
			});
			failed++;
			continue;
		}

		try {
			const statusResponse = await checkPhonePeStatus(merchantTransactionId);

			if (!statusResponse) {
				// PhonePe unreachable — increment attempt and skip
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						metadata: { ...(meta as any), reconciliationAttempts: attempts + 1 },
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
						metadata: { ...(meta as any), reconciliationAttempts: attempts + 1, phonePeState: state },
					},
				});
				logger.info('[Reconciliation] Pending payment resolved → FAILED', {
					paymentId: payment.id,
					merchantTransactionId,
					state,
				});
				failed++;
			} else {
				// Still PENDING — increment attempt counter
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						metadata: { ...(meta as any), reconciliationAttempts: attempts + 1, lastChecked: new Date().toISOString() },
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
			await db.financialPayment.update({
				where: { id: payment.id },
				data: {
					metadata: { ...(meta as any), reconciliationAttempts: attempts + 1 },
				},
			}).catch(() => {});
		}
	}

	logger.info('[Reconciliation] Cycle complete', { checked: pendingPayments.length, resolved, failed });
	return { checked: pendingPayments.length, resolved, failed };
};
