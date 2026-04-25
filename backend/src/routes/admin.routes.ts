import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole, requirePermission, requireAdminPolicy } from '../middleware/rbac.middleware';
import {
	validateAdminListUsersQuery,
	validateAdminGetUserIdParam,
	validateTherapistProfileIdParam,
	validateAdminListSubscriptionsQuery,
	asyncHandler,
} from '../middleware/validate.middleware';
import { verifyProviderWebhookController, rejectProviderWebhookController } from '../controllers/providerVerification.controller';
import { listUsersController, getUserController, verifyProviderController, verifyTherapistController, approveProviderController, getMetricsController, listSubscriptionsController, getAdminUserApprovalsController, updateAdminUserApprovalController, getAdminLiveSessionsController, getAdminFeedbackController, resolveAdminFeedbackController, updateAdminUserStatusController, updateAdminUsersBulkStatusController, searchAdminEntitiesController, getRolesController, updateRolePermissionsController, getUserAcceptancesController, getComplianceStatusController, getLegalDocumentsController, downloadLegalDocumentController, getPlatformAdminRoleInventoryController, createPlatformAdminAccountController, getEffectiveAdminPoliciesController, creditUserWalletController } from '../controllers/admin.controller';
import {
	getAdminAnalyticsSummaryController,
	getAdminMostUsedTemplatesController,
	getAdminTherapistUtilizationController,
	exportAdminAnalyticsReportController,
	enqueueAdminAnalyticsExportController,
	getAdminAnalyticsExportStatusController,
	downloadAdminAnalyticsExportController,
	getAdminPaymentReliabilityController,
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
import {
  getAllTracks,
  createTrack,
  deleteTrack
} from '../controllers/admin-sound.controller';
import {
	listPaymentReliabilityController,
	getPaymentReliabilityMetricsController,
	getPaymentReliabilityDetailController,
	retryPaymentReliabilityController,
} from '../controllers/admin-payment-reliability.controller';
import { getAdminModuleSummaryController } from '../controllers/admin-module.controller';
import { adminAnalyticsExportRateLimiter, auditExportRateLimiter } from '../middleware/rateLimiter.middleware';
import {
	getAdminPricingConfigController,
	updateAdminPricingConfigController,
} from '../controllers/pricing.controller';
import { 
	updateVerificationController, 
	getVerificationsController, 
	getVerificationDocumentsController 
} from '../controllers/admin-verification.controller';
import { 
	getPayoutDetailController,
	listPayoutsController,
	createPayoutController,
	processPayoutController,
	retryPayoutController,
	getPayoutMetricsController,
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
import { exportAuditLogController, getAuditLogController } from '../controllers/admin-audit.controller';
import { 
	listGroupCategoriesController, 
	createGroupCategoryController, 
	updateGroupCategoryController, 
	deleteGroupCategoryController 
} from '../controllers/admin-groups.controller';
import {
	createAdminQrCodeController,
	createCheckinQrCodeController,
	createSessionJoinQrCodeController,
	createScreeningQrCodeController,
	getAdminQrAnalyticsBySourceController,
	getAdminQrAnalyticsByTypeController,
	listAdminQrCodesController,
	updateAdminQrCodeController,
} from '../controllers/admin-qr.controller';
import {
	getPlatformConfigController,
	listPlatformConfigsController,
	rollbackPlatformConfigController,
	upsertPlatformConfigController,
} from '../controllers/platform-config.controller';
import {
	approveAdminAgreementController,
	createAdminAgreementController,
	getAdminAgreementByIdController,
	listAdminAgreementsController,
	rejectAdminAgreementController,
	updateAdminAgreementStatusController,
} from '../controllers/admin-agreement.controller';
import { listCorporateDemoRequestsController } from '../controllers/corporate.controller';
import { listRetreatIntentsController, updateRetreatIntentStatusController } from '../controllers/retreat.controller';

const router = Router();

router.post('/users/wallet/credit', requireAuth, requireRole(['admin', 'superadmin', 'financemanager']), requireAdminPolicy('payments.manage'), asyncHandler(creditUserWalletController));
router.get('/ping', (req, res) => res.json({ message: 'pong' }));

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Query parameters:
 *   - role: 'patient' | 'therapist' | 'admin' (optional)
 *   - status: 'active' | 'deleted' (optional)
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 */
router.get('/users', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.view'), ...validateAdminListUsersQuery, asyncHandler(listUsersController));
router.get('/search', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager', 'complianceofficer']), requireAdminPolicy('users.view'), asyncHandler(searchAdminEntitiesController));

/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.view'), ...validateAdminGetUserIdParam, asyncHandler(getUserController));

router.patch('/users/:id/status', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.moderate'), asyncHandler(updateAdminUserStatusController));
router.post('/users/bulk-status', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.moderate'), asyncHandler(updateAdminUsersBulkStatusController));

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
	requireAdminPolicy('providers.verify'),
	...validateTherapistProfileIdParam,
	asyncHandler(verifyTherapistController),
);

router.post(
	'/verify-provider/:id',
	requireAuth,
	requireRole('admin'),
	requireAdminPolicy('providers.verify'),
	...validateTherapistProfileIdParam,
	asyncHandler(verifyProviderController),
);

// Webhook endpoints: called by Zoho Flow / Zoho Desk when manual review completes.
// These endpoints are protected by the Zoho Flow webhook secret header `x-zoho-flow-secret`.
router.post('/verify-provider', asyncHandler(verifyProviderWebhookController));
router.post('/reject-provider', asyncHandler(rejectProviderWebhookController));

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
	requireAdminPolicy('providers.verify'),
	asyncHandler(approveProviderController),
);

/**
 * GET /api/v1/admin/user-approvals
 * Get all users pending onboarding approval
 */
router.get('/user-approvals', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.moderate'), asyncHandler(getAdminUserApprovalsController));

/**
 * PATCH /api/v1/admin/user-approvals/:id
 * Approve or Reject a user's registration
 */
router.patch('/user-approvals/:id', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.moderate'), asyncHandler(updateAdminUserApprovalController));

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
router.get('/metrics', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getMetricsController));

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
router.get('/subscriptions', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), ...validateAdminListSubscriptionsQuery, asyncHandler(listSubscriptionsController));

router.get('/pricing', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), asyncHandler(getAdminPricingConfigController));
router.put('/pricing', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), asyncHandler(updateAdminPricingConfigController));
router.patch('/pricing', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), asyncHandler(updateAdminPricingConfigController));

// === PLATFORM CONFIG (GLOBAL) ===
router.get('/platform-config', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager', 'complianceofficer']), requireAdminPolicy('config.view'), asyncHandler(listPlatformConfigsController));
router.get('/platform-config/:key', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager', 'complianceofficer']), requireAdminPolicy('config.view'), asyncHandler(getPlatformConfigController));
router.put('/platform-config/:key', requireAuth, requireRole('superadmin'), requireAdminPolicy('config.manage'), asyncHandler(upsertPlatformConfigController));
router.patch('/platform-config/:key', requireAuth, requireRole('superadmin'), requireAdminPolicy('config.manage'), asyncHandler(upsertPlatformConfigController));
router.post('/platform-config/:key/rollback', requireAuth, requireRole('superadmin'), requireAdminPolicy('config.manage'), asyncHandler(rollbackPlatformConfigController));

// === ADMIN AGREEMENTS (COMPAT ROUTES) ===
router.get('/agreements', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager']), asyncHandler(listAdminAgreementsController));
router.post('/agreements', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager']), asyncHandler(createAdminAgreementController));
router.get('/agreements/:agreementId', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager']), asyncHandler(getAdminAgreementByIdController));
router.patch('/agreements/:agreementId/status', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager']), asyncHandler(updateAdminAgreementStatusController));
router.patch('/agreements/:agreementId/approve', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager']), asyncHandler(approveAdminAgreementController));
router.patch('/agreements/:agreementId/reject', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager']), asyncHandler(rejectAdminAgreementController));

/**
 * GET /api/v1/admin/modules/:module/summary
 * Generic real-time summary for admin module pages.
 */
router.get('/modules/:module/summary', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getAdminModuleSummaryController));

// ==================== DASHBOARD & CORE ====================
// Removed duplicate analytics/health route. Only permission-guarded version remains below.
router.get('/company-reports', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('analytics.view'), asyncHandler(getAdminCompanyReportsController));
router.get('/analytics/bi-summary', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('analytics.view'), asyncHandler(getAdminBICorporateSummaryController));
router.get('/analytics/therapist-performance', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('analytics.view'), asyncHandler(getAdminTherapistPerformanceController));
router.get('/analytics/reliability', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getAdminPaymentReliabilityController));
router.get('/analytics/user-growth', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('analytics.view'), asyncHandler(getAdminUserGrowthAnalyticsController));
router.get('/analytics/sessions', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('analytics.view'), asyncHandler(getAdminSessionAnalyticsController));
router.get('/analytics/platform', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('analytics.view'), asyncHandler(getAdminPlatformAnalyticsController));

/**
 * GET /api/v1/admin/analytics/summary
 * Query params:
 *   - from: ISO date/time string (required)
 *   - to: ISO date/time string (required)
 *   - organizationKey: bigint (required)
 *   - therapistId: string (optional)
 */
router.get('/analytics/summary', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getAdminAnalyticsSummaryController));

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
router.get('/analytics/templates', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getAdminMostUsedTemplatesController));

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
router.get('/analytics/utilization', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getAdminTherapistUtilizationController));

/**
 * GET /api/v1/admin/analytics/revenue
 * Get revenue analytics dashboard data
 */
router.get(
	'/analytics/revenue',
	requireAuth,
	requireRole('admin'),
	requireAdminPolicy('analytics.view'),
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
	requireAdminPolicy('analytics.view'),
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
	requireAdminPolicy('analytics.view'),
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
	requireAdminPolicy('analytics.view'),
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
router.get('/analytics/payments', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getAdminPaymentReliabilityController));

/**
 * GET /api/v1/admin/payments/reliability
 * Revenue-protection payment reliability list with filters and sorting.
 */
router.get('/payments/reliability', requireAuth, requireRole('admin'), requireAdminPolicy('payments.view'), asyncHandler(listPaymentReliabilityController));

/**
 * GET /api/v1/admin/payments/reliability/metrics
 * Aggregated metrics for payment reliability control plane.
 */
router.get('/payments/reliability/metrics', requireAuth, requireRole('admin'), requireAdminPolicy('payments.view'), asyncHandler(getPaymentReliabilityMetricsController));

/**
 * GET /api/v1/admin/payments/:id
 * Detailed inspector payload for a payment reliability row.
 */
router.get('/payments/:id', requireAuth, requireRole('admin'), requireAdminPolicy('payments.view'), asyncHandler(getPaymentReliabilityDetailController));

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
router.post('/payments/:paymentId/retry', requireAuth, requireRole('admin'), requireAdminPolicy('payments.retry'), asyncHandler(retryPaymentReliabilityController));

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
router.post('/analytics/export', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), adminAnalyticsExportRateLimiter, asyncHandler(exportAdminAnalyticsReportController));

/**
 * POST /api/v1/admin/analytics/export/async
 * Queue heavy export job for async processing.
 */
router.post('/analytics/export/async', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), adminAnalyticsExportRateLimiter, asyncHandler(enqueueAdminAnalyticsExportController));

/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/status
 * Poll async export status.
 */
router.get('/analytics/export/:exportJobKey/status', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), asyncHandler(getAdminAnalyticsExportStatusController));

/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/download
 * Download completed async export output.
 */
router.get(
	'/analytics/export/:exportJobKey/download',
	requireAuth,
	requireRole('admin'),
	requireAdminPolicy('analytics.view'),
	asyncHandler(downloadAdminAnalyticsExportController)
);

// === PHASE 2: ENHANCED VERIFICATION + PAYOUTS + WAIVERS ===
router.get('/verifications', requireAuth, requireRole('admin'), requireAdminPolicy('providers.verify'), asyncHandler(getVerificationsController));
router.get('/verifications/:id/documents', requireAuth, requireRole('admin'), requireAdminPolicy('providers.verify'), asyncHandler(getVerificationDocumentsController));
router.patch('/verifications/:id', requireAuth, requireRole('admin'), requireAdminPolicy('providers.verify'), asyncHandler(updateVerificationController));

// ==================== PAYOUTS ====================
router.get('/payouts/metrics', requireAuth, requireRole('admin'), requireAdminPolicy('payouts.view'), asyncHandler(getPayoutMetricsController));
router.get('/payouts', requireAuth, requireRole('admin'), requireAdminPolicy('payouts.view'), asyncHandler(listPayoutsController));
router.get('/payouts/:id', requireAuth, requireRole('admin'), requireAdminPolicy('payouts.view'), asyncHandler(getPayoutDetailController));
router.post('/payouts', requireAuth, requireRole('admin'), requireAdminPolicy('payouts.manage'), asyncHandler(createPayoutController));
router.post('/payouts/:id/process', requireAuth, requireRole('admin'), requireAdminPolicy('payouts.manage'), asyncHandler(processPayoutController));
router.post('/payouts/:id/retry', requireAuth, requireRole('admin'), requireAdminPolicy('payouts.manage'), asyncHandler(retryPayoutController));

router.post('/waive-subscription', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), asyncHandler(waiveSubscriptionController));
router.post('/pricing/free-toggle', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), asyncHandler(toggleGlobalFreeController));

