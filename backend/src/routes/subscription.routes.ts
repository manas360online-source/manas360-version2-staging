import { Router } from 'express';
import {
	getMySubscriptionsController,
} from '../controllers/subscription.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { paymentRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.get('/me', requireAuth, asyncHandler(getMySubscriptionsController));

export default router;

