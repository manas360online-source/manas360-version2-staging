import crypto, { randomUUID } from 'crypto';
import { createClient } from 'redis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { initiatePhonePePayment } from './phonepe.service';
import { recordPaymentCapturedMetric } from './payment-metrics.service';
import { logger } from '../utils/logger';

const redis = createClient({ url: env.redisUrl });
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
	redis.on('error', (error) => {
		console.warn('[payment.service] Redis unavailable, continuing with degraded idempotency cache', error);
	});
	void redis.connect().catch(() => undefined);
}

const db = prisma as any;

const asMinor = (value: number): number => Math.max(0, Math.round(value));

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

const providerShareRatio = env.paymentProviderSharePercent / 100;
const platformShareRatio = env.paymentPlatformSharePercent / 100;

if (Math.round((providerShareRatio + platformShareRatio) * 100) !== 100) {
	throw new Error('PAYMENT_PROVIDER_SHARE_PERCENT + PAYMENT_PLATFORM_SHARE_PERCENT must equal 100');
}

export interface CreateFinancialSessionInput {
	patientId: string;
	providerId: string;
	amountMinor: number;
	currency?: string;
	idempotencyKey?: string;
}

const assertPaymentActors = async (tx: any, patientId: string, providerId: string): Promise<void> => {
	if (patientId === providerId) {
		throw new AppError('patientId and providerId must be different', 422);
	}

	const [patient, provider] = await Promise.all([
		tx.user.findUnique({ where: { id: patientId }, select: { id: true, role: true, isDeleted: true } }),
		tx.user.findUnique({ where: { id: providerId }, select: { id: true, role: true, isDeleted: true } }),
	]);

	if (!patient || patient.isDeleted || String(patient.role) !== 'PATIENT') {
		throw new AppError('Invalid patient account', 422);
	}

	const providerRole = String(provider?.role || '');
	const isValidProviderRole = ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'].includes(providerRole);
	if (!provider || provider.isDeleted || !isValidProviderRole) {
		throw new AppError('Invalid provider account', 422);
	}
};

export const createSessionPayment = async (input: CreateFinancialSessionInput) => {
	const amountMinor = asMinor(input.amountMinor);
	if (!amountMinor) {
		throw new AppError('amountMinor must be greater than zero', 422);
	}

	const idempotencyKey = String(input.idempotencyKey || randomUUID()).trim();
	if (!idempotencyKey) {
		throw new AppError('idempotencyKey is required for payment creation', 422);
	}

	const existing = await db.financialSession.findUnique({ where: { idempotencyKey } });
	if (existing) {
		const payment = await db.financialPayment.findFirst({ where: { sessionId: existing.id } });
		if (payment) {
			return {
				sessionId: existing.id,
				
				paymentType: 'provider_fee',
 				transactionId: existing.merchantTransactionId,
				idempotencyKey,
			};
		}
	}

	const transactionId = `SESS_${Date.now()}_${idempotencyKey.slice(0, 8)}`;
	const shouldBypass = env.allowDevPaymentBypass && env.nodeEnv === 'development';
	const frontendBaseUrl = env.frontendUrl;
	const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId: input.patientId,
			amountInPaise: amountMinor,
			callbackUrl,
			redirectUrl: `${frontendBaseUrl}/payment/status?id=${transactionId}`,
		});
	} catch (error: any) {
		if (!shouldBypass) {
			throw new AppError(error?.message || 'Failed to initiate PhonePe payment', 500);
		}

		redirectUrl = `${frontendBaseUrl}/payment/status?id=${transactionId}`;
	}

	const created = await db.$transaction(async (tx: any) => {
		await assertPaymentActors(tx, input.patientId, input.providerId);

		await tx.providerWallet.upsert({
			where: { providerId: input.providerId },
			update: {},
			create: { providerId: input.providerId },
		});

		const session = await tx.financialSession.create({
			data: {
				patientId: input.patientId,
				providerId: input.providerId,
				status: 'PENDING_PAYMENT',
				expectedAmountMinor: amountMinor,
				currency: input.currency ?? 'INR',
				idempotencyKey,
				merchantTransactionId: transactionId,
			},
		});

		const payment = await tx.financialPayment.create({
			data: {
				sessionId: session.id,
				providerId: input.providerId,
				merchantTransactionId: transactionId,
				status: 'PENDING_CAPTURE',
				amountMinor,
				currency: input.currency ?? 'INR',
			},
		});

		return { session, payment };
	});

	return {
		sessionId: created.session.id,
		paymentId: created.payment.id,
		paymentType: 'provider_fee',
		transactionId,
		redirectUrl,
		amountMinor,
		currency: input.currency ?? 'INR',
		feeBreakdown: {
			platformFeeMinor: Math.round(amountMinor * platformShareRatio),
			providerFeeMinor: Math.floor(amountMinor * providerShareRatio),
		},
		idempotencyKey,
	};
};

