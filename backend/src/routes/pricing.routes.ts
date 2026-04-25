import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { getPricingConfigController } from '../controllers/pricing.controller';

const router = Router();

router.get('/', asyncHandler(getPricingConfigController));

export default router;
