import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Track webhook to prevent duplicate processing
 * Returns true if this is a new webhook, false if duplicate
 */
export const trackWebhookEvent = async (eventId: string, eventType: string): Promise<boolean> => {
	try {
		// Check if webhook was already processed
		const existing = await prisma.webhookLog.findFirst({
			where: { provider: 'PHONEPE', eventId },
		});

		if (existing) {
			logger.info('[PhonePeWebhook] Duplicate webhook detected', {
				eventId,
				eventType,
				processedAt: existing.processedAt,
			});
			return false; // Duplicate
		}

		// Record this webhook
		const payloadHash = crypto.createHash('sha256').update(`${eventType}:${eventId}`).digest('hex');
		await prisma.webhookLog.create({
			data: {
				provider: 'PHONEPE',
				eventId,
				eventType,
				payloadHash,
				signature: 'PHONEPE_INTERNAL',
				isSignatureValid: true,
				rawPayload: { source: 'PHONEPE', eventType, eventId },
				processedAt: new Date(),
				processStatus: 'PROCESSED',
			},
		});

		return true; // New webhook
	} catch (error: any) {
		logger.error('[PhonePeWebhook] Failed to track webhook', { eventId, error: error?.message });
		// Continue processing even if tracking fails
		return true;
	}
};

/**
 * Process checkout.order.completed event
 */
export const processOrderCompletedEvent = async (payload: any): Promise<void> => {
	const merchantTransactionId = payload.merchantOrderId || payload.orderId;
	const state = payload.state;
	const amount = Number(payload.amount || 0);

	if (!merchantTransactionId) {
		throw new AppError('Missing merchantOrderId in webhook', 422);
	}

	if (state !== 'COMPLETED') {
		logger.warn('[PhonePeWebhook] Order state is not COMPLETED', {
			merchantTransactionId,
			state,
		});
		return;
	}

	logger.info('[PhonePeWebhook] Order completed', {
		merchantTransactionId,
		amount,
		paymentMode: payload.paymentDetails?.[0]?.paymentMode,
	});

	// Find and update payment record
	const payment = await prisma.financialPayment.findFirst({
		where: { merchantTransactionId: merchantTransactionId },
		include: { session: true },
	});

	if (!payment) {
		logger.error('[PhonePeWebhook] Unknown payment transaction', { merchantTransactionId });
		return;
	}

	// Idempotency: Skip if already captured
	if (payment.status === 'CAPTURED') {
		logger.debug('[PhonePeWebhook] Payment already captured, skipping duplicate', {
			paymentId: payment.id,
		});
		return;
	}

	// Validate amount
	if (amount !== Number(payment.amountMinor)) {
		logger.error('[PhonePeWebhook] Amount mismatch', {
			paymentId: payment.id,
			expected: payment.amountMinor,
			received: amount,
		});
		throw new AppError('Payment amount mismatch', 422);
	}

	// Update payment as captured
	await prisma.financialPayment.update({
		where: { id: payment.id },
		data: {
			status: 'CAPTURED',
			razorpayPaymentId: payload.paymentDetails?.[0]?.transactionId,
			capturedAt: new Date(),
			retryCount: 0,
			nextRetryAt: null,
			metadata: { ...payment.metadata, webhookEvent: 'checkout.order.completed' },
		},
	});

	// Invoice generation intentionally disabled.

	// ── Provider Platform Access activation ──
	const paymentMeta = (payment.metadata as any) || {};
	if (
		String(paymentMeta.type || '') === 'provider_platform_access'
		|| String(paymentMeta.flow || '') === 'provider_platform_access'
		|| String(merchantTransactionId).startsWith('PROV_PA_')
	) {
		const billingCycle = String(paymentMeta.billingCycle || 'monthly');
		const providerId = String(payment.providerId || '');
		if (providerId) {
			try {
				const { activatePlatformAccess } = await import('./platform-access.service');
				await activatePlatformAccess(providerId, billingCycle, merchantTransactionId);
				logger.info('[PhonePeWebhook] Platform access activated', { providerId, billingCycle });
			} catch (err: any) {
				logger.error('[PhonePeWebhook] Platform access activation failed', {
					providerId,
					error: err?.message,
				});
			}
		}
		return; // Platform access handled — no session to update
	}

	// ── Provider Lead Plan / Checkout activation (PROV_SUB_ prefix) ──
	if (String(merchantTransactionId).startsWith('PROV_SUB_') || String(paymentMeta.type || '') === 'provider_subscription') {
		const planKey = String(paymentMeta.plan || paymentMeta.planKey || 'free');
		const providerId = String(payment.providerId || '');
		if (providerId && planKey && planKey !== 'free') {
			try {
				const { activateProviderSubscription } = await import('./provider-subscription.service');
				await activateProviderSubscription(providerId, planKey as any, merchantTransactionId);
				logger.info('[PhonePeWebhook] Provider subscription activated', { providerId, planKey });
			} catch (err: any) {
				logger.error('[PhonePeWebhook] Provider subscription activation failed', {
					providerId,
					error: err?.message,
				});
			}
		}
		return;
	}

	// Update session as confirmed (patient session payments)
	if (payment.sessionId) {
		await prisma.financialSession.update({
			where: { id: payment.sessionId },
			data: {
				status: 'CONFIRMED',
				confirmedAt: new Date(),
			},
		});
	}

	logger.info('[PhonePeWebhook] Payment captured successfully', {
		paymentId: payment.id,
		sessionId: payment.sessionId,
	});
};

