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
exports.processRazorpayWebhook = exports.releaseSessionEarnings = exports.processPhonePeWebhook = exports.createSessionPayment = void 0;
const crypto_1 = __importStar(require("crypto"));
const redis_1 = require("redis");
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const razorpay_service_1 = require("./razorpay.service");
const phonepe_service_1 = require("./phonepe.service");
const logger_1 = require("../utils/logger");
const redis = (0, redis_1.createClient)({ url: env_1.env.redisUrl });
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
    redis.on('error', (error) => {
        console.warn('[payment.service] Redis unavailable, continuing with degraded idempotency cache', error);
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
    if (!amountMinor) {
        throw new error_middleware_1.AppError('amountMinor must be greater than zero', 422);
    }
    const idempotencyKey = (0, crypto_1.randomUUID)();
    const transactionId = `SESS_${Date.now()}_${idempotencyKey.slice(0, 8)}`;
    const shouldBypass = env_1.env.allowDevPaymentBypass && env_1.env.nodeEnv === 'development';
    let redirectUrl;
    try {
        redirectUrl = await (0, phonepe_service_1.initiatePhonePePayment)({
            transactionId,
            userId: input.patientId,
            amountInPaise: amountMinor,
            callbackUrl: `${env_1.env.apiPrefix}/payment/phonepe/webhook`,
            redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status`,
        });
    }
    catch (error) {
        if (!shouldBypass) {
            throw new error_middleware_1.AppError(error?.message || 'Failed to initiate PhonePe payment', 500);
        }
        redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status?id=${transactionId}`;
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
                razorpayOrderId: transactionId,
            },
        });
        const payment = await tx.financialPayment.create({
            data: {
                sessionId: session.id,
                providerId: input.providerId,
                razorpayOrderId: transactionId,
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
            await db.$transaction(async (tx) => {
                const payment = await tx.financialPayment.findFirst({
                    where: { razorpayOrderId: merchantTransactionId },
                });
                if (!payment || payment.status === 'CAPTURED')
                    return;
                const amountMinor = Number(data.amount);
                const therapistShareMinor = Math.floor(amountMinor * providerShareRatio);
                const platformShareMinor = amountMinor - therapistShareMinor;
                await tx.financialPayment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'CAPTURED',
                        razorpayPaymentId: String(data.transactionId),
                        capturedAt: new Date(),
                        therapistShareMinor,
                        platformShareMinor,
                    },
                });
                await tx.financialSession.update({
                    where: { id: payment.sessionId },
                    data: { status: 'CONFIRMED', confirmedAt: new Date() },
                });
                await tx.revenueLedger.create({
                    data: {
                        type: 'SESSION',
                        grossAmountMinor: amountMinor,
                        platformCommissionMinor: platformShareMinor,
                        providerShareMinor: therapistShareMinor,
                        paymentType: 'PROVIDER_FEE',
                        taxAmountMinor: 0,
                        currency: payment.currency,
                        referenceId: payment.sessionId,
                        sessionId: payment.sessionId,
                        paymentId: payment.id,
                    },
                });
            });
            logger_1.logger.info(`[PaymentService] Session payment processed and capture recorded`, { merchantTransactionId });
            return { handled: true, message: 'PhonePe session payment processed' };
        }
        if (merchantTransactionId.startsWith('SUB_')) {
            const parts = merchantTransactionId.split('_');
            const userId = parts[1];
            const planKey = data.metadata?.plan || parts[2];
            const { checkPhonePeStatus } = await Promise.resolve().then(() => __importStar(require('./phonepe.service')));
            const verify = await checkPhonePeStatus(merchantTransactionId);
            if (!verify || !verify.success || verify.code !== 'PAYMENT_SUCCESS' || verify.data?.state !== 'COMPLETED') {
                throw new error_middleware_1.AppError("Patient payment not verified", 400);
            }
            // Fix 8: Idempotency check for patient
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/db')));
            const existingSub = await prisma.patientSubscription.findUnique({ where: { userId } });
            if (existingSub?.paymentId === merchantTransactionId) {
                logger_1.logger.debug(`[PaymentService] Patient subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
                return { handled: true, message: 'Patient subscription already processed' };
            }
            const { reactivatePatientSubscription } = await Promise.resolve().then(() => __importStar(require('./patient-v1.service')));
            await reactivatePatientSubscription(userId);
            logger_1.logger.info(`[PaymentService] Patient subscription activated successfully`, { merchantTransactionId, userId, planKey });
            return { handled: true, message: 'PhonePe subscription payment processed' };
        }
        if (merchantTransactionId.startsWith('PROV_SUB_')) {
            const parts = merchantTransactionId.split('_');
            // PROV_SUB_{providerId}_{planKey}_{timestamp}
            const providerId = parts[2];
            // Fix 7: Get plan from metadata payload (fallback to URL param)
            const planKey = data.metadata?.plan || parts[3];
            const { checkPhonePeStatus } = await Promise.resolve().then(() => __importStar(require('./phonepe.service')));
            const verify = await checkPhonePeStatus(merchantTransactionId);
            if (!verify || !verify.success || verify.code !== 'PAYMENT_SUCCESS' || verify.data?.state !== 'COMPLETED') {
                throw new error_middleware_1.AppError("Provider payment not verified or not completed", 400);
            }
            // Fix 8: Idempotency check for provider
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/db')));
            const existingSub = await prisma.providerSubscription.findUnique({ where: { providerId } });
            if (existingSub?.paymentId === merchantTransactionId) {
                logger_1.logger.debug(`[PaymentService] Provider subscription webhook bypassed (Idempotency)`, { merchantTransactionId });
                return { handled: true, message: 'Provider subscription already processed' };
            }
            const { activateProviderSubscription } = await Promise.resolve().then(() => __importStar(require('./provider-subscription.service')));
            await activateProviderSubscription(providerId, planKey, merchantTransactionId);
            logger_1.logger.info(`[PaymentService] Provider subscription activated successfully`, { merchantTransactionId, providerId, planKey });
            return { handled: true, message: 'PhonePe provider subscription payment processed' };
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
                paymentId: payment.id,
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
const processRazorpayWebhook = async (rawBody, signature) => {
    if (!env_1.env.razorpayWebhookSecret) {
        throw new error_middleware_1.AppError('RAZORPAY_WEBHOOK_SECRET not configured', 500);
    }
    const isSignatureValid = (0, razorpay_service_1.verifyRazorpayWebhookSignature)(rawBody, signature, env_1.env.razorpayWebhookSecret);
    if (!isSignatureValid) {
        throw new error_middleware_1.AppError('Invalid Razorpay webhook signature', 401);
    }
    const event = JSON.parse(rawBody);
    const eventId = String(event?.id ?? '');
    const eventType = String(event?.event ?? '');
    if (!eventId || !eventType) {
        throw new error_middleware_1.AppError('Invalid webhook payload', 422);
    }
    const cacheKey = `webhook:razorpay:${eventId}`;
    let setOk = 'OK';
    if (!isTestEnv) {
        setOk = await redis.set(cacheKey, '1', {
            NX: true,
            EX: env_1.env.webhookIdempotencyTtlSeconds,
        }).catch(() => 'OK');
    }
    if (!setOk) {
        return { handled: true, message: 'Duplicate webhook (cache)' };
    }
    const payloadHash = sha256(rawBody);
    try {
        await db.webhookLog.create({
            data: {
                provider: 'RAZORPAY',
                eventId,
                eventType,
                payloadHash,
                signature,
                isSignatureValid: true,
                processStatus: 'RECEIVED',
                rawPayload: event,
            },
        });
    }
    catch {
        return { handled: true, message: 'Duplicate webhook (db unique)' };
    }
    if (eventType === 'payment.captured') {
        const paymentEntity = event?.payload?.payment?.entity;
        const razorpayOrderId = String(paymentEntity?.order_id ?? '');
        const razorpayPaymentId = String(paymentEntity?.id ?? '');
        const amountMinor = asMinor(Number(paymentEntity?.amount ?? 0));
        if (!razorpayOrderId || !razorpayPaymentId || !amountMinor) {
            await db.webhookLog.updateMany({
                where: { provider: 'RAZORPAY', eventId },
                data: { processStatus: 'FAILED' },
            });
            throw new error_middleware_1.AppError('Invalid payment.captured payload', 422);
        }
        await db.$transaction(async (tx) => {
            const payment = await tx.financialPayment.findFirst({
                where: { razorpayOrderId },
            });
            if (!payment || payment.status === 'CAPTURED' || payment.status === 'FAILED')
                return;
            const therapistShareMinor = Math.floor(amountMinor * providerShareRatio);
            const platformShareMinor = amountMinor - therapistShareMinor;
            await tx.financialPayment.update({
                where: { id: payment.id },
                data: {
                    status: 'CAPTURED',
                    razorpayPaymentId,
                    capturedAt: new Date(),
                    therapistShareMinor,
                    platformShareMinor,
                },
            });
            await tx.providerWallet.upsert({
                where: { providerId: payment.providerId },
                update: {
                    pendingBalanceMinor: { increment: therapistShareMinor },
                    lifetimeEarningsMinor: { increment: therapistShareMinor },
                },
                create: {
                    providerId: payment.providerId,
                    pendingBalanceMinor: therapistShareMinor,
                    lifetimeEarningsMinor: therapistShareMinor,
                },
            });
            await tx.financialSession.update({
                where: { id: payment.sessionId },
                data: { status: 'CONFIRMED', confirmedAt: new Date() },
            });
            await tx.webhookLog.updateMany({
                where: { provider: 'RAZORPAY', eventId },
                data: { processStatus: 'PROCESSED', processedAt: new Date(), sessionId: payment.sessionId },
            });
        });
        return { handled: true, message: 'payment.captured processed' };
    }
    return { handled: false, message: `Unhandled event: ${eventType}` };
};
exports.processRazorpayWebhook = processRazorpayWebhook;
