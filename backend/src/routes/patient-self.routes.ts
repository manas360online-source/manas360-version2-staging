import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler, validateCreateDailyCheckInRequest } from '../middleware/validate.middleware';
import {
  getAvailableProvidersController,
} from '../controllers/smart-match.controller';
import {
  cancelPatientSubscriptionController,
  completePatientExerciseController,
  createMoodController,
  getMyActiveCbtAssignmentsController,
  getMyCbtAssignmentDetailController,
  upsertMyCbtAssignmentResponseController,
  downgradePatientSubscriptionController,
  getPatientDashboardController,
  getPatientExercisesController,
  getPatientInsightsController,
  getPatientMoodController,
  getPatientMoodStatsController,
  getPatientMoodTodayController,
  getPatientPaymentMethodController,
  getPatientProgressController,
  getPatientReportsController,
  generateCompleteHealthSummaryController,
  getPatientRecordSecureUrlController,
  createPatientRecordShareLinkController,
  streamSharedPatientRecordController,
  getPatientSettingsController,
  getPatientSupportCenterController,
  getPatientSubscriptionController,
  getMyCareTeamController,
  logWellnessLibraryActivityController,
  reactivatePatientSubscriptionController,
  createPatientSupportTicketController,
  togglePatientSubscriptionAutoRenewController,
  updatePatientSettingsController,
  updatePatientPaymentMethodController,
  upgradePatientSubscriptionController,
  checkoutPatientSubscriptionController,
} from '../controllers/patient-v1.controller';
import { addDailyCheckInController } from '../controllers/patient.controller';
import { getMyPetStateController, upsertMyPetStateController } from '../controllers/pet.controller';
import {
  getConversationsController,
  getMessagesController,
  sendMessageController,
  markMessagesReadController,
  startConversationController,
} from '../controllers/messaging.controller';

const router = Router();


router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'manas360-api' });
});



router.get('/dashboard', requireAuth, requireRole('patient'), asyncHandler(getPatientDashboardController));
router.get('/insights', requireAuth, requireRole('patient'), asyncHandler(getPatientInsightsController));
router.get('/reports', requireAuth, requireRole('patient'), asyncHandler(getPatientReportsController));
router.post('/reports/health-summary', requireAuth, requireRole('patient'), asyncHandler(generateCompleteHealthSummaryController));
router.get('/records/:id/url', requireAuth, requireRole('patient'), asyncHandler(getPatientRecordSecureUrlController));
router.post('/records/:id/share', requireAuth, requireRole('patient'), asyncHandler(createPatientRecordShareLinkController));
router.get('/records/shared/:token', asyncHandler(streamSharedPatientRecordController));
router.get('/care-team', requireAuth, requireRole('patient'), asyncHandler(getMyCareTeamController));
router.get('/providers/smart-match', requireAuth, requireRole('patient'), asyncHandler(getAvailableProvidersController));
router.get('/providers/available', requireAuth, requireRole('patient'), asyncHandler(async (req, res) => {
  const query = req.query as Record<string, any>;
  (req as any).query = {
    ...query,
    daysOfWeek: query.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
    timeSlots: query.timeSlots || ['0-1439'],
    providerType: query.providerType || query.role,
    concerns: query.concerns || (query.specialization ? [String(query.specialization)] : undefined),
    languages: query.languages || (query.language ? [String(query.language)] : undefined),
  };
  res.setHeader('X-Endpoint-Deprecated', 'Use /v1/patient/providers/smart-match');
  await getAvailableProvidersController(req, res);
}));

router.get('/settings', requireAuth, requireRole('patient'), asyncHandler(getPatientSettingsController));
router.put('/settings', requireAuth, requireRole('patient'), asyncHandler(updatePatientSettingsController));

router.get('/support', requireAuth, requireRole('patient'), asyncHandler(getPatientSupportCenterController));
router.post('/support/tickets', requireAuth, requireRole('patient'), asyncHandler(createPatientSupportTicketController));

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
router.post('/mood', requireAuth, requireRole('patient'), asyncHandler(createMoodController));
router.get('/mood/today', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodTodayController));
router.get('/mood/history', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodController));
router.get('/mood/stats', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodStatsController));

router.get('/pets/state', requireAuth, requireRole('patient'), asyncHandler(getMyPetStateController));
router.put('/pets/state', requireAuth, requireRole('patient'), asyncHandler(upsertMyPetStateController));

router.get('/progress', requireAuth, requireRole('patient'), asyncHandler(getPatientProgressController));
router.post('/daily-checkin', requireAuth, requireRole('patient'), ...validateCreateDailyCheckInRequest, asyncHandler(addDailyCheckInController));

router.get('/exercises', requireAuth, requireRole('patient'), asyncHandler(getPatientExercisesController));
router.post('/exercises/library', requireAuth, requireRole('patient'), asyncHandler(logWellnessLibraryActivityController));
router.patch('/exercises/:id/complete', requireAuth, requireRole('patient'), asyncHandler(completePatientExerciseController));

router.get('/cbt-assignments/active', requireAuth, requireRole('patient'), asyncHandler(getMyActiveCbtAssignmentsController));
router.get('/cbt-assignments/:assignmentId', requireAuth, requireRole('patient'), asyncHandler(getMyCbtAssignmentDetailController));
router.patch('/cbt-assignments/:assignmentId', requireAuth, requireRole('patient'), asyncHandler(upsertMyCbtAssignmentResponseController));

// Direct messaging
router.get('/messages/conversations', requireAuth, requireRole('patient'), asyncHandler(getConversationsController));
router.post('/messages/start', requireAuth, requireRole('patient'), asyncHandler(startConversationController));
router.get('/messages/:conversationId', requireAuth, requireRole('patient'), asyncHandler(getMessagesController));
router.post('/messages', requireAuth, requireRole('patient'), asyncHandler(sendMessageController));
router.post('/messages/:conversationId/read', requireAuth, requireRole('patient'), asyncHandler(markMessagesReadController));

export default router;