/**
 * Process checkout.order.failed event
 */
export const processOrderFailedEvent = async (payload: any): Promise<void> => {
	const merchantTransactionId = payload.merchantOrderId || payload.orderId;
	const state = payload.state;
	const errorCode = payload.paymentDetails?.[0]?.errorCode || payload.errorCode || 'UNKNOWN';
	const errorMessage = payload.paymentDetails?.[0]?.errorMessage || 'Payment failed';

	if (!merchantTransactionId) {
		throw new AppError('Missing merchantOrderId in webhook', 422);
	}

	logger.info('[PhonePeWebhook] Order failed', {
		merchantTransactionId,
		state,
		errorCode,
	});

	// Find and update payment record
	const payment = await prisma.financialPayment.findFirst({
		where: { merchantTransactionId: merchantTransactionId },
	});

	if (!payment) {
		logger.error('[PhonePeWebhook] Unknown payment transaction', { merchantTransactionId });
		return;
	}

	// Idempotency: Skip if already in terminal state
	if (['FAILED', 'CAPTURED', 'EXPIRED'].includes(payment.status)) {
		logger.debug('[PhonePeWebhook] Payment already in terminal state, skipping', {
			paymentId: payment.id,
			status: payment.status,
		});
		return;
	}

	// Update payment as failed
	await prisma.financialPayment.update({
		where: { id: payment.id },
		data: {
			status: 'FAILED',
			failedAt: new Date(),
			failureReason: `${errorCode}: ${errorMessage}`,
			retryCount: 0,
			nextRetryAt: null,
		},
	});

	logger.error('[PhonePeWebhook] Payment marked as failed', {
		paymentId: payment.id,
		reason: errorCode,
	});
};

/**
 * Process pg.refund.completed event
 */
