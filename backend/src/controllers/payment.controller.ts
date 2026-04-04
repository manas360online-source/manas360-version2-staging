import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { LEAD_MARKETPLACE_PRICES, PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';
import {
	createSessionPayment,
	processPhonePeWebhook,
	releaseSessionEarnings,
	reconcilePhonePePaymentStatus,
} from '../services/payment.service';
import { applyCreditsForPayment } from '../services/wallet.service';
import { initiatePatientSubscriptionPayment } from '../services/patient-subscription-payment.service';
import { reactivatePatientSubscription } from '../services/patient-v1.service';
import { initiateProviderSubscriptionPayment } from '../services/provider-subscription-payment.service';
import { initiateProviderPlatformPayment } from '../services/provider-subscription-payment.service';
import { activateProviderSubscription } from '../services/provider-subscription.service';
import { activatePlatformAccess } from '../services/platform-access.service';
import { createPendingSubscriptionComponents } from '../services/provider-subscription.pending.service';
import { getActivePlatformPlan } from '../services/pricing.service';
import { 
	verifyPhonePeWebhook, 
	initiatePhonePeRefund, 
	checkPhonePeRefundStatus,
	verifyPhonePeWebhookAuth,
	isPhonePeWebhookIP,
	getClientIpFromRequest,
} from '../services/phonepe.service';
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

export const phonepeWebhookController = async (req: Request, res: Response): Promise<void> => {
	const payload = req.body as any;
	const hasProbePayload = Boolean(payload?.data?.merchantTransactionId || payload?.merchantTransactionId || payload?.response);
	const isHostedEnv = env.nodeEnv === 'production' || env.nodeEnv === 'staging';

	if (env.allowDevPhonePeWebhookProbeBypass && !hasProbePayload) {
		return void res.status(200).json({ success: true, message: 'PhonePe webhook endpoint reachable' });
	}

	const clientIp = getClientIpFromRequest(req);
	if (isHostedEnv && !env.allowPhonePeWebhookIpBypass && !isPhonePeWebhookIP(clientIp)) {
		logger.warn('[PhonePe] Webhook rejected due to IP allowlist', { clientIp });
		throw new AppError('Unauthorized webhook source', 401);
	}

	if (isHostedEnv) {
		const username = String(env.phonePeWebhookUsername || '').trim();
		const password = String(env.phonePeWebhookPassword || '').trim();
		if (!username || !password) {
			throw new AppError('PhonePe webhook auth credentials are not configured', 500);
		}

		const authHeader = String(req.headers.authorization || '').trim();
		if (!verifyPhonePeWebhookAuth(authHeader, username, password)) {
			throw new AppError('Unauthorized webhook request', 401);
		}

		const xVerifyHeader = String(req.headers['x-verify'] || req.headers['x_verify'] || '').trim();
		const rawBody = String(req.rawBody || '').trim() || JSON.stringify(payload || {});
		if (!xVerifyHeader || !verifyPhonePeWebhook(rawBody, xVerifyHeader)) {
			throw new AppError('Invalid webhook signature', 401);
		}
	}

	const decoded = typeof payload?.response === 'string' && payload.response.trim().length > 0
		? JSON.parse(Buffer.from(payload.response, 'base64').toString('utf8'))
		: payload;

	const result = await processPhonePeWebhook(decoded);
	res.status(200).json({ success: true, ...result });
};

export const getPhonePeStatusController = async (req: Request, res: Response): Promise<void> => {
	const transactionId = String(req.params.transactionId ?? '').trim();
	if (!transactionId) throw new AppError('transactionId is required', 422);

	const result = await reconcilePhonePePaymentStatus(transactionId, 5, 5000);
	sendSuccess(res, result, 'Payment status retrieved', 200);
};

export const initiateRefundController = async (req: Request, res: Response): Promise<void> => {
	const patientId = getAuthUserId(req);
	const paymentId = String(req.body.paymentId ?? req.body.refundPaymentId ?? '').trim();
	const amountMinor = Math.max(0, Math.round(Number(req.body.amountMinor ?? 0)));

	if (!paymentId) throw new AppError('paymentId is required', 422);
	if (!Number.isFinite(amountMinor) || amountMinor <= 0) throw new AppError('amountMinor must be > 0', 422);

	const payment = await prisma.financialPayment.findUnique({
		where: { id: paymentId },
		select: { id: true, patientId: true, merchantTransactionId: true, currency: true },
	});

	if (!payment) throw new AppError('Payment not found', 404);
	if (String(payment.patientId || '') !== patientId) throw new AppError('Unauthorized to refund this payment', 403);

	const merchantRefundId = `RF_${Date.now()}_${payment.id.slice(0, 8)}`;
	const refundResult = await initiatePhonePeRefund({
		merchantRefundId,
		originalMerchantOrderId: payment.merchantTransactionId,
		amountInPaise: amountMinor,
	});

	const refundRecord = await (prisma as any).financialRefund.create({
		data: {
			paymentId: payment.id,
			merchantRefundId,
			originalMerchantOrderId: payment.merchantTransactionId,
			phonePeRefundId: refundResult.refundId || null,
			amountMinor,
			currency: payment.currency || 'INR',
			status: refundResult.state === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
			requestData: { paymentId, amountMinor },
			responseData: refundResult.responseData,
		},
	});

	sendSuccess(res, refundRecord, 'Refund initiated', 201);
};

const UNIVERSAL_PATIENT_PLAN_MAP: Record<string, 'free' | 'monthly' | 'quarterly' | 'premium_monthly'> = {
	'patient-free': 'free',
	'patient-1month': 'monthly',
	'patient-3month': 'quarterly',
	'patient-1year': 'premium_monthly',
	free: 'free',
	monthly: 'monthly',
	quarterly: 'quarterly',
	premium_monthly: 'premium_monthly',
};

const UNIVERSAL_PROVIDER_PLAN_MAP: Record<string, ProviderPlanKey> = {
	'lead-free': 'free',
	'lead-basic': 'basic',
	'lead-standard': 'standard',
	'lead-premium': 'premium',
	free: 'free',
	standard: 'standard',
	premium: 'premium',
};

const resolvePatientPlanKey = (planId: string) => UNIVERSAL_PATIENT_PLAN_MAP[String(planId || '').trim().toLowerCase()] || null;
const resolveProviderPlanKey = (planId: string) => UNIVERSAL_PROVIDER_PLAN_MAP[String(planId || '').trim().toLowerCase()] || null;
const resolveProviderCycle = (raw: unknown): 'monthly' | 'quarterly' => String(raw || 'monthly').trim().toLowerCase() === 'quarterly' ? 'quarterly' : 'monthly';

const buildUniversalSuccessUrl = (type: string, planId: string, transactionId: string): string =>
	`${env.frontendUrl}/#/universal/payment-success?type=${encodeURIComponent(type)}&planId=${encodeURIComponent(planId)}&transactionId=${encodeURIComponent(transactionId)}`;

const computeProviderCheckoutTotals = (input: {
	leadPlanKey: ProviderPlanKey;
	platformCycle: 'monthly' | 'quarterly';
	hot: number;
	warm: number;
	cold: number;
}) => {
	const platformMinor = input.platformCycle === 'quarterly' ? 27900 : 9900;
	const plan = PROVIDER_PLANS[input.leadPlanKey];
	const leadPlanMinor = Math.round((input.platformCycle === 'quarterly' ? plan.quarterlyPrice : plan.price) * 100);
	const addonsMinor = (Math.max(0, input.hot) * LEAD_MARKETPLACE_PRICES.hot + Math.max(0, input.warm) * LEAD_MARKETPLACE_PRICES.warm + Math.max(0, input.cold) * LEAD_MARKETPLACE_PRICES.cold) * 100;
	const subtotalMinor = platformMinor + leadPlanMinor + addonsMinor;
	const gstMinor = Math.round(subtotalMinor * 0.18);
	const totalMinor = subtotalMinor + gstMinor;
	return { platformMinor, leadPlanMinor, addonsMinor, subtotalMinor, gstMinor, totalMinor };
};

const activatePlanForType = async (params: {
	type: string;
	planId: string;
	userId: string;
	paymentId: string;
	providerCycle?: 'monthly' | 'quarterly';
	providerAddons?: { hot: number; warm: number; cold: number };
	metadata?: Record<string, unknown>;
}) => {
	if (params.type === 'patient') {
		const planKey = resolvePatientPlanKey(params.planId);
		if (!planKey) throw new AppError('Invalid patient plan', 422);
		return reactivatePatientSubscription(params.userId, params.paymentId, planKey);
	}

	if (params.type === 'provider') {
		const providerPlanKey = resolveProviderPlanKey(params.planId);
		if (!providerPlanKey) throw new AppError('Invalid provider plan', 422);
		const cycle = resolveProviderCycle(params.providerCycle);
		const providerSubscription = await activateProviderSubscription(params.userId, providerPlanKey, params.paymentId);
		await activatePlatformAccess(params.userId, cycle, params.paymentId).catch(() => null);
		if (params.providerAddons) {
			await createPendingSubscriptionComponents({
				providerId: params.userId,
				leadPlanKey: providerPlanKey,
				platformCycle: cycle,
				addons: params.providerAddons,
				merchantTransactionId: params.paymentId,
				metadata: params.metadata || {},
			}).catch(() => null);
		}
		return providerSubscription;
	}

	throw new AppError('Invalid type. Must be "provider" or "patient"', 422);
};

export const getUniversalInvoiceController = async (req: Request, res: Response): Promise<void> => {
	const orderId = String(req.params.orderId ?? '').trim();
	if (!orderId) throw new AppError('orderId is required', 422);

	const payment = await prisma.universalCheckoutPayment.findUnique({ where: { id: orderId } });
	if (!payment) {
		throw new AppError('Payment not found', 404);
	}

	const invoice = {
		orderId: payment.id,
		type: payment.type,
		planId: payment.planId,
		baseAmount: (payment.baseAmountMinor / 100).toFixed(2),
		gst: (payment.gstMinor / 100).toFixed(2),
		totalAmount: (payment.totalAmountMinor / 100).toFixed(2),
		walletUsed: (payment.walletUsedMinor / 100).toFixed(2),
		finalAmount: (payment.finalAmountMinor / 100).toFixed(2),
		status: payment.status,
		createdAt: payment.createdAt,
		completedAt: payment.completedAt,
	};

	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.json"`);
	sendSuccess(res, invoice, 'Invoice retrieved', 200);
};



	export const initiateUniversalPaymentController = async (req: Request, res: Response): Promise<void> => {
		const userId = getAuthUserId(req);
		const type = String(req.body.type ?? '').trim().toLowerCase();
		const planId = String(req.body.planId ?? '').trim();
		const baseAmountMinor = Math.max(0, Math.round(Number(req.body.baseAmountMinor ?? 0)));
		const gstMinor = Math.max(0, Math.round(Number(req.body.gstMinor ?? 0)));
		const totalAmountMinor = Math.max(0, Math.round(Number(req.body.totalAmountMinor ?? 0)));
		const walletUsedMinor = Math.max(0, Math.round(Number(req.body.walletUsedMinor ?? 0)));
		const finalAmountMinor = Math.max(0, Math.round(Number(req.body.finalAmountMinor ?? 0)));
		const idempotencyKey = String(req.body.idempotencyKey ?? '').trim();
		const promoCode = String(req.body.promoCode ?? '').trim() || undefined;
		const platformCycle = resolveProviderCycle(req.body.platformCycle);
		const providerAddons = {
			hot: Math.max(0, Math.round(Number(req.body.addons?.hot ?? 0))),
			warm: Math.max(0, Math.round(Number(req.body.addons?.warm ?? 0))),
			cold: Math.max(0, Math.round(Number(req.body.addons?.cold ?? 0))),
		};

		if (!['provider', 'patient'].includes(type)) {
			throw new AppError('Invalid type. Must be "provider" or "patient"', 422);
		}
		if (!planId) throw new AppError('planId is required', 422);
		if (!idempotencyKey) throw new AppError('idempotencyKey is required', 422);

		const universalPayment = await prisma.universalCheckoutPayment.findUnique({ where: { idempotencyKey } });
		if (universalPayment) {
			logger.info('[UniversalPayment] Idempotent duplicate detected', { idempotencyKey });
			return void sendSuccess(res, universalPayment, 'Duplicate payment detected', 200);
		}

		const paymentRecord = await prisma.universalCheckoutPayment.create({
			data: {
				type,
				planId,
				baseAmountMinor,
				gstMinor,
				totalAmountMinor,
				walletUsedMinor,
				finalAmountMinor,
				idempotencyKey,
				status: 'INITIATED',
			},
		});

		const successRedirectUrl = buildUniversalSuccessUrl(type, planId, paymentRecord.id);

		try {
			if (type === 'patient') {
				const patientPlanKey = resolvePatientPlanKey(planId);
				if (!patientPlanKey) throw new AppError('Invalid patient plan', 422);

				const plan = await getActivePlatformPlan(patientPlanKey);
				if (!plan) throw new AppError('Invalid patient plan', 422);

				const expectedGstMinor = Math.round(baseAmountMinor * 0.18);
				const expectedTotalMinor = baseAmountMinor + expectedGstMinor;
				if (Math.abs(gstMinor - expectedGstMinor) > 1) throw new AppError('GST mismatch. Please refresh checkout and retry.', 422);
				if (totalAmountMinor > 0 && Math.abs(totalAmountMinor - expectedTotalMinor) > 1) throw new AppError('Invalid checkout total. Total must be subtotal plus GST.', 422);

				const walletResult = await applyCreditsForPayment({
					userId,
					referenceId: idempotencyKey || `universal_patient_${Date.now()}`,
					referenceType: 'patient_subscription',
					amountMinor: expectedTotalMinor,
				});

				const effectiveFinalAmountMinor = Math.max(0, walletResult.finalAmount);
				if (effectiveFinalAmountMinor <= 0 || Number(plan.price || 0) <= 0) {
					const activated = await activatePlanForType({
						type,
						planId,
						userId,
						paymentId: paymentRecord.id,
						metadata: { walletUsedMinor: walletResult.amountUsed, promoCode },
					});

					const completed = await prisma.universalCheckoutPayment.update({
						where: { id: paymentRecord.id },
						data: { status: 'COMPLETED', completedAt: new Date(), planDetails: activated as any },
					});
					return void sendSuccess(res, { ...completed, redirectUrl: successRedirectUrl }, 'Free plan activated', 201);
				}

				const payment = await initiatePatientSubscriptionPayment(userId, patientPlanKey, {
					amountMinorOverride: effectiveFinalAmountMinor,
					redirectUrlOverride: successRedirectUrl,
					metadata: {
						universalCheckoutPaymentId: paymentRecord.id,
						promoCode,
						walletUsedMinor: walletResult.amountUsed,
						finalAmountMinor: effectiveFinalAmountMinor,
					},
				});

				await prisma.universalCheckoutPayment.update({
					where: { id: paymentRecord.id },
					data: {
						phonepeTransactionId: String(payment.transactionId || ''),
						status: 'PENDING_PAYMENT',
					},
				});

				return void sendSuccess(res, { ...paymentRecord, redirectUrl: payment.redirectUrl, merchantTransactionId: payment.transactionId }, 'Payment initiated. Redirecting to PhonePe...', 201);
			}

			const providerPlanKey = resolveProviderPlanKey(planId);
			if (!providerPlanKey) throw new AppError('Invalid provider plan', 422);

			const plan = PROVIDER_PLANS[providerPlanKey];
			if (!plan) throw new AppError('Invalid provider plan', 422);

			const totals = computeProviderCheckoutTotals({
				leadPlanKey: providerPlanKey,
				platformCycle,
				hot: providerAddons.hot,
				warm: providerAddons.warm,
				cold: providerAddons.cold,
			});

			if (baseAmountMinor > 0 && Math.abs(baseAmountMinor - totals.subtotalMinor) > 1) {
				throw new AppError('Subtotal mismatch. Please refresh checkout and retry.', 409);
			}
			if (gstMinor > 0 && Math.abs(gstMinor - totals.gstMinor) > 1) {
				throw new AppError('GST mismatch. Please refresh checkout and retry.', 409);
			}
			if (totalAmountMinor > 0 && Math.abs(totalAmountMinor - totals.totalMinor) > 1) {
				throw new AppError('Total mismatch. Please refresh checkout and retry.', 409);
			}

			const walletResult = await applyCreditsForPayment({
				userId,
				referenceId: idempotencyKey || `universal_provider_${Date.now()}`,
				referenceType: 'provider_subscription',
				amountMinor: totals.totalMinor,
			});
			const effectiveFinalAmountMinor = Math.max(0, walletResult.finalAmount);

			if (effectiveFinalAmountMinor <= 0) {
				const activated = await activatePlanForType({
					type,
					planId,
					userId,
					paymentId: paymentRecord.id,
					providerCycle: platformCycle,
					providerAddons,
					metadata: { promoCode, walletUsedMinor: walletResult.amountUsed, platformCycle },
				});

				const completed = await prisma.universalCheckoutPayment.update({
					where: { id: paymentRecord.id },
					data: { status: 'COMPLETED', completedAt: new Date(), planDetails: activated as any },
				});
				return void sendSuccess(res, { ...completed, redirectUrl: successRedirectUrl }, 'Free plan activated', 201);
			}

			if (providerPlanKey === 'free') {
				const platformPayment = await initiateProviderPlatformPayment(
					userId,
					platformCycle,
					effectiveFinalAmountMinor,
					{ redirectUrlOverride: successRedirectUrl, idempotencyKey, requireGateway: true }
				);

				await prisma.universalCheckoutPayment.update({
					where: { id: paymentRecord.id },
					data: {
						phonepeTransactionId: String(platformPayment.transactionId || ''),
						status: 'PENDING_PAYMENT',
						metadata: {
							platformCycle,
							addons: providerAddons,
							flow: 'universal_provider_platform_only',
						},
					},
				});

				return void sendSuccess(
					res,
					{ ...paymentRecord, redirectUrl: platformPayment.redirectUrl, merchantTransactionId: platformPayment.transactionId },
					'Payment initiated. Redirecting to PhonePe...',
					201,
				);
			}

			const payment = await initiateProviderSubscriptionPayment(userId, providerPlanKey, {
				amountMinorOverride: effectiveFinalAmountMinor,
				idempotencyKey,
				redirectUrlOverride: successRedirectUrl,
				metadata: {
					flow: 'universal_checkout',
					platformCycle,
					platformMinor: totals.platformMinor,
					leadPlanMinor: totals.leadPlanMinor,
					addons: providerAddons,
					expectedSubtotalMinor: totals.subtotalMinor,
					expectedGstMinor: totals.gstMinor,
					expectedTotalMinor: totals.totalMinor,
					promoCode,
					universalCheckoutPaymentId: paymentRecord.id,
					walletUsedMinor: walletResult.amountUsed,
					finalAmountMinor: effectiveFinalAmountMinor,
				},
			});

			await prisma.universalCheckoutPayment.update({
				where: { id: paymentRecord.id },
				data: {
					phonepeTransactionId: String(payment.transactionId || ''),
					status: 'PENDING_PAYMENT',
				},
			});

			await createPendingSubscriptionComponents({
				providerId: userId,
				leadPlanKey: providerPlanKey,
				platformCycle,
				addons: providerAddons,
				merchantTransactionId: String(payment.transactionId || ''),
				metadata: {
					flow: 'universal_checkout',
					universalCheckoutPaymentId: paymentRecord.id,
					promoCode,
				},
			}).catch(() => null);

			return void sendSuccess(res, { ...paymentRecord, redirectUrl: payment.redirectUrl, merchantTransactionId: payment.transactionId }, 'Payment initiated. Redirecting to PhonePe...', 201);
		} catch (error: any) {
			if (error instanceof AppError) throw error;
			logger.error('[UniversalPayment.Initiate] Error', { error: error?.message, type, planId });
			await prisma.universalCheckoutPayment.delete({ where: { id: paymentRecord.id } }).catch(() => null);
			throw new AppError('Failed to initiate universal payment: ' + error?.message, 502);
		}
		};

		export const confirmUniversalPaymentController = async (req: Request, res: Response): Promise<void> => {
			const paymentId = String(req.body.paymentId ?? '').trim();
			if (!paymentId) throw new AppError('paymentId is required', 422);

			const payment = await prisma.universalCheckoutPayment.findUnique({ where: { id: paymentId } });
			if (!payment) throw new AppError('Payment not found', 404);

			if (payment.status === 'COMPLETED') {
				return void sendSuccess(res, payment, 'Payment already confirmed', 200);
			}

			const activated = await activatePlanForType({
				type: payment.type,
				planId: payment.planId,
				userId: getAuthUserId(req),
				paymentId: payment.id,
			});

			const updated = await prisma.universalCheckoutPayment.update({
				where: { id: payment.id },
				data: { status: 'COMPLETED', completedAt: new Date(), planDetails: activated as any },
			});

			sendSuccess(res, updated, 'Plan activated successfully', 200);
		};

		export const verifyUniversalPaymentController = async (req: Request, res: Response): Promise<void> => {
			const orderId = String(req.query.orderId ?? req.query.transactionId ?? '').trim();
			if (!orderId) throw new AppError('orderId is required', 422);

			const payment = await prisma.universalCheckoutPayment.findUnique({ where: { id: orderId } });
			if (!payment) throw new AppError('Payment not found', 404);

			if (payment.status === 'COMPLETED') {
				return void sendSuccess(res, { payment }, 'Payment status verified', 200);
			}

			if (payment.phonepeTransactionId) {
				const phonepeStatus = await reconcilePhonePePaymentStatus(payment.phonepeTransactionId, 5, 5000);
				const state = String(phonepeStatus.state || '').toUpperCase();
				if (state === 'COMPLETED' || state === 'PAYMENT_SUCCESS') {
					const activated = await activatePlanForType({
						type: payment.type,
						planId: payment.planId,
						userId: getAuthUserId(req),
						paymentId: payment.id,
						providerCycle: String(payment.metadata?.platformCycle || '').toLowerCase() === 'quarterly' ? 'quarterly' : 'monthly',
						providerAddons: payment.metadata?.addons as { hot: number; warm: number; cold: number } | undefined,
						metadata: payment.metadata || {},
					});

					const updated = await prisma.universalCheckoutPayment.update({
						where: { id: payment.id },
						data: { status: 'COMPLETED', completedAt: new Date(), planDetails: activated as any },
					});
					return void sendSuccess(res, { payment: updated }, 'Payment completed', 200);
				}

				if (state === 'FAILED' || state === 'DECLINED' || state === 'PAYMENT_ERROR') {
					const failed = await prisma.universalCheckoutPayment.update({
						where: { id: payment.id },
						data: { status: 'FAILED', failedAt: new Date() },
					});
					return void sendSuccess(res, { payment: failed }, 'Payment failed', 200);
				}

				if (state === 'PENDING' || state === 'PAYMENT_PENDING') {
					if (payment.status !== 'PENDING_PAYMENT') {
						const pending = await prisma.universalCheckoutPayment.update({
							where: { id: payment.id },
							data: { status: 'PENDING_PAYMENT' },
						});
						return void sendSuccess(res, { payment: pending }, 'Payment pending', 200);
					}
				}
			}

			sendSuccess(res, { payment }, 'Payment status verified', 200);
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


