import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { submitRetreatIntentController } from '../controllers/retreat.controller';

const router = Router();

// Public — no auth required (anyone can express interest in a retreat)
router.post('/intent', asyncHandler(submitRetreatIntentController));

export default router;
