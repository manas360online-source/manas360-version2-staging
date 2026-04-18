import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { registerEnrollmentController } from '../controllers/enrollment.controller';

const router = Router();

router.post('/register', asyncHandler(registerEnrollmentController));

export default router;
