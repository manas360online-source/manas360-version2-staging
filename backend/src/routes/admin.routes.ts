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
import { listUsersController, getUserController, verifyProviderController, verifyTherapistController, approveProviderController, getMetricsController, listSubscriptionsController, getAdminUserApprovalsController, updateAdminUserApprovalController, getAdminLiveSessionsController, getAdminFeedbackController, resolveAdminFeedbackController, updateAdminUserStatusController, getRolesController, updateRolePermissionsController, getUserAcceptancesController, getComplianceStatusController, getLegalDocumentsController, downloadLegalDocumentController } from '../controllers/admin.controller';
import {
	getAdminAnalyticsSummaryController,
	getAdminMostUsedTemplatesController,
	getAdminTherapistUtilizationController,
	exportAdminAnalyticsReportController,
	enqueueAdminAnalyticsExportController,
	getAdminAnalyticsExportStatusController,
	downloadAdminAnalyticsExportController,
	getAdminPaymentReliabilityController,
	retryPaymentManuallyController,
	getAdminRevenueAnalyticsController,
	getAdminUserMetricsController,
	getAdminProviderMetricsController,
	getAdminMarketplaceMetricsController,
	getAdminSystemHealthController,
	getAdminCompanyReportsController,
	getAdminBICorporateSummaryController,
	getAdminTherapistPerformanceController,
	getAdminSessionAnalyticsController,
	getAdminUserGrowthAnalyticsController,
	getAdminPlatformAnalyticsController,
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
import { 
	updateVerificationController, 
	getVerificationsController, 
	getVerificationDocumentsController 
} from '../controllers/admin-verification.controller';
import { 
	getPayoutsController, 
	approvePayoutController 
} from '../controllers/admin-payout.controller';
import { 
	toggleGlobalFreeController, 
	waiveSubscriptionController,
	getPricingContractsController,
	createPricingDraftController,
	approvePricingContractController
} from '../controllers/admin-pricing.controller';
import { 
	getZohoTicketsController, 
	addZohoCommentController, 
	getBlueprintStatusController 
} from '../controllers/admin-tickets.controller';
import {
	getOffersController,
	createOfferController,
	updateOfferController,
	deleteOfferController,
	reorderOffersController,
	publishOffersController
} from '../controllers/admin-offer.controller';
import { getLiveMetricsController } from '../controllers/admin-metrics.controller';
import { 
	getCrisisAlertsController, 
	respondToCrisisController 
} from '../controllers/admin-crisis.controller';
import { getAuditLogController } from '../controllers/admin-audit.controller';
import { 
	listGroupCategoriesController, 
	createGroupCategoryController, 
	updateGroupCategoryController, 
	deleteGroupCategoryController 
} from '../controllers/admin-groups.controller';
import {
	createAdminQrCodeController,
	listAdminQrCodesController,
	updateAdminQrCodeController,
} from '../controllers/admin-qr.controller';

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
router.get('/users', requireAuth, requireRole(['admin', 'superadmin']), ...validateAdminListUsersQuery, asyncHandler(listUsersController));

/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', requireAuth, requireRole(['admin', 'superadmin']), ...validateAdminGetUserIdParam, asyncHandler(getUserController));

router.patch('/users/:id/status', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(updateAdminUserStatusController));

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
 * GET /api/v1/admin/user-approvals
 * Get all users pending onboarding approval
 */
router.get('/user-approvals', requireAuth, requireRole(['admin', 'superadmin']), requirePermission('manage_users'), asyncHandler(getAdminUserApprovalsController));

/**
 * PATCH /api/v1/admin/user-approvals/:id
 * Approve or Reject a user's registration
 */
router.patch('/user-approvals/:id', requireAuth, requireRole(['admin', 'superadmin']), requirePermission('manage_users'), asyncHandler(updateAdminUserApprovalController));

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

// ==================== DASHBOARD & CORE ====================
router.get('/analytics/health', requireAuth, requireRole('admin'), asyncHandler(getAdminSystemHealthController));
router.get('/company-reports', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAdminCompanyReportsController));
router.get('/analytics/bi-summary', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAdminBICorporateSummaryController));
router.get('/analytics/therapist-performance', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAdminTherapistPerformanceController));
router.get('/analytics/reliability', requireAuth, requireRole('admin'), asyncHandler(getAdminPaymentReliabilityController));
router.get('/analytics/user-growth', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAdminUserGrowthAnalyticsController));
router.get('/analytics/sessions', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAdminSessionAnalyticsController));
router.get('/analytics/platform', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAdminPlatformAnalyticsController));

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
 * GET /api/v1/admin/analytics/revenue
 * Get revenue analytics dashboard data
 */
