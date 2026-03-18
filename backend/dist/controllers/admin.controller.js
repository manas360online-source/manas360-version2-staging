"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSubscriptionsController = exports.getMetricsController = exports.approveProviderController = exports.verifyProviderController = exports.verifyTherapistController = exports.getUserController = exports.listUsersController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const admin_service_1 = require("../services/admin.service");
const response_1 = require("../utils/response");
/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Admin role required
 */
const listUsersController = async (req, res) => {
    const query = req.validatedAdminListUsersQuery;
    if (!query) {
        throw new error_middleware_1.AppError('Invalid query parameters', 400);
    }
    const result = await (0, admin_service_1.listUsers)(query.page, query.limit, {
        role: query.role,
        status: query.status,
    });
    (0, response_1.sendSuccess)(res, result, 'Users fetched successfully');
};
exports.listUsersController = listUsersController;
/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Admin role required
 */
const getUserController = async (req, res) => {
    const userId = req.validatedUserId;
    if (!userId) {
        throw new error_middleware_1.AppError('User ID is required', 400);
    }
    const user = await (0, admin_service_1.getUserById)(userId);
    (0, response_1.sendSuccess)(res, user, 'User fetched successfully');
};
exports.getUserController = getUserController;
/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Admin role required
 * Sets isVerified = true and records verification timestamp
 */
const verifyTherapistController = async (req, res) => {
    const therapistProfileId = req.validatedTherapistProfileId;
    const adminUserId = req.auth?.userId;
    if (!therapistProfileId) {
        throw new error_middleware_1.AppError('Therapist profile ID is required', 400);
    }
    if (!adminUserId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const result = await (0, admin_service_1.verifyTherapist)(therapistProfileId, adminUserId);
    (0, response_1.sendSuccess)(res, result, 'Therapist verified successfully');
};
exports.verifyTherapistController = verifyTherapistController;
const verifyProviderController = async (req, res) => {
    const providerUserId = req.validatedTherapistProfileId;
    const adminUserId = req.auth?.userId;
    if (!providerUserId) {
        throw new error_middleware_1.AppError('Provider ID is required', 400);
    }
    if (!adminUserId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const result = await (0, admin_service_1.verifyProvider)(providerUserId, adminUserId);
    (0, response_1.sendSuccess)(res, result, 'Provider verified successfully');
};
exports.verifyProviderController = verifyProviderController;
const approveProviderController = async (req, res) => {
    const providerUserId = req.params['id'];
    const adminUserId = req.auth?.userId;
    if (!providerUserId) {
        throw new error_middleware_1.AppError('Provider ID is required', 400);
    }
    if (!adminUserId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const result = await (0, admin_service_1.approveProvider)(providerUserId, adminUserId);
    (0, response_1.sendSuccess)(res, result, 'Provider approved successfully');
};
exports.approveProviderController = approveProviderController;
/**
 * GET /api/v1/admin/metrics
 * Get comprehensive platform metrics
 * Admin role required
 *
 * Returns:
 * - totalUsers: Count of active users
 * - totalTherapists: Count of therapist profiles
 * - verifiedTherapists: Count of verified therapists
 * - completedSessions: Count of completed therapy sessions
 * - totalRevenue: Sum of all transaction amounts
 * - activeSubscriptions: Count of therapists with active patients
 */
const getMetricsController = async (req, res) => {
    const metrics = await (0, admin_service_1.getMetrics)();
    (0, response_1.sendSuccess)(res, metrics, 'Platform metrics retrieved successfully');
};
exports.getMetricsController = getMetricsController;
/**
 * GET /api/v1/admin/subscriptions
 * List all active subscriptions with pagination and filters
 * Admin role required
 *
 * Query parameters:
 * - planType: 'basic' | 'premium' | 'pro' (optional)
 * - status: 'active' | 'expired' | 'cancelled' | 'paused' (optional, default: 'active')
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 10, max: 50)
 */
const listSubscriptionsController = async (req, res) => {
    const query = req.validatedAdminListSubscriptionsQuery;
    if (!query) {
        throw new error_middleware_1.AppError('Invalid query parameters', 400);
    }
    const result = await (0, admin_service_1.listSubscriptions)(query.page, query.limit, {
        planType: query.planType,
        status: query.status,
    });
    (0, response_1.sendSuccess)(res, result, 'Subscriptions fetched successfully');
};
exports.listSubscriptionsController = listSubscriptionsController;
