import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { mdcCheckInController } from '../controllers/mdc.controller';

const router = Router();

router.post('/checkin', asyncHandler(mdcCheckInController));

export default router;