// === PHASE 3: ZOHO DESK + ZOHO FLOW INTEGRATION ===
router.get('/tickets', requireAuth, requireRole('admin'), requireAdminPolicy('tickets.manage'), getZohoTicketsController);
router.post('/tickets/:id/comment', requireAuth, requireRole('admin'), requireAdminPolicy('tickets.manage'), addZohoCommentController);

router.get('/blueprints/status', requireAuth, requireRole('admin'), requireAdminPolicy('tickets.manage'), getBlueprintStatusController);

// === PHASE 4: OFFER MARQUEE + PRICING CONTRACTS ===
router.get('/offers', requireAuth, requireRole('admin'), requireAdminPolicy('offers.manage'), getOffersController);
router.post('/offers', requireAuth, requireRole('admin'), requireAdminPolicy('offers.manage'), createOfferController);
router.put('/offers/:id', requireAuth, requireRole('admin'), requireAdminPolicy('offers.manage'), updateOfferController);
router.delete('/offers/:id', requireAuth, requireRole('admin'), requireAdminPolicy('offers.manage'), deleteOfferController);
router.post('/offers/reorder', requireAuth, requireRole('admin'), requireAdminPolicy('offers.manage'), reorderOffersController);
router.post('/offers/publish', requireAuth, requireRole('admin'), requireAdminPolicy('offers.manage'), publishOffersController);

