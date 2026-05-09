import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  getMyPsychologistDashboardController,
  getMyPsychologistPatientsController,
  getMyPsychologistPatientOverviewController,
  getMyPsychologistAssessmentsController,
  postMyPsychologistAssessmentController,
  getMyPsychologistReportsController,
  postMyPsychologistReportController,
  postCloneMyPsychologistReportController,
  getMyPsychologistPatientReportsController,
  postShareMyPsychologistPatientReportController,
  putMyPsychologistReportController,
  getMyPsychologistTestsController,
  getMyPsychologistScheduleController,
  getMyPsychologistMessagesController,
  getMyPsychologistProfileController,
  getMyPsychologistSettingsController,
  putMyPsychologistSettingsController,
} from '../controllers/psychologist.controller';

const router = Router();

router.get('/me/dashboard', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistDashboardController));
router.get('/me/patients', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistPatientsController));
router.get('/me/patients/:patientId/overview', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistPatientOverviewController));

router.get('/me/assessments', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistAssessmentsController));
router.post('/me/assessments', requireAuth, requireRole('psychologist'), asyncHandler(postMyPsychologistAssessmentController));

router.get('/me/reports', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistReportsController));
router.post('/me/reports', requireAuth, requireRole('psychologist'), asyncHandler(postMyPsychologistReportController));
router.put('/me/reports/:id', requireAuth, requireRole('psychologist'), asyncHandler(putMyPsychologistReportController));
router.post('/me/reports/:id/clone-for-patient', requireAuth, requireRole('psychologist'), asyncHandler(postCloneMyPsychologistReportController));
router.get('/me/patient-reports', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistPatientReportsController));
router.post('/me/patient-reports/:id/share', requireAuth, requireRole('psychologist'), asyncHandler(postShareMyPsychologistPatientReportController));

router.get('/me/tests', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistTestsController));
router.get('/me/schedule', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistScheduleController));
router.get('/me/messages', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistMessagesController));

router.get('/me/profile', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistProfileController));
router.get('/me/settings', requireAuth, requireRole('psychologist'), asyncHandler(getMyPsychologistSettingsController));
router.put('/me/settings', requireAuth, requireRole('psychologist'), asyncHandler(putMyPsychologistSettingsController));

export default router;
