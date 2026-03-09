"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const admin_analytics_controller_1 = require("../controllers/admin-analytics.controller");
const admin_module_controller_1 = require("../controllers/admin-module.controller");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Query parameters:
 *   - role: 'patient' | 'therapist' | 'admin' (optional)
 *   - status: 'active' | 'deleted' (optional)
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 */
router.get('/users', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateAdminListUsersQuery, (0, validate_middleware_1.asyncHandler)(admin_controller_1.listUsersController));
/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateAdminGetUserIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.getUserController));
/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Sets isVerified = true and records verification timestamp
 * Route parameters:
 *   - id: therapist identifier
 * Response: Updated therapist profile summary
 */
router.patch('/therapists/:id/verify', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateTherapistProfileIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.verifyTherapistController));
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
router.get('/metrics', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getMetricsController));
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
router.get('/subscriptions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateAdminListSubscriptionsQuery, (0, validate_middleware_1.asyncHandler)(admin_controller_1.listSubscriptionsController));
/**
 * GET /api/v1/admin/modules/:module/summary
 * Generic real-time summary for admin module pages.
 */
router.get('/modules/:module/summary', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_module_controller_1.getAdminModuleSummaryController));
/**
 * GET /api/v1/admin/analytics/summary
 * Query params:
 *   - from: ISO date/time string (required)
 *   - to: ISO date/time string (required)
 *   - organizationKey: bigint (required)
 *   - therapistId: string (optional)
 */
router.get('/analytics/summary', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminAnalyticsSummaryController));
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
router.get('/analytics/templates', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminMostUsedTemplatesController));
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
router.get('/analytics/utilization', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminTherapistUtilizationController));
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
router.post('/analytics/export', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), rateLimiter_middleware_1.adminAnalyticsExportRateLimiter, (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.exportAdminAnalyticsReportController));
/**
 * POST /api/v1/admin/analytics/export/async
 * Queue heavy export job for async processing.
 */
router.post('/analytics/export/async', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), rateLimiter_middleware_1.adminAnalyticsExportRateLimiter, (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.enqueueAdminAnalyticsExportController));
/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/status
 * Poll async export status.
 */
router.get('/analytics/export/:exportJobKey/status', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.getAdminAnalyticsExportStatusController));
/**
 * GET /api/v1/admin/analytics/export/:exportJobKey/download
 * Download completed async export output.
 */
router.get('/analytics/export/:exportJobKey/download', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_analytics_controller_1.downloadAdminAnalyticsExportController));
exports.default = router;
