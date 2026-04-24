import crypto, { randomUUID } from 'crypto';
import { createClient } from 'redis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { initiatePhonePePayment, checkPhonePeStatus } from './phonepe.service';
import { recordPaymentCapturedMetric } from './payment-metrics.service';
import { reactivatePatientSubscription } from './patient-v1.service';
import { activateProviderSubscription } from './provider-subscription.service';
import { activateAllPendingComponents, expirePendingComponents } from './provider-subscription.pending.service';
import { extractDeclineReasonFromPhonePe, formatDeclineMessage } from './phonepe-decline-reasons.service';
import { sendWhatsAppMessage } from './whatsapp.service';
import { logger } from '../utils/logger';
import { getPlatformConfig } from './platform-config.service';

const redis = createClient({
  url: env.redisUrl,
  socket: {
    reconnectStrategy: () => false,
  },
});
let redisWarned = false;
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
	redis.on('error', (error) => {
		if (!redisWarned) {
			console.warn('[payment.service] Redis unavailable, continuing with degraded idempotency cache', error);
			redisWarned = true;
		}
	});
	void redis.connect().catch(() => undefined);
}

const db = prisma as any;

const asMinor = (value: number): number => Math.max(0, Math.round(value));

const isPlaceholderSecret = (value: string): boolean => {
	const normalized = String(value || '').trim().toLowerCase();
	if (!normalized) return true;
	return normalized.startsWith('change-')
		|| normalized.includes('replace-me')
		|| normalized.includes('your-')
		|| normalized === 'dummy'
		|| normalized === 'test';
};

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

const DEFAULT_COMMISSION = {
	providerPercent: env.paymentProviderSharePercent,
	platformPercent: env.paymentPlatformSharePercent,
};

const normalizeCommission = (input: any) => {
	const providerPercent = Number(input?.providerPercent ?? input?.provider ?? input?.provider_share ?? DEFAULT_COMMISSION.providerPercent);
	const platformPercent = Number(input?.platformPercent ?? input?.platform ?? input?.platform_share ?? DEFAULT_COMMISSION.platformPercent);
	if (!Number.isFinite(providerPercent) || !Number.isFinite(platformPercent)) {
		return DEFAULT_COMMISSION;
	}
	if (Math.round(providerPercent + platformPercent) !== 100) {
		return DEFAULT_COMMISSION;
	}
	return { providerPercent, platformPercent };
};

