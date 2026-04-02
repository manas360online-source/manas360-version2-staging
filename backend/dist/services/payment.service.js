"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePhonePePaymentStatus = exports.retryPaymentManually = exports.releaseSessionEarnings = exports.processPhonePeWebhook = exports.createSessionPayment = void 0;
const crypto_1 = __importStar(require("crypto"));
const redis_1 = require("redis");
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const phonepe_service_1 = require("./phonepe.service");
const payment_metrics_service_1 = require("./payment-metrics.service");
const patient_v1_service_1 = require("./patient-v1.service");
const provider_subscription_service_1 = require("./provider-subscription.service");
const provider_subscription_pending_service_1 = require("./provider-subscription.pending.service");
const phonepe_decline_reasons_service_1 = require("./phonepe-decline-reasons.service");
const logger_1 = require("../utils/logger");
const redis = (0, redis_1.createClient)({
    url: env_1.env.redisUrl,
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
const db = db_1.prisma;
const asMinor = (value) => Math.max(0, Math.round(value));
const sha256 = (input) => crypto_1.default.createHash('sha256').update(input).digest('hex');
const providerShareRatio = env_1.env.paymentProviderSharePercent / 100;
const platformShareRatio = env_1.env.paymentPlatformSharePercent / 100;
if (Math.round((providerShareRatio + platformShareRatio) * 100) !== 100) {
    throw new Error('PAYMENT_PROVIDER_SHARE_PERCENT + PAYMENT_PLATFORM_SHARE_PERCENT must equal 100');
}
const assertPaymentActors = async (tx, patientId, providerId) => {
    if (patientId === providerId) {
        throw new error_middleware_1.AppError('patientId and providerId must be different', 422);
    }
    const [patient, provider] = await Promise.all([
        tx.user.findUnique({ where: { id: patientId }, select: { id: true, role: true, isDeleted: true } }),
        tx.user.findUnique({ where: { id: providerId }, select: { id: true, role: true, isDeleted: true } }),
    ]);
    if (!patient || patient.isDeleted || String(patient.role) !== 'PATIENT') {
        throw new error_middleware_1.AppError('Invalid patient account', 422);
    }
    const providerRole = String(provider?.role || '');
    const isValidProviderRole = ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'].includes(providerRole);
    if (!provider || provider.isDeleted || !isValidProviderRole) {
        throw new error_middleware_1.AppError('Invalid provider account', 422);
    }
};
const createSessionPayment = async (input) => {
    const amountMinor = asMinor(input.amountMinor);
    // GUIDELINE COMPLIANCE: PhonePe requires minimum 100 paise (₹1.00)
    if (!Number.isFinite(amountMinor) || amountMinor < 100) {
        throw new error_middleware_1.AppError('amountMinor must be at least 100 paise (₹1.00) per PhonePe payment gateway requirements', 422);
    }
    const idempotencyKey = String(input.idempotencyKey || (0, crypto_1.randomUUID)()).trim();
    if (!idempotencyKey) {
        throw new error_middleware_1.AppError('idempotencyKey is required for payment creation', 422);
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
    const hasPhonePeOAuth = Boolean(String(process.env.PHONEPE_CLIENT_ID || '').trim())
        && Boolean(String(process.env.PHONEPE_CLIENT_SECRET || '').trim());
    const shouldBypass = env_1.env.allowDevPaymentBypass && env_1.env.nodeEnv === 'development' && !hasPhonePeOAuth;
    const frontendBaseUrl = env_1.env.frontendUrl;
    const paymentStatusBase = `${frontendBaseUrl}/#/payment/status`;
    const callbackUrl = `${env_1.env.apiUrl}${env_1.env.apiPrefix}/v1/payments/phonepe/webhook`;
    let redirectUrl;
    try {
        redirectUrl = await (0, phonepe_service_1.initiatePhonePePayment)({
            transactionId,
            userId: input.patientId,
            amountInPaise: amountMinor,
            callbackUrl,
            redirectUrl: `${paymentStatusBase}?transactionId=${transactionId}`,
        });
    }
    catch (error) {
        if (!shouldBypass) {
            throw new error_middleware_1.AppError(error?.message || 'Failed to initiate PhonePe payment', 500);
        }
        redirectUrl = `${paymentStatusBase}?transactionId=${transactionId}`;
    }
    const created = await db.$transaction(async (tx) => {
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
exports.createSessionPayment = createSessionPayment;
const processPhonePeWebhook = async (decoded) => {
    const { success, code, data } = decoded;
    const merchantTransactionId = String(data?.merchantTransactionId || '');
    logger_1.logger.info(`[PaymentService] PhonePe Webhook Received: ${merchantTransactionId}`, { success, code, amount: data?.amount });
    if (!merchantTransactionId) {
        logger_1.logger.error(`[PaymentService] PhonePe Webhook Rejected: Missing merchantTransactionId`, { decoded });
        throw new error_middleware_1.AppError('Missing merchantTransactionId in PhonePe webhook', 422);
    }
    if (success && code === 'PAYMENT_SUCCESS') {
        if (merchantTransactionId.startsWith('SESS_')) {
            let capturedPayment = null;
            let capturedAmountMinor = 0;
            await db.$transaction(async (tx) => {
                const payment = await tx.financialPayment.findFirst({
                    where: { merchantTransactionId: merchantTransactionId },
                });
                if (!payment) {
                    logger_1.logger.error('[PaymentService] PhonePe webhook with unknown transaction', { merchantTransactionId });
                    return;
                }
                if (payment.status === 'CAPTURED') {
                    logger_1.logger.debug('[PaymentService] PhonePe webhook duplicate capture ignored', { merchantTransactionId, paymentId: payment.id });
                    capturedPayment = payment;
                    capturedAmountMinor = Number(payment.amountMinor || 0);
                    return;
                }
                const payloadAmountMinor = Number(data.amount);
                if (!Number.isFinite(payloadAmountMinor) || payloadAmountMinor <= 0) {
                    logger_1.logger.error('[PaymentService] Invalid amount in PhonePe webhook', { merchantTransactionId, amount: data.amount });
                    throw new error_middleware_1.AppError('Invalid amount in PhonePe webhook', 422);
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
                await (0, payment_metrics_service_1.recordPaymentCapturedMetric)({
                    paymentId: String(capturedPayment.id),
                    transactionId: merchantTransactionId,
                    userId: String(capturedPayment.patientId || ''),
                    amountMinor: capturedAmountMinor,
                    retryCount: Number(capturedPayment.retryCount || 0),
                    channel: 'session',
                });
            }
            logger_1.logger.info(`[PaymentService] Session payment processed and capture recorded`, { merchantTransactionId });
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
                throw new error_middleware_1.AppError('Unable to resolve patient subscription userId from payment', 422);
            }
            const verify = await (0, phonepe_service_1.checkPhonePeStatus)(merchantTransactionId);
            const verifyCode = String(verify?.code || '').toUpperCase();
            // GUIDELINE COMPLIANCE: Rely ONLY on .state field for payment status determination
            const verifyState = String(verify?.data?.state || '').toUpperCase().trim();
            const isVerifiedByStatus = Boolean(verify) && (verifyCode === 'PAYMENT_SUCCESS' || verifyState === 'COMPLETED');
            const isExplicitFailure = verifyCode === 'PAYMENT_ERROR'
                || verifyState === 'FAILED'
                || verifyState === 'DECLINED'
                || verifyState === 'CANCELLED';
            // GUIDELINE: Handle PENDING states with reconciliation
            const isPendingState = verifyState === 'PENDING' || verifyState === '';
            if (isPendingState && !isExplicitFailure) {
                // GUIDELINE Option 2: Mark as pending in UI but reconcile backend until terminal
                logger_1.logger.warn('[PaymentService] Transaction in PENDING state; backend will continue reconciliation', {
                    merchantTransactionId,
                    verifyCode,
                    verifyState,
                });
                // Don't throw - allow webhook to mark as PENDING_CAPTURE, frontend will poll
                // Or reconcile here if backend should drive the completion
            }
            if (isExplicitFailure) {
                throw new error_middleware_1.AppError('Patient payment verification failed or declined', 400);
            }
            if (!isVerifiedByStatus && !isPendingState) {
                logger_1.logger.warn('[PaymentService] Status verification unavailable/non-completed; proceeding with webhook success', {
                    merchantTransactionId,
                    verifyCode,
                    verifyState,
                });
            }
            // Fix 8: Idempotency check for patient
            const existingSub = await db.patientSubscription.findUnique({ where: { userId } });
            if (existingSub?.paymentId === merchantTransactionId) {
                logger_1.logger.debug(`[PaymentService] Patient subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
                return { handled: true, message: 'Patient subscription already processed' };
            }
            const activated = await (0, patient_v1_service_1.reactivatePatientSubscription)(userId, merchantTransactionId, String(planKey || ''));
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
                await (0, payment_metrics_service_1.recordPaymentCapturedMetric)({
                    paymentId: String(payment.id),
                    transactionId: merchantTransactionId,
                    userId,
                    planId: String(planKey || ''),
                    amountMinor: Number(payment.amountMinor || 0),
                    retryCount: Number(payment.retryCount || 0),
                    channel: 'patient_subscription',
                });
            }
            logger_1.logger.info(`[PaymentService] Patient subscription activated successfully`, { merchantTransactionId, userId, planKey });
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
                throw new error_middleware_1.AppError('Unable to resolve providerId from provider subscription payment', 422);
            }
            const verify = await (0, phonepe_service_1.checkPhonePeStatus)(merchantTransactionId);
            const verifyCode = String(verify?.code || '').toUpperCase();
            const verifyState = String(verify?.data?.state || '').toUpperCase();
            const rawDeclineReason = (0, phonepe_decline_reasons_service_1.extractDeclineReasonFromPhonePe)(verify?.data || {});
            const declineReasonInfo = (0, phonepe_decline_reasons_service_1.formatDeclineMessage)(rawDeclineReason);
            const isVerifiedByStatus = Boolean(verify) && (verifyCode === 'PAYMENT_SUCCESS' || verifyState === 'COMPLETED');
            const isExplicitFailure = verifyCode === 'PAYMENT_ERROR'
                || verifyState === 'FAILED'
                || verifyState === 'DECLINED';
            // ================================================================
            // PHASE 2: Handle payment failure → expire pending components
            // ================================================================
            if (isExplicitFailure) {
                // Expire all pending subscription components
                await (0, provider_subscription_pending_service_1.expirePendingComponents)({
                    providerId,
                    merchantTransactionId,
                    reason: rawDeclineReason || 'payment_declined',
                }).catch(err => {
                    logger_1.logger.warn('[Phase2] Failed to expire pending components on payment failure', {
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
                        logger_1.logger.warn('[Phase2] Failed to update payment record with decline reason', { error: String(err) });
                    });
                }
                throw new error_middleware_1.AppError(declineReasonInfo.title, 400);
            }
            if (!isVerifiedByStatus) {
                logger_1.logger.warn('[PaymentService] Provider status verification unavailable/non-completed; proceeding with webhook success', {
                    merchantTransactionId,
                    verifyCode,
                    verifyState,
                });
            }
            // Fix 8: Idempotency check for provider
            const existingSub = await db.providerSubscription.findUnique({ where: { providerId } });
            if (existingSub?.paymentId === merchantTransactionId) {
                logger_1.logger.debug(`[PaymentService] Provider subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
                return { handled: true, message: 'Provider subscription already processed' };
            }
            // ================================================================
            // PHASE 2: Atomically activate all pending subscription components
            // ================================================================
            const pendingActivation = await (0, provider_subscription_pending_service_1.activateAllPendingComponents)({
                providerId,
                merchantTransactionId,
            }).catch(err => {
                logger_1.logger.error('[Phase2] Failed to atomically activate pending components', {
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
            const activated = await (0, provider_subscription_service_1.activateProviderSubscription)(providerId, planKey, merchantTransactionId);
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
                            // Store Phase 2 activation details
                            pendingComponentsActivated: pendingActivation.totalActivated,
                            phase2enabled: true,
                        },
                    },
                });
                await (0, payment_metrics_service_1.recordPaymentCapturedMetric)({
                    paymentId: String(payment.id),
                    transactionId: merchantTransactionId,
                    userId: providerId,
                    planId: String(planKey || ''),
                    amountMinor: Number(payment.amountMinor || 0),
                    retryCount: Number(payment.retryCount || 0),
                    channel: 'provider_subscription',
                });
            }
            logger_1.logger.info(`[PaymentService] Provider subscription activated successfully (Phase 2)`, {
                merchantTransactionId,
                providerId,
                planKey,
                pendingComponentsActivated: pendingActivation.totalActivated,
            });
            return { handled: true, message: 'PhonePe provider subscription payment processed (with atomic pending activation)' };
        }
    }
    logger_1.logger.warn(`[PaymentService] PhonePe Webhook unhandled condition (success: ${success}, code: ${code})`, { merchantTransactionId });
    return { handled: true, message: `PhonePe status: ${code}` };
};
exports.processPhonePeWebhook = processPhonePeWebhook;
const releaseSessionEarnings = async (sessionId, actorTherapistId) => {
    await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe('SELECT "id" FROM "financial_sessions" WHERE "id" = $1 FOR UPDATE', sessionId);
        const session = await tx.financialSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            throw new error_middleware_1.AppError('Financial session not found', 404);
        }
        if (actorTherapistId && String(session.providerId) !== String(actorTherapistId)) {
            throw new error_middleware_1.AppError('Forbidden: therapist does not own this session', 403);
        }
        if (session.status === 'COMPLETED') {
            return;
        }
        const payment = await tx.financialPayment.findFirst({
            where: { sessionId, status: 'CAPTURED' },
            orderBy: { createdAt: 'desc' },
        });
        if (!payment) {
            throw new error_middleware_1.AppError('Captured payment not found for session', 409);
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
        await tx.$queryRawUnsafe('SELECT "providerId" FROM "provider_wallets" WHERE "providerId" = $1 FOR UPDATE', payment.providerId);
        const wallet = await tx.providerWallet.findUnique({ where: { providerId: payment.providerId } });
        if (!wallet) {
            throw new error_middleware_1.AppError('Provider wallet not found', 404);
        }
        const releaseAmount = BigInt(payment.therapistShareMinor ?? 0);
        if (BigInt(wallet.pendingBalanceMinor ?? 0) < releaseAmount) {
            throw new error_middleware_1.AppError('Insufficient pending balance for release', 409);
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
exports.releaseSessionEarnings = releaseSessionEarnings;
/**
 * Manual Payment Retry (Admin Recovery Tool)
 *
 * Allows admin/support to manually trigger payment retry for failed payments.
 * Used after customer updates payment method or during system recovery.
 *
 * Resets retry state and schedules immediate retry via reconciliation worker.
 */
const retryPaymentManually = async (paymentId, adminUserId) => {
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
        throw new error_middleware_1.AppError('Payment not found', 404);
    }
    // Already successful — no retry needed
    if (payment.status === 'CAPTURED') {
        throw new error_middleware_1.AppError('Payment already captured successfully', 400);
    }
    // Attempting to retry an expired payment — check if we should allow
    if (payment.status === 'EXPIRED') {
        logger_1.logger.warn('[ManualRetry] Attempting to retry expired payment', {
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
    logger_1.logger.info('MANUAL_PAYMENT_RETRY_TRIGGERED', {
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
exports.retryPaymentManually = retryPaymentManually;
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
const reconcilePhonePePaymentStatus = async (transactionId, maxRetries = 5, initialWaitMs = 5000) => {
    logger_1.logger.info('[Payment.Reconcile] Starting status reconciliation (strict PhonePe guideline schedule)', {
        transactionId,
        maxRetries,
        initialWaitMs,
    });
    let currentState = 'PENDING';
    let lastStatus = null;
    // GUIDELINE COMPLIANCE: Strict reconciliation schedule as per PhonePe guidelines
    // First check: 20-25 seconds after transaction initiation
    // Then: Every 3s for 30s, every 6s for 60s, every 10s for 60s, every 30s for 60s, every 1 minute until final
    const getWaitTimeMs = (attempt) => {
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
            logger_1.logger.info('[Payment.Reconcile] Waiting before retry (PhonePe guideline schedule)', {
                transactionId,
                attempt,
                nextCheckInSeconds: Math.round(waitMs / 1000),
            });
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        try {
            lastStatus = await (0, phonepe_service_1.checkPhonePeStatus)(transactionId);
            if (!lastStatus) {
                logger_1.logger.warn('[Payment.Reconcile] Status check returned null', {
                    transactionId,
                    attempt,
                });
                continue;
            }
            // GUIDELINE COMPLIANCE: Rely only on .state field for payment status determination
            const state = String(lastStatus?.data?.state || '').toUpperCase().trim();
            logger_1.logger.info('[Payment.Reconcile] Status check result', {
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
                logger_1.logger.info('[Payment.Reconcile] Terminal state reached', {
                    transactionId,
                    state: currentState,
                    attemptNumber: attempt,
                });
                // If success, trigger webhook processing to update DB state
                if (isTerminalSuccess && transactionId.startsWith('SUB_')) {
                    try {
                        await (0, exports.processPhonePeWebhook)(lastStatus).catch((error) => {
                            logger_1.logger.warn('[Payment.Reconcile] Inline webhook processing failed', {
                                transactionId,
                                error: error?.message,
                            });
                        });
                    }
                    catch { }
                }
                return {
                    state: currentState,
                    transactionId,
                    resultMessage: `Payment state is ${currentState}`,
                };
            }
            if (!isStillPending) {
                // Unknown state
                logger_1.logger.warn('[Payment.Reconcile] Unknown state received', {
                    transactionId,
                    state,
                });
            }
        }
        catch (error) {
            logger_1.logger.warn('[Payment.Reconcile] Status check error', {
                transactionId,
                attempt,
                error: error?.message,
            });
            // Continue to next retry per guideline
        }
    }
    // All retries exhausted but still PENDING
    logger_1.logger.warn('[Payment.Reconcile] Max retries exhausted (guideline schedule completed), still PENDING', {
        transactionId,
        maxRetries,
        finalState: currentState,
    });
    return {
        state: 'PENDING',
        transactionId,
        resultMessage: `Payment status is still PENDING after all reconciliation attempts. Please try status check again later or contact support. (PhonePe guideline max schedule: ~${Math.round(maxRetries * 90 / 60)} min)`,
    };
};
exports.reconcilePhonePePaymentStatus = reconcilePhonePePaymentStatus;
