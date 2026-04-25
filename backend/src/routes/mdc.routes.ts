import { Router } from 'express';
import { asyncHandler } from '../middleware/validate.middleware';
import { mdcCheckInController } from '../controllers/mdc.controller';
import * as mdcStaffController from '../controllers/mdc-staff.controller';
import * as mdcAuthController from '../controllers/mdc-auth.controller';
import * as mdcClinicController from '../controllers/mdc-clinic.controller';
import * as mdcPatientController from '../controllers/mdc-patient.controller';
import { requireMdcTenant } from '../middleware/mdc-tenant.middleware';

const router = Router();

router.post('/checkin', asyncHandler(mdcCheckInController));

// Clinic Lifecycle
router.get('/features', asyncHandler(mdcClinicController.getFeatures));
router.post('/calculate-pricing', asyncHandler(mdcClinicController.calculatePricing));
router.post('/register', asyncHandler(mdcClinicController.registerClinic));

// Auth
router.post('/auth/request-otp', asyncHandler(mdcAuthController.initiateMdcLogin));
router.post('/auth/verify-otp', asyncHandler(mdcAuthController.verifyMdcLogin));

// Staff Management
router.post('/clinics/:clinicId/staff', requireMdcTenant, asyncHandler(mdcStaffController.createStaff));
router.get('/clinics/:clinicId/staff', requireMdcTenant, asyncHandler(mdcStaffController.listStaff));
router.delete('/staff/:staffId', asyncHandler(mdcStaffController.deactivateStaff));

// Patient Management
router.post('/clinics/:clinicId/patients', requireMdcTenant, asyncHandler(mdcPatientController.createPatient));
router.post('/clinics/:clinicId/patients/bulk', requireMdcTenant, asyncHandler(mdcPatientController.bulkUploadPatients));
router.get('/clinics/:clinicId/patients', requireMdcTenant, asyncHandler(mdcPatientController.listPatients));

export default router;
