import { Router } from 'express';
import {
	getMySubscriptionsController,
	calculateSubscriptionPriceController,
} from '../controllers/subscription.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { paymentRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.get('/me', requireAuth, asyncHandler(getMySubscriptionsController));
router.post('/calculate-price', requireAuth, paymentRateLimiter, asyncHandler(calculateSubscriptionPriceController));

export default router;

