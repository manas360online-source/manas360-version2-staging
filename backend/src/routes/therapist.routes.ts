import { Router } from 'express';
import {
	createTherapistProfileController,
	getMyTherapistProfileController,
	uploadMyTherapistDocumentController,
} from '../controllers/therapist.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTherapistRole } from '../middleware/rbac.middleware';
import {
	asyncHandler,
	uploadTherapistDocumentMiddleware,
	validateCreateTherapistProfileRequest,
	validateSessionIdParam,
	validateTherapistEarningsQuery,
	validateTherapistLeadsQuery,
	validateTherapistSessionNoteRequest,
	validateTherapistSessionHistoryQuery,
	validateUpdateTherapistSessionStatusRequest,
	validateUploadTherapistDocumentRequest,
} from '../middleware/validate.middleware';
import {
	getMyTherapistLeadsController,
	purchaseMyTherapistLeadController,
} from '../controllers/lead.controller';
import {
	rescheduleSessionController,
	cancelSessionController,
	sendReminderController,
	startLiveSessionController,
	therapistProposeAppointmentSlotController,
} from '../controllers/therapist.actions.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { requireSessionOwnership } from '../middleware/ownership.middleware';
import {
	getMyTherapistSessionsController,
    getMyTherapistSessionController,
	getMyTherapistEarningsController,
	patchMyTherapistSessionController,
	postMyTherapistSessionNoteController,
	exportMyTherapistSessionController,
	postMyTherapistResponseNoteController,
	listMyTherapistResponseNotesController,
	getMyTherapistResponseNoteController,
	putMyTherapistResponseNoteController,
	deleteMyTherapistResponseNoteController,
} from '../controllers/session.controller';
import { exportRateLimiter } from '../middleware/exportRateLimiter.middleware';
import {
	getMyTherapistDashboardController,
	getMyTherapistMessagesController,
	getMyTherapistPendingAppointmentRequestsController,
	getMyTherapistPatientsController,
	getMyTherapistPayoutHistoryController,
	getMyTherapistSessionNotesController,
} from '../controllers/therapist-dashboard.controller';
import {
	deleteMyTherapistCareTeamController,
	deleteMyTherapistExerciseController,
	deleteMyTherapistResourceController,
	getMyTherapistAssessmentsController,
	getMyTherapistCareTeamController,
	getMyTherapistExercisesController,
	getMyTherapistResourcesController,
	getMyTherapistStructuredSessionNotesController,
	postGenerateAiSessionNoteController,
	patchMyTherapistCareTeamController,
	patchMyTherapistExerciseController,
	postMyTherapistAssessmentController,
	postMyTherapistCareTeamController,
	postMyTherapistExerciseController,
	postMyTherapistExerciseTrackController,
	postMyTherapistResourceController,
	postMyTherapistResourceTrackController,
	putMyTherapistStructuredSessionNoteController,
} from '../controllers/therapist-modules.controller';
import {
	acceptAppointmentController,
	rejectAppointmentController,
} from '../controllers/smart-match.controller';

const router = Router();

router.post('/profile', requireAuth, requireTherapistRole, ...validateCreateTherapistProfileRequest, asyncHandler(createTherapistProfileController));
router.get('/me/profile', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistProfileController));
router.get('/me/leads', requireAuth, requireTherapistRole, ...validateTherapistLeadsQuery, asyncHandler(getMyTherapistLeadsController));
router.post('/me/leads/:id/purchase', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(purchaseMyTherapistLeadController));
router.get('/me/earnings', requireAuth, requireTherapistRole, ...validateTherapistEarningsQuery, asyncHandler(getMyTherapistEarningsController));
router.get('/me/sessions', requireAuth, requireTherapistRole, ...validateTherapistSessionHistoryQuery, asyncHandler(getMyTherapistSessionsController));
router.get('/me/dashboard', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistDashboardController));
router.get('/me/patients', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistPatientsController));
router.get('/me/notes', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistSessionNotesController));
router.get('/me/session-notes', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistStructuredSessionNotesController));
router.put('/me/session-notes/:sessionId', requireAuth, requireTherapistRole, asyncHandler(putMyTherapistStructuredSessionNoteController));
router.post('/session/:id/generate-ai-note', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(postGenerateAiSessionNoteController));

