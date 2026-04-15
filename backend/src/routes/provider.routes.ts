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
	// New CRUD controllers
	createPrescription,
	updatePrescription,
	discontinuePrescription,
	createLabOrder,
	updateLabOrderStatus,
	createGoal,
	updateGoal,
	getProviderCareTeam,
	assignCareTeam,
	removeCareTeam,
	getPendingAppointmentRequests,
	acceptAppointmentRequest,
	rejectAppointmentRequest,
	getPatientDocuments,
    createAddendum,
} from '../controllers/provider.controller';
import {
	getProviderMyQrAnalyticsController,
	getProviderMyQrController,
} from '../controllers/provider-qr.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole, requireClinicalVerification, type UserRole } from '../middleware/rbac.middleware';
import { requireProviderSubscription } from '../middleware/subscription.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

const providerRoles: UserRole[] = ['therapist', 'psychologist', 'psychiatrist', 'coach'];
const providerOnboardingRoles: UserRole[] = [...providerRoles, 'learner'];
const providerDashboardRoles: UserRole[] = [...providerRoles, 'learner'];

router.post(
	'/onboarding',
	requireAuth,
	requireRole(providerOnboardingRoles),
	asyncHandler(submitProviderOnboardingController),
);

router.get(
	'/dashboard',
	requireAuth,
	requireRole(providerRoles),
	requireClinicalVerification,
	asyncHandler(getProviderDashboardController),
);

router.get('/my-qr', requireAuth, requireRole(providerRoles), asyncHandler(getProviderMyQrController));
router.get('/my-qr/analytics', requireAuth, requireRole(providerRoles), asyncHandler(getProviderMyQrAnalyticsController));

router.get('/calendar', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getProviderCalendarSessions));
router.get('/patients', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getProviderPatients));
router.get('/earnings', requireAuth, requireRole(providerRoles), asyncHandler(getProviderEarnings));
router.get('/settings', requireAuth, requireRole(providerRoles), asyncHandler(getProviderSettings));
router.put('/settings', requireAuth, requireRole(providerRoles), asyncHandler(updateProviderSettings));
router.get('/messages/conversations', requireAuth, requireRole(providerRoles), asyncHandler(getConversations));
router.get('/messages/:conversationId', requireAuth, requireRole(providerRoles), asyncHandler(getConversationMessages));
router.post('/messages', requireAuth, requireRole(providerRoles), asyncHandler(sendMessage));

// Patient chart endpoints
router.get('/patient/:patientId/overview', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getPatientOverview));
router.get('/patient/:patientId/assessments', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getPatientAssessments));
router.post('/patient/:patientId/assign', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(assignPatientItem));

// Weekly plan
router.post('/patient/:patientId/weekly-plan', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(saveWeeklyPlan));
router.post('/patient/:patientId/weekly-plan/publish', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(publishWeeklyPlan));
router.post('/patient/:patientId/sessions/schedule', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(scheduleNextSession));

// Prescriptions — list + CRUD
router.get('/patient/:patientId/prescriptions', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getPatientPrescriptions));
router.post('/patient/:patientId/prescriptions', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(createPrescription));
router.patch('/patient/:patientId/prescriptions/:prescriptionId', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(updatePrescription));
router.delete('/patient/:patientId/prescriptions/:prescriptionId', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(discontinuePrescription));

// Labs — list + CRUD
router.get('/patient/:patientId/labs', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getPatientLabs));
router.post('/patient/:patientId/labs', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(createLabOrder));
router.patch('/patient/:patientId/labs/:labId', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(updateLabOrderStatus));

// Goals — list + CRUD + message
router.get('/patient/:patientId/goals', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getPatientGoals));
router.post('/patient/:patientId/goals', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(createGoal));
router.patch('/patient/:patientId/goals/:goalId', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(updateGoal));
router.post('/patient/:patientId/goals/:goalId/message', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(sendGoalMessage));

// Notes
router.get('/patient/:patientId/notes', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getPatientNotes));
router.post('/patient/:patientId/notes', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(createPatientNote));
router.put('/patient/:patientId/notes/:noteId', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(updatePatientNote));

// Addendum: create an addendum to an existing note
router.post('/patient/:patientId/notes/:noteId/addendum', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(createAddendum));

// Documents aggregation
router.get('/patient/:patientId/documents', requireAuth, requireRole(providerRoles), requireClinicalVerification, asyncHandler(getPatientDocuments));

// Care-team management
router.get('/care-team', requireAuth, requireRole(providerRoles), asyncHandler(getProviderCareTeam));
router.post('/care-team/:patientId', requireAuth, requireRole(providerRoles), asyncHandler(assignCareTeam));
router.delete('/care-team/:patientId', requireAuth, requireRole(providerRoles), asyncHandler(removeCareTeam));

// Appointment requests queue
router.get('/appointments/pending', requireAuth, requireRole(providerRoles), asyncHandler(getPendingAppointmentRequests));
router.post('/appointments/:requestId/accept', requireAuth, requireRole(providerRoles), asyncHandler(acceptAppointmentRequest));
router.post('/appointments/:requestId/reject', requireAuth, requireRole(providerRoles), asyncHandler(rejectAppointmentRequest));

// Meeting link
router.post('/meeting-link/:sessionId', requireAuth, requireRole(providerRoles), asyncHandler(generateMeetingLink));

// ── Provider Subscription & Leads ──
import {
	getProviderSubscriptionController,
	upgradeProviderSubscriptionController,
	checkoutProviderSubscriptionController,
	cancelProviderSubscriptionController,
	getProviderLeadsController,
	getProviderLeadStatsController,
	getProviderMarketplaceController,
	purchaseMarketplaceLeadController,
	getProviderPlansController,
} from '../controllers/provider-subscription.controller';

router.get('/plans', asyncHandler(getProviderPlansController)); // public
router.get('/subscription', requireAuth, requireRole(providerRoles), asyncHandler(getProviderSubscriptionController));
router.patch('/subscription/upgrade', requireAuth, requireRole(providerRoles), asyncHandler(upgradeProviderSubscriptionController));
router.post('/subscription/checkout', requireAuth, requireRole(providerRoles), asyncHandler(checkoutProviderSubscriptionController));
router.patch('/subscription/cancel', requireAuth, requireRole(providerRoles), asyncHandler(cancelProviderSubscriptionController));
router.get('/leads', requireAuth, requireRole(providerRoles), requireProviderSubscription, requireClinicalVerification, asyncHandler(getProviderLeadsController));
router.get('/lead-stats', requireAuth, requireRole(providerRoles), requireProviderSubscription, requireClinicalVerification, asyncHandler(getProviderLeadStatsController));
router.get('/marketplace', requireAuth, requireRole(providerRoles), requireProviderSubscription, requireClinicalVerification, asyncHandler(getProviderMarketplaceController));
router.post('/marketplace/purchase', requireAuth, requireRole(providerRoles), requireProviderSubscription, requireClinicalVerification, asyncHandler(purchaseMarketplaceLeadController));

// ── Platform Access ──
import {
	getPlatformAccessController,
	initiatePlatformAccessController,
} from '../controllers/platform-access.controller';

router.get('/platform-access', requireAuth, requireRole(providerRoles), asyncHandler(getPlatformAccessController));
router.post('/platform-access/initiate', requireAuth, requireRole(providerRoles), asyncHandler(initiatePlatformAccessController));

export default router;

