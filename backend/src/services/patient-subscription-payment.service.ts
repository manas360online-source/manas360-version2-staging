import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { getActivePlatformPlan } from './pricing.service';
import { initiatePhonePePayment } from './phonepe.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const toCompactToken = (value: string, maxLength: number): string =>
	String(value || '')
		.replace(/[^a-zA-Z0-9]/g, '')
		.slice(0, maxLength)
		.toLowerCase();

interface PatientSubscriptionPaymentOptions {
	amountMinorOverride?: number;
	idempotencyKey?: string;
	redirectUrlOverride?: string;
	metadata?: Record<string, unknown>;
}

export const initiatePatientSubscriptionPayment = async (
	userId: string,
	planKey: string,
	options?: PatientSubscriptionPaymentOptions,
) => {
	const plan = await getActivePlatformPlan(planKey);
	if (!plan) throw new AppError('Invalid subscription plan', 422);

	const existingSubscription = await prisma.patientSubscription.findUnique({ where: { userId } }).catch(() => null);
	const isAnyActiveSubscription = Boolean(
		existingSubscription
		&& String(existingSubscription.status || '').toLowerCase() === 'active'
		&& new Date(existingSubscription.renewalDate).getTime() > Date.now(),
	);
	if (isAnyActiveSubscription) {
		throw new AppError('An active subscription already exists', 409);
	}

	const initiatedAttempts = await prisma.financialPayment.findMany({
		where: {
			patientId: userId,
			status: 'INITIATED',
		},
		orderBy: { createdAt: 'desc' },
		take: 20,
	}).catch(() => [] as any[]);

	const requestedIdempotencyKey = String(options?.idempotencyKey || '').trim();
	const matchingAttempts = initiatedAttempts.filter((row: any) => {
		const isPlanMatch =
			String(row?.metadata?.type || '') === 'patient_subscription'
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
				planName: plan.name,
				price: plan.price,
			};
		}

		await prisma.financialPayment.deleteMany({
			where: {
				id: { in: matchingAttempts.map((item: any) => String(item.id)) },
			},
		}).catch(() => null);
	}

	const userToken = toCompactToken(userId, 8) || 'user';
	const transactionId = `SUB_${userToken}_${Date.now()}`;
	const hasPhonePeOAuth = Boolean(String(process.env.PHONEPE_CLIENT_ID || '').trim())
		&& Boolean(String(process.env.PHONEPE_CLIENT_SECRET || '').trim());
	const shouldBypass = ((env.allowDevPaymentBypass && env.nodeEnv !== 'production' && !hasPhonePeOAuth) || env.subscriptionPaymentBypass);
	// Only allow local success fallback when bypass is explicitly enabled.
	const canFallbackWithoutGateway = shouldBypass;
	const amountMinor = Math.max(
		0,
		Math.round(
			Number.isFinite(Number(options?.amountMinorOverride))
				? Number(options?.amountMinorOverride)
				: Number(plan.price || 0) * 100,
		),
	);
	const frontendBaseUrl = env.frontendUrl;
	const paymentStatusBase = `${frontendBaseUrl}/#/payment/status`;
	const redirectUrlTarget = String(options?.redirectUrlOverride || `${paymentStatusBase}?transactionId=${transactionId}&status=SUCCESS`).trim();
	const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;
	const cycleKey = new Date().toISOString().slice(0, 10);
	const subscriptionIdempotencyKey = requestedIdempotencyKey || `sub_init:${userId}:${planKey}:${cycleKey}`;

	let redirectUrl: string;
	if (shouldBypass) {
		// Short-circuit: no gateway call, pretend success and jump to local success page.
		redirectUrl = redirectUrlTarget;
	} else {
		try {
			redirectUrl = await initiatePhonePePayment({
				transactionId,
				userId,
				amountInPaise: amountMinor,
				callbackUrl,
				redirectUrl: redirectUrlTarget,
			});
		} catch (error: any) {
			if (!canFallbackWithoutGateway) {
				throw new AppError(error?.message || 'PhonePe Payment Initiation Failed', 502);
			}
			// Non-production fallback: continue with local redirect when gateway is unavailable.
			logger.warn('[PhonePe] Falling back to local redirect after patient payment initiation failure', {
				transactionId,
				nodeEnv: env.nodeEnv,
				error: error?.message,
			});
			redirectUrl = redirectUrlTarget;
		}
	}

	// Mandatory: Create financialPayment record for reconciliation worker
	try {
		await prisma.financialPayment.create({
			data: {
				merchantTransactionId: transactionId,
				patientId: userId,
				amountMinor: BigInt(amountMinor),
				currency: 'INR',
				captureIdempotencyKey: subscriptionIdempotencyKey,
				status: shouldBypass ? 'CAPTURED' : 'INITIATED',
				metadata: {
					type: 'patient_subscription',
					plan: planKey,
					redirectUrl,
					idempotencyKey: subscriptionIdempotencyKey,
					redirectUrlOverride: String(options?.redirectUrlOverride || '').trim() || undefined,
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
				planName: plan.name,
				price: plan.price,
			};
		}

		throw new AppError('Payment initiation already in progress. Please retry in a moment.', 409);
	}

	if (shouldBypass) {
		const nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
		await prisma.patientSubscription.upsert({
			where: { userId },
			update: {
				planName: plan.name,
				price: Number(plan.price || 0),
				status: 'active',
				renewalDate: nextRenewalDate,
				autoRenew: true,
				billingCycle: 'monthly',
				updatedAt: new Date(),
			},
			create: {
				userId,
				planName: plan.name,
				price: Number(plan.price || 0),
				status: 'active',
				renewalDate: nextRenewalDate,
				billingCycle: 'monthly',
				autoRenew: true,
			}
		});
	}

	return {
		transactionId,
		redirectUrl,
		planName: plan.name,
		price: plan.price,
	};
};