// === QR CODE MANAGEMENT ===
router.get('/qr-codes', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(listAdminQrCodesController));
router.post('/qr-codes', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(createAdminQrCodeController));
router.get('/qr/analytics/by-type', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(getAdminQrAnalyticsByTypeController));
router.get('/qr/analytics/by-source', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(getAdminQrAnalyticsBySourceController));
router.post('/qr/screening/generate', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(createScreeningQrCodeController));
router.post('/qr/checkin/generate', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(createCheckinQrCodeController));
router.post('/qr/join/generate', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(createSessionJoinQrCodeController));
router.patch('/qr-codes/:code', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('qr.manage'), asyncHandler(updateAdminQrCodeController));

router.get('/pricing/contracts', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), getPricingContractsController);
router.post('/pricing/contracts/draft', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), createPricingDraftController);
router.post('/pricing/contracts/:id/approve', requireAuth, requireRole('admin'), requireAdminPolicy('pricing.manage'), approvePricingContractController);

// === PHASE 5: REAL-TIME, CRISIS, REPORTS & AUDIT ===
router.get('/metrics/live', requireAuth, requireRole('admin'), requireAdminPolicy('analytics.view'), getLiveMetricsController);
router.get('/live-sessions', requireAuth, requireRole(['admin', 'superadmin', 'complianceofficer']), requirePermission('view_analytics'), asyncHandler(getAdminLiveSessionsController));

