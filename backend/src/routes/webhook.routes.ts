import { Router } from 'express';
import { jitsiConferenceEventController } from '../controllers/jitsi-audio.controller';
import { webhookRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	phonePeWebhookHandler,
	agoraWebhookHandler,
	zohoSignWebhookHandler,
	crisisWebhookHandler,
	zohoFlowEventHandler
} from '../controllers/webhook.controller';

const router = Router();

router.post('/jitsi/events', webhookRateLimiter, asyncHandler(jitsiConferenceEventController));

// === PHASE 3: ZOHO FLOW / WEBHOOKS ===
router.post('/phonepe', webhookRateLimiter, phonePeWebhookHandler);
router.post('/agora', webhookRateLimiter, agoraWebhookHandler);
router.post('/zoho-sign', webhookRateLimiter, zohoSignWebhookHandler);
router.post('/crisis', webhookRateLimiter, crisisWebhookHandler);
router.post('/zoho-flow', webhookRateLimiter, zohoFlowEventHandler);

export default router;

