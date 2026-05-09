import { Router } from 'express';
import {
	completeFinancialSessionController,
	createSessionPaymentController,
	phonepeWebhookController,
	getPhonePeStatusController,
	initiateRefundController,
	getRefundStatusController,
} from '../controllers/payment.controller';
import {
	initiateUniversalPaymentController,
	confirmUniversalPaymentController,
	verifyUniversalPaymentController,
} from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { requireSubscription } from '../middleware/subscription.middleware';
import { paymentRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/sessions', requireAuth, requireRole('patient'), requireSubscription, paymentRateLimiter, asyncHandler(createSessionPaymentController));
router.post('/sessions/:id/complete', requireAuth, requireRole('therapist'), paymentRateLimiter, asyncHandler(completeFinancialSessionController));

// PhonePe specific routes
router.get('/phonepe/webhook', (_req, res) => {
	res.status(200).json({ success: true, message: 'PhonePe webhook endpoint reachable' });
});
router.post('/phonepe/webhook', asyncHandler(phonepeWebhookController));
router.get('/phonepe/status/:transactionId', requireAuth, asyncHandler(getPhonePeStatusController));
// Public status endpoint for redirect page (no auth required; transactionId is hard to guess)
router.get('/status/:transactionId', asyncHandler(getPhonePeStatusController));

// Refund routes
router.post('/refund', requireAuth, requireRole('patient'), paymentRateLimiter, asyncHandler(initiateRefundController));
router.get('/refund/:refundId/status', requireAuth, requireRole('patient'), asyncHandler(getRefundStatusController));

// Universal payment routes (for all plan types)
router.post('/universal/initiate', requireAuth, paymentRateLimiter, asyncHandler(initiateUniversalPaymentController));
router.post('/universal/confirm', requireAuth, paymentRateLimiter, asyncHandler(confirmUniversalPaymentController));
router.get('/universal/verify', requireAuth, asyncHandler(verifyUniversalPaymentController));
export default router;
