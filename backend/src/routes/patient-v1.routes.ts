import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { requireSubscription, requirePremiumSubscription } from '../middleware/subscription.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	getConversationsController,
	getMessagesController,
	sendMessageController,
	markMessagesReadController,
	startConversationController,
} from '../controllers/messaging.controller';
import {
	aiChatController,
	bookSessionController,
	cancelPatientSubscriptionController,
	completePatientExerciseController,
	completeTreatmentPlanTaskController,
	createMoodController,
	downgradePatientSubscriptionController,
	getPatientExercisesController,
	getPatientInsightsController,
	getPatientMoodStatsController,
	getPatientMoodTodayController,
	getPatientProgressController,
	getPatientReportsController,
	getPatientSharedReportMetaController,
	downloadPatientSharedReportController,
	generateCompleteHealthSummaryController,
	getPatientRecordSecureUrlController,
	createPatientRecordShareLinkController,
	streamSharedPatientRecordController,
	getPatientDashboardController,
	getPatientMoodController,
	getJourneyRecommendationController,
	getMyCareTeamController,
	getPatientPaymentMethodController,
	getPatientSubscriptionController,
	getMyTreatmentPlanController,
	getProviderByIdController,
	listNotificationsController,
	listProvidersController,
	logWellnessLibraryActivityController,
	markNotificationReadController,
	moodHistoryController,
	patientConfirmProposedAppointmentSlotController,
	reactivatePatientSubscriptionController,
	sessionDetailController,
	sessionHistoryController,
	sessionSummaryPdfController,
	togglePatientSubscriptionAutoRenewController,
	upcomingSessionsController,
	updatePatientPaymentMethodController,
	upgradePatientSubscriptionController,
	checkoutPatientSubscriptionController,
	verifyPaymentController,
	getMyActiveCbtAssignmentsController,
	getMyAssessmentsController,
	submitPresetAssessmentController,
} from '../controllers/patient-v1.controller';
import {
	getAvailableProvidersController,
	createAppointmentRequestController,
	getPatientPendingRequestsController,
	getPaymentPendingRequestController,
	acceptAppointmentController,
	rejectAppointmentController,
} from '../controllers/smart-match.controller';
import {
	getPatientDocuments,
} from '../controllers/provider.controller';
import {
	getMyDocumentsController,
	getPatientDocumentDownload,
} from '../controllers/patient.controller';
import { uploadPatientDocument } from '../controllers/patient.controller';

const router = Router();

router.get('/patient/dashboard', requireAuth, requireRole('patient'), asyncHandler(getPatientDashboardController));
router.get('/patient/insights', requireAuth, requireRole('patient'), asyncHandler(getPatientInsightsController));
router.get('/patient/reports', requireAuth, requireRole('patient'), asyncHandler(getPatientReportsController));
router.get('/patient/reports/shared/:id', requireAuth, requireRole('patient'), asyncHandler(getPatientSharedReportMetaController));
router.get('/patient/reports/shared/:id/download', requireAuth, requireRole('patient'), asyncHandler(downloadPatientSharedReportController));
router.post('/patient/reports/health-summary', requireAuth, requireRole('patient'), asyncHandler(generateCompleteHealthSummaryController));

// Patient documents — reuses provider aggregation but scoped to own ID
router.get('/patient/documents', requireAuth, requireRole('patient'), asyncHandler(getMyDocumentsController));
router.get('/patient/records/:id/url', requireAuth, requireRole('patient'), asyncHandler(getPatientRecordSecureUrlController));
router.post('/patient/records/:id/share', requireAuth, requireRole('patient'), asyncHandler(createPatientRecordShareLinkController));
router.get('/patient/records/shared/:token', asyncHandler(streamSharedPatientRecordController));
router.get('/patient/documents/:id/download', requireAuth, requireRole('patient'), asyncHandler(getPatientDocumentDownload));
router.get('/patient/care-team', requireAuth, requireRole('patient'), asyncHandler(getMyCareTeamController));

// Smart Match appointment booking flow
router.get('/patient/providers/smart-match', requireAuth, requireRole('patient'), requireSubscription, asyncHandler(getAvailableProvidersController));
router.post('/patient/appointments/smart-match', requireAuth, requireRole('patient'), requireSubscription, asyncHandler(createAppointmentRequestController));
router.get('/patient/appointments/requests/pending', requireAuth, requireRole('patient'), asyncHandler(getPatientPendingRequestsController));
router.get('/patient/appointments/payment-pending', requireAuth, requireRole('patient'), asyncHandler(getPaymentPendingRequestController));

router.post('/patient/appointments/smart-match/confirm-slot', requireAuth, requireRole('patient'), asyncHandler(patientConfirmProposedAppointmentSlotController));

// Legacy compatibility endpoints: proxy to smart-match engine with default availability.
router.get('/patient/providers/available', requireAuth, requireRole('patient'), requireSubscription, asyncHandler(async (req, res) => {
	const query = req.query as Record<string, any>;
	const days = query.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
	const slots = query.timeSlots || ['0-1439'];

	(req as any).query = {
		...query,
		daysOfWeek: days,
		timeSlots: slots,
		providerType: query.providerType || query.role,
		concerns: query.concerns || (query.specialization ? [String(query.specialization)] : undefined),
		languages: query.languages || (query.language ? [String(query.language)] : undefined),
	};
	res.setHeader('X-Endpoint-Deprecated', 'Use /v1/patient/providers/smart-match');
	await getAvailableProvidersController(req, res);
}));

