import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import {
	createSessionPayment,
	processRazorpayWebhook,
	processPhonePeWebhook,
	releaseSessionEarnings,
} from '../services/payment.service';
import { processSubscriptionWebhook } from '../services/subscription.service';
import { verifyPhonePeWebhook, checkPhonePeStatus } from '../services/phonepe.service';
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

	// 1. Mandatory BasicAuth validation (UAT compliance)
	const authHeader = String(req.headers['authorization'] ?? '');
	if (env.phonePeWebhookUsername && env.phonePeWebhookPassword) {
		const expectedAuth = 'Basic ' + Buffer.from(`${env.phonePeWebhookUsername}:${env.phonePeWebhookPassword}`).toString('base64');
		if (authHeader !== expectedAuth) {
			throw new AppError('Invalid webhook authorization', 401);
		}
	}

	// 2. Existing X-VERIFY signature check
	const xVerify = String(req.headers['x-verify'] ?? '');
	if (!xVerify) {
		throw new AppError('Missing x-verify header', 400);
	}

	const body = String(req.body?.response || '').trim(); // The base64 response string from PhonePe
	if (!body) {
		throw new AppError('Missing response body in PhonePe webhook', 400);
	}

	// Make sure we preserve raw payload shape to avoid parser normalization mismatches.
	const isValid = verifyPhonePeWebhook(body, xVerify);
	if (!isValid) {
		throw new AppError('Invalid PhonePe signature', 401);
	}

	let decoded: any;
	try {
		decoded = JSON.parse(Buffer.from(body, 'base64').toString('utf-8'));
	} catch (error: any) {
		logger.error('[PaymentController] Failed to parse PhonePe webhook body', { error: error?.message, body });
		throw new AppError('Invalid PhonePe webhook payload format', 400);
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

	res.status(200).json({ success: true, data: status });
};