router.get(
	'/analytics/revenue',
	requireAuth,
	requireRole('admin'),
	requirePermission('view_analytics'),
	asyncHandler(getAdminRevenueAnalyticsController)
);

/**
 * GET /api/v1/admin/analytics/user-metrics
 * Get user metrics and growth analytics
 */
router.get(
	'/analytics/users',
	requireAuth,
	requireRole('admin'),
	requirePermission('view_analytics'),
	asyncHandler(getAdminUserMetricsController)
);

/**
 * GET /api/v1/admin/analytics/provider-metrics
 * Get provider performance and utilization metrics
 */
router.get(
	'/analytics/providers',
	requireAuth,
	requireRole('admin'),
	requirePermission('view_analytics'),
	asyncHandler(getAdminProviderMetricsController)
);

/**
 * GET /api/v1/admin/analytics/marketplace-metrics
 * Get marketplace (lead matching, supply/demand) metrics
 */
router.get(
	'/analytics/marketplace',
	requireAuth,
	requireRole('admin'),
	requirePermission('view_analytics'),
	asyncHandler(getAdminMarketplaceMetricsController)
);

/**
 * GET /api/v1/admin/analytics/system-health
 * Get system health and infrastructure metrics
 */
router.get(
	'/analytics/health',
	requireAuth,
	requireRole('admin'),
	requirePermission('view_analytics'),
	asyncHandler(getAdminSystemHealthController)
);

/**
 * GET /api/v1/admin/analytics/payments
 * Query params:
 *   - days: number (optional, default 30)
 */
router.get('/analytics/payments', requireAuth, requireRole('admin'), requirePermission('view_analytics'), asyncHandler(getAdminPaymentReliabilityController));

/**
 * POST /api/v1/admin/payments/:paymentId/retry
 * Manual payment retry endpoint (admin/support tool)
 * 
 * Resets retry counter and schedules immediate reconciliation
 * Use when customer updates payment method to trigger re-attempt
 * 
 * Route params:
 *   - paymentId: string (financial_payment.id)
 * 
 * Response: { success: boolean, message: string, payment: { id, status, retryCount, nextRetryAt } }
 * 
 * Requires: admin role + manage_payments permission
 */
router.post('/payments/:paymentId/retry', requireAuth, requireRole('admin'), requirePermission('manage_payments'), asyncHandler(retryPaymentManuallyController));

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
router.get(
	'/analytics/export/:exportJobKey/download',
	requireAuth,
	requireRole('admin'),
	requirePermission('view_analytics'),
	asyncHandler(downloadAdminAnalyticsExportController)
);

// === PHASE 2: ENHANCED VERIFICATION + PAYOUTS + WAIVERS ===
router.get('/verifications', requireAuth, requireRole('admin'), requirePermission('manage_therapists'), asyncHandler(getVerificationsController));
router.get('/verifications/:id/documents', requireAuth, requireRole('admin'), requirePermission('manage_therapists'), asyncHandler(getVerificationDocumentsController));
router.patch('/verifications/:id', requireAuth, requireRole('admin'), requirePermission('manage_therapists'), asyncHandler(updateVerificationController));

router.get('/payouts', requireAuth, requireRole('admin'), requirePermission('payouts_approve'), asyncHandler(getPayoutsController));
router.post('/payouts/:id/approve', requireAuth, requireRole('admin'), requirePermission('payouts_approve'), asyncHandler(approvePayoutController));

router.post('/waive-subscription', requireAuth, requireRole('admin'), asyncHandler(waiveSubscriptionController));
router.post('/pricing/free-toggle', requireAuth, requireRole('admin'), requirePermission('pricing_edit'), asyncHandler(toggleGlobalFreeController));

// === PHASE 3: ZOHO DESK + ZOHO FLOW INTEGRATION ===
router.get('/tickets', requireAuth, requireRole('admin'), getZohoTicketsController);
router.post('/tickets/:id/comment', requireAuth, requireRole('admin'), addZohoCommentController);

router.get('/blueprints/status', requireAuth, requireRole('admin'), getBlueprintStatusController);

