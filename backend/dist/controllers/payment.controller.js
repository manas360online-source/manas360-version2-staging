"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPhonePeStatusController = exports.phonepeWebhookController = exports.razorpayWebhookController = exports.completeFinancialSessionController = exports.createSessionPaymentController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const env_1 = require("../config/env");
const payment_service_1 = require("../services/payment.service");
const subscription_service_1 = require("../services/subscription.service");
const phonepe_service_1 = require("../services/phonepe.service");
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
    // 1. Mandatory BasicAuth validation (UAT compliance)
    const authHeader = String(req.headers['authorization'] ?? '');
    if (env_1.env.phonePeWebhookUsername && env_1.env.phonePeWebhookPassword) {
        const expectedAuth = 'Basic ' + Buffer.from(`${env_1.env.phonePeWebhookUsername}:${env_1.env.phonePeWebhookPassword}`).toString('base64');
        if (authHeader !== expectedAuth) {
            throw new error_middleware_1.AppError('Invalid webhook authorization', 401);
        }
    }
    // 2. Existing X-VERIFY signature check
    const xVerify = String(req.headers['x-verify'] ?? '');
    if (!xVerify) {
        throw new error_middleware_1.AppError('Missing x-verify header', 400);
    }
    const body = String(req.body?.response || '').trim(); // The base64 response string from PhonePe
    if (!body) {
        throw new error_middleware_1.AppError('Missing response body in PhonePe webhook', 400);
    }
    // Make sure we preserve raw payload shape to avoid parser normalization mismatches.
    const isValid = (0, phonepe_service_1.verifyPhonePeWebhook)(body, xVerify);
    if (!isValid) {
        throw new error_middleware_1.AppError('Invalid PhonePe signature', 401);
    }
    let decoded;
    try {
        decoded = JSON.parse(Buffer.from(body, 'base64').toString('utf-8'));
    }
    catch (error) {
        logger_1.logger.error('[PaymentController] Failed to parse PhonePe webhook body', { error: error?.message, body });
        throw new error_middleware_1.AppError('Invalid PhonePe webhook payload format', 400);
    }
    const result = await (0, payment_service_1.processPhonePeWebhook)(decoded);
    res.status(200).json({ success: true, ...result });
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
