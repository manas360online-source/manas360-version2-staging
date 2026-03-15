import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import {
	validateAdminListUsersQuery,
	validateAdminGetUserIdParam,
	validateTherapistProfileIdParam,
	validateAdminListSubscriptionsQuery,
	asyncHandler,
} from '../middleware/validate.middleware';
import { listUsersController, getUserController, verifyProviderController, verifyTherapistController, approveProviderController, getMetricsController, listSubscriptionsController } from '../controllers/admin.controller';
import {
	getAdminAnalyticsSummaryController,
	getAdminMostUsedTemplatesController,
	getAdminTherapistUtilizationController,
	exportAdminAnalyticsReportController,
	enqueueAdminAnalyticsExportController,
	getAdminAnalyticsExportStatusController,
	downloadAdminAnalyticsExportController,
} from '../controllers/admin-analytics.controller';
import { getAdminModuleSummaryController } from '../controllers/admin-module.controller';
import { adminAnalyticsExportRateLimiter } from '../middleware/rateLimiter.middleware';
import {
	getAdminPricingConfigController,
	updateAdminPricingConfigController,
} from '../controllers/pricing.controller';
import {
	createQuestionOptionAdminController,
	createScreeningTemplateAdminController,
	createTemplateQuestionAdminController,
	ensureScreeningTemplateDefaultAdminController,
	listAllProviderExtraQuestionsAdminController,
	listScoringBandsAdminController,
	listScreeningTemplatesAdminController,
	listTemplateQuestionsAdminController,
	replaceScoringBandsAdminController,
	simulateTemplateScoringController,
	updateQuestionOptionAdminController,
	updateScreeningTemplateAdminController,
	updateTemplateQuestionAdminController,
} from '../controllers/free-screening-admin.controller';

const router = Router();

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Query parameters:
 *   - role: 'patient' | 'therapist' | 'admin' (optional)
 *   - status: 'active' | 'deleted' (optional)
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 */
router.get('/users', requireAuth, requireRole('admin'), requirePermission('manage_users'), ...validateAdminListUsersQuery, asyncHandler(listUsersController));

/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', requireAuth, requireRole('admin'), requirePermission('read_all_profiles'), ...validateAdminGetUserIdParam, asyncHandler(getUserController));

/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Sets isVerified = true and records verification timestamp
 * Route parameters:
 *   - id: therapist identifier
 * Response: Updated therapist profile summary
 */
router.patch(
	'/therapists/:id/verify',
	requireAuth,
	requireRole('admin'),
	requirePermission('manage_therapists'),
	...validateTherapistProfileIdParam,
	asyncHandler(verifyTherapistController),
);

router.post(
	'/verify-provider/:id',
	requireAuth,
	requireRole('admin'),
	requirePermission('manage_therapists'),
	...validateTherapistProfileIdParam,
	asyncHandler(verifyProviderController),
);

/**
 * POST /api/v1/admin/approve-provider/:id
 * Approve provider onboarding — sets isVerified, onboardingStatus = COMPLETED
 * Route parameters:
 *   - id: provider user ID
 */
router.post(
	'/approve-provider/:id',
	requireAuth,
	requireRole('admin'),
	requirePermission('manage_therapists'),
	asyncHandler(approveProviderController),
);

/**
 * GET /api/v1/admin/metrics
 * Get comprehensive platform metrics
 * No query parameters required
 * Response includes:
 *   - totalUsers: Count of active users
 *   - totalTherapists: Count of therapist profiles
 *   - verifiedTherapists: Count of verified therapists
 *   - completedSessions: Count of completed therapy sessions
 *   - totalRevenue: Sum of all transaction amounts
 *   - activeSubscriptions: Count of therapists with active patients
 */
router.get('/metrics', requireAuth, requireRole('admin'), requirePermission('view_analytics'), asyncHandler(getMetricsController));

/**
 * GET /api/v1/admin/subscriptions
 * List all active subscriptions with pagination and filters
 * Query parameters:
 *   - planType: 'basic' | 'premium' | 'pro' (optional)
 *   - status: 'active' | 'expired' | 'cancelled' | 'paused' (optional, default: 'active')
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 * Response: Paginated list of subscriptions with user and plan details
 */
router.get('/subscriptions', requireAuth, requireRole('admin'), ...validateAdminListSubscriptionsQuery, asyncHandler(listSubscriptionsController));

router.get('/pricing', requireAuth, requireRole('admin'), asyncHandler(getAdminPricingConfigController));
router.put('/pricing', requireAuth, requireRole('admin'), asyncHandler(updateAdminPricingConfigController));
router.patch('/pricing', requireAuth, requireRole('admin'), asyncHandler(updateAdminPricingConfigController));

