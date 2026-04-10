import { randomBytes } from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { ADMIN_POLICIES, POLICY_VERSION, getRolePermissionsForRole, roleHierarchy } from '../middleware/rbac.middleware';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import type { PaginationMeta } from '../utils/pagination';
import { hashPassword } from '../utils/hash';
import { sendPlatformAdminInviteEmail } from './email.service';
import { env } from '../config/env';

const db = prisma as any;

type PlatformAdminRole = 'admin' | 'superadmin' | 'clinicaldirector' | 'financemanager' | 'complianceofficer';

const PLATFORM_ADMIN_ROLES: PlatformAdminRole[] = [
	'admin',
	'superadmin',
	'clinicaldirector',
	'financemanager',
	'complianceofficer',
];

const INVITABLE_PLATFORM_ADMIN_ROLES: Exclude<PlatformAdminRole, 'superadmin'>[] = [
	'admin',
	'clinicaldirector',
	'financemanager',
	'complianceofficer',
];

const PLATFORM_ADMIN_ROLE_PERMISSIONS: Record<PlatformAdminRole, string[]> = {
	admin: ['dashboard', 'users_read', 'users_write', 'view_analytics', 'manage_users', 'manage_therapists', 'view_feedback', 'view_audit'],
	superadmin: ['dashboard', 'users_read', 'users_write', 'view_analytics', 'manage_users', 'manage_therapists', 'view_feedback', 'view_audit', 'pricing_edit', 'payouts_approve', 'manage_compliance'],
	clinicaldirector: ['dashboard', 'users_read', 'manage_therapists', 'view_analytics', 'view_feedback', 'view_audit'],
	financemanager: ['dashboard', 'view_analytics', 'pricing_edit', 'payouts_approve', 'revenue'],
	complianceofficer: ['dashboard', 'view_analytics', 'view_feedback', 'view_audit', 'manage_compliance', 'read_reports'],
};

const toPrismaUserRole = (role: PlatformAdminRole): 'ADMIN' | 'SUPER_ADMIN' | 'CLINICAL_DIRECTOR' | 'FINANCE_MANAGER' | 'COMPLIANCE_OFFICER' => {
	if (role === 'admin') return 'ADMIN';
	if (role === 'superadmin') return 'SUPER_ADMIN';
	if (role === 'clinicaldirector') return 'CLINICAL_DIRECTOR';
	if (role === 'financemanager') return 'FINANCE_MANAGER';
	return 'COMPLIANCE_OFFICER';
};

const ensurePlatformRoleStore = async (): Promise<void> => {
	await db.$executeRaw`
		CREATE TABLE IF NOT EXISTS roles (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			description TEXT,
			permissions TEXT[] NOT NULL DEFAULT '{}'::text[],
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`;
};

const seedPlatformRoleRecords = async (): Promise<void> => {
	await ensurePlatformRoleStore();

	for (const role of PLATFORM_ADMIN_ROLES) {
		await db.role.upsert({
			where: { name: role },
			update: { permissions: PLATFORM_ADMIN_ROLE_PERMISSIONS[role] },
			create: {
				id: randomBytes(16).toString('hex'),
				name: role,
				description:
					role === 'superadmin'
						? 'Platform owner with full access'
						: role === 'admin'
							? 'Platform admin with management access'
							: role === 'clinicaldirector'
								? 'Clinical operations admin'
								: role === 'financemanager'
									? 'Finance admin'
									: 'Compliance admin',
				permissions: PLATFORM_ADMIN_ROLE_PERMISSIONS[role],
			},
		});
	}
};

const normalizePlatformAdminRole = (role: string): PlatformAdminRole => {
	const normalized = role.toLowerCase().replace(/[-_\s]/g, '');
	if (normalized === 'admin') return 'admin';
	if (normalized === 'superadmin' || normalized === 'super_admin') return 'superadmin';
	if (normalized === 'clinicaldirector' || normalized === 'clinical_director') return 'clinicaldirector';
	if (normalized === 'financemanager' || normalized === 'finance_manager') return 'financemanager';
	if (normalized === 'complianceofficer' || normalized === 'compliance_officer') return 'complianceofficer';
	throw new AppError('Invalid platform admin role', 400);
};

const ensureRoleRecord = async (role: PlatformAdminRole): Promise<void> => {
	await seedPlatformRoleRecords();
	await db.role.upsert({
		where: { name: role },
		update: { permissions: PLATFORM_ADMIN_ROLE_PERMISSIONS[role] },
		create: {
			id: randomBytes(16).toString('hex'),
			name: role,
			description:
				role === 'superadmin'
					? 'Platform owner with full access'
					: role === 'admin'
						? 'Platform admin with management access'
						: role === 'clinicaldirector'
							? 'Clinical operations admin'
							: role === 'financemanager'
								? 'Finance admin'
								: 'Compliance admin',
				permissions: PLATFORM_ADMIN_ROLE_PERMISSIONS[role],
		},
	});
};

