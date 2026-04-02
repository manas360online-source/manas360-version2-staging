import { AppError } from '../middleware/error.middleware';
import { PROVIDER_PLANS, type ProviderPlanKey } from '../config/providerPlans';
import { initiatePhonePePayment } from './phonepe.service';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

const toCompactToken = (value: string, maxLength: number): string =>
	String(value || '')
		.replace(/[^a-zA-Z0-9]/g, '')
		.slice(0, maxLength)
		.toLowerCase();

interface ProviderSubscriptionPaymentOptions {
	amountMinorOverride?: number;
	idempotencyKey?: string;
	redirectUrlOverride?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Initiate a payment for provider subscription via PhonePe.
 * Transaction ID prefixed with PROV_SUB_ for webhook identification.
 */
export const initiateProviderSubscriptionPayment = async (
	providerId: string,
	planKey: ProviderPlanKey,
	options?: ProviderSubscriptionPaymentOptions,
) => {
	const plan = PROVIDER_PLANS[planKey];
	if (!plan) throw new AppError('Invalid provider plan', 422);
	if (plan.price === 0) throw new AppError('Free plan does not require payment', 422);

	const existingSubscription = await prisma.providerSubscription.findUnique({ where: { providerId } }).catch(() => null);
	const isAnyActiveSubscription = Boolean(
		existingSubscription
		&& String(existingSubscription.status || '').toLowerCase() === 'active'
		&& new Date(existingSubscription.expiryDate).getTime() > Date.now(),
	);
	if (isAnyActiveSubscription) {
		throw new AppError('An active provider subscription already exists', 409);
	}

	const requestedIdempotencyKey = String(options?.idempotencyKey || '').trim();

	const recentAttemptCount = await prisma.financialPayment.count({
		where: {
			providerId,
			metadata: {
				path: ['type'],
				equals: 'provider_subscription',
			},
			createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
		},
	}).catch(() => 0);
	if (recentAttemptCount >= 3) {
		throw new AppError('Too many payment attempts. Please try again in one hour.', 429);
	}

	const initiatedAttempts = await prisma.financialPayment.findMany({
		where: {
			providerId,
			status: 'INITIATED',
		},
		orderBy: { createdAt: 'desc' },
		take: 20,
	}).catch(() => [] as any[]);

	const matchingAttempts = initiatedAttempts.filter((row: any) => {
		const isPlanMatch =
			String(row?.metadata?.type || '') === 'provider_subscription'
			&& String(row?.metadata?.plan || '') === String(planKey);
		if (!isPlanMatch) return false;
		if (!requestedIdempotencyKey) return true;
		return String(row?.captureIdempotencyKey || row?.metadata?.idempotencyKey || '') === requestedIdempotencyKey;
	});
	const latestAttempt = matchingAttempts[0] as any;
	if (latestAttempt) {
		const ageMs = Date.now() - new Date(latestAttempt.createdAt).getTime();
		const redirectUrl = String(latestAttempt?.metadata?.redirectUrl || '').trim();
		if (redirectUrl && ageMs <= 15 * 60 * 1000) {
			return {
				transactionId: String(latestAttempt.merchantTransactionId),
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

	const providerToken = toCompactToken(providerId, 8) || 'provider';
	const transactionId = `PROV_SUB_${providerToken}_${Date.now()}`;
	const hasPhonePeOAuth = Boolean(String(process.env.PHONEPE_CLIENT_ID || '').trim())
		&& Boolean(String(process.env.PHONEPE_CLIENT_SECRET || '').trim());
	const shouldBypass = env.allowDevPaymentBypass && env.nodeEnv !== 'production' && !hasPhonePeOAuth;
	const canFallbackWithoutGateway = shouldBypass;
	const frontendBaseUrl = env.frontendUrl;
	const paymentStatusBase = `${frontendBaseUrl}/#/payment/status`;
	const redirectUrlTarget = String(options?.redirectUrlOverride || `${paymentStatusBase}?transactionId=${transactionId}&status=SUCCESS`).trim();
	const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;
	const cycleKey = new Date().toISOString().slice(0, 10);
	const subscriptionIdempotencyKey = requestedIdempotencyKey || `prov_sub_init:${providerId}:${planKey}:${cycleKey}`;
	const amountMinor = Math.max(
		0,
		Math.round(
			Number.isFinite(Number(options?.amountMinorOverride))
				? Number(options?.amountMinorOverride)
				: Number(plan.price || 0) * 100,
		),
	);

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId: providerId,
			amountInPaise: amountMinor,
			callbackUrl,
			redirectUrl: redirectUrlTarget,
			metadata: { plan: planKey, ...(options?.metadata || {}) },
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
		redirectUrl = redirectUrlTarget;
	}

	// Mandatory: Create financialPayment record for reconciliation worker
	try {
		await prisma.providerWallet.upsert({
			where: { providerId },
			update: {},
			create: { providerId },
		}).catch(() => null);

		await prisma.financialPayment.create({
			data: {
				merchantTransactionId: transactionId,
				providerId,
				amountMinor,
				currency: 'INR',
				captureIdempotencyKey: subscriptionIdempotencyKey,
				status: shouldBypass ? 'CAPTURED' : 'INITIATED',
				metadata: {
					type: 'provider_subscription',
					plan: planKey,
					redirectUrl,
					idempotencyKey: subscriptionIdempotencyKey,
					...(options?.metadata || {}),
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
				transactionId: String(existing.merchantTransactionId),
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

/**
 * Initiate PhonePe payment specifically for Platform Access (₹99/mo or ₹279/qtr).
 * Transaction ID prefixed with PROV_PA_ for webhook identification.
 */
export const initiateProviderPlatformPayment = async (
	providerId: string,
	billingCycle: 'monthly' | 'quarterly',
	amountMinor: number,
	options?: { redirectUrlOverride?: string; idempotencyKey?: string; requireGateway?: boolean },
) => {
	const providerToken = toCompactToken(providerId, 8) || 'provider';
	const transactionId = `PROV_PA_${providerToken}_${Date.now()}`;
	const hasPhonePeOAuth = Boolean(String(process.env.PHONEPE_CLIENT_ID || '').trim())
		&& Boolean(String(process.env.PHONEPE_CLIENT_SECRET || '').trim());
	const requireGateway = Boolean(options?.requireGateway);
	const shouldBypass = !requireGateway && env.allowDevPaymentBypass && env.nodeEnv !== 'production' && !hasPhonePeOAuth;
	const canFallbackWithoutGateway = shouldBypass;
	const frontendBaseUrl = env.frontendUrl;
	const paymentStatusBase = `${frontendBaseUrl}/#/payment/status`;
	const redirectUrlTarget = String(options?.redirectUrlOverride || `${paymentStatusBase}?transactionId=${transactionId}&status=SUCCESS`).trim();
	const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId: providerId,
			amountInPaise: amountMinor,
			callbackUrl,
			redirectUrl: redirectUrlTarget,
			metadata: {
				flow: 'provider_platform_access',
				billingCycle,
			},
		});
	} catch (error: any) {
		if (!shouldBypass && !canFallbackWithoutGateway) {
			throw new AppError(error?.message || 'PhonePe Payment Initiation Failed', 502);
		}
		logger.warn('[PhonePe] Platform access payment fallback to local redirect', {
			transactionId,
			nodeEnv: env.nodeEnv,
			error: error?.message,
		});
		redirectUrl = redirectUrlTarget;
	}

	// Create financialPayment record
	try {
		await prisma.providerWallet.upsert({
			where: { providerId },
			update: {},
			create: { providerId },
		}).catch(() => null);

		await prisma.financialPayment.create({
			data: {
				merchantTransactionId: transactionId,
				providerId,
				amountMinor,
				currency: 'INR',
				captureIdempotencyKey: String(options?.idempotencyKey || `prov_pa:${providerId}:${billingCycle}:${new Date().toISOString().slice(0, 10)}`),
				status: shouldBypass ? 'CAPTURED' : 'INITIATED',
				metadata: {
					type: 'provider_platform_access',
					flow: 'provider_platform_access',
					billingCycle,
					redirectUrl,
					redirectUrlOverride: String(options?.redirectUrlOverride || '').trim() || undefined,
				},
			},
		});
	} catch (error: any) {
		if (String(error?.code || '') !== 'P2002') throw error;
		// Duplicate idempotency — payment already initiated today, that's fine
	}

	if (shouldBypass) {
		// Dev bypass: activate immediately
		const { activatePlatformAccess } = await import('./platform-access.service');
		await activatePlatformAccess(providerId, billingCycle, transactionId);
	}

	return {
		transactionId,
		redirectUrl,
		billingCycle,
		amountMinor,
	};
};
