import { AppError } from '../middleware/error.middleware';
import { PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';
import { initiatePhonePePayment } from './phonepe.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Initiate a payment for provider subscription via PhonePe.
 * Transaction ID prefixed with PROV_SUB_ for webhook identification.
 */
export const initiateProviderSubscriptionPayment = async (providerId: string, planKey: ProviderPlanKey) => {
	const { prisma } = await import('../config/db');
	const plan = PROVIDER_PLANS[planKey];
	if (!plan) throw new AppError('Invalid provider plan', 422);
	if (plan.price === 0) throw new AppError('Free plan does not require payment', 422);

	const existingSubscription = await prisma.providerSubscription.findUnique({ where: { providerId } }).catch(() => null);
	const isSameActivePlan = Boolean(
		existingSubscription
		&& String(existingSubscription.status || '').toLowerCase() === 'active'
		&& new Date(existingSubscription.expiryDate).getTime() > Date.now()
		&& String(existingSubscription.plan || '').toLowerCase() === String(planKey).toLowerCase(),
	);
	if (isSameActivePlan) {
		throw new AppError('This provider plan is already active', 409);
	}

	const initiatedAttempts = await prisma.financialPayment.findMany({
		where: {
			providerId,
			status: 'INITIATED',
		},
		orderBy: { createdAt: 'desc' },
		take: 20,
	}).catch(() => [] as any[]);

	const matchingAttempts = initiatedAttempts.filter((row: any) =>
		String(row?.metadata?.type || '') === 'provider_subscription'
		&& String(row?.metadata?.plan || '') === String(planKey),
	);

	const latestAttempt = matchingAttempts[0] as any;
	if (latestAttempt) {
		const ageMs = Date.now() - new Date(latestAttempt.createdAt).getTime();
		const redirectUrl = String(latestAttempt?.metadata?.redirectUrl || '').trim();
		if (redirectUrl && ageMs <= 15 * 60 * 1000) {
			return {
				transactionId: String(latestAttempt.razorpayOrderId),
				redirectUrl,
				planName: planKey,
				price: plan.price,
			};
		}

		await prisma.financialPayment.deleteMany({
			where: {
				id: { in: matchingAttempts.map((item: any) => String(item.id)) },
			},
		}).catch(() => null);
	}

	const transactionId = `PROV_SUB_${providerId}_${planKey}_${Date.now()}`;
	const shouldBypass = env.allowDevPaymentBypass && env.nodeEnv !== 'production';
	const canFallbackWithoutGateway = env.nodeEnv !== 'production';
	const frontendBaseUrl = env.frontendUrl;
	const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;
	const cycleKey = new Date().toISOString().slice(0, 10);
	const subscriptionIdempotencyKey = `prov_sub_init:${providerId}:${planKey}:${cycleKey}`;

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId: providerId,
			amountInPaise: plan.price * 100,
			callbackUrl,
			redirectUrl: `${frontendBaseUrl}/payment/status?id=${transactionId}&status=SUCCESS`,
			metadata: { plan: planKey },
		});
	} catch (error: any) {
		if (!shouldBypass && !canFallbackWithoutGateway) {
			throw new AppError(error?.message || 'PhonePe Payment Initiation Failed', 502);
		}
		// Non-production fallback: return a local redirect URL even if gateway is unavailable.
		logger.warn('[PhonePe] Falling back to local redirect after payment initiation failure', {
			transactionId,
			nodeEnv: env.nodeEnv,
			error: error?.message,
		});
		redirectUrl = `${frontendBaseUrl}/payment/status?id=${transactionId}&status=SUCCESS`;
	}

	// Mandatory: Create financialPayment record for reconciliation worker
	try {
		await prisma.financialPayment.create({
			data: {
				razorpayOrderId: transactionId,
				providerId,
				amountMinor: plan.price * 100,
				currency: 'INR',
				captureIdempotencyKey: subscriptionIdempotencyKey,
				status: shouldBypass ? 'CAPTURED' : 'INITIATED',
				metadata: {
					type: 'provider_subscription',
					plan: planKey,
					redirectUrl,
					idempotencyKey: subscriptionIdempotencyKey,
				}
			}
		});
	} catch (error: any) {
		if (String(error?.code || '') !== 'P2002') {
			throw error;
		}

		const existing = await prisma.financialPayment.findFirst({
			where: { captureIdempotencyKey: subscriptionIdempotencyKey },
			orderBy: { createdAt: 'desc' },
		}).catch(() => null);

		const existingRedirect = String(existing?.metadata?.redirectUrl || '').trim();
		if (existing && existingRedirect) {
			return {
				transactionId: String(existing.razorpayOrderId),
				redirectUrl: existingRedirect,
				planName: planKey,
				price: plan.price,
			};
		}

		throw new AppError('Payment initiation already in progress. Please retry in a moment.', 409);
	}

	if (shouldBypass) {
		const { activateProviderSubscription } = await import('./provider-subscription.service');
		await activateProviderSubscription(providerId, planKey);
	}

	return {
		transactionId,
		redirectUrl,
		planName: planKey,
		price: plan.price,
	};
};