router.get('/me/exercises', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistExercisesController));
router.post('/me/exercises', requireAuth, requireTherapistRole, asyncHandler(postMyTherapistExerciseController));
router.patch('/me/exercises/:id', requireAuth, requireTherapistRole, asyncHandler(patchMyTherapistExerciseController));
router.post('/me/exercises/:id/track', requireAuth, requireTherapistRole, asyncHandler(postMyTherapistExerciseTrackController));
router.delete('/me/exercises/:id', requireAuth, requireTherapistRole, asyncHandler(deleteMyTherapistExerciseController));

router.get('/me/assessments', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistAssessmentsController));
router.post('/me/assessments', requireAuth, requireTherapistRole, asyncHandler(postMyTherapistAssessmentController));

router.get('/me/resources', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistResourcesController));
router.post('/me/resources', requireAuth, requireTherapistRole, asyncHandler(postMyTherapistResourceController));
router.post('/me/resources/:id/track', requireAuth, requireTherapistRole, asyncHandler(postMyTherapistResourceTrackController));
router.delete('/me/resources/:id', requireAuth, requireTherapistRole, asyncHandler(deleteMyTherapistResourceController));

router.get('/me/care-team', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistCareTeamController));
router.post('/me/care-team', requireAuth, requireTherapistRole, asyncHandler(postMyTherapistCareTeamController));
router.patch('/me/care-team/:id', requireAuth, requireTherapistRole, asyncHandler(patchMyTherapistCareTeamController));
router.delete('/me/care-team/:id', requireAuth, requireTherapistRole, asyncHandler(deleteMyTherapistCareTeamController));
router.get('/me/messages', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistMessagesController));
router.get('/me/payout-history', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistPayoutHistoryController));
router.get('/me/sessions/:id', requireAuth, requireTherapistRole, ...validateSessionIdParam, requireSessionOwnership, asyncHandler(getMyTherapistSessionController));
router.get('/me/sessions/:id/export', requireAuth, requireTherapistRole, ...validateSessionIdParam, requireSessionOwnership, exportRateLimiter, asyncHandler(exportMyTherapistSessionController));
router.post('/me/sessions/:id/actions/reschedule', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(rescheduleSessionController));
router.post('/me/sessions/:id/actions/cancel', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(cancelSessionController));
router.post('/me/sessions/:id/actions/remind', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(sendReminderController));
router.post('/me/sessions/:id/actions/start-live', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(startLiveSessionController));
router.post('/me/appointments/propose-slot', requireAuth, requireTherapistRole, asyncHandler(therapistProposeAppointmentSlotController));
// Smart Match appointment booking
router.get('/me/appointments/pending', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistPendingAppointmentRequestsController));
router.post('/me/appointments/accept', requireAuth, requireTherapistRole, asyncHandler(acceptAppointmentController));
router.post('/me/appointments/reject', requireAuth, requireTherapistRole, asyncHandler(rejectAppointmentController));
// Analytics
router.get('/me/analytics/summary', requireAuth, requireTherapistRole, asyncHandler(analyticsController.getSummary.bind(analyticsController)));
router.get('/me/analytics/sessions', requireAuth, requireTherapistRole, asyncHandler(analyticsController.getTimeSeries.bind(analyticsController)));
router.get('/me/analytics/dropoff', requireAuth, requireTherapistRole, asyncHandler(analyticsController.getDropOff.bind(analyticsController)));
router.patch('/me/sessions/:id', requireAuth, requireTherapistRole, ...validateSessionIdParam, ...validateUpdateTherapistSessionStatusRequest, asyncHandler(patchMyTherapistSessionController));
router.post('/me/sessions/:id/notes', requireAuth, requireTherapistRole, ...validateSessionIdParam, ...validateTherapistSessionNoteRequest, asyncHandler(postMyTherapistSessionNoteController));
router.post('/me/sessions/:id/responses/:responseId/notes', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(postMyTherapistResponseNoteController));
router.get('/me/sessions/:id/responses/:responseId/notes', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(listMyTherapistResponseNotesController));
router.get('/me/sessions/:id/responses/:responseId/notes/:noteId', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(getMyTherapistResponseNoteController));
router.put('/me/sessions/:id/responses/:responseId/notes/:noteId', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(putMyTherapistResponseNoteController));
router.delete('/me/sessions/:id/responses/:responseId/notes/:noteId', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(deleteMyTherapistResponseNoteController));
router.post(
	'/me/documents',
	requireAuth,
	requireTherapistRole,
	uploadTherapistDocumentMiddleware,
	...validateUploadTherapistDocumentRequest,
	asyncHandler(uploadMyTherapistDocumentController),
);

export default router;
