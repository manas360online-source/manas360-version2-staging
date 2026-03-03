import { Router } from 'express';
import { getLandingMetricsController } from '../controllers/landing.controller';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.get('/metrics', asyncHandler(getLandingMetricsController));

export default router;
