import { Router } from 'express';
import { getPlanController, getAllPlansController } from '../controllers/shared.controller';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

/**
 * SHARED ROUTES
 * =============
 * Public endpoints for plans, pricing, and other shared data
 */

// Get all plans of a type (provider/patient)
router.get('/plans/:type', asyncHandler(getAllPlansController));

// Get specific plan details
router.get('/plans/:type/:planId', asyncHandler(getPlanController));

export default router;
