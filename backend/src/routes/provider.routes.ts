import { Router } from 'express';
import {
	assignPatientItem,
	createPatientNote,
	generateMeetingLink,
	getPatientAssessments,
	getPatientCBTModules,
	getPatientGoals,
	getPatientLabs,
	getPatientNotes,
	getPatientOverview,
	getPatientPrescriptions,
	getProviderDashboardController,
	getProviderPatients,
	reviewCBTModule,
	sendGoalMessage,
	updatePatientNote,
} from '../controllers/provider.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.get(
	'/dashboard',
	requireAuth,
	requireRole(['therapist', 'psychologist', 'psychiatrist', 'coach']),
	asyncHandler(getProviderDashboardController),
);

router.get('/patients', requireAuth, asyncHandler(getProviderPatients));

router.get('/patient/:patientId/overview', requireAuth, asyncHandler(getPatientOverview));

router.get('/patient/:patientId/assessments', requireAuth, asyncHandler(getPatientAssessments));

router.post('/patient/:patientId/assign', requireAuth, asyncHandler(assignPatientItem));

router.get('/patient/:patientId/cbt', requireAuth, asyncHandler(getPatientCBTModules));

router.put('/patient/:patientId/cbt/:moduleId/review', requireAuth, asyncHandler(reviewCBTModule));

router.get('/patient/:patientId/prescriptions', requireAuth, asyncHandler(getPatientPrescriptions));

router.get('/patient/:patientId/labs', requireAuth, asyncHandler(getPatientLabs));

router.get('/patient/:patientId/goals', requireAuth, asyncHandler(getPatientGoals));

router.post('/patient/:patientId/goals/:goalId/message', requireAuth, asyncHandler(sendGoalMessage));

router.get('/patient/:patientId/notes', requireAuth, asyncHandler(getPatientNotes));

router.post('/patient/:patientId/notes', requireAuth, asyncHandler(createPatientNote));

router.put('/patient/:patientId/notes/:noteId', requireAuth, asyncHandler(updatePatientNote));

router.post('/meeting-link/:sessionId', requireAuth, asyncHandler(generateMeetingLink));

export default router;
