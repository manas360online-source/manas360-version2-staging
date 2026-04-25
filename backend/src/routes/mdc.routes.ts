import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { mdcCheckInController } from '../controllers/mdc.controller';
import * as mdcStaffController from '../controllers/mdc-staff.controller';
import * as mdcAuthController from '../controllers/mdc-auth.controller';

const router = Router();

router.post('/checkin', asyncHandler(mdcCheckInController));

// Auth
router.post('/auth/request-otp', asyncHandler(mdcAuthController.requestOtp));
router.post('/auth/verify-otp', asyncHandler(mdcAuthController.verifyOtp));

// Staff Management
router.post('/clinics/:clinicId/staff', asyncHandler(mdcStaffController.createStaff));
router.get('/clinics/:clinicId/staff', asyncHandler(mdcStaffController.listStaff));
router.delete('/staff/:staffId', asyncHandler(mdcStaffController.deactivateStaff));

export default router;
