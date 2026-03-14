import { Router } from 'express';
import { razorpayWebhookController } from '../controllers/payment.controller';
import { jitsiConferenceEventController } from '../controllers/jitsi-audio.controller';
import { webhookRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/razorpay', webhookRateLimiter, asyncHandler(razorpayWebhookController));
router.post('/jitsi/events', webhookRateLimiter, asyncHandler(jitsiConferenceEventController));

export default router;

