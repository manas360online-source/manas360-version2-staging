import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { listUsers, getUserById, verifyTherapist, verifyProvider, approveProvider, getMetrics, listSubscriptions } from '../services/admin.service';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Admin role required
 */
export const listUsersController = async (req: Request, res: Response): Promise<void> => {
	const query = req.validatedAdminListUsersQuery;

	if (!query) {
		throw new AppError('Invalid query parameters', 400);
	}

	const result = await listUsers(query.page, query.limit, {
		role: query.role,
		status: query.status,
	});

	sendSuccess(res, result, 'Users fetched successfully');
};

/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Admin role required
 */
export const getUserController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.validatedUserId;

	if (!userId) {
		throw new AppError('User ID is required', 400);
	}

	const user = await getUserById(userId);

	sendSuccess(res, user, 'User fetched successfully');
};

/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Admin role required
 * Sets isVerified = true and records verification timestamp
 */
export const verifyTherapistController = async (req: Request, res: Response): Promise<void> => {
	const therapistProfileId = req.validatedTherapistProfileId;
	const adminUserId = req.auth?.userId;

	if (!therapistProfileId) {
		throw new AppError('Therapist profile ID is required', 400);
	}

	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await verifyTherapist(therapistProfileId, adminUserId);

	sendSuccess(res, result, 'Therapist verified successfully');
};

export const verifyProviderController = async (req: Request, res: Response): Promise<void> => {
	const providerUserId = req.validatedTherapistProfileId;
	const adminUserId = req.auth?.userId;

	if (!providerUserId) {
		throw new AppError('Provider ID is required', 400);
	}

	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await verifyProvider(providerUserId, adminUserId);

	sendSuccess(res, result, 'Provider verified successfully');
};

export const approveProviderController = async (req: Request, res: Response): Promise<void> => {
	const providerUserId = req.params['id'] as string;
	const adminUserId = req.auth?.userId;

	if (!providerUserId) {
		throw new AppError('Provider ID is required', 400);
	}

	if (!adminUserId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await approveProvider(providerUserId, adminUserId);

	sendSuccess(res, result, 'Provider approved successfully');
};

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
export const getMetricsController = async (req: Request, res: Response): Promise<void> => {
	const metrics = await getMetrics();

	sendSuccess(res, metrics, 'Platform metrics retrieved successfully');
};

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
export const listSubscriptionsController = async (req: Request, res: Response): Promise<void> => {
	const query = req.validatedAdminListSubscriptionsQuery;

	if (!query) {
		throw new AppError('Invalid query parameters', 400);
	}

	const result = await listSubscriptions(query.page, query.limit, {
		planType: query.planType,
		status: query.status,
	});

	sendSuccess(res, result, 'Subscriptions fetched successfully');
};
