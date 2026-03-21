import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import { prisma } from '../config/db';
import {
	createSessionPayment,
	processRazorpayWebhook,
	processPhonePeWebhook,
	releaseSessionEarnings,
} from '../services/payment.service';
import { processSubscriptionWebhook } from '../services/subscription.service';
import { 
	verifyPhonePeWebhook, 
	checkPhonePeStatus, 
	initiatePhonePeRefund, 
	checkPhonePeRefundStatus,
	verifyPhonePeWebhookAuth,
	isPhonePeWebhookIP,
	getClientIpFromRequest,
} from '../services/phonepe.service';
import { 
	trackWebhookEvent,
	processPhonePeWebhookEvent,
} from '../services/phonepeWebhook.service';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}
	return userId;
};

export const createSessionPaymentController = async (req: Request, res: Response): Promise<void> => {
	const patientId = getAuthUserId(req);
	const providerId = String(req.body.providerId ?? '').trim();
	const amountMinor = Number(req.body.amountMinor);
	const currency = String(req.body.currency ?? 'INR');

	if (!providerId) {
		throw new AppError('providerId is required', 422);
	}

	if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
		throw new AppError('amountMinor must be > 0', 422);
	}

	const result = await createSessionPayment({
		patientId,
		providerId,
		amountMinor,
		currency,
	});

	sendSuccess(res, result, 'Session payment initiated', 201);
};

export const completeFinancialSessionController = async (req: Request, res: Response): Promise<void> => {
	const therapistId = getAuthUserId(req);
	const sessionId = String(req.params.id ?? '').trim();
	if (!sessionId) {
		throw new AppError('session id is required', 422);
	}

	await releaseSessionEarnings(sessionId, therapistId);
	sendSuccess(res, { sessionId }, 'Session earnings released');
};

export const razorpayWebhookController = async (req: Request, res: Response): Promise<void> => {
	const signature = String(req.headers['x-razorpay-signature'] ?? '');
	if (!signature) {
		throw new AppError('Missing x-razorpay-signature', 401);
	}

	const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
	const event = req.body as any;
	const eventType = String(event?.event ?? '');
	const hasSubscriptionEntity = Boolean(
		event?.payload?.subscription?.entity || event?.payload?.payment?.entity?.subscription,
	);

	let result;
	if (eventType.startsWith('subscription.') || (eventType === 'payment.failed' && hasSubscriptionEntity)) {
		result = await processSubscriptionWebhook(rawBody, signature);
	} else {
		result = await processRazorpayWebhook(rawBody, signature);
	}

	res.status(200).json({ success: true, ...result });
};