// === PHASE 4: OFFER MARQUEE + PRICING CONTRACTS ===
router.get('/offers', requireAuth, requireRole('admin'), requirePermission('offers_edit'), getOffersController);
router.post('/offers', requireAuth, requireRole('admin'), requirePermission('offers_edit'), createOfferController);
router.put('/offers/:id', requireAuth, requireRole('admin'), requirePermission('offers_edit'), updateOfferController);
router.delete('/offers/:id', requireAuth, requireRole('admin'), requirePermission('offers_edit'), deleteOfferController);
router.post('/offers/reorder', requireAuth, requireRole('admin'), requirePermission('offers_edit'), reorderOffersController);
router.post('/offers/publish', requireAuth, requireRole('admin'), requirePermission('offers_edit'), publishOffersController);

// === QR CODE MANAGEMENT ===
router.get('/qr-codes', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(listAdminQrCodesController));
router.post('/qr-codes', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(createAdminQrCodeController));
router.patch('/qr-codes/:code', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(updateAdminQrCodeController));

router.get('/pricing/contracts', requireAuth, requireRole('admin'), getPricingContractsController);
router.post('/pricing/contracts/draft', requireAuth, requireRole('admin'), requirePermission('pricing_edit'), createPricingDraftController);
router.post('/pricing/contracts/:id/approve', requireAuth, requireRole('admin'), requirePermission('pricing_edit'), approvePricingContractController);

// === PHASE 5: REAL-TIME, CRISIS, REPORTS & AUDIT ===
router.get('/metrics/live', requireAuth, requireRole('admin'), getLiveMetricsController);
router.get('/live-sessions', requireAuth, requireRole(['admin', 'superadmin', 'complianceofficer']), requirePermission('view_analytics'), asyncHandler(getAdminLiveSessionsController));

/**
 * Support & Sentiment Dashboard
 */
router.get('/feedback', requireAuth, requireRole(['admin', 'complianceofficer']), asyncHandler(getAdminFeedbackController));
router.post('/feedback/:id/resolve', requireAuth, requireRole(['admin', 'complianceofficer']), asyncHandler(resolveAdminFeedbackController));

router.get('/crisis/alerts', requireAuth, requireRole(['admin', 'complianceofficer']), getCrisisAlertsController);
router.post('/crisis/:id/respond', requireAuth, requireRole(['admin', 'complianceofficer']), respondToCrisisController);

router.get('/audit', requireAuth, requireRole(['admin', 'complianceofficer']), getAuditLogController);
router.get('/compliance/status', requireAuth, requireRole(['admin', 'complianceofficer']), asyncHandler(getComplianceStatusController));
router.get('/legal/documents', requireAuth, requireRole(['admin', 'complianceofficer']), asyncHandler(getLegalDocumentsController));
router.get('/legal/documents/:id/download', requireAuth, requireRole(['admin', 'complianceofficer']), asyncHandler(downloadLegalDocumentController));
router.get('/acceptances', requireAuth, requireRole(['admin', 'complianceofficer']), asyncHandler(getUserAcceptancesController));

// Advanced Reporting & Exports
router.post('/reports/export', requireAuth, requireRole(['admin', 'complianceofficer']), requirePermission('view_analytics'), enqueueAdminAnalyticsExportController);
router.get('/reports/export/:jobId', requireAuth, requireRole(['admin', 'complianceofficer']), requirePermission('view_analytics'), getAdminAnalyticsExportStatusController);
router.get('/reports/export/:jobId/download', requireAuth, requireRole(['admin', 'complianceofficer']), requirePermission('view_analytics'), downloadAdminAnalyticsExportController);

// === PHASE 5 EXTENSION: DYNAMIC GROUPS ===
router.get('/groups', requireAuth, requireRole('admin'), listGroupCategoriesController);
router.post('/groups', requireAuth, requireRole('admin'), createGroupCategoryController);
router.put('/groups/:id', requireAuth, requireRole('admin'), updateGroupCategoryController);
router.delete('/groups/:id', requireAuth, requireRole('admin'), deleteGroupCategoryController);

// === DYNAMIC ROLE MANAGEMENT ===
router.get('/roles', requireAuth, requireRole('superadmin'), asyncHandler(getRolesController));
router.patch('/roles/:role', requireAuth, requireRole('superadmin'), asyncHandler(updateRolePermissionsController));

export default router;
