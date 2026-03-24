import { Router } from 'express';
import { jitsiConferenceEventController } from '../controllers/jitsi-audio.controller';
import { webhookRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/jitsi/events', webhookRateLimiter, asyncHandler(jitsiConferenceEventController));

export default router;

