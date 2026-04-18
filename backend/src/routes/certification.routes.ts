import { Router } from 'express';
import { getCertificationByIdController, getCertificationsController, getMyCertificationStateController, registerEnrollmentController } from '../controllers/certification.controller';
import { asyncHandler } from '../middleware/validate.middleware';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', asyncHandler(getCertificationsController));
router.get('/me', requireAuth, asyncHandler(getMyCertificationStateController));
router.post('/register', optionalAuth, asyncHandler(registerEnrollmentController));
router.get('/:id', asyncHandler(getCertificationByIdController));

export default router;