export interface PlatformAdminRoleInventoryItem {
	role: PlatformAdminRole;
	existsInRbac: boolean;
	hasRoleRecord: boolean;
	userCount: number;
	permissions: string[];
}

export interface CreatePlatformAdminInput {
	email: string;
	role: string;
	firstName?: string;
	lastName?: string;
	password?: string;
	name?: string;
}

const mapRoleFilterToEnum = (role?: string): 'PATIENT' | 'THERAPIST' | 'PSYCHIATRIST' | 'COACH' | 'ADMIN' | 'COMPLIANCE_OFFICER' | undefined => {
	if (!role) return undefined;
	const normalized = role.toLowerCase();
	if (normalized === 'patient') return 'PATIENT';
	if (normalized === 'therapist') return 'THERAPIST';
	if (normalized === 'psychiatrist') return 'PSYCHIATRIST';
	if (normalized === 'coach') return 'COACH';
	if (normalized === 'admin') return 'ADMIN';
	if (normalized === 'complianceofficer') return 'COMPLIANCE_OFFICER';
	throw new AppError('Invalid role filter', 400);
};

const mapPlanTypeToEnum = (planType?: string): 'BASIC' | 'PREMIUM' | 'LEAD_PLAN' | undefined => {
	if (!planType) return undefined;
	const normalized = planType.toLowerCase();
	if (normalized === 'basic') return 'BASIC';
	if (normalized === 'premium') return 'PREMIUM';
	if (normalized === 'pro') return 'LEAD_PLAN';
	throw new AppError('Invalid plan type', 400);
};

const mapSubscriptionStatusToEnum = (status?: string): 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE' | undefined => {
	if (!status) return undefined;
	const normalized = status.toLowerCase();
	if (normalized === 'active') return 'ACTIVE';
	if (normalized === 'expired') return 'EXPIRED';
	if (normalized === 'cancelled') return 'CANCELLED';
	if (normalized === 'paused') return 'PAST_DUE';
	throw new AppError('Invalid subscription status', 400);
};

export interface AdminListUsersResponse {
	data: Array<{
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: 'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin' | 'complianceofficer';
		isTherapistVerified: boolean;
		therapistVerifiedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	}>;
	meta: PaginationMeta;
}

/**
 * List users with pagination and filtering
 *
 * Query filters:
 * - role: 'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin' | 'complianceofficer' (optional)
 * - status: 'active' | 'deleted' (optional)
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 10, max: 50)
 *
 * Returns paginated list with metadata
 */
