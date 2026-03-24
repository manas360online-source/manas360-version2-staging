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
		// Subscription webhooks removed (was Razorpay)
		result = { handled: false, message: 'Subscription webhooks not supported' };
	} else {
		result = await processRazorpayWebhook(rawBody, signature);
	}

	res.status(200).json({ success: true, ...result });
};

export const phonepeWebhookController = async (req: Request, res: Response): Promise<void> => {
	const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
	const xVerify = String(req.headers['x-verify'] ?? '').trim();

	if (!xVerify || !verifyPhonePeWebhook(rawBody, xVerify)) {
		throw new AppError('Invalid PhonePe webhook signature', 401);
	}

	const payload = req.body as any;
	let decoded: any = payload;

	if (typeof payload?.response === 'string' && payload.response.trim().length > 0) {
		try {
			decoded = JSON.parse(Buffer.from(payload.response, 'base64').toString('utf8'));
		} catch {
			throw new AppError('Invalid PhonePe webhook payload', 422);
		}
	}

	const result = await processPhonePeWebhook(decoded);
	res.status(200).json({ success: true, ...result });
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

	const normalizedCode = String(status?.code || '').toUpperCase();
	const normalizedState = String(status?.data?.state || '').toUpperCase();
	const isCompleted = normalizedCode === 'PAYMENT_SUCCESS' || normalizedState === 'COMPLETED';

	// Webhooks can be delayed/unavailable in local test setups.
	// Reconcile completed PhonePe status inline so patient subscription activation is immediate.
	if (isCompleted && transactionId.startsWith('SUB_')) {
		await processPhonePeWebhook(status).catch((error) => {
			logger.warn('[PhonePe] Inline status reconciliation failed', {
				transactionId,
				error: error?.message,
			});
		});
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