/**
 * Support & Sentiment Dashboard
 */
router.get('/feedback', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('feedback.manage'), asyncHandler(getAdminFeedbackController));
router.post('/feedback/:id/resolve', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('feedback.manage'), asyncHandler(resolveAdminFeedbackController));

router.get('/crisis/alerts', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('compliance.manage'), getCrisisAlertsController);
router.post('/crisis/:id/respond', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('compliance.manage'), respondToCrisisController);

router.get('/audit', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('audit.view'), getAuditLogController);
router.post('/audit/export', requireAuth, auditExportRateLimiter, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('audit.export'), exportAuditLogController);
router.get('/compliance/status', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('compliance.manage'), asyncHandler(getComplianceStatusController));
router.get('/legal/documents', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('compliance.manage'), asyncHandler(getLegalDocumentsController));
router.get('/legal/documents/:id/download', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('compliance.manage'), asyncHandler(downloadLegalDocumentController));
router.get('/acceptances', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('compliance.manage'), asyncHandler(getUserAcceptancesController));

// Advanced Reporting & Exports
router.post('/reports/export', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('analytics.view'), enqueueAdminAnalyticsExportController);
router.get('/reports/export/:jobId', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('analytics.view'), getAdminAnalyticsExportStatusController);
router.get('/reports/export/:jobId/download', requireAuth, requireRole(['admin', 'complianceofficer']), requireAdminPolicy('analytics.view'), downloadAdminAnalyticsExportController);