router.post('/patient/appointments/request', requireAuth, requireRole('patient'), requireSubscription, asyncHandler(async (req, res) => {
	const body = req.body || {};
	(req as any).body = {
		...body,
		availabilityPrefs: body.availabilityPrefs || {
			daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
			timeSlots: [{ startMinute: 0, endMinute: 1439 }],
		},
		context: body.context || body.carePath,
		languages: body.languages || (body.preferredLanguage ? [String(body.preferredLanguage)] : undefined),
	};
	res.setHeader('X-Endpoint-Deprecated', 'Use /v1/patient/appointments/smart-match');
	await createAppointmentRequestController(req, res);
}));

router.post('/patient/appointments/confirm-slot', requireAuth, requireRole('patient'), asyncHandler(async (req, res) => {
	res.setHeader('X-Endpoint-Deprecated', 'Use /v1/patient/appointments/smart-match/confirm-slot');
	await patientConfirmProposedAppointmentSlotController(req, res);
}));

router.get('/providers', requireAuth, requireRole('patient'), asyncHandler(listProvidersController));
router.get('/providers/:id', requireAuth, requireRole('patient'), asyncHandler(getProviderByIdController));

router.post('/sessions/book', requireAuth, requireRole('patient'), requireSubscription, asyncHandler(bookSessionController));
router.get('/sessions/upcoming', requireAuth, requireRole('patient'), asyncHandler(upcomingSessionsController));
router.get('/sessions/history', requireAuth, requireRole('patient'), asyncHandler(sessionHistoryController));
router.get('/sessions/:id/documents/session-pdf', requireAuth, requireRole('patient'), asyncHandler(sessionSummaryPdfController));
router.get('/sessions/:id', requireAuth, requireRole('patient'), asyncHandler(sessionDetailController));

router.post('/payments/verify', requireAuth, requireRole('patient'), asyncHandler(verifyPaymentController));

router.get('/assessments/journey-recommendation', requireAuth, requireRole('patient'), asyncHandler(getJourneyRecommendationController));

// Preset entry point assessment submission (gated by feature flag in service layer)
router.post('/assessments/preset-submit', requireAuth, requireRole('patient'), asyncHandler(submitPresetAssessmentController));

// Patient assessment history for current user
router.get('/patient/me/assessments', requireAuth, requireRole('patient'), asyncHandler(getMyAssessmentsController));

router.get('/therapy-plan', requireAuth, requireRole('patient'), asyncHandler(getMyTreatmentPlanController));
router.patch('/therapy-plan/tasks/:id/complete', requireAuth, requireRole('patient'), asyncHandler(completeTreatmentPlanTaskController));

router.post('/mood', requireAuth, requireRole('patient'), asyncHandler(createMoodController));
router.get('/mood/history', requireAuth, requireRole('patient'), asyncHandler(moodHistoryController));
router.get('/mood/today', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodTodayController));
router.get('/mood/stats', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodStatsController));

router.get('/patient/progress', requireAuth, requireRole('patient'), asyncHandler(getPatientProgressController));

router.post('/ai/chat', requireAuth, requireRole('patient'), asyncHandler(aiChatController));

router.get('/notifications', requireAuth, requireRole('patient'), asyncHandler(listNotificationsController));
router.patch('/notifications/:id/read', requireAuth, requireRole('patient'), asyncHandler(markNotificationReadController));

router.get('/subscription', requireAuth, requireRole('patient'), asyncHandler(getPatientSubscriptionController));
router.patch('/subscription/upgrade', requireAuth, requireRole('patient'), asyncHandler(upgradePatientSubscriptionController));
router.post('/subscription/checkout', requireAuth, requireRole('patient'), asyncHandler(checkoutPatientSubscriptionController));
router.patch('/subscription/downgrade', requireAuth, requireRole('patient'), asyncHandler(downgradePatientSubscriptionController));
router.patch('/subscription/cancel', requireAuth, requireRole('patient'), asyncHandler(cancelPatientSubscriptionController));
router.patch('/subscription/reactivate', requireAuth, requireRole('patient'), asyncHandler(reactivatePatientSubscriptionController));
router.patch('/subscription/auto-renew', requireAuth, requireRole('patient'), asyncHandler(togglePatientSubscriptionAutoRenewController));

router.get('/payment-method', requireAuth, requireRole('patient'), asyncHandler(getPatientPaymentMethodController));
router.put('/payment-method', requireAuth, requireRole('patient'), asyncHandler(updatePatientPaymentMethodController));

router.get('/mood', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodController));

router.get('/exercises', requireAuth, requireRole('patient'), asyncHandler(getPatientExercisesController));
router.post('/exercises/library', requireAuth, requireRole('patient'), asyncHandler(logWellnessLibraryActivityController));
router.patch('/exercises/:id/complete', requireAuth, requireRole('patient'), asyncHandler(completePatientExerciseController));

// CBT assignment fallback route (primary is /api/patient/cbt-assignments/*)
router.get('/cbt-assignments/active', requireAuth, requireRole('patient'), asyncHandler(getMyActiveCbtAssignmentsController));

// Direct messaging
router.get('/patient/messages/conversations', requireAuth, requireRole('patient'), asyncHandler(getConversationsController));
router.post('/patient/messages/start', requireAuth, requireRole('patient'), asyncHandler(startConversationController));
router.get('/patient/messages/:conversationId', requireAuth, requireRole('patient'), asyncHandler(getMessagesController));
router.post('/patient/messages', requireAuth, requireRole('patient'), asyncHandler(sendMessageController));
router.post('/patient/messages/:conversationId/read', requireAuth, requireRole('patient'), asyncHandler(markMessagesReadController));

const upload = multer({ storage: multer.memoryStorage() });

router.post('/patient/documents/upload', requireAuth, requireRole('patient'), upload.single('file'), asyncHandler(uploadPatientDocument));

export default router;