export const phonepeWebhookController = async (req: Request, res: Response): Promise<void> => {
	const shouldAllowProbeBypass = env.isDevelopment
		&& env.allowDevPhonePeWebhookProbeBypass
		&& !req.headers['x-verify'];

	if (shouldAllowProbeBypass) {
		res.status(200).json({ success: true, handled: true, message: 'PhonePe webhook probe accepted (dev bypass)' });
		return;
	}

	// ========== IP WHITELIST VALIDATION ==========
	const clientIp = getClientIpFromRequest(req);
	if (!isPhonePeWebhookIP(clientIp)) {
		logger.warn('[PhonePeWebhook] Request from unauthorized IP', { clientIp });
		// Don't throw error - IP whitelisting is optional, just log
		// In production with strict firewall rules, this layer provides defense-in-depth
	}

	// ========== AUTHORIZATION HEADER VALIDATION ==========
	// NOTE: PhonePe webhook authentication is done via X-VERIFY checksum.
	// Legacy username/password auth is intentionally disabled because PhonePe does not send this header.
	if (env.phonePeWebhookUsername || env.phonePeWebhookPassword) {
		logger.warn('[PhonePeWebhook] PHONEPE_WEBHOOK_USERNAME/PASSWORD configured but webhook auth is ignored for compatibility');
	}

	// ========== PAYLOAD PARSING ==========
	// Support both new event format and legacy base64 format
	let webhookBody: any;
	const rawBodyString = String(req.body?.response || '').trim();
	const eventFromBody = req.body?.event;

	if (rawBodyString) {
		// Legacy format: base64-encoded payload with X-VERIFY signature
		const xVerify = String(req.headers['x-verify'] ?? '').trim();
		if (!xVerify) {
			throw new AppError('Missing x-verify header for base64 payload', 400);
		}

		const isValid = verifyPhonePeWebhook(rawBodyString, xVerify);
		if (!isValid) {
			throw new AppError('Invalid PhonePe signature', 401);
		}

		try {
			webhookBody = JSON.parse(Buffer.from(rawBodyString, 'base64').toString('utf-8'));
		} catch (error: any) {
			logger.error('[PhonePeWebhook] Failed to parse base64 payload', { error: error?.message });
			throw new AppError('Invalid payload format', 400);
		}
	} else if (eventFromBody) {
		// New format: Direct JSON payload with event field
		webhookBody = req.body;
	} else {
		throw new AppError('Missing webhook payload', 400);
	}

	// ========== IDEMPOTENCY CHECK ==========
	// Generate event ID: use combination of event type, merchant order/refund ID, and timestamp
	const payload = webhookBody.payload || webhookBody;
	const event = webhookBody.event
		|| webhookBody.type
		|| (
			payload?.merchantRefundId || payload?.refundId
				? payload?.state === 'FAILED'
					? 'pg.refund.failed'
					: 'pg.refund.completed'
				: payload?.state === 'FAILED'
					? 'checkout.order.failed'
					: 'checkout.order.completed'
		);
	let eventId: string;

	if (event?.startsWith('checkout.order')) {
		const orderId = payload?.merchantOrderId || payload?.orderId;
		const timestamp = payload?.timestamp || payload?.expireAt;
		eventId = `${event}_${orderId}_${timestamp}`;
	} else if (event?.startsWith('pg.refund')) {
		const refundId = payload?.merchantRefundId || payload?.refundId || payload?.originalMerchantOrderId;
		const timestamp = payload?.timestamp;
		eventId = `${event}_${refundId}_${timestamp}`;
	} else {
		eventId = `${event}_${Date.now()}`;
	}

	// Check if already processed (idempotency)
	const isNewEvent = await trackWebhookEvent(eventId, event);
	if (!isNewEvent) {
		// Already processed - return success to avoid PhonePe retry
		logger.info('[PhonePeWebhook] Duplicate webhook, returning success', { eventId });
		res.status(200).json({ success: true, message: 'Webhook acknowledged (duplicate)', handled: false });
		return;
	}

	// ========== EVENT ROUTING ==========
	try {
		// Route based on event type
		if (!event) {
			throw new AppError('Missing event type', 400);
		}

		await processPhonePeWebhookEvent(event, payload);

		logger.info('[PhonePeWebhook] Webhook processed successfully', { eventId, event });
		res.status(200).json({ success: true, handled: true, message: 'Webhook processed' });
	} catch (error: any) {
		logger.error('[PhonePeWebhook] Failed to process event', {
			eventId,
			event: webhookBody.event,
			error: error?.message,
		});

		// Return 200 anyway to prevent PhonePe retries, but log the error
		res.status(200).json({
			success: true,
			handled: false,
			message: 'Webhook received but processing failed',
			error: error?.message,
		});
	}
};

export const getPhonePeStatusController = async (req: Request, res: Response): Promise<void> => {
	const transactionId = String(req.params.transactionId ?? '').trim();
	if (!transactionId) {
		throw new AppError('transactionId is required', 422);
	}

	const status = await checkPhonePeStatus(transactionId);
	if (!status) {
		throw new AppError('Unable to fetch payment status', 502);
	}

	res.status(200).json({ success: true, data: status });
};

