"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRefundStatusController = exports.initiateRefundController = exports.getPhonePeStatusController = exports.phonepeWebhookController = exports.razorpayWebhookController = exports.completeFinancialSessionController = exports.createSessionPaymentController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const payment_service_1 = require("../services/payment.service");
const subscription_service_1 = require("../services/subscription.service");
const phonepe_service_1 = require("../services/phonepe.service");
const phonepeWebhook_service_1 = require("../services/phonepeWebhook.service");
const logger_1 = require("../utils/logger");
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const createSessionPaymentController = async (req, res) => {
    const patientId = getAuthUserId(req);
    const providerId = String(req.body.providerId ?? '').trim();
    const amountMinor = Number(req.body.amountMinor);
    const currency = String(req.body.currency ?? 'INR');
    if (!providerId) {
        throw new error_middleware_1.AppError('providerId is required', 422);
    }
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        throw new error_middleware_1.AppError('amountMinor must be > 0', 422);
    }
    const result = await (0, payment_service_1.createSessionPayment)({
        patientId,
        providerId,
        amountMinor,
        currency,
    });
    (0, response_1.sendSuccess)(res, result, 'Session payment initiated', 201);
};
exports.createSessionPaymentController = createSessionPaymentController;
const completeFinancialSessionController = async (req, res) => {
    const therapistId = getAuthUserId(req);
    const sessionId = String(req.params.id ?? '').trim();
    if (!sessionId) {
        throw new error_middleware_1.AppError('session id is required', 422);
    }
    await (0, payment_service_1.releaseSessionEarnings)(sessionId, therapistId);
    (0, response_1.sendSuccess)(res, { sessionId }, 'Session earnings released');
};
exports.completeFinancialSessionController = completeFinancialSessionController;
const razorpayWebhookController = async (req, res) => {
    const signature = String(req.headers['x-razorpay-signature'] ?? '');
    if (!signature) {
        throw new error_middleware_1.AppError('Missing x-razorpay-signature', 401);
    }
    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const event = req.body;
    const eventType = String(event?.event ?? '');
    const hasSubscriptionEntity = Boolean(event?.payload?.subscription?.entity || event?.payload?.payment?.entity?.subscription);
    let result;
    if (eventType.startsWith('subscription.') || (eventType === 'payment.failed' && hasSubscriptionEntity)) {
        result = await (0, subscription_service_1.processSubscriptionWebhook)(rawBody, signature);
    }
    else {
        result = await (0, payment_service_1.processRazorpayWebhook)(rawBody, signature);
    }
    res.status(200).json({ success: true, ...result });
};
exports.razorpayWebhookController = razorpayWebhookController;
const phonepeWebhookController = async (req, res) => {
    const shouldAllowProbeBypass = env_1.env.isDevelopment
        && env_1.env.allowDevPhonePeWebhookProbeBypass
        && !req.headers['x-verify'];
    if (shouldAllowProbeBypass) {
        res.status(200).json({ success: true, handled: true, message: 'PhonePe webhook probe accepted (dev bypass)' });
        return;
    }
    // ========== IP WHITELIST VALIDATION ==========
    const clientIp = (0, phonepe_service_1.getClientIpFromRequest)(req);
    if (!(0, phonepe_service_1.isPhonePeWebhookIP)(clientIp)) {
        logger_1.logger.warn('[PhonePeWebhook] Request from unauthorized IP', { clientIp });
        // Don't throw error - IP whitelisting is optional, just log
        // In production with strict firewall rules, this layer provides defense-in-depth
    }
    // ========== AUTHORIZATION HEADER VALIDATION ==========
    // PhonePe doc: "Authorization: SHA256(username:password)"
    const authHeader = String(req.headers['authorization'] ?? '').trim();
    const webhookUsername = String(env_1.env.phonePeWebhookUsername ?? '').trim();
    const webhookPassword = String(env_1.env.phonePeWebhookPassword ?? '').trim();
    if (webhookUsername && webhookPassword) {
        const isAuthValid = (0, phonepe_service_1.verifyPhonePeWebhookAuth)(authHeader, webhookUsername, webhookPassword);
        if (!isAuthValid) {
            throw new error_middleware_1.AppError('Invalid webhook authorization', 401);
        }
        logger_1.logger.debug('[PhonePeWebhook] Authorization header verified');
    }
    else if (authHeader) {
        logger_1.logger.warn('[PhonePeWebhook] Authorization header provided but credentials not configured');
    }
    // ========== PAYLOAD PARSING ==========
    // Support both new event format and legacy base64 format
    let webhookBody;
    const rawBodyString = String(req.body?.response || '').trim();
    const eventFromBody = req.body?.event;
    if (rawBodyString) {
        // Legacy format: base64-encoded payload with X-VERIFY signature
        const xVerify = String(req.headers['x-verify'] ?? '').trim();
        if (!xVerify) {
            throw new error_middleware_1.AppError('Missing x-verify header for base64 payload', 400);
        }
        const isValid = (0, phonepe_service_1.verifyPhonePeWebhook)(rawBodyString, xVerify);
        if (!isValid) {
            throw new error_middleware_1.AppError('Invalid PhonePe signature', 401);
        }
        try {
            webhookBody = JSON.parse(Buffer.from(rawBodyString, 'base64').toString('utf-8'));
        }
        catch (error) {
            logger_1.logger.error('[PhonePeWebhook] Failed to parse base64 payload', { error: error?.message });
            throw new error_middleware_1.AppError('Invalid payload format', 400);
        }
    }
    else if (eventFromBody) {
        // New format: Direct JSON payload with event field
        webhookBody = req.body;
    }
    else {
        throw new error_middleware_1.AppError('Missing webhook payload', 400);
    }
    // ========== IDEMPOTENCY CHECK ==========
    // Generate event ID: use combination of event type, merchant order/refund ID, and timestamp
    const payload = webhookBody.payload || webhookBody;
    const event = webhookBody.event
        || webhookBody.type
        || (payload?.merchantRefundId || payload?.refundId
            ? payload?.state === 'FAILED'
                ? 'pg.refund.failed'
                : 'pg.refund.completed'
            : payload?.state === 'FAILED'
                ? 'checkout.order.failed'
                : 'checkout.order.completed');
    let eventId;
    if (event?.startsWith('checkout.order')) {
        const orderId = payload?.merchantOrderId || payload?.orderId;
        const timestamp = payload?.timestamp || payload?.expireAt;
        eventId = `${event}_${orderId}_${timestamp}`;
    }
    else if (event?.startsWith('pg.refund')) {
        const refundId = payload?.merchantRefundId || payload?.refundId || payload?.originalMerchantOrderId;
        const timestamp = payload?.timestamp;
        eventId = `${event}_${refundId}_${timestamp}`;
    }
    else {
        eventId = `${event}_${Date.now()}`;
    }
    // Check if already processed (idempotency)
    const isNewEvent = await (0, phonepeWebhook_service_1.trackWebhookEvent)(eventId, event);
    if (!isNewEvent) {
        // Already processed - return success to avoid PhonePe retry
        logger_1.logger.info('[PhonePeWebhook] Duplicate webhook, returning success', { eventId });
        res.status(200).json({ success: true, message: 'Webhook acknowledged (duplicate)', handled: false });
        return;
    }
    // ========== EVENT ROUTING ==========
    try {
        // Route based on event type
        if (!event) {
            throw new error_middleware_1.AppError('Missing event type', 400);
        }
        await (0, phonepeWebhook_service_1.processPhonePeWebhookEvent)(event, payload);
        logger_1.logger.info('[PhonePeWebhook] Webhook processed successfully', { eventId, event });
        res.status(200).json({ success: true, handled: true, message: 'Webhook processed' });
    }
    catch (error) {
        logger_1.logger.error('[PhonePeWebhook] Failed to process event', {
            eventId,
            event: webhookBody.event,
            error: error?.message,
        });
        // Return 200 anyway to prevent PhonePe retries, but log the error
        res.status(200).json({
            success: true,
            handled: false,
            message: 'Webhook received but processing failed',
            error: error?.message,
        });
    }
};
exports.phonepeWebhookController = phonepeWebhookController;
const getPhonePeStatusController = async (req, res) => {
    const transactionId = String(req.params.transactionId ?? '').trim();
    if (!transactionId) {
        throw new error_middleware_1.AppError('transactionId is required', 422);
    }
    const status = await (0, phonepe_service_1.checkPhonePeStatus)(transactionId);
    if (!status) {
        throw new error_middleware_1.AppError('Unable to fetch payment status', 502);
    }
    res.status(200).json({ success: true, data: status });
};
exports.getPhonePeStatusController = getPhonePeStatusController;
const initiateRefundController = async (req, res) => {
    const patientId = getAuthUserId(req);
    const paymentId = String(req.body.paymentId ?? '').trim();
    const reason = String(req.body.reason ?? 'Customer requested').trim();
    if (!paymentId) {
        throw new error_middleware_1.AppError('paymentId is required', 422);
    }
    // Verify payment exists and belongs to the patient
    const payment = await db_1.prisma.financialPayment.findUnique({
        where: { id: paymentId },
        include: {
            session: {
                select: { patientId: true },
            },
        },
    });
    if (!payment) {
        throw new error_middleware_1.AppError('Payment not found', 404);
    }
    if (payment.session?.patientId !== patientId) {
        throw new error_middleware_1.AppError('Unauthorized to refund this payment', 403);
    }
    if (payment.status !== 'CAPTURED') {
        throw new error_middleware_1.AppError('Only captured payments can be refunded', 422);
    }
    // Check if refund already exists
    const existingRefund = await db_1.prisma.financialRefund.findFirst({
        where: { paymentId },
    });
    if (existingRefund && existingRefund.status !== 'FAILED') {
        throw new error_middleware_1.AppError('Refund already initiated for this payment', 422);
    }
    // Generate merchant refund ID
    const merchantRefundId = `${paymentId}-${Date.now()}`;
    try {
        // Initiate PhonePe refund
        const refundResult = await (0, phonepe_service_1.initiatePhonePeRefund)({
            merchantRefundId,
            originalMerchantOrderId: payment.razorpayOrderId,
            amountInPaise: Number(payment.amountMinor),
        });
        // Create or update refund record
        const refund = await db_1.prisma.financialRefund.upsert({
            where: { merchantRefundId },
            create: {
                paymentId,
                merchantRefundId,
                originalMerchantOrderId: payment.razorpayOrderId,
                phonePeRefundId: refundResult.refundId,
                status: 'PENDING',
                amountMinor: payment.amountMinor,
                currency: payment.currency,
                reason,
                responseData: refundResult.responseData,
            },
            update: {
                phonePeRefundId: refundResult.refundId || undefined,
                status: 'PENDING',
                responseData: refundResult.responseData,
                retryCount: 0,
                updatedAt: new Date(),
            },
        });
        (0, response_1.sendSuccess)(res, refund, 'Refund initiated successfully', 201);
    }
    catch (error) {
        if (error instanceof error_middleware_1.AppError)
            throw error;
        // Log error and create failed refund record
        logger_1.logger.error('[Payment] Refund initiation failed', {
            paymentId,
            error: error?.message,
        });
        throw new error_middleware_1.AppError('Failed to initiate refund: ' + error?.message, 502);
    }
};
exports.initiateRefundController = initiateRefundController;
const getRefundStatusController = async (req, res) => {
    const refundId = String(req.params.refundId ?? '').trim();
    if (!refundId) {
        throw new error_middleware_1.AppError('refundId is required', 422);
    }
    // Verify refund exists
    const refund = await db_1.prisma.financialRefund.findUnique({
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
        throw new error_middleware_1.AppError('Refund not found', 404);
    }
    const patientId = getAuthUserId(req);
    if (refund.payment?.session?.patientId !== patientId) {
        throw new error_middleware_1.AppError('Unauthorized to view this refund', 403);
    }
    try {
        // Get latest status from PhonePe if refund is still pending
        if (refund.status === 'PENDING' && refund.merchantRefundId) {
            const statusData = await (0, phonepe_service_1.checkPhonePeRefundStatus)(refund.merchantRefundId);
            if (statusData?.data?.state) {
                const newStatus = statusData.data.state === 'COMPLETED' ? 'COMPLETED' :
                    statusData.data.state === 'CONFIRMED' ? 'CONFIRMED' :
                        statusData.data.state === 'FAILED' ? 'FAILED' :
                            'PENDING';
                // Update refund record with latest status
                const updatedRefund = await db_1.prisma.financialRefund.update({
                    where: { id: refundId },
                    data: {
                        status: newStatus,
                        responseData: statusData,
                        ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
                        ...(newStatus === 'FAILED' && { failedAt: new Date() }),
                    },
                });
                (0, response_1.sendSuccess)(res, updatedRefund, 'Refund status retrieved', 200);
                return;
            }
        }
        (0, response_1.sendSuccess)(res, refund, 'Refund status retrieved', 200);
    }
    catch (error) {
        logger_1.logger.error('[Payment] Refund status check failed', {
            refundId,
            error: error?.message,
        });
        throw new error_middleware_1.AppError('Failed to fetch refund status: ' + error?.message, 502);
    }
};
exports.getRefundStatusController = getRefundStatusController;
