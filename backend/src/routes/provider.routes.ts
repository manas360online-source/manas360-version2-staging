import { Router } from 'express';
import {
	assignPatientItem,
	createPatientNote,
	generateMeetingLink,
	getProviderCalendarSessions,
	getProviderEarnings,
	getProviderSettings,
	getPatientAssessments,
	getPatientGoals,
	getPatientLabs,
	getPatientNotes,
	getPatientOverview,
	getConversationMessages,
	getConversations,
	getPatientPrescriptions,
	getProviderDashboardController,
	getProviderPatients,
	publishWeeklyPlan,
	scheduleNextSession,
	saveWeeklyPlan,
	sendMessage,
	sendGoalMessage,
	submitProviderOnboardingController,
	updatePatientNote,
	updateProviderSettings,
} from '../controllers/provider.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post(
	'/onboarding',
	requireAuth,
	requireRole(['therapist', 'psychologist', 'psychiatrist', 'coach']),
	asyncHandler(submitProviderOnboardingController),
);

router.get(
	'/dashboard',
	requireAuth,
	requireRole(['therapist', 'psychologist', 'psychiatrist', 'coach']),
	asyncHandler(getProviderDashboardController),
);

router.get('/calendar', requireAuth, asyncHandler(getProviderCalendarSessions));
router.get('/patients', requireAuth, asyncHandler(getProviderPatients));
router.get('/earnings', requireAuth, asyncHandler(getProviderEarnings));
router.get('/settings', requireAuth, asyncHandler(getProviderSettings));
router.put('/settings', requireAuth, asyncHandler(updateProviderSettings));
router.get('/messages/conversations', requireAuth, asyncHandler(getConversations));
router.get('/messages/:conversationId', requireAuth, asyncHandler(getConversationMessages));
router.post('/messages', requireAuth, asyncHandler(sendMessage));

router.get('/patient/:patientId/overview', requireAuth, asyncHandler(getPatientOverview));

router.get('/patient/:patientId/assessments', requireAuth, asyncHandler(getPatientAssessments));

router.post('/patient/:patientId/assign', requireAuth, asyncHandler(assignPatientItem));

router.post('/patient/:patientId/weekly-plan', requireAuth, asyncHandler(saveWeeklyPlan));
router.post('/patient/:patientId/weekly-plan/publish', requireAuth, asyncHandler(publishWeeklyPlan));
router.post('/patient/:patientId/sessions/schedule', requireAuth, asyncHandler(scheduleNextSession));

router.get('/patient/:patientId/prescriptions', requireAuth, asyncHandler(getPatientPrescriptions));

router.get('/patient/:patientId/labs', requireAuth, asyncHandler(getPatientLabs));

router.get('/patient/:patientId/goals', requireAuth, asyncHandler(getPatientGoals));

router.post('/patient/:patientId/goals/:goalId/message', requireAuth, asyncHandler(sendGoalMessage));

router.get('/patient/:patientId/notes', requireAuth, asyncHandler(getPatientNotes));

router.post('/patient/:patientId/notes', requireAuth, asyncHandler(createPatientNote));

router.put('/patient/:patientId/notes/:noteId', requireAuth, asyncHandler(updatePatientNote));

router.post('/meeting-link/:sessionId', requireAuth, asyncHandler(generateMeetingLink));

export default router;
