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

export const initiatePatientSubscriptionPayment = async (userId: string, planKey: string) => {
	const plan = await getActivePlatformPlan(planKey);
	if (!plan) throw new AppError('Invalid subscription plan', 422);

	const existingSubscription = await prisma.patientSubscription.findUnique({ where: { userId } }).catch(() => null);
	const isSameActivePlan = Boolean(
		existingSubscription
		&& String(existingSubscription.status || '').toLowerCase() === 'active'
		&& new Date(existingSubscription.renewalDate).getTime() > Date.now()
		&& String(existingSubscription.planName || '').trim().toLowerCase() === String(plan.name || '').trim().toLowerCase(),
	);
	if (isSameActivePlan) {
		throw new AppError('This subscription plan is already active', 409);
	}

	const initiatedAttempts = await prisma.financialPayment.findMany({
		where: {
			patientId: userId,
			status: 'INITIATED',
		},
		orderBy: { createdAt: 'desc' },
		take: 20,
	}).catch(() => [] as any[]);

	const matchingAttempts = initiatedAttempts.filter((row: any) =>
		String(row?.metadata?.type || '') === 'patient_subscription'
		&& String(row?.metadata?.plan || '') === String(planKey),
	);

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

	const userToken = toCompactToken(userId, 12) || 'user';
	const planToken = toCompactToken(planKey, 10) || 'plan';
	const transactionId = `SUB_${userToken}_${planToken}_${Date.now()}`;
	const shouldBypass = false;
	const amountMinor = Math.max(0, Math.round(Number(plan.price || 0) * 100));
	const frontendBaseUrl = env.frontendUrl;
	const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;
	const cycleKey = new Date().toISOString().slice(0, 10);
	const subscriptionIdempotencyKey = `sub_init:${userId}:${planKey}:${cycleKey}`;

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId,
			amountInPaise: amountMinor,
			callbackUrl,
			redirectUrl: `${frontendBaseUrl}/payment/status?id=${transactionId}&status=SUCCESS`,
		});
	} catch (error: any) {
		if (!shouldBypass) {
			throw new AppError(error?.message || 'PhonePe Payment Initiation Failed', 502);
		}
		// Bypass mode: mock a success redirect
		logger.info('[PhonePe] Bypassing patient payment initiation in development mode', { transactionId });
		redirectUrl = `${frontendBaseUrl}/payment/status?id=${transactionId}&status=SUCCESS`;
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
				price: amountMinor,
				status: 'active',
				renewalDate: nextRenewalDate,
				updatedAt: new Date(),
			},
			create: {
				userId,
				planName: plan.name,
				price: amountMinor,
				status: 'active',
				renewalDate: nextRenewalDate,
				billingCycle: 'monthly',
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