router.get('/screening/templates', requireAuth, requireRole('admin'), asyncHandler(listScreeningTemplatesAdminController));
router.post('/screening/templates', requireAuth, requireRole('admin'), asyncHandler(createScreeningTemplateAdminController));
router.post('/screening/templates/defaults/:templateKey/ensure', requireAuth, requireRole('admin'), asyncHandler(ensureScreeningTemplateDefaultAdminController));
router.put('/screening/templates/:templateId', requireAuth, requireRole('admin'), asyncHandler(updateScreeningTemplateAdminController));

router.get('/screening/templates/:templateId/questions', requireAuth, requireRole('admin'), asyncHandler(listTemplateQuestionsAdminController));
router.post('/screening/templates/:templateId/questions', requireAuth, requireRole('admin'), asyncHandler(createTemplateQuestionAdminController));
router.put('/screening/questions/:questionId', requireAuth, requireRole('admin'), asyncHandler(updateTemplateQuestionAdminController));

router.post('/screening/questions/:questionId/options', requireAuth, requireRole('admin'), asyncHandler(createQuestionOptionAdminController));
router.put('/screening/options/:optionId', requireAuth, requireRole('admin'), asyncHandler(updateQuestionOptionAdminController));

router.get('/screening/templates/:templateId/scoring-bands', requireAuth, requireRole('admin'), asyncHandler(listScoringBandsAdminController));
router.put('/screening/templates/:templateId/scoring-bands', requireAuth, requireRole('admin'), asyncHandler(replaceScoringBandsAdminController));
router.post('/screening/templates/:templateId/simulate', requireAuth, requireRole('admin'), asyncHandler(simulateTemplateScoringController));
router.get('/screening/provider-questions', requireAuth, requireRole('admin'), asyncHandler(listAllProviderExtraQuestionsAdminController));

/**
 * GET /api/v1/admin/modules/:module/summary
 * Generic real-time summary for admin module pages.
 */
router.get('/modules/:module/summary', requireAuth, requireRole('admin'), asyncHandler(getAdminModuleSummaryController));

/**
 * GET /api/v1/admin/analytics/summary
 * Query params:
 *   - from: ISO date/time string (required)
 *   - to: ISO date/time string (required)
 *   - organizationKey: bigint (required)
 *   - therapistId: string (optional)
 */
router.get('/analytics/summary', requireAuth, requireRole('admin'), requirePermission('view_analytics'), asyncHandler(getAdminAnalyticsSummaryController));

/**
 * GET /api/v1/admin/analytics/templates
 * Query params:
 *   - from: ISO date string (required)
 *   - to: ISO date string (required)
 *   - organizationKey: bigint (required)
 *   - limit: number (optional, default 25, max 100)
 *   - lastSessionsCount: bigint (optional, keyset cursor)
 *   - lastTemplateKey: bigint (optional, keyset cursor)
 */
router.get('/analytics/templates', requireAuth, requireRole('admin'), asyncHandler(getAdminMostUsedTemplatesController));

/**
 * GET /api/v1/admin/analytics/utilization
 * Query params:
 *   - from: ISO date string (required)
 *   - to: ISO date string (required)
 *   - organizationKey: bigint (required)
 *   - limit: number (optional, default 25, max 100)
 *   - lastWeekStartDate: YYYY-MM-DD (optional, keyset cursor)
 *   - lastTherapistKey: bigint (optional, keyset cursor)
 */
router.get('/analytics/utilization', requireAuth, requireRole('admin'), asyncHandler(getAdminTherapistUtilizationController));

/**
 * POST /api/v1/admin/analytics/export
 * Body:
 *   - format: 'csv' | 'pdf'
 *   - from: ISO date/time (required)
 *   - to: ISO date/time (required)
 *   - organizationKey: number (required)
 *   - includeChartsSnapshot?: boolean
 *   - chartSnapshots?: string[] (data URL images; optional)
 */
router.post('/analytics/export', requireAuth, requireRole('admin'), requirePermission('view_analytics'), adminAnalyticsExportRateLimiter, asyncHandler(exportAdminAnalyticsReportController));

/**
 * POST /api/v1/admin/analytics/export/async
 * Queue heavy export job for async processing.
 */
router.post('/analytics/export/async', requireAuth, requireRole('admin'), adminAnalyticsExportRateLimiter, asyncHandler(enqueueAdminAnalyticsExportController));

/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/status
 * Poll async export status.
 */
router.get('/analytics/export/:exportJobKey/status', requireAuth, requireRole('admin'), asyncHandler(getAdminAnalyticsExportStatusController));

/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/download
 * Download completed async export output.
 */
router.get('/analytics/export/:exportJobKey/download', requireAuth, requireRole('admin'), asyncHandler(downloadAdminAnalyticsExportController));

export default router;
