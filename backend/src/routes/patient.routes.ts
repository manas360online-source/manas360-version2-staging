import { Router } from 'express';
import {
	addDailyCheckInController,
	createPatientProfileController,
	getMyDocumentsController,
	getMyMoodHistoryController,
	getMyPatientAssessmentHistoryController,
	getMyPatientProfileController,
	getMyPrescriptionsController,
	getMyTherapyPlanController,
} from '../controllers/patient.controller';
import { getMyPetStateController, upsertMyPetStateController } from '../controllers/pet.controller';
import { bookMySessionController, getMySessionHistoryController } from '../controllers/session.controller';
import { getAvailableProvidersController } from '../controllers/smart-match.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePatientRole } from '../middleware/rbac.middleware';
import {
	asyncHandler,
	validateCreatePatientProfileRequest,
	validatePatientMoodHistoryQuery,
	validatePatientAssessmentHistoryQuery,
	validateBookSessionRequest,
	validatePatientSessionHistoryQuery,
	validateCreateDailyCheckInRequest,
} from '../middleware/validate.middleware';

const router = Router();

router.post('/profile', requireAuth, requirePatientRole, ...validateCreatePatientProfileRequest, asyncHandler(createPatientProfileController));
router.get('/me/profile', requireAuth, requirePatientRole, asyncHandler(getMyPatientProfileController));
router.get('/me/assessments', requireAuth, requirePatientRole, ...validatePatientAssessmentHistoryQuery, asyncHandler(getMyPatientAssessmentHistoryController));
router.get('/me/mood-history', requireAuth, requirePatientRole, ...validatePatientMoodHistoryQuery, asyncHandler(getMyMoodHistoryController));
router.get('/me/therapy-plan', requireAuth, requirePatientRole, asyncHandler(getMyTherapyPlanController));
router.get('/me/therapist-matches', requireAuth, requirePatientRole, asyncHandler(async (req, res) => {
	const query = req.query as Record<string, any>;
	(req as any).query = {
		...query,
		daysOfWeek: query.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
		timeSlots: query.timeSlots || ['0-1439'],
		providerType: query.providerType || 'THERAPIST',
		concerns: query.concerns || (query.specializationPreference ? [String(query.specializationPreference)] : undefined),
		languages: query.languages || (query.languagePreference ? [String(query.languagePreference)] : undefined),
	};
	res.setHeader('X-Endpoint-Deprecated', 'Use /v1/patient/providers/smart-match');
	await getAvailableProvidersController(req, res);
}));
router.post('/me/sessions/book', requireAuth, requirePatientRole, ...validateBookSessionRequest, asyncHandler(bookMySessionController));
router.get('/me/sessions', requireAuth, requirePatientRole, ...validatePatientSessionHistoryQuery, asyncHandler(getMySessionHistoryController));
router.post('/me/daily-checkin', requireAuth, requirePatientRole, ...validateCreateDailyCheckInRequest, asyncHandler(addDailyCheckInController));
router.get('/me/pets/state', requireAuth, requirePatientRole, asyncHandler(getMyPetStateController));
router.put('/me/pets/state', requireAuth, requirePatientRole, asyncHandler(upsertMyPetStateController));
router.get('/documents', requireAuth, requirePatientRole, asyncHandler(getMyDocumentsController));
router.get('/prescriptions', requireAuth, requirePatientRole, asyncHandler(getMyPrescriptionsController));

export default router;