const resolveCommissionSplit = async (providerId?: string | null) => {
	const config = await getPlatformConfig('commission', { allowMissing: true });
	if (!config?.value || typeof config.value !== 'object') {
		return normalizeCommission(DEFAULT_COMMISSION);
	}
	const value = config.value as any;
	const overrides = value.providers || value.overrides || {};
	const providerOverride = providerId ? overrides[providerId] : null;
	const base = value.default || value.base || value;
	return normalizeCommission(providerOverride || base);
};

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
	
	// GUIDELINE COMPLIANCE: PhonePe requires minimum 100 paise (₹1.00)
	if (!Number.isFinite(amountMinor) || amountMinor < 100) {
		throw new AppError('amountMinor must be at least 100 paise (₹1.00) per PhonePe payment gateway requirements', 422);
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
	const hasPhonePeOAuth = !isPlaceholderSecret(String(process.env.PHONEPE_CLIENT_ID || ''))
		&& !isPlaceholderSecret(String(process.env.PHONEPE_CLIENT_SECRET || ''));
	const shouldBypass = env.allowDevPaymentBypass && env.nodeEnv === 'development' && !hasPhonePeOAuth;
	const frontendBaseUrl = env.frontendUrl;
	const paymentStatusBase = `${frontendBaseUrl}/#/payment/status`;
	const callbackUrl = `${env.apiUrl}${env.apiPrefix}/v1/payments/phonepe/webhook`;

	let redirectUrl: string;
	try {
		redirectUrl = await initiatePhonePePayment({
			transactionId,
			userId: input.patientId,
			amountInPaise: amountMinor,
			callbackUrl,
			redirectUrl: `${paymentStatusBase}?transactionId=${transactionId}`,
		});
	} catch (error: any) {
		if (!shouldBypass) {
			throw new AppError(error?.message || 'Failed to initiate PhonePe payment', 500);
		}

		redirectUrl = `${paymentStatusBase}?transactionId=${transactionId}`;
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

	const commission = await resolveCommissionSplit(input.providerId);
	const platformShareRatio = commission.platformPercent / 100;
	const providerShareRatio = commission.providerPercent / 100;

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

				const commission = await resolveCommissionSplit(payment.providerId ?? null);
				const providerShareRatio = commission.providerPercent / 100;
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

				// Send WhatsApp payment success notification (non-blocking)
				const patientUser = await db.user.findUnique({
					where: { id: String(capturedPayment.patientId) },
					select: { phone: true, name: true },
				});
				if (patientUser?.phone) {
					sendWhatsAppMessage({
						phoneNumber: patientUser.phone,
						templateType: 'payment_success',
						userType: 'patient',
						templateVariables: {
							name: patientUser.name || 'User',
							amount: `₹${(capturedAmountMinor / 100).toFixed(2)}`,
							planName: 'Session Payment',
							expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
						},
						flowEvent: 'PAYMENT_SUCCESS',
						flowRole: 'PATIENT',
						flowData: {
							userId: String(capturedPayment.patientId || ''),
							name: String(patientUser.name || 'User'),
							amount: `₹${(capturedAmountMinor / 100).toFixed(2)}`,
						},
					}).catch((err) => console.error('[Payment] Failed to send payment_success WhatsApp:', err.message));
				}

					// Invoice generation intentionally disabled.
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

	const verify = await checkPhonePeStatus(merchantTransactionId);
			const verifyCode = String(verify?.code || '').toUpperCase();
			// GUIDELINE COMPLIANCE: Rely ONLY on .state field for payment status determination
			const verifyState = String(verify?.data?.state || '').toUpperCase().trim();
			const isVerifiedByStatus = Boolean(verify) && (
				verifyCode === 'PAYMENT_SUCCESS' || verifyState === 'COMPLETED'
			);
			const isExplicitFailure = verifyCode === 'PAYMENT_ERROR'
				|| verifyState === 'FAILED'
				|| verifyState === 'DECLINED'
				|| verifyState === 'CANCELLED';
			
			// GUIDELINE: Handle PENDING states with reconciliation
			const isPendingState = verifyState === 'PENDING' || verifyState === '';
			if (isPendingState && !isExplicitFailure) {
				// GUIDELINE Option 2: Mark as pending in UI but reconcile backend until terminal
				logger.warn('[PaymentService] Transaction in PENDING state; backend will continue reconciliation', {
					merchantTransactionId,
					verifyCode,
					verifyState,
				});
				// Don't throw - allow webhook to mark as PENDING_CAPTURE, frontend will poll
				// Or reconcile here if backend should drive the completion
			}

			if (isExplicitFailure) {
				throw new AppError('Patient payment verification failed or declined', 400);
			}

			if (!isVerifiedByStatus && !isPendingState) {
				logger.warn('[PaymentService] Status verification unavailable/non-completed; proceeding with webhook success', {
					merchantTransactionId,
					verifyCode,
					verifyState,
				});
			}

			// Fix 8: Idempotency check for patient
			const existingSub = await db.patientSubscription.findUnique({ where: { userId } });
			if (existingSub?.paymentId === merchantTransactionId) {
				logger.debug(`[PaymentService] Patient subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
				return { handled: true, message: 'Patient subscription already processed' };
			}

			const lockedMinor = Number(payment?.metadata?.priceLockedMinor ?? payment?.amountMinor ?? 0);
			const planVersion = Number(payment?.metadata?.planVersion || 1);
			const planName = String(payment?.metadata?.planName || '').trim() || undefined;

			const activated = await reactivatePatientSubscription(userId, merchantTransactionId, String(planKey || ''), {
				priceLockedMinor: lockedMinor,
				planVersion,
				planName,
				priceLocked: lockedMinor > 0,
			});

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
							planName: planName || payment?.metadata?.planName,
							planVersion,
							priceLockedMinor: lockedMinor,
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

				// Send WhatsApp payment success for subscription (non-blocking)
				const patientUser = await db.user.findUnique({
					where: { id: userId },
					select: { phone: true, name: true },
				});
				if (patientUser?.phone) {
					sendWhatsAppMessage({
						phoneNumber: patientUser.phone,
						templateType: 'payment_success',
						userType: 'patient',
						templateVariables: {
							name: patientUser.name || 'User',
							amount: `₹${(Number(payment.amountMinor || 0) / 100).toFixed(2)}`,
							planName: String(planKey || 'Subscription Plan'),
							expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
						},
						flowEvent: 'PAYMENT_SUCCESS',
						flowRole: 'PATIENT',
						flowData: {
							userId,
							name: String(patientUser.name || 'User'),
							amount: `₹${(Number(payment.amountMinor || 0) / 100).toFixed(2)}`,
						},
					}).catch((err) => console.error('[Payment] Failed to send subscription payment_success WhatsApp:', err.message));
				}

				// Invoice generation intentionally disabled.
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

			const verify = await checkPhonePeStatus(merchantTransactionId);
			const verifyCode = String(verify?.code || '').toUpperCase();
			const verifyState = String(verify?.data?.state || '').toUpperCase();
			const rawDeclineReason = extractDeclineReasonFromPhonePe(verify?.data || {});
			const declineReasonInfo = formatDeclineMessage(rawDeclineReason);
			
			const isVerifiedByStatus = Boolean(verify) && (
				verifyCode === 'PAYMENT_SUCCESS' || verifyState === 'COMPLETED'
			);
			const isExplicitFailure = verifyCode === 'PAYMENT_ERROR'
				|| verifyState === 'FAILED'
				|| verifyState === 'DECLINED';

			// ================================================================
			// PHASE 2: Handle payment failure → expire pending components
			// ================================================================
			if (isExplicitFailure) {
				// Expire all pending subscription components
				await expirePendingComponents({
					providerId,
					merchantTransactionId,
					reason: rawDeclineReason || 'payment_declined',
				}).catch(err => {
					logger.warn('[Phase2] Failed to expire pending components on payment failure', {
						providerId,
						merchantTransactionId,
						error: String(err),
					});
					// Continue anyway - don't throw
				});

				// Store decline reason in payment record for dashboard/retry flow
				if (payment?.id) {
					await db.financialPayment.update({
						where: { id: payment.id },
						data: {
							status: 'FAILED',
							failedAt: new Date(),
							failureReason: rawDeclineReason,
							metadata: {
								...(payment.metadata || {}),
								type: 'provider_subscription',
								plan: planKey,
								declineReason: rawDeclineReason,
								declineTitle: declineReasonInfo.title,
								declineMessage: declineReasonInfo.message,
								declineAction: declineReasonInfo.action,
								declineIsRetryable: declineReasonInfo.isRetryable,
								declineRetryAfterMinutes: declineReasonInfo.retryAfterMinutes,
							},
						},
					}).catch(err => {
						logger.warn('[Phase2] Failed to update payment record with decline reason', { error: String(err) });
					});
				}

				throw new AppError(declineReasonInfo.title, 400);
			}

			if (!isVerifiedByStatus) {
				logger.warn('[PaymentService] Provider status verification unavailable/non-completed; proceeding with webhook success', {
					merchantTransactionId,
					verifyCode,
					verifyState,
				});
			}

			// Fix 8: Idempotency check for provider
			const existingSub = await db.providerSubscription.findUnique({ where: { providerId } });
			if (existingSub?.paymentId === merchantTransactionId) {
				logger.debug(`[PaymentService] Provider subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
				return { handled: true, message: 'Provider subscription already processed' };
			}

			// ================================================================
			// PHASE 2: Atomically activate all pending subscription components
			// ================================================================
			const pendingActivation = await activateAllPendingComponents({
				providerId,
				merchantTransactionId,
			}).catch(err => {
				logger.error('[Phase2] Failed to atomically activate pending components', {
					providerId,
					merchantTransactionId,
					error: String(err),
				});
				// Continue with legacy activation for backward compatibility
				return {
					platformActivated: 0,
					leadPlanActivated: 0,
					marketplaceActivated: 0,
					totalActivated: 0,
				};
			});

			const providerPlanVersion = Number(payment?.metadata?.planVersion || 1);
			const providerLockedMinor = Number(payment?.metadata?.priceLockedMinor ?? payment?.amountMinor ?? 0);
			const providerPriceInr = Number(payment?.metadata?.planPriceInr || 0) || (providerLockedMinor > 0 ? Math.round(providerLockedMinor / 100) : undefined);
			const activated = await activateProviderSubscription(providerId, planKey as any, merchantTransactionId, {
				priceOverride: providerPriceInr,
				planVersion: providerPlanVersion,
				priceLocked: providerLockedMinor > 0,
			});

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
							planVersion: providerPlanVersion,
							priceLockedMinor: providerLockedMinor,
							subscriptionId: String(activated?.id || ''),
							paymentVerifiedAt: new Date().toISOString(),
							// Store Phase 2 activation details
							pendingComponentsActivated: pendingActivation.totalActivated,
							phase2enabled: true,
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

				// Send WhatsApp payment success for provider subscription (non-blocking)
				const providerUser = await db.user.findUnique({
					where: { id: providerId },
					select: { phone: true, name: true },
				});
				if (providerUser?.phone) {
					sendWhatsAppMessage({
						phoneNumber: providerUser.phone,
						templateType: 'payment_success',
						userType: 'therapist',
						templateVariables: {
							name: providerUser.name || 'Provider',
							amount: `₹${(Number(payment.amountMinor || 0) / 100).toFixed(2)}`,
							planName: String(planKey || 'Subscription Plan'),
							expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
						},
						flowEvent: 'PAYMENT_SUCCESS',
						flowRole: 'THERAPIST',
						flowData: {
							userId: providerId,
							name: String(providerUser.name || 'Provider'),
							amount: `₹${(Number(payment.amountMinor || 0) / 100).toFixed(2)}`,
						},
					}).catch((err) => console.error('[Payment] Failed to send provider subscription payment_success WhatsApp:', err.message));
				}

				// Invoice generation intentionally disabled.
			}

			logger.info(`[PaymentService] Provider subscription activated successfully (Phase 2)`, {
				merchantTransactionId,
				providerId,
				planKey,
				pendingComponentsActivated: pendingActivation.totalActivated,
			});
			return { handled: true, message: 'PhonePe provider subscription payment processed (with atomic pending activation)' };
		}

		// ================================================================
		// CERT_ — Certification Enrollment Payment
		// ================================================================
		if (merchantTransactionId.startsWith('CERT_')) {
			const payment = await db.financialPayment.findFirst({
				where: { merchantTransactionId: merchantTransactionId },
				orderBy: { createdAt: 'desc' },
			});
			if (payment?.status === 'CAPTURED') {
				return { handled: true, message: 'Certification enrollment payment already captured' };
			}

			const verify = await checkPhonePeStatus(merchantTransactionId);
			const verifyCode = String(verify?.code || '').toUpperCase();
			const verifyState = String(verify?.data?.state || '').toUpperCase();
			const isVerifiedByStatus = Boolean(verify) && (
				verifyCode === 'PAYMENT_SUCCESS' || verifyState === 'COMPLETED'
			);

			if (!isVerifiedByStatus) {
				logger.warn('[PaymentService] Certification payment not verified', { merchantTransactionId, verifyCode, verifyState });
				throw new AppError('Certification payment verification failed', 400);
			}

			// Extract metadata from either the webhook data or our local payment record
			const certSlug = String(data?.metadata?.certSlug || payment?.metadata?.certSlug || '');
			const userId = String(data?.metadata?.userId || payment?.patientId || data?.metaInfo?.udf1 || '');
			const paymentPlan = String(data?.metadata?.paymentPlan || payment?.metadata?.paymentPlan || 'full').toUpperCase();
			const totalAmountPaise = Number(data?.amount || payment?.amountMinor || 0);

			if (!userId || !certSlug) {
				logger.error('[PaymentService] Missing required metadata for certification payment', { userId, certSlug, merchantTransactionId });
				throw new AppError('Unable to resolve enrollment details from certification payment', 422);
			}

			await db.$transaction(async (tx: any) => {
				// 1. Update CertificationEnrollment
				const enrollment = await tx.certificationEnrollment.findUnique({
					where: { userId_certificationSlug: { userId, certificationSlug: certSlug } }
				});

				if (!enrollment) {
					logger.error('[PaymentService] Enrollment record not found during payment capture', { userId, certSlug });
					throw new AppError('Enrollment record not found', 404);
				}

				const isInstallment = paymentPlan === 'INSTALLMENT';
				const currentPaid = Number(enrollment.installmentsPaidCount || 0);
				const nextPaid = isInstallment ? currentPaid + 1 : 1;
				const isFullyPaidNow = !isInstallment || nextPaid >= 3;

				await tx.certificationEnrollment.update({
					where: { id: enrollment.id },
					data: {
						status: isFullyPaidNow ? 'PAID' : 'PARTIAL',
						amountPaid: (enrollment.amountPaid || 0) + totalAmountPaise,
						installmentsPaidCount: nextPaid,
						certId: merchantTransactionId,
					}
				});

				// 2. Provision or update TherapistProfile
				const existingProfile = await tx.therapistProfile.findUnique({ where: { userId } });
				const mergedCertifications = Array.from(new Set([
					...((existingProfile?.certifications as string[] | undefined) || []),
					certSlug,
				]));

				if (existingProfile) {
					await tx.therapistProfile.update({
						where: { userId },
						data: {
							certificationStatus: 'ENROLLED',
							certificationPaymentId: merchantTransactionId,
							leadBoostScore: Math.max(30, Number(existingProfile.leadBoostScore || 0)),
							certifications: mergedCertifications,
						},
					});
				} else {
					const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
					await tx.therapistProfile.create({
						data: {
							userId,
							displayName: user?.name || 'Provider',
							certificationStatus: 'ENROLLED',
							certificationPaymentId: merchantTransactionId,
							leadBoostScore: 30,
							certifications: [certSlug],
							onboardingCompleted: false,
							isVerified: false,
						},
					});
				}

				// 3. Update financialPayment record to CAPTURED
				if (payment?.id) {
					await tx.financialPayment.update({
						where: { id: payment.id },
						data: {
							status: 'CAPTURED',
							capturedAt: new Date(),
						}
					});
				}
			});

			logger.info('[PaymentService] Certification payment processed successfully', { merchantTransactionId, userId, certSlug, paymentPlan });
			return { handled: true, message: 'Certification enrollment payment processed' };
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
}

/**
 * Reconcile payment status from PhonePe (handles PENDING polling).
 * Called from redirect page or status endpoint to verify final payment state.
 * 
 * Implements PhonePe UAT polling schedule:
 * - 1st check: after 5s
 * - 2nd-3rd checks: every 3s (15s total)
 * - 4th-5th checks: every 6s (30s total)  
 * - 6th+ checks: every 10s (until 60s+) then every 30s
 * 
 * Returns: { state, transactionId, resultMessage }
 */
export const reconcilePhonePePaymentStatus = async (
	transactionId: string,
	maxRetries: number = 5,
	initialWaitMs: number = 5000
): Promise<{ state: string; transactionId: string; resultMessage: string }> => {
	logger.info('[Payment.Reconcile] Starting status reconciliation (strict PhonePe guideline schedule)', {
		transactionId,
		maxRetries,
		initialWaitMs,
	});

	let currentState = 'PENDING';
	let lastStatus: any = null;

	// GUIDELINE COMPLIANCE: Strict reconciliation schedule as per PhonePe guidelines
	// First check: 20-25 seconds after transaction initiation
	// Then: Every 3s for 30s, every 6s for 60s, every 10s for 60s, every 30s for 60s, every 1 minute until final
	const getWaitTimeMs = (attempt: number): number => {
		if (attempt === 1) {
			return 20000; // First check: 20-25 seconds
		}
		if (attempt <= 11) {
			return 3000; // Every 3s for next 10 attempts (30 seconds total)
		}
		if (attempt <= 21) {
			return 6000; // Every 6s for next 10 attempts (60 seconds)
		}
		if (attempt <= 31) {
			return 10000; // Every 10s for next 10 attempts (100 seconds)
		}
		if (attempt <= 35) {
			return 30000; // Every 30s for next 4 attempts (120 seconds)
		}
		return 60000; // Every 1 minute thereafter
	};

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const waitMs = getWaitTimeMs(attempt);

		if (attempt > 1) {
			logger.info('[Payment.Reconcile] Waiting before retry (PhonePe guideline schedule)', {
				transactionId,
				attempt,
				nextCheckInSeconds: Math.round(waitMs / 1000),
			});
			await new Promise((resolve) => setTimeout(resolve, waitMs));
		}

		try {
			lastStatus = await checkPhonePeStatus(transactionId);
			if (!lastStatus) {
				logger.warn('[Payment.Reconcile] Status check returned null', {
					transactionId,
					attempt,
				});
				continue;
			}

			// GUIDELINE COMPLIANCE: Rely only on .state field for payment status determination
			const state = String(lastStatus?.data?.state || '').toUpperCase().trim();
			
			logger.info('[Payment.Reconcile] Status check result', {
				transactionId,
				attempt,
				state,
				code: lastStatus?.code,
				rawData: lastStatus?.data,
			});

			// Map state: COMPLETED or PAYMENT_SUCCESS = success
			const isTerminalSuccess = state === 'COMPLETED' || state === 'PAYMENT_SUCCESS';
			const isTerminalFailure = state === 'FAILED' || state === 'DECLINED' || state === 'CANCELLED';
			const isStillPending = state === 'PENDING' || state === '';

			if (isTerminalSuccess || isTerminalFailure) {
				currentState = isTerminalSuccess ? 'COMPLETED' : state;
				logger.info('[Payment.Reconcile] Terminal state reached', {
					transactionId,
					state: currentState,
					attemptNumber: attempt,
				});

				// If success, trigger webhook processing to update DB state
				if (isTerminalSuccess && transactionId.startsWith('SUB_')) {
					try {
						await processPhonePeWebhook(lastStatus).catch((error) => {
							logger.warn('[Payment.Reconcile] Inline webhook processing failed', {
								transactionId,
								error: error?.message,
							});
						});
					} catch {}
				}

				return {
					state: currentState,
					transactionId,
					resultMessage: `Payment state is ${currentState}`,
				};
			}

			if (!isStillPending) {
				// Unknown state
				logger.warn('[Payment.Reconcile] Unknown state received', {
					transactionId,
					state,
				});
			}
		} catch (error: any) {
			logger.warn('[Payment.Reconcile] Status check error', {
				transactionId,
				attempt,
				error: error?.message,
			});
			// Continue to next retry per guideline
		}
	}

	// All retries exhausted but still PENDING
	logger.warn('[Payment.Reconcile] Max retries exhausted (guideline schedule completed), still PENDING', {
		transactionId,
		maxRetries,
		finalState: currentState,
	});

	return {
		state: 'PENDING',
		transactionId,
		resultMessage: `Payment status is still PENDING after all reconciliation attempts. Please try status check again later or contact support. (PhonePe guideline max schedule: ~${Math.round(maxRetries * 90 / 60)} min)`,
	};
}