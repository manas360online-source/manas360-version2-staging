import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  asyncHandler,
  validateCreatePsychiatricAssessmentRequest,
  validateCreatePrescriptionRequest,
  validateDrugInteractionCheckRequest,
  validateCreateMedicationHistoryRequest,
  validateCreatePsychiatristFollowUpRequest,
} from '../middleware/validate.middleware';
import {
  getMyPsychiatristDashboardController,
  getMyPsychiatristSelfModeController,
  getMyPsychiatristPatientsController,
  postMyPsychiatricAssessmentController,
  getMyPsychiatricAssessmentsController,
  postMyPrescriptionController,
  getMyPrescriptionsController,
  postMyDrugInteractionCheckController,
  postMyMedicationHistoryController,
  getMyMedicationHistoryController,
  getMyParameterTrackingController,
  postMyFollowUpController,
} from '../controllers/psychiatrist.controller';

const router = Router();

router.get('/me/dashboard', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatristDashboardController));
router.get('/me/self-mode', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatristSelfModeController));
router.get('/me/patients', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatristPatientsController));

router.post('/me/assessments', requireAuth, requireRole('psychiatrist'), ...validateCreatePsychiatricAssessmentRequest, asyncHandler(postMyPsychiatricAssessmentController));
router.get('/me/assessments', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatricAssessmentsController));

router.post('/me/prescriptions', requireAuth, requireRole('psychiatrist'), ...validateCreatePrescriptionRequest, asyncHandler(postMyPrescriptionController));
router.get('/me/prescriptions', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPrescriptionsController));

router.post('/me/drug-interactions/check', requireAuth, requireRole('psychiatrist'), ...validateDrugInteractionCheckRequest, asyncHandler(postMyDrugInteractionCheckController));

router.post('/me/medication-history', requireAuth, requireRole('psychiatrist'), ...validateCreateMedicationHistoryRequest, asyncHandler(postMyMedicationHistoryController));
router.get('/me/medication-history', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyMedicationHistoryController));

router.get('/me/parameter-tracking/:patientId', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyParameterTrackingController));
router.post('/me/follow-ups', requireAuth, requireRole('psychiatrist'), ...validateCreatePsychiatristFollowUpRequest, asyncHandler(postMyFollowUpController));

export default router;