export const initiateRefundController = async (req: Request, res: Response): Promise<void> => {
	const patientId = getAuthUserId(req);
	const paymentId = String(req.body.paymentId ?? '').trim();
	const reason = String(req.body.reason ?? 'Customer requested').trim();

	if (!paymentId) {
		throw new AppError('paymentId is required', 422);
	}

	// Verify payment exists and belongs to the patient
	const payment = await prisma.financialPayment.findUnique({
		where: { id: paymentId },
		include: {
			session: {
				select: { patientId: true },
			},
		},
	});

	if (!payment) {
		throw new AppError('Payment not found', 404);
	}

	if (payment.session?.patientId !== patientId) {
		throw new AppError('Unauthorized to refund this payment', 403);
	}

	if (payment.status !== 'CAPTURED') {
		throw new AppError('Only captured payments can be refunded', 422);
	}

	// Check if refund already exists
	const existingRefund = await prisma.financialRefund.findFirst({
		where: { paymentId },
	});

	if (existingRefund && existingRefund.status !== 'FAILED') {
		throw new AppError('Refund already initiated for this payment', 422);
	}

	// Generate merchant refund ID
	const merchantRefundId = `${paymentId}-${Date.now()}`;

	try {
		// Initiate PhonePe refund
		const refundResult = await initiatePhonePeRefund({
			merchantRefundId,
			originalMerchantOrderId: payment.razorpayOrderId,
			amountInPaise: Number(payment.amountMinor),
		});

		// Create or update refund record
		const refund = await prisma.financialRefund.upsert({
			where: { merchantRefundId },
			create: {
				paymentId,
				merchantRefundId,
				originalMerchantOrderId: payment.razorpayOrderId,
				phonePeRefundId: refundResult.refundId,
				status: 'PENDING',
				amountMinor: payment.amountMinor,
				currency: payment.currency,
				reason,
				responseData: refundResult.responseData,
			},
			update: {
				phonePeRefundId: refundResult.refundId || undefined,
				status: 'PENDING',
				responseData: refundResult.responseData,
				retryCount: 0,
				updatedAt: new Date(),
			},
		});

		sendSuccess(res, refund, 'Refund initiated successfully', 201);
	} catch (error: any) {
		if (error instanceof AppError) throw error;

		// Log error and create failed refund record
		logger.error('[Payment] Refund initiation failed', {
			paymentId,
			error: error?.message,
		});

		throw new AppError('Failed to initiate refund: ' + error?.message, 502);
	}
};

export const getRefundStatusController = async (req: Request, res: Response): Promise<void> => {
	const refundId = String(req.params.refundId ?? '').trim();

	if (!refundId) {
		throw new AppError('refundId is required', 422);
	}

	// Verify refund exists
	const refund = await prisma.financialRefund.findUnique({
		where: { id: refundId },
		include: {
			payment: {
				select: {
					session: {
						select: { patientId: true },
					},
				},
			},
		},
	});

	if (!refund) {
		throw new AppError('Refund not found', 404);
	}

	const patientId = getAuthUserId(req);
	if (refund.payment?.session?.patientId !== patientId) {
		throw new AppError('Unauthorized to view this refund', 403);
	}

	try {
		// Get latest status from PhonePe if refund is still pending
		if (refund.status === 'PENDING' && refund.merchantRefundId) {
			const statusData = await checkPhonePeRefundStatus(refund.merchantRefundId);

			if (statusData?.data?.state) {
				const newStatus = statusData.data.state === 'COMPLETED' ? 'COMPLETED' : 
					               statusData.data.state === 'CONFIRMED' ? 'CONFIRMED' :
					               statusData.data.state === 'FAILED' ? 'FAILED' :
					               'PENDING';

				// Update refund record with latest status
				const updatedRefund = await prisma.financialRefund.update({
					where: { id: refundId },
					data: {
						status: newStatus,
						responseData: statusData,
						...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
						...(newStatus === 'FAILED' && { failedAt: new Date() }),
					},
				});

				sendSuccess(res, updatedRefund, 'Refund status retrieved', 200);
				return;
			}
		}

		sendSuccess(res, refund, 'Refund status retrieved', 200);
	} catch (error: any) {
		logger.error('[Payment] Refund status check failed', {
			refundId,
			error: error?.message,
		});

		throw new AppError('Failed to fetch refund status: ' + error?.message, 502);
	}
};
