import { Router } from 'express';
import { completeCertificationController, getCertificationByIdController, getCertificationsController, getMyCertificationStateController, registerEnrollmentController, markInstallmentPaidController } from '../controllers/certification.controller';
import { asyncHandler } from '../middleware/validate.middleware';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', asyncHandler(getCertificationsController));
router.get('/me', requireAuth, asyncHandler(getMyCertificationStateController));
router.post('/register', optionalAuth, asyncHandler(registerEnrollmentController));
router.post('/complete', requireAuth, asyncHandler(completeCertificationController));
router.post('/pay-installment', requireAuth, asyncHandler(markInstallmentPaidController));
router.get('/:id', asyncHandler(getCertificationByIdController));

export default router;