export const processPhonePeWebhook = async (decoded: any): Promise<{ handled: boolean; message: string }> => {
	const { success, code, data } = decoded;
	const merchantTransactionId = String(data?.merchantTransactionId || '');
	
	logger.info(`[PaymentService] PhonePe Webhook Received: ${merchantTransactionId}`, { success, code, amount: data?.amount });

	if (!merchantTransactionId) {
		logger.error(`[PaymentService] PhonePe Webhook Rejected: Missing merchantTransactionId`, { decoded });
		throw new AppError('Missing merchantTransactionId in PhonePe webhook', 422);
	}

	if (success && code === 'PAYMENT_SUCCESS') {
		if (merchantTransactionId.startsWith('SESS_')) {
			let capturedPayment: any = null;
			let capturedAmountMinor = 0;
			await db.$transaction(async (tx: any) => {
				const payment = await tx.financialPayment.findFirst({
					where: { merchantTransactionId: merchantTransactionId },
				});

				if (!payment) {
					logger.error('[PaymentService] PhonePe webhook with unknown transaction', { merchantTransactionId });
					return;
				}

				if (payment.status === 'CAPTURED') {
					logger.debug('[PaymentService] PhonePe webhook duplicate capture ignored', { merchantTransactionId, paymentId: payment.id });
					capturedPayment = payment;
					capturedAmountMinor = Number(payment.amountMinor || 0);
					return;
				}

				const payloadAmountMinor = Number(data.amount);
				if (!Number.isFinite(payloadAmountMinor) || payloadAmountMinor <= 0) {
					logger.error('[PaymentService] Invalid amount in PhonePe webhook', { merchantTransactionId, amount: data.amount });
					throw new AppError('Invalid amount in PhonePe webhook', 422);
				}

				const therapistShareMinor = Math.floor(payloadAmountMinor * providerShareRatio);
				const platformShareMinor = payloadAmountMinor - therapistShareMinor;

				await tx.financialPayment.update({
					where: { id: payment.id },
					data: {
						status: 'CAPTURED',
						razorpayPaymentId: String(data.transactionId),
						capturedAt: new Date(),
						retryCount: 0,
						nextRetryAt: null,
						failedAt: null,
						failureReason: null,
						therapistShareMinor,
						platformShareMinor,
					},
				});

				capturedPayment = payment;
				capturedAmountMinor = payloadAmountMinor;

				await tx.financialSession.update({
					where: { id: payment.sessionId },
					data: { status: 'CONFIRMED', confirmedAt: new Date() },
				});

				await tx.revenueLedger.create({
					data: {
						type: 'SESSION',
						grossAmountMinor: payloadAmountMinor,
						platformCommissionMinor: platformShareMinor,
						providerShareMinor: therapistShareMinor,
						paymentType: 'PROVIDER_FEE',
						taxAmountMinor: 0,
						currency: payment.currency,
						referenceId: payment.sessionId,
						sessionId: payment.sessionId,
					},
				});
			});

			if (capturedPayment?.id) {
				await recordPaymentCapturedMetric({
					paymentId: String(capturedPayment.id),
					transactionId: merchantTransactionId,
					userId: String(capturedPayment.patientId || ''),
					amountMinor: capturedAmountMinor,
					retryCount: Number(capturedPayment.retryCount || 0),
					channel: 'session',
				});
			}

			logger.info(`[PaymentService] Session payment processed and capture recorded`, { merchantTransactionId });
			return { handled: true, message: 'PhonePe session payment processed' };
		}

		if (merchantTransactionId.startsWith('SUB_')) {
			const payment = await db.financialPayment.findFirst({
				where: { merchantTransactionId: merchantTransactionId },
				orderBy: { createdAt: 'desc' },
			});
			if (payment?.status === 'CAPTURED') {
				return { handled: true, message: 'Patient subscription payment already captured' };
			}
			const parts = merchantTransactionId.split('_');
			const userId = String(payment?.patientId || parts[1] || '');
			const planKey = data.metadata?.plan || payment?.metadata?.plan || parts[2];
			if (!userId) {
				throw new AppError('Unable to resolve patient subscription userId from payment', 422);
			}

			const { checkPhonePeStatus } = await import('./phonepe.service');
			const verify = await checkPhonePeStatus(merchantTransactionId);
			const verifyCode = String(verify?.code || '').toUpperCase();
			const verifyState = String(verify?.data?.state || '').toUpperCase();
			const isVerifiedByStatus = Boolean(verify) && (
				verifyCode === 'PAYMENT_SUCCESS' || verifyState === 'COMPLETED'
			);
			const isExplicitFailure = verifyCode === 'PAYMENT_ERROR'
				|| verifyState === 'FAILED'
				|| verifyState === 'DECLINED';

			if (isExplicitFailure) {
				throw new AppError('Patient payment not verified', 400);
			}

			if (!isVerifiedByStatus) {
				logger.warn('[PaymentService] Status verification unavailable/non-completed; proceeding with webhook success', {
					merchantTransactionId,
					verifyCode,
					verifyState,
				});
			}

			// Fix 8: Idempotency check for patient
			const { prisma } = await import('../config/db');
			const existingSub = await prisma.patientSubscription.findUnique({ where: { userId } });
			if (existingSub?.paymentId === merchantTransactionId) {
				logger.debug(`[PaymentService] Patient subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
				return { handled: true, message: 'Patient subscription already processed' };
			}

			const { reactivatePatientSubscription } = await import('./patient-v1.service');
			const activated = await reactivatePatientSubscription(userId, merchantTransactionId, String(planKey || ''));

			if (payment?.id) {
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						status: 'CAPTURED',
						razorpayPaymentId: String(data?.transactionId || payment.razorpayPaymentId || ''),
						capturedAt: new Date(),
						retryCount: 0,
						nextRetryAt: null,
						failedAt: null,
						failureReason: null,
						metadata: {
							...(payment.metadata || {}),
							type: 'patient_subscription',
							plan: planKey,
							subscriptionId: String(activated?.id || ''),
							paymentVerifiedAt: new Date().toISOString(),
						},
					},
				});

				await recordPaymentCapturedMetric({
					paymentId: String(payment.id),
					transactionId: merchantTransactionId,
					userId,
					planId: String(planKey || ''),
					amountMinor: Number(payment.amountMinor || 0),
					retryCount: Number(payment.retryCount || 0),
					channel: 'patient_subscription',
				});
			}
			
			logger.info(`[PaymentService] Patient subscription activated successfully`, { merchantTransactionId, userId, planKey });
			return { handled: true, message: 'PhonePe subscription payment processed' };
		}

		if (merchantTransactionId.startsWith('PROV_SUB_')) {
			const payment = await db.financialPayment.findFirst({
				where: { merchantTransactionId: merchantTransactionId },
				orderBy: { createdAt: 'desc' },
			});
			if (payment?.status === 'CAPTURED') {
				return { handled: true, message: 'Provider subscription payment already captured' };
			}
			const parts = merchantTransactionId.split('_');
			// Support both legacy PROV_SUB_{providerId}_{plan}_{ts} and compact IDs.
			const providerId = String(payment?.providerId || parts[2] || '');
			const planKey = data.metadata?.plan || payment?.metadata?.plan || parts[3];
			if (!providerId) {
				throw new AppError('Unable to resolve providerId from provider subscription payment', 422);
			}

			const { checkPhonePeStatus } = await import('./phonepe.service');
			const verify = await checkPhonePeStatus(merchantTransactionId);
			const verifyCode = String(verify?.code || '').toUpperCase();
			const verifyState = String(verify?.data?.state || '').toUpperCase();
			const isVerifiedByStatus = Boolean(verify) && (
				verifyCode === 'PAYMENT_SUCCESS' || verifyState === 'COMPLETED'
			);
			const isExplicitFailure = verifyCode === 'PAYMENT_ERROR'
				|| verifyState === 'FAILED'
				|| verifyState === 'DECLINED';

			if (isExplicitFailure) {
				throw new AppError('Provider payment not verified or not completed', 400);
			}

			if (!isVerifiedByStatus) {
				logger.warn('[PaymentService] Provider status verification unavailable/non-completed; proceeding with webhook success', {
					merchantTransactionId,
					verifyCode,
					verifyState,
				});
			}

			// Fix 8: Idempotency check for provider
			const { prisma } = await import('../config/db');
			const existingSub = await prisma.providerSubscription.findUnique({ where: { providerId } });
			if (existingSub?.paymentId === merchantTransactionId) {
				logger.debug(`[PaymentService] Provider subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
				return { handled: true, message: 'Provider subscription already processed' };
			}

			const { activateProviderSubscription } = await import('./provider-subscription.service');
			const activated = await activateProviderSubscription(providerId, planKey as any, merchantTransactionId);

			if (payment?.id) {
				await db.financialPayment.update({
					where: { id: payment.id },
					data: {
						status: 'CAPTURED',
						razorpayPaymentId: String(data?.transactionId || payment.razorpayPaymentId || ''),
						capturedAt: new Date(),
						retryCount: 0,
						nextRetryAt: null,
						failedAt: null,
						failureReason: null,
						metadata: {
							...(payment.metadata || {}),
							type: 'provider_subscription',
							plan: planKey,
							subscriptionId: String(activated?.id || ''),
							paymentVerifiedAt: new Date().toISOString(),
						},
					},
				});

				await recordPaymentCapturedMetric({
					paymentId: String(payment.id),
					transactionId: merchantTransactionId,
					userId: providerId,
					planId: String(planKey || ''),
					amountMinor: Number(payment.amountMinor || 0),
					retryCount: Number(payment.retryCount || 0),
					channel: 'provider_subscription',
				});
			}

			logger.info(`[PaymentService] Provider subscription activated successfully`, { merchantTransactionId, providerId, planKey });
			return { handled: true, message: 'PhonePe provider subscription payment processed' };
		}
	}

	logger.warn(`[PaymentService] PhonePe Webhook unhandled condition (success: ${success}, code: ${code})`, { merchantTransactionId });
	return { handled: true, message: `PhonePe status: ${code}` };
};

export const releaseSessionEarnings = async (sessionId: string, actorTherapistId?: string): Promise<void> => {
	await db.$transaction(async (tx: any) => {
		await tx.$queryRawUnsafe('SELECT "id" FROM "financial_sessions" WHERE "id" = $1 FOR UPDATE', sessionId);

		const session = await tx.financialSession.findUnique({ where: { id: sessionId } });
		if (!session) {
			throw new AppError('Financial session not found', 404);
		}

		if (actorTherapistId && String(session.providerId) !== String(actorTherapistId)) {
			throw new AppError('Forbidden: therapist does not own this session', 403);
		}

		if (session.status === 'COMPLETED') {
			return;
		}

		const payment = await tx.financialPayment.findFirst({
			where: { sessionId, status: 'CAPTURED' },
			orderBy: { createdAt: 'desc' },
		});

		if (!payment) {
			throw new AppError('Captured payment not found for session', 409);
		}

		await tx.$queryRawUnsafe('SELECT "id" FROM "financial_payments" WHERE "id" = $1 FOR UPDATE', payment.id);

		const releaseReferenceKey = `release:${payment.id}`;
		const existingRelease = await tx.walletTransaction.findUnique({
			where: { referenceKey: releaseReferenceKey },
			select: { id: true },
		});
		if (existingRelease) {
			return;
		}

		await tx.$queryRawUnsafe(
			'SELECT "providerId" FROM "provider_wallets" WHERE "providerId" = $1 FOR UPDATE',
			payment.providerId,
		);

		const wallet = await tx.providerWallet.findUnique({ where: { providerId: payment.providerId } });
		if (!wallet) {
			throw new AppError('Provider wallet not found', 404);
		}

		const releaseAmount = BigInt(payment.therapistShareMinor ?? 0);
		if (BigInt(wallet.pendingBalanceMinor ?? 0) < releaseAmount) {
			throw new AppError('Insufficient pending balance for release', 409);
		}

		const before = BigInt(wallet.availableBalanceMinor ?? 0);
		const after = before + releaseAmount;

		await tx.providerWallet.update({
			where: { providerId: payment.providerId },
			data: {
				pendingBalanceMinor: BigInt(wallet.pendingBalanceMinor ?? 0) - releaseAmount,
				availableBalanceMinor: after,
				version: (wallet.version ?? 1) + 1,
			},
		});

		await tx.walletTransaction.create({
			data: {
				providerId: payment.providerId,
				walletTxnType: 'RELEASE',
				status: 'POSTED',
				amountMinor: Number(releaseAmount),
				currency: payment.currency,
				balanceBeforeMinor: before,
				balanceAfterMinor: after,
				sessionId,
				
				referenceKey: releaseReferenceKey,
			},
		});

		await tx.financialSession.updateMany({
			where: { id: sessionId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
			data: { status: 'COMPLETED', completedAt: new Date() },
		});
	});
};


/**
 * Manual Payment Retry (Admin Recovery Tool)
 *
 * Allows admin/support to manually trigger payment retry for failed payments.
 * Used after customer updates payment method or during system recovery.
 *
 * Resets retry state and schedules immediate retry via reconciliation worker.
 */
export const retryPaymentManually = async (paymentId: string, adminUserId: string): Promise<{
	success: boolean;
	message: string;
	payment: {
		id: string;
		status: string;
		retryCount: number;
		nextRetryAt: Date | null;
	};
}> => {
	const payment = await db.financialPayment.findUnique({
		where: { id: paymentId },
		select: {
			id: true,
			status: true,
			retryCount: true,
			nextRetryAt: true,
			patientId: true,
			providerId: true,
			failureReason: true,
			metadata: true,
		},
	});

	if (!payment) {
		throw new AppError('Payment not found', 404);
	}

	// Already successful — no retry needed
	if (payment.status === 'CAPTURED') {
		throw new AppError('Payment already captured successfully', 400);
	}

	// Attempting to retry an expired payment — check if we should allow
	if (payment.status === 'EXPIRED') {
		logger.warn('[ManualRetry] Attempting to retry expired payment', {
			paymentId,
			adminUserId,
		});
		// Allow retry, but it will require re-initiation from gateway
	}

	// Reset retry counter and schedule immediate retry
	const updatedPayment = await db.financialPayment.update({
		where: { id: paymentId },
		data: {
			retryCount: 0,
			nextRetryAt: new Date(), // Immediate retry
			metadata: {
				...(typeof payment.metadata === 'object' && payment.metadata ? payment.metadata : {}),
				manualRetryTriggeredAt: new Date().toISOString(),
				manualRetryTriggeredBy: adminUserId,
				previousStatus: payment.status,
				previousFailureReason: payment.failureReason,
			},
		},
		select: {
			id: true,
			status: true,
			retryCount: true,
			nextRetryAt: true,
		},
	});

	logger.info('MANUAL_PAYMENT_RETRY_TRIGGERED', {
		paymentId,
		adminUserId,
		previousStatus: payment.status,
		previousRetryCount: Number(payment.retryCount || 0),
		newRetryCount: Number(updatedPayment.retryCount || 0),
		nextRetryAt: updatedPayment.nextRetryAt,
		patientId: payment.patientId,
		providerId: payment.providerId,
	});

	return {
		success: true,
		message: 'Payment retry scheduled for immediate processing',
		payment: updatedPayment,
	};
};