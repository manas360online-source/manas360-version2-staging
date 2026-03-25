import { Router } from 'express';
import {
	completeFinancialSessionController,
	createSessionPaymentController,
	phonepeWebhookController,
	getPhonePeStatusController,
	initiateRefundController,
	getRefundStatusController,
} from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { paymentRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/sessions', requireAuth, requireRole('patient'), paymentRateLimiter, asyncHandler(createSessionPaymentController));
router.post('/sessions/:id/complete', requireAuth, requireRole('therapist'), paymentRateLimiter, asyncHandler(completeFinancialSessionController));

// PhonePe specific routes
router.get('/phonepe/webhook', (_req, res) => {
	res.status(200).json({ success: true, message: 'PhonePe webhook endpoint reachable' });
});
router.post('/phonepe/webhook', asyncHandler(phonepeWebhookController));
router.get('/phonepe/status/:transactionId', requireAuth, asyncHandler(getPhonePeStatusController));

// Refund routes
router.post('/refund', requireAuth, requireRole('patient'), paymentRateLimiter, asyncHandler(initiateRefundController));
router.get('/refund/:refundId/status', requireAuth, requireRole('patient'), asyncHandler(getRefundStatusController));

export default router;
