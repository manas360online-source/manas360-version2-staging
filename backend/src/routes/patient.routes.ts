import { Router } from 'express';
import {
	addDailyCheckInController,
	createPatientAssessmentController,
	createPatientProfileController,
	getMyDocumentsController,
	getMyMoodHistoryController,
	getMyPatientAssessmentHistoryController,
	getMyPatientProfileController,
	getMyPrescriptionsController,
	getMyTherapyPlanController,
	getMyTherapistMatchesController,
} from '../controllers/patient.controller';
import { getMyPetStateController, upsertMyPetStateController } from '../controllers/pet.controller';
import { bookMySessionController, getMySessionHistoryController } from '../controllers/session.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePatientRole } from '../middleware/rbac.middleware';
import {
	asyncHandler,
	validateCreatePatientAssessmentRequest,
	validateCreatePatientProfileRequest,
	validatePatientMoodHistoryQuery,
	validatePatientAssessmentHistoryQuery,
	validateBookSessionRequest,
	validatePatientSessionHistoryQuery,
	validateTherapistMatchQuery,
	validateCreateDailyCheckInRequest,
} from '../middleware/validate.middleware';

const router = Router();

router.post('/profile', requireAuth, requirePatientRole, ...validateCreatePatientProfileRequest, asyncHandler(createPatientProfileController));
router.get('/me/profile', requireAuth, requirePatientRole, asyncHandler(getMyPatientProfileController));
router.post('/me/assessments', requireAuth, requirePatientRole, ...validateCreatePatientAssessmentRequest, asyncHandler(createPatientAssessmentController));
router.get('/me/assessments', requireAuth, requirePatientRole, ...validatePatientAssessmentHistoryQuery, asyncHandler(getMyPatientAssessmentHistoryController));
router.get('/me/mood-history', requireAuth, requirePatientRole, ...validatePatientMoodHistoryQuery, asyncHandler(getMyMoodHistoryController));
router.get('/me/therapy-plan', requireAuth, requirePatientRole, asyncHandler(getMyTherapyPlanController));
router.get('/me/therapist-matches', requireAuth, requirePatientRole, ...validateTherapistMatchQuery, asyncHandler(getMyTherapistMatchesController));
router.post('/me/sessions/book', requireAuth, requirePatientRole, ...validateBookSessionRequest, asyncHandler(bookMySessionController));
router.get('/me/sessions', requireAuth, requirePatientRole, ...validatePatientSessionHistoryQuery, asyncHandler(getMySessionHistoryController));
router.post('/me/daily-checkin', requireAuth, requirePatientRole, ...validateCreateDailyCheckInRequest, asyncHandler(addDailyCheckInController));
router.get('/me/pets/state', requireAuth, requirePatientRole, asyncHandler(getMyPetStateController));
router.put('/me/pets/state', requireAuth, requirePatientRole, asyncHandler(upsertMyPetStateController));
router.get('/documents', requireAuth, requirePatientRole, asyncHandler(getMyDocumentsController));
router.get('/prescriptions', requireAuth, requirePatientRole, asyncHandler(getMyPrescriptionsController));

export default router;