export const listUsers = async (
	page: number,
	limit: number,
	{
		role,
		status,
		sortBy,
		sortOrder,
	}: {
		role?: string;
		status?: string;
		sortBy?: 'createdAt' | 'email' | 'role';
		sortOrder?: 'asc' | 'desc';
	} = {},
): Promise<AdminListUsersResponse> => {
	if (status && !['active', 'deleted'].includes(status.toLowerCase())) {
		throw new AppError('Invalid status filter', 400);
	}

	if (status?.toLowerCase() === 'deleted') {
		const normalized = normalizePagination(
			{ page, limit },
			{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
		);
		return {
			data: [],
			meta: buildPaginationMeta(0, normalized),
		};
	}

	const roleFilter = mapRoleFilterToEnum(role);
	const resolvedSortBy = sortBy ?? 'createdAt';
	const resolvedSortOrder = sortOrder ?? 'desc';

	const normalized = normalizePagination(
		{ page, limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const [users, totalItems] = await Promise.all([
		db.user.findMany({
			where: roleFilter ? { role: roleFilter } : undefined,
			orderBy: { [resolvedSortBy]: resolvedSortOrder },
			skip: normalized.skip,
			take: normalized.limit,
			select: {
				id: true,
				email: true,
				phone: true,
				firstName: true,
				lastName: true,
				role: true,
				status: true,
				isTherapistVerified: true,
				therapistVerifiedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
		db.user.count({ where: roleFilter ? { role: roleFilter } : undefined }),
	]);

	return {
		data: users.map((user: any) => ({
			id: user.id,
			email: user.email,
			phone: user.phone || 'N/A',
			firstName: user.firstName,
			lastName: user.lastName,
			role: String(user.role).toLowerCase(),
			status: String(user.status).toLowerCase(),
			isTherapistVerified: Boolean(user.isTherapistVerified),
			therapistVerifiedAt: user.therapistVerifiedAt ?? null,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		})),
		meta: buildPaginationMeta(totalItems, normalized),
	};
};

/**
 * Get a single user by ID
 *
 * Returns full user profile with sensitive fields excluded
 * Throws 404 if user not found
 */
export const getUserById = async (userId: string): Promise<{
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	isTherapistVerified: boolean;
	therapistVerifiedAt: Date | null;
	therapistVerifiedByUserId: string | null;
	createdAt: Date;
	updatedAt: Date;
}> => {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			role: true,
			isTherapistVerified: true,
			therapistVerifiedAt: true,
			therapistVerifiedByUserId: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	return {
		...user,
		isTherapistVerified: Boolean(user.isTherapistVerified),
		therapistVerifiedAt: user.therapistVerifiedAt ?? null,
		therapistVerifiedByUserId: user.therapistVerifiedByUserId ?? null,
		role: String(user.role).toLowerCase(),
	} as any;
};

/**
 * Verify therapist credentials
 *
 * Sets isVerified = true and records verification timestamp + admin user ID
 * Prevents re-verification with 409 Conflict
 * Returns updated therapist profile summary
 */
export const verifyTherapist = async (
	therapistProfileId: string,
	adminUserId: string,
): Promise<{
	_id: string;
	displayName: string;
	isVerified: boolean;
	verifiedAt: Date | null;
	verifiedBy: string | null;
	updatedAt: Date;
}> => {
	const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
	if (!admin || admin.role !== 'ADMIN') {
		throw new AppError('Admin user not found', 404);
	}

	const therapistUser = await db.user.findUnique({
		where: { id: therapistProfileId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			role: true,
			updatedAt: true,
			isTherapistVerified: true,
			therapistVerifiedAt: true,
			therapistVerifiedByUserId: true,
		},
	});
	if (!therapistUser || therapistUser.role !== 'THERAPIST') {
		throw new AppError('Therapist profile not found', 404);
	}

	if (therapistUser.isTherapistVerified) {
		return {
			_id: therapistUser.id,
			displayName: `${therapistUser.firstName ?? ''} ${therapistUser.lastName ?? ''}`.trim() || 'Therapist',
			isVerified: true,
			verifiedAt: therapistUser.therapistVerifiedAt ?? null,
			verifiedBy: therapistUser.therapistVerifiedByUserId ?? null,
			updatedAt: therapistUser.updatedAt,
		};
	}

	const updated = await db.user.update({
		where: { id: therapistUser.id },
		data: {
			isTherapistVerified: true,
			therapistVerifiedAt: new Date(),
			therapistVerifiedByUserId: adminUserId,
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			isTherapistVerified: true,
			therapistVerifiedAt: true,
			therapistVerifiedByUserId: true,
			updatedAt: true,
		},
	});

	return {
		_id: updated.id,
		displayName: `${updated.firstName ?? ''} ${updated.lastName ?? ''}`.trim() || 'Therapist',
		isVerified: Boolean(updated.isTherapistVerified),
		verifiedAt: updated.therapistVerifiedAt ?? null,
		verifiedBy: updated.therapistVerifiedByUserId ?? null,
		updatedAt: updated.updatedAt,
	};
};

export const verifyProvider = async (
	providerUserId: string,
	adminUserId: string,
): Promise<{
	_id: string;
	isVerified: boolean;
	verifiedAt: Date | null;
	verifiedBy: string | null;
	updatedAt: Date;
}> => {
	const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
	if (!admin || admin.role !== 'ADMIN') {
		throw new AppError('Admin user not found', 404);
	}

	return db.$transaction(async (tx: any) => {
		const providerUser = await tx.user.findUnique({
			where: { id: providerUserId },
			select: { id: true, role: true },
		});

		if (!providerUser) {
			throw new AppError('Provider not found', 404);
		}

		const role = String(providerUser.role || '').toUpperCase();
		if (!['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'].includes(role)) {
			throw new AppError('Provider not found', 404);
		}

		const profile = await tx.therapistProfile.findUnique({
			where: { userId: providerUser.id },
			select: { id: true, isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
		});

		if (!profile) {
			throw new AppError('Provider profile not found', 404);
		}

		if (profile.isVerified) {
			return {
				_id: providerUser.id,
				isVerified: true,
				verifiedAt: profile.verifiedAt ?? null,
				verifiedBy: profile.verifiedByUserId ?? null,
				updatedAt: profile.updatedAt,
			};
		}

		const now = new Date();

		const updatedProfile = await tx.therapistProfile.update({
			where: { userId: providerUser.id },
			data: {
				isVerified: true,
				verifiedAt: now,
				verifiedByUserId: adminUserId,
			},
			select: { isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
		});

		await tx.user.update({
			where: { id: providerUser.id },
			data: {
				isTherapistVerified: true,
				therapistVerifiedAt: now,
				therapistVerifiedByUserId: adminUserId,
			},
		});

		return {
			_id: providerUser.id,
			isVerified: Boolean(updatedProfile.isVerified),
			verifiedAt: updatedProfile.verifiedAt ?? null,
			verifiedBy: updatedProfile.verifiedByUserId ?? null,
			updatedAt: updatedProfile.updatedAt,
		};
	});
};

/**
 * Approve provider onboarding
 *
 * Sets TherapistProfile.isVerified = true, User.isTherapistVerified = true,
 * and User.onboardingStatus = 'COMPLETED'.
 * Idempotent — returns current state if already approved.
 */
export const approveProvider = async (
	providerUserId: string,
	adminUserId: string,
): Promise<{
	_id: string;
	isVerified: boolean;
	onboardingStatus: string;
	verifiedAt: Date | null;
	verifiedBy: string | null;
	updatedAt: Date;
}> => {
	const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
	if (!admin || admin.role !== 'ADMIN') {
		throw new AppError('Admin user not found', 404);
	}

	return db.$transaction(async (tx: any) => {
		const providerUser = await tx.user.findUnique({
			where: { id: providerUserId },
			select: { id: true, role: true, onboardingStatus: true },
		});

		if (!providerUser) {
			throw new AppError('Provider not found', 404);
		}

		const role = String(providerUser.role || '').toUpperCase();
		if (!['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'].includes(role)) {
			throw new AppError('Provider not found', 404);
		}

		const profile = await tx.therapistProfile.findUnique({
			where: { userId: providerUser.id },
			select: { id: true, isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
		});

		if (!profile) {
			throw new AppError('Provider profile not found. Provider must submit onboarding first.', 404);
		}

		const alreadyCompleted =
			profile.isVerified && String(providerUser.onboardingStatus || '').toUpperCase() === 'COMPLETED';

		if (alreadyCompleted) {
			return {
				_id: providerUser.id,
				isVerified: true,
				onboardingStatus: 'COMPLETED',
				verifiedAt: profile.verifiedAt ?? null,
				verifiedBy: profile.verifiedByUserId ?? null,
				updatedAt: profile.updatedAt,
			};
		}

		const now = new Date();

		const updatedProfile = await tx.therapistProfile.update({
			where: { userId: providerUser.id },
			data: {
				isVerified: true,
				verifiedAt: now,
				verifiedByUserId: adminUserId,
			},
			select: { isVerified: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
		});

		await tx.user.update({
			where: { id: providerUser.id },
			data: {
				isTherapistVerified: true,
				therapistVerifiedAt: now,
				therapistVerifiedByUserId: adminUserId,
				onboardingStatus: 'COMPLETED',
			},
		});

		return {
			_id: providerUser.id,
			isVerified: Boolean(updatedProfile.isVerified),
			onboardingStatus: 'COMPLETED',
			verifiedAt: updatedProfile.verifiedAt ?? null,
			verifiedBy: updatedProfile.verifiedByUserId ?? null,
			updatedAt: updatedProfile.updatedAt,
		};
	});
};

/**
 * Get admin metrics from PostgreSQL via Prisma queries.
 */
export const getMetrics = async (): Promise<{
	totalUsers: number;
	totalTherapists: number;
	verifiedTherapists: number;
	completedSessions: number;
	totalRevenue: number;
	activeSubscriptions: number;
}> => {
	const [
		totalUsersResult,
		totalTherapistsResult,
		verifiedTherapistsResult,
		completedSessionsResult,
		revenueAgg,
		activeSubscriptionsResult,
	] = await Promise.all([
		db.user.count(),
		db.user.count({ where: { role: 'THERAPIST' } }),
		db.user.count({ where: { role: 'THERAPIST', isTherapistVerified: true } }),
		db.therapySession.count({ where: { status: 'COMPLETED' } }),
		db.revenueLedger.aggregate({ _sum: { grossAmountMinor: true } }),
		db.marketplaceSubscription.count({ where: { status: 'ACTIVE' } }),
	]);

	const grossMinor = BigInt(revenueAgg?._sum?.grossAmountMinor ?? 0);
	const totalRevenue = Number(grossMinor) / 100;
	return {
		totalUsers: totalUsersResult,
		totalTherapists: totalTherapistsResult,
		verifiedTherapists: verifiedTherapistsResult,
		completedSessions: completedSessionsResult,
		totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
		activeSubscriptions: activeSubscriptionsResult,
	};
};

/**
 * List active subscriptions with pagination and filtering
 *
 * Query filters:
 * - planType: 'basic' | 'premium' | 'pro' (optional)
 * - status: 'active' | 'expired' | 'cancelled' | 'paused' (optional, defaults to 'active')
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 10, max: 50)
 *
 * Populates user information and returns paginated list with metadata
 */
export interface AdminListSubscriptionsResponse {
	data: Array<{
		_id: string;
		user: {
			id: string;
			name: string | null;
			email: string;
			phone: string | null;
		};
		plan: {
			type: string;
			name: string;
		};
		status: string;
		startDate: Date;
		expiryDate: Date;
		price: number;
		currency: string;
		billingCycle: string;
		autoRenew: boolean;
		createdAt: Date;
	}>;
	meta: PaginationMeta;
}

export const listSubscriptions = async (
	page: number,
	limit: number,
	{
		planType,
		status,
	}: {
		planType?: string;
		status?: string;
	} = {},
): Promise<AdminListSubscriptionsResponse> => {
	const mappedPlan = mapPlanTypeToEnum(planType);
	const mappedStatus = mapSubscriptionStatusToEnum(status) ?? 'ACTIVE';

	const normalized = normalizePagination(
		{ page, limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const [subscriptions, totalItems] = await Promise.all([
		db.marketplaceSubscription.findMany({
			where: {
				status: mappedStatus,
				...(mappedPlan ? { plan: mappedPlan } : {}),
			},
			orderBy: { createdAt: 'desc' },
			skip: normalized.skip,
			take: normalized.limit,
			include: {
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
				invoices: true,
			},
		}),
		db.marketplaceSubscription.count({
			where: {
				status: mappedStatus,
				...(mappedPlan ? { plan: mappedPlan } : {}),
			},
		}),
	]);

	const data = subscriptions.map((sub: any) => {
		const latestInvoice = (sub.invoices ?? [])
			.sort((a: any, b: any) => new Date(b.billedAt).getTime() - new Date(a.billedAt).getTime())[0];

		return {
			_id: sub.id,
		user: {
			id: sub.user.id,
			name: `${sub.user.firstName ?? ''} ${sub.user.lastName ?? ''}`.trim() || null,
			email: sub.user.email,
			phone: null,
		},
		plan: {
			type: String(sub.plan).toLowerCase(),
			name: String(sub.plan),
		},
		status: String(sub.status).toLowerCase(),
		startDate: sub.currentPeriodStart ?? sub.createdAt,
		expiryDate: sub.currentPeriodEnd ?? sub.createdAt,
		price: latestInvoice ? Number(latestInvoice.amountMinor) / 100 : 0,
		currency: latestInvoice?.currency ?? 'INR',
		billingCycle: 'monthly',
		autoRenew: String(sub.status) !== 'CANCELLED',
		createdAt: sub.createdAt,
		};
	});

	return {
		data,
		meta: buildPaginationMeta(totalItems, normalized),
	};
};

/**
 * Get all users pending onboarding approval
 */
export const getUserApprovals = async (): Promise<any[]> => {
	const users = await db.user.findMany({
		where: {
			onboardingStatus: 'PENDING',
			isDeleted: false,
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			phone: true,
			role: true,
			createdAt: true,
			therapistProfile: {
				select: { id: true }
			},
		},
		orderBy: { createdAt: 'desc' },
	});

	if (users.length === 0) return [];

	const userIds = users.map(u => u.id);
	const docs = await db.providerDocument.findMany({
		where: { userId: { in: userIds } }
	});

	return users.map((u: any) => {
		const userDocs = docs.filter(d => d.userId === u.id);
		const documentUrl = userDocs.length > 0 ? userDocs[0].url : null;
		
		return {
			id: u.id,
			fullName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'New User',
			email: u.email,
			phone: u.phone,
			role: String(u.role).toLowerCase(),
			status: 'pending',
			registeredAt: u.createdAt,
			documentUrl: documentUrl,
		};
	});
};

/**
 * Approve or Reject a user's registration
 */
export const updateUserApprovalStatus = async (
	userId: string,
	action: 'approve' | 'reject',
	reason?: string,
): Promise<void> => {
	const status = action === 'approve' ? 'COMPLETED' : 'REJECTED';

	await db.user.update({
		where: { id: userId },
		data: {
			onboardingStatus: status,
			...(action === 'approve' ? { isTherapistVerified: true, therapistVerifiedAt: new Date() } : {}),
		},
	});
	
	// Implementation note: In a real system, we would also send an email/notification here
	// and potentially log the rejection reason.
};

/**
 * List currently active sessions (Live Monitor)
 */
export const listLiveSessions = async (): Promise<any[]> => {
	// Find session IDs with at least one ONLINE participant
	const activePresences = await prisma.sessionPresence.findMany({
		where: { status: 'ONLINE' },
		select: { sessionId: true },
		distinct: ['sessionId'],
	});

	if (activePresences.length === 0) return [];

	const activeSessionIds = activePresences.map((p: any) => p.sessionId);

	const sessions = await db.therapySession.findMany({
		where: {
			id: { in: activeSessionIds },
			status: 'CONFIRMED',
		},
		include: {
			patientProfile: {
				include: {
					user: {
						select: { firstName: true, lastName: true },
					},
				},
			},
			therapistProfile: {
				select: { firstName: true, lastName: true },
			},
		},
	});

	return sessions.map((s: any) => ({
		id: s.id,
		therapistName: `${s.therapistProfile?.firstName ?? ''} ${s.therapistProfile?.lastName ?? ''}`.trim() || 'Therapist',
		patientName: `${s.patientProfile?.user?.firstName ?? ''} ${s.patientProfile?.user?.lastName ?? ''}`.trim() || 'Patient',
		startTime: s.dateTime.toISOString(),
		status: 'in-progress', // Since they have active presence
	}));
};

/**
 * List all user feedback
 */
export const getFeedback = async (): Promise<any[]> => {
	try {
		if (!db.userFeedback) return [];

		const feedback = await db.userFeedback.findMany({
			include: {
				user: {
					select: {
						firstName: true,
						lastName: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		if (!feedback) return [];

		return feedback.map((f: any) => ({
			id: f.id,
			userName: `${f.user?.firstName ?? ''} ${f.user?.lastName ?? ''}`.trim() || 'Anonymous',
			rating: f.rating,
			comment: f.comment,
			sentiment: f.sentiment.toLowerCase(),
			createdAt: f.createdAt.toISOString(),
			resolved: f.resolved,
		}));
	} catch (err: any) {
		// UserFeedback model may not exist yet or table is missing – return empty list
		return [];
	}
};

/**
 * Mark feedback as resolved
 */
export const resolveFeedback = async (feedbackId: string): Promise<void> => {
	const feedback = await db.userFeedback.findUnique({ where: { id: feedbackId } });
	if (!feedback) {
		throw new AppError('Feedback not found', 404);
	}

	await db.userFeedback.update({
		where: { id: feedbackId },
		data: { resolved: true },
	});
};

/**
 * Update user status (Active/Suspended/etc)
 */
export const updateUserStatus = async (userId: string, status: string, _reason?: string): Promise<void> => {
	const normalizedStatus = status.toUpperCase();
	if (!['ACTIVE', 'SUSPENDED', 'DISABLED'].includes(normalizedStatus)) {
		throw new AppError('Invalid status. Must be ACTIVE, SUSPENDED, or DISABLED', 400);
	}

	const user = await db.user.findUnique({ where: { id: userId } });
	if (!user) {
		throw new AppError('User not found', 404);
	}

	await db.user.update({
		where: { id: userId },
		data: { status: normalizedStatus as any },
	});
};

export const updateUsersBulkStatus = async (
	userIds: string[],
	status: string,
	adminUserId: string,
	actorRole?: string,
	reason?: string,
): Promise<{
	requestedCount: number;
	successCount: number;
	failedCount: number;
	failedIds: string[];
	status: string;
	reason?: string;
}> => {
	if (!Array.isArray(userIds) || userIds.length === 0) {
		throw new AppError('userIds must be a non-empty array', 400);
	}

	const dedupedUserIds = Array.from(new Set(userIds));
	if (dedupedUserIds.length > 100) {
		throw new AppError('Bulk limit exceeded. Maximum 100 users per request.', 400);
	}

	const normalizedStatus = status.toUpperCase();
	if (!['ACTIVE', 'SUSPENDED', 'DISABLED'].includes(normalizedStatus)) {
		throw new AppError('Invalid status. Must be ACTIVE, SUSPENDED, or DISABLED', 400);
	}

	const existingUsers = await db.user.findMany({
		where: { id: { in: dedupedUserIds } },
		select: { id: true },
	});

	const existingIds = new Set(existingUsers.map((user: { id: string }) => user.id));
	const failedIds = dedupedUserIds.filter((id) => !existingIds.has(id));
	const targetIds = dedupedUserIds.filter((id) => existingIds.has(id));

	let successCount = 0;
	if (targetIds.length > 0) {
		const updateResult = await db.user.updateMany({
			where: { id: { in: targetIds } },
			data: {
				status: normalizedStatus as any,
			},
		});
		successCount = Number(updateResult.count || 0);
	}

	try {
		if (db.auditLog && adminUserId) {
			await db.auditLog.create({
				data: {
					userId: adminUserId,
					action: 'BULK_USER_STATUS_UPDATE',
					resource: 'User',
					details: {
						policy: 'users.moderate',
						policyVersion: POLICY_VERSION,
						actorRole: actorRole || null,
						status: normalizedStatus,
						reason: reason || null,
						requestedCount: dedupedUserIds.length,
						successCount,
						failedCount: failedIds.length,
						affectedIds: targetIds,
						failedIds,
					},
				},
			});
		}
	} catch {
		// keep bulk operation successful even if audit write fails
	}

	return {
		requestedCount: dedupedUserIds.length,
		successCount,
		failedCount: failedIds.length,
		failedIds,
		status: normalizedStatus,
		reason,
	};
};

/**
 * Get all roles and permissions
 */
export const getRoles = async (): Promise<any[]> => {
	await seedPlatformRoleRecords();
	try {
	return await db.role.findMany({
		orderBy: { name: 'asc' },
	});
	} catch {
		return PLATFORM_ADMIN_ROLES.map((role) => ({
			id: role,
			name: role,
			description: PLATFORM_ADMIN_ROLE_PERMISSIONS[role].join(', '),
			permissions: PLATFORM_ADMIN_ROLE_PERMISSIONS[role],
			createdAt: new Date(0),
			updatedAt: new Date(0),
		}));
	}
};

/**
 * Update permissions for a specific role
 */
export const updateRolePermissions = async (roleName: string, permissions: string[]): Promise<any> => {
	await seedPlatformRoleRecords();
	const role = await db.role.update({
		where: { name: roleName },
		data: { permissions },
	});
	return role;
};

export const getPlatformAdminRoleInventory = async (): Promise<PlatformAdminRoleInventoryItem[]> => {
	await seedPlatformRoleRecords();
	const items: PlatformAdminRoleInventoryItem[] = [];

	for (const role of PLATFORM_ADMIN_ROLES) {
		let userCount = 0;
		let hasRoleRecord = false;

		try {
			userCount = await db.user.count({ where: { role: toPrismaUserRole(role) } });
		} catch {
			userCount = 0;
		}

		try {
			hasRoleRecord = Boolean(await db.role.findUnique({ where: { name: role }, select: { id: true } }));
		} catch {
			hasRoleRecord = false;
		}

		items.push({
			role,
			existsInRbac: roleHierarchy[role] !== undefined,
			hasRoleRecord,
			userCount,
			permissions: PLATFORM_ADMIN_ROLE_PERMISSIONS[role],
		});
	}

	return items;
};

const toRbacRoleName = (value: unknown):
	| 'admin'
	| 'superadmin'
	| 'clinicaldirector'
	| 'financemanager'
	| 'complianceofficer'
	| null => {
	const normalized = String(value || '').toLowerCase().replace(/[_\s-]/g, '');
	if (normalized === 'admin') return 'admin';
	if (normalized === 'superadmin') return 'superadmin';
	if (normalized === 'clinicaldirector') return 'clinicaldirector';
	if (normalized === 'financemanager') return 'financemanager';
	if (normalized === 'complianceofficer') return 'complianceofficer';
	return null;
};

export const getEffectiveAdminPolicies = async (userId: string): Promise<{
	userId: string;
	role: string;
	permissions: string[];
	policyVersion: number;
	allowedPolicies: string[];
	deniedPolicies: string[];
}> => {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true, isDeleted: true },
	});

	if (!user || user.isDeleted) {
		throw new AppError('Admin user not found', 404);
	}

	const role = toRbacRoleName(user.role);
	if (!role) {
		throw new AppError('User is not a platform admin', 403);
	}

	const permissions = await getRolePermissionsForRole(role);
	const allowedPolicies = Object.entries(ADMIN_POLICIES)
		.filter(([, requiredPermissions]) => requiredPermissions.some((perm) => permissions.includes(perm)))
		.map(([policyKey]) => policyKey)
		.sort((a, b) => a.localeCompare(b));

	const deniedPolicies = Object.keys(ADMIN_POLICIES)
		.filter((policyKey) => !allowedPolicies.includes(policyKey))
		.sort((a, b) => a.localeCompare(b));

	return {
		userId,
		role,
		permissions: [...permissions].sort((a, b) => a.localeCompare(b)),
		policyVersion: POLICY_VERSION,
		allowedPolicies,
		deniedPolicies,
	};
};

export const createPlatformAdminAccount = async (
	createdByUserId: string,
	input: CreatePlatformAdminInput,
): Promise<{
	user: {
		id: string;
		email: string | null;
		role: string;
		firstName: string;
		lastName: string;
	};
	temporaryPassword: string;
	isNewAccount: boolean;
}> => {
	const actor = await db.user.findUnique({ where: { id: createdByUserId }, select: { role: true } });
	if (!actor || normalizePlatformAdminRole(String(actor.role || '')) !== 'superadmin') {
		throw new AppError('Superadmin required', 403);
	}

	const email = String(input.email || '').trim().toLowerCase();
	if (!email || !email.includes('@')) {
		throw new AppError('Valid email is required', 400);
	}

	const role = normalizePlatformAdminRole(String(input.role || ''));
	if (!INVITABLE_PLATFORM_ADMIN_ROLES.includes(role as Exclude<PlatformAdminRole, 'superadmin'>)) {
		throw new AppError('Only admin, clinicaldirector, financemanager, or complianceofficer can be created from this endpoint', 400);
	}

	const temporaryPassword = String(input.password || '').trim() || `Admin-${randomBytes(6).toString('hex')}`;
	const passwordHash = await hashPassword(temporaryPassword);
	const firstName = String(input.firstName || '').trim();
	const lastName = String(input.lastName || '').trim();
	const displayName = String(input.name || `${firstName} ${lastName}`.trim() || email.split('@')[0]).trim();

	await seedPlatformRoleRecords();
	await ensureRoleRecord(role);

	const existing = await db.user.findUnique({ where: { email }, select: { id: true, isDeleted: true } });
	if (existing?.isDeleted) {
		throw new AppError('Deleted account cannot be promoted. Restore it first.', 409);
	}

	const baseData = {
		email,
		firstName: firstName || displayName,
		lastName,
		name: displayName,
		role: toPrismaUserRole(role),
		passwordHash,
		emailVerified: true,
		phoneVerified: false,
		provider: 'LOCAL',
		isDeleted: false,
		deletedAt: null,
		status: 'ACTIVE',
		onboardingStatus: 'COMPLETED',
		companyId: null,
		companyKey: null,
		isCompanyAdmin: false,
		permissions: {},
		failedLoginAttempts: 0,
		lockUntil: null,
		mfaEnabled: false,
		mfaSecret: null,
		phone: null,
	};

	const user = existing
		? await db.user.update({
			where: { id: existing.id },
			data: baseData,
			select: { id: true, email: true, role: true, firstName: true, lastName: true },
		})
		: await db.user.create({
			data: baseData,
			select: { id: true, email: true, role: true, firstName: true, lastName: true },
		});

	const inviteLoginUrl = String(process.env.ADMIN_INVITE_LOGIN_URL || `${String(env.frontendUrl || '').replace(/\/$/, '')}/admin-portal/login`).trim();
	await sendPlatformAdminInviteEmail({
		to: email,
		name: displayName,
		role,
		loginUrl: inviteLoginUrl,
		temporaryPassword,
	});

	return {
		user: {
			id: user.id,
			email: user.email,
			role: String(user.role).toLowerCase(),
			firstName: user.firstName,
			lastName: user.lastName,
		},
		temporaryPassword,
		isNewAccount: !existing,
	};
};

export const searchAdminEntities = async (
	q: string,
	limit = 8,
): Promise<{
	users: Array<{ id: string; name: string; email: string; role: string }>;
	payments: Array<{ id: string; status: string; amountMinor: number; currency: string }>;
	sessions: Array<{ id: string; status: string; scheduledAt: string | null }>;
}> => {
	const query = String(q || '').trim();
	if (query.length < 2) {
		return { users: [], payments: [], sessions: [] };
	}

	const safeLimit = Math.max(1, Math.min(limit, 20));

	const [users, payments, sessions] = await Promise.all([
		db.user
			.findMany({
				where: {
					OR: [
						{ email: { contains: query, mode: 'insensitive' } },
						{ firstName: { contains: query, mode: 'insensitive' } },
						{ lastName: { contains: query, mode: 'insensitive' } },
					],
				},
				select: { id: true, firstName: true, lastName: true, email: true, role: true },
				take: safeLimit,
				orderBy: { createdAt: 'desc' },
			})
			.catch(() => []),
		db.financialPayment
			.findMany({
				where: {
					OR: [
						{ id: { contains: query, mode: 'insensitive' } },
						{ merchantTransactionId: { contains: query, mode: 'insensitive' } },
					],
				},
				select: { id: true, status: true, amountMinor: true, currency: true },
				take: safeLimit,
				orderBy: { createdAt: 'desc' },
			})
			.catch(() => []),
		db.therapySession
			.findMany({
				where: {
					OR: [
						{ id: { contains: query, mode: 'insensitive' } },
						{ status: { contains: query, mode: 'insensitive' } },
					],
				},
				select: { id: true, status: true, dateTime: true },
				take: safeLimit,
				orderBy: { dateTime: 'desc' },
			})
			.catch(() => []),
	]);

	return {
		users: users.map((user: any) => ({
			id: user.id,
			name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed User',
			email: user.email,
			role: String(user.role || '').toLowerCase(),
		})),
		payments: payments.map((payment: any) => ({
			id: payment.id,
			status: String(payment.status || 'UNKNOWN'),
			amountMinor: Number(payment.amountMinor || 0),
			currency: String(payment.currency || 'INR'),
		})),
		sessions: sessions.map((session: any) => ({
			id: session.id,
			status: String(session.status || 'UNKNOWN'),
			scheduledAt: session.dateTime ? new Date(session.dateTime).toISOString() : null,
		})),
	};
};
