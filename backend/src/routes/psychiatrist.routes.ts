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
  getMyPsychiatristMedicationLibraryController,
  postMyPsychiatristMedicationLibraryController,
  getMyPsychiatristAssessmentTemplatesController,
  postMyPsychiatristAssessmentTemplateController,
  getMyPsychiatristAssessmentDraftController,
  putMyPsychiatristAssessmentDraftController,
  deleteMyPsychiatristAssessmentDraftController,
  getMyPsychiatristSettingsController,
  putMyPsychiatristSettingsController,
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
router.get('/me/medication-library', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatristMedicationLibraryController));
router.post('/me/medication-library', requireAuth, requireRole('psychiatrist'), asyncHandler(postMyPsychiatristMedicationLibraryController));
router.get('/me/assessment-templates', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatristAssessmentTemplatesController));
router.post('/me/assessment-templates', requireAuth, requireRole('psychiatrist'), asyncHandler(postMyPsychiatristAssessmentTemplateController));
router.get('/me/assessment-drafts/:patientId', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatristAssessmentDraftController));
router.put('/me/assessment-drafts/:patientId', requireAuth, requireRole('psychiatrist'), asyncHandler(putMyPsychiatristAssessmentDraftController));
router.delete('/me/assessment-drafts/:patientId', requireAuth, requireRole('psychiatrist'), asyncHandler(deleteMyPsychiatristAssessmentDraftController));
router.get('/me/settings', requireAuth, requireRole('psychiatrist'), asyncHandler(getMyPsychiatristSettingsController));
router.put('/me/settings', requireAuth, requireRole('psychiatrist'), asyncHandler(putMyPsychiatristSettingsController));

export default router;