// === PHASE 5 EXTENSION: DYNAMIC GROUPS ===
router.get('/groups', requireAuth, requireRole('admin'), requireAdminPolicy('groups.manage'), listGroupCategoriesController);
router.post('/groups', requireAuth, requireRole('admin'), requireAdminPolicy('groups.manage'), createGroupCategoryController);
router.put('/groups/:id', requireAuth, requireRole('admin'), requireAdminPolicy('groups.manage'), updateGroupCategoryController);
router.delete('/groups/:id', requireAuth, requireRole('admin'), requireAdminPolicy('groups.manage'), deleteGroupCategoryController);

// === DYNAMIC ROLE MANAGEMENT ===
router.get('/roles', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager', 'complianceofficer']), requireAdminPolicy('users.view'), asyncHandler(getRolesController));
router.patch('/roles/:role', requireAuth, requireRole('superadmin'), requireAdminPolicy('users.moderate'), asyncHandler(updateRolePermissionsController));
router.get('/rbac/platform-admins', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager', 'complianceofficer']), requireAdminPolicy('users.view'), asyncHandler(getPlatformAdminRoleInventoryController));
router.post('/rbac/platform-admins', requireAuth, requireRole('superadmin'), requireAdminPolicy('users.moderate'), asyncHandler(createPlatformAdminAccountController));
router.get('/rbac/effective-policies', requireAuth, requireRole(['admin', 'superadmin', 'clinicaldirector', 'financemanager', 'complianceofficer']), requireAdminPolicy('users.view'), asyncHandler(getEffectiveAdminPoliciesController));

// === CORPORATE DEMO REQUESTS ===
router.get('/corporate-demo-requests', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.view'), asyncHandler(listCorporateDemoRequestsController));

// === RETREAT INTENTS ===
router.get('/retreat-intents', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.view'), asyncHandler(listRetreatIntentsController));
router.patch('/retreat-intents/:id/status', requireAuth, requireRole(['admin', 'superadmin']), requireAdminPolicy('users.moderate'), asyncHandler(updateRetreatIntentStatusController));

// === SOUND THERAPY ADMIN ===
router.get('/sound', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(getAllTracks));
router.post('/sound', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(createTrack));
router.delete('/sound/:id', requireAuth, requireRole(['admin', 'superadmin']), asyncHandler(deleteTrack));

export default router;
