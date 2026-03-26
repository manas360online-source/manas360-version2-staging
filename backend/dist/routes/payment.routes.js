"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.post('/sessions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('patient'), rateLimiter_middleware_1.paymentRateLimiter, (0, validate_middleware_1.asyncHandler)(payment_controller_1.createSessionPaymentController));
router.post('/sessions/:id/complete', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('therapist'), rateLimiter_middleware_1.paymentRateLimiter, (0, validate_middleware_1.asyncHandler)(payment_controller_1.completeFinancialSessionController));
// PhonePe specific routes
router.get('/phonepe/webhook', (_req, res) => {
    res.status(200).json({ success: true, message: 'PhonePe webhook endpoint reachable' });
});
router.post('/phonepe/webhook', (0, validate_middleware_1.asyncHandler)(payment_controller_1.phonepeWebhookController));
router.get('/phonepe/status/:transactionId', auth_middleware_1.requireAuth, (0, validate_middleware_1.asyncHandler)(payment_controller_1.getPhonePeStatusController));
// Public status endpoint for redirect page (no auth required; transactionId is hard to guess)
router.get('/status/:transactionId', (0, validate_middleware_1.asyncHandler)(payment_controller_1.getPhonePeStatusController));
// Refund routes
router.post('/refund', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('patient'), rateLimiter_middleware_1.paymentRateLimiter, (0, validate_middleware_1.asyncHandler)(payment_controller_1.initiateRefundController));
router.get('/refund/:refundId/status', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('patient'), (0, validate_middleware_1.asyncHandler)(payment_controller_1.getRefundStatusController));
exports.default = router;