export const processRefundCompletedEvent = async (payload: any): Promise<void> => {
	const merchantRefundId = payload.merchantRefundId;
	const originalMerchantOrderId = payload.originalMerchantOrderId;
	const refundId = payload.refundId;
	const amount = Number(payload.amount || 0);
	const state = payload.state;

	if ((!merchantRefundId && !refundId) || !originalMerchantOrderId) {
		throw new AppError('Missing refund identifiers in webhook', 422);
	}

	if (state !== 'COMPLETED') {
		logger.warn('[PhonePeWebhook] Refund state is not COMPLETED', {
			merchantRefundId,
			state,
		});
		return;
	}

	logger.info('[PhonePeWebhook] Refund completed', {
		merchantRefundId,
		refundId,
		amount,
	});

	// Find and update refund record
	const refund = merchantRefundId
		? await prisma.financialRefund.findUnique({
			where: { merchantRefundId },
			include: { payment: true },
		})
		: await prisma.financialRefund.findFirst({
			where: {
				originalMerchantOrderId,
				OR: [{ phonePeRefundId: refundId }, { phonePeRefundId: null }],
			},
			orderBy: { createdAt: 'desc' },
			include: { payment: true },
		});

	if (!refund) {
		logger.error('[PhonePeWebhook] Unknown refund transaction', { merchantRefundId });
		return;
	}

	// Idempotency: Skip if already completed
	if (refund.status === 'COMPLETED') {
		logger.debug('[PhonePeWebhook] Refund already completed, skipping duplicate', {
			refundId: refund.id,
		});
		return;
	}

	// Update refund as completed
	await prisma.financialRefund.update({
		where: { id: refund.id },
		data: {
			status: 'COMPLETED',
			phonePeRefundId: refundId,
			completedAt: new Date(),
			retrievedAt: new Date(),
			responseData: payload,
		},
	});

	// Update related payment status to REFUNDED
	if (refund.paymentId) {
		await prisma.financialPayment.update({
			where: { id: refund.paymentId },
			data: {
				status: 'REFUNDED',
				metadata: { refundId: refund.id, refundCompletedAt: new Date() },
			},
		});
	}

	logger.info('[PhonePeWebhook] Refund marked as completed', {
		refundId: refund.id,
		paymentId: refund.paymentId,
	});
};

/**
 * Process pg.refund.failed event
 */
export const processRefundFailedEvent = async (payload: any): Promise<void> => {
	const merchantRefundId = payload.merchantRefundId;
	const originalMerchantOrderId = payload.originalMerchantOrderId;
	const refundId = payload.refundId;
	const state = payload.state;
	const errorCode = payload.errorCode || 'UNKNOWN';
	const errorMessage = payload.detailedErrorCode || 'Refund failed';

	if ((!merchantRefundId && !refundId) || !originalMerchantOrderId) {
		throw new AppError('Missing refund identifiers in webhook', 422);
	}

	logger.info('[PhonePeWebhook] Refund failed', {
		merchantRefundId,
		refundId,
		state,
		errorCode,
	});

	// Find and update refund record
	const refund = merchantRefundId
		? await prisma.financialRefund.findUnique({
			where: { merchantRefundId },
		})
		: await prisma.financialRefund.findFirst({
			where: {
				originalMerchantOrderId,
				OR: [{ phonePeRefundId: refundId }, { phonePeRefundId: null }],
			},
			orderBy: { createdAt: 'desc' },
		});

	if (!refund) {
		logger.error('[PhonePeWebhook] Unknown refund transaction', { merchantRefundId });
		return;
	}

	// Idempotency: Skip if already in terminal state
	if (['FAILED', 'COMPLETED', 'CANCELLED'].includes(refund.status)) {
		logger.debug('[PhonePeWebhook] Refund already in terminal state, skipping', {
			refundId: refund.id,
			status: refund.status,
		});
		return;
	}

	// Update refund as failed
	await prisma.financialRefund.update({
		where: { id: refund.id },
		data: {
			status: 'FAILED',
			failedAt: new Date(),
			failureReason: `${errorCode}: ${errorMessage}`,
			retrievedAt: new Date(),
			responseData: payload,
		},
	});

	logger.error('[PhonePeWebhook] Refund marked as failed', {
		refundId: refund.id,
		reason: errorCode,
	});
};

/**
 * Main webhook processor - routes to appropriate handler
 */
export const processPhonePeWebhookEvent = async (event: string, payload: any): Promise<void> => {
	logger.info('[PhonePeWebhook] Processing event', { event });

	switch (event) {
		case 'checkout.order.completed':
			await processOrderCompletedEvent(payload);
			break;

		case 'checkout.order.failed':
			await processOrderFailedEvent(payload);
			break;

		case 'pg.refund.completed':
			await processRefundCompletedEvent(payload);
			break;

		case 'pg.refund.failed':
			await processRefundFailedEvent(payload);
			break;

		default:
			logger.warn('[PhonePeWebhook] Unknown event type', { event });
	}
};
