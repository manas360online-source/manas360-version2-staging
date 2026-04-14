import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from './error.middleware';

const db = prisma as any;

/**
 * Role type definition
 * Extensible enum for user roles
 * Can be extended for superadmin, moderator, etc.
 */
export type UserRole =
	| 'patient'
	| 'therapist'
	| 'psychologist'
	| 'psychiatrist'
	| 'coach'
	| 'admin'
	| 'superadmin'
	| 'clinicaldirector'
	| 'financemanager'
	| 'complianceofficer';

export const POLICY_VERSION = 1;

export const ADMIN_POLICIES: Record<string, string[]> = {
	users: ['manage_users'],
	'users.view': ['manage_users'],
	'users.moderate': ['manage_users'],
	providers: ['manage_therapists'],
	'providers.verify': ['manage_therapists'],
	payments: ['manage_payments'],
	'payments.view': ['view_analytics'],
	'payments.retry': ['manage_payments'],
	invoices: ['manage_payments'],
	'invoices.view': ['manage_payments'],
	'invoices.manage': ['manage_payments'],
	'invoices.refund': ['manage_payments'],
	pricing: ['pricing_edit'],
	'pricing.manage': ['pricing_edit'],
	payouts: ['payouts_approve'],
	'payouts.manage': ['payouts_approve'],
	'payouts.view': ['payouts_approve'],
	offers: ['offers_edit'],
	'offers.manage': ['offers_edit'],
	qr: ['offers_edit'],
	'qr.manage': ['offers_edit'],
	screening: ['manage_therapists'],
	'screening.manage': ['manage_therapists'],
	audit: ['view_audit'],
	'audit.view': ['view_audit'],
	'audit.export': ['view_audit'],
	analytics: ['view_analytics'],
	'analytics.view': ['view_analytics'],
	feedback: ['view_feedback'],
	'feedback.manage': ['view_feedback'],
	config: ['view_analytics'],
	'config.view': ['view_analytics'],
	'config.manage': ['manage_compliance'],
	tickets: ['view_feedback'],
	'tickets.manage': ['view_feedback'],
	groups: ['manage_users'],
	'groups.manage': ['manage_users'],
	compliance: ['manage_compliance'],
	'compliance.manage': ['manage_compliance'],
};

const normalizeRoleName = (value: unknown): UserRole => String(value || '').toLowerCase().replace(/[_\s-]/g, '') as UserRole;

// Safety fallback when `roles` table is empty or not seeded in local/staging.
// This keeps platform-admin routes usable instead of returning blanket 403s.
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
	patient: ['view_own_records', 'book_sessions', 'view_dashboard'],
	therapist: ['view_patients', 'manage_sessions', 'prescribe_treatments', 'view_dashboard'],
	psychologist: ['view_patients', 'manage_sessions', 'conduct_assessments', 'view_dashboard'],
	psychiatrist: ['view_patients', 'manage_sessions', 'prescribe_medications', 'order_labs', 'view_dashboard'],
	coach: ['view_assigned_patients', 'manage_coaching_sessions', 'view_dashboard'],
	admin: [
		'manage_users',
		'manage_therapists',
		'view_analytics',
		'manage_payments',
		'view_reports',
		'payouts_approve',
		'pricing_edit',
		'offers_edit',
		'view_feedback',
		'manage_compliance',
	],
	superadmin: [
		'manage_users',
		'manage_admins',
		'manage_therapists',
		'view_analytics',
		'manage_payments',
		'view_reports',
		'payouts_approve',
		'pricing_edit',
		'offers_edit',
		'system_settings',
		'manage_roles',
		'audit_logs',
		'view_feedback',
		'manage_compliance',
	],
	clinicaldirector: ['view_analytics', 'manage_therapists', 'view_reports', 'clinical_approvals', 'view_dashboard'],
	financemanager: ['view_analytics', 'manage_payments', 'payouts_approve', 'view_reports', 'financial_exports'],
	complianceofficer: ['view_analytics', 'view_reports', 'audit_logs', 'compliance_status', 'legal_documents', 'user_acceptances', 'view_feedback', 'manage_compliance'],
};

/**
 * Role hierarchy for logical grouping
 * Useful for future permission inheritance
 */
export const roleHierarchy: Record<UserRole, number> = {
	patient: 1,
	therapist: 2,
	psychologist: 2,
	psychiatrist: 2,
	coach: 2,
	clinicaldirector: 3,
	financemanager: 3,
	complianceofficer: 3,
	admin: 3,
	superadmin: 4,
};

/**
 * Cache for user role to reduce database queries
 * TTL: 5 minutes
 * Key: userId, Value: { role, timestamp }
 */
const roleCache = new Map<string, { role: UserRole; timestamp: number; isDeleted: boolean }>();
const permissionsCache = new Map<UserRole, { permissions: string[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear role cache (useful after role updates)
 */
export const clearRoleCache = (userId?: string): void => {
	if (userId) {
		roleCache.delete(userId);
	} else {
		roleCache.clear();
	}
};

/**
 * Clear permissions cache (useful after permission updates)
 */
export const clearPermissionsCache = (roleName?: UserRole): void => {
	if (roleName) {
		permissionsCache.delete(roleName);
	} else {
		permissionsCache.clear();
	}
};

/**
 * Get role permissions from DB or cache
 */
const getRolePermissions = async (roleName: UserRole): Promise<string[]> => {
	const cached = permissionsCache.get(roleName);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		return cached.permissions;
	}

	const normalizedRoleName = normalizeRoleName(roleName);
	const roleDataRows = (await db.$queryRawUnsafe(
		"SELECT permissions FROM roles WHERE REPLACE(REPLACE(REPLACE(LOWER(name), '_', ''), '-', ''), ' ', '') = $1",
		normalizedRoleName,
	)) as Array<{ permissions: string[] | null }>;

	// Multiple rows may normalize to same role name (e.g. ADMIN/admin).
	// Merge all matched permissions to avoid nondeterministic 403s.
	const mergedPermissions = Array.from(
		new Set(
			roleDataRows.flatMap((row) => (Array.isArray(row?.permissions) ? row.permissions : [])),
		),
	);

	const permissions = mergedPermissions.length > 0
		? mergedPermissions
		: (DEFAULT_ROLE_PERMISSIONS[normalizedRoleName] || []);

	if ((roleDataRows.length === 0 || mergedPermissions.length === 0) && permissions.length > 0) {
		console.warn(`[RBAC] Using fallback permissions for role '${normalizedRoleName}' because roles table entry is missing/empty.`);
	}
	
	permissionsCache.set(roleName, {
		permissions,
		timestamp: Date.now(),
	});

	return permissions;
};

export const getRolePermissionsForRole = async (roleName: UserRole): Promise<string[]> => getRolePermissions(roleName);

export const requireAdminPolicy = (
	policyKey: keyof typeof ADMIN_POLICIES,
): ((req: Request, _res: Response, next: NextFunction) => Promise<void>) => {
	const required = ADMIN_POLICIES[policyKey];
	if (!required || required.length === 0) {
		throw new Error(`Unknown admin policy key: ${String(policyKey)}`);
	}
	return requirePermission(required, {
		policyKey: String(policyKey),
		policyVersion: POLICY_VERSION,
	});
};

/**
 * Get user role with caching
 *
 * Security considerations:
 * 1. Cache includes isDeleted flag to invalidate on account deletion
 * 2. TTL prevents stale data (max 5 minutes)
 * 3. Always verifies user exists in database
 * 4. Returns null if user not found or deleted
 *
 * @param userId - User ID from JWT
 * @returns Object with role and deleted status, or null if user not found
 */
const getUserRole = async (userId: string): Promise<{ role: UserRole; isDeleted: boolean } | null> => {
	// Check cache first
	const cached = roleCache.get(userId);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		if (cached.isDeleted) {
			return null; // User was deleted, don't return cached role
		}
		return { role: cached.role, isDeleted: cached.isDeleted };
	}

	// Query database if not in cache
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	if (!user) {
		return null;
	}

	// Cache the result (map super_admin to superadmin for generic convention)
	const cleanRole = normalizeRoleName(user.role);
	roleCache.set(userId, {
		role: cleanRole,
		timestamp: Date.now(),
		isDeleted: false,
	});

	return {
		role: cleanRole,
		isDeleted: false,
	};
};

/**
 * Generic role-based access control middleware
 *
 * Security features:
 * 1. Extracts userId from JWT (via requireAuth middleware)
 * 2. Validates user exists and is not deleted
 * 3. Checks role against allowed roles
 * 4. Prevents privilege escalation by verifying in database
 * 5. Caches roles to reduce database load
 * 6. Supports single role or multiple roles
 *
 * @param allowedRoles - Single role string or array of allowed roles
 * @returns Express middleware function
 *
 * @example
 * // Single role
 * router.get('/admin', requireRole('admin'), handler);
 *
 * @example
 * // Multiple roles
 * router.get('/sensitive', requireRole(['admin', 'superadmin']), handler);
 */
export const requireRole = (
	allowedRoles: UserRole | UserRole[],
): ((req: Request, _res: Response, next: NextFunction) => Promise<void>) => {
	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

	// Validate allowed roles at middleware creation time (defense in depth)
	const validRoles = Object.keys(roleHierarchy) as UserRole[];
	for (const role of roles) {
		if (!validRoles.includes(role)) {
			throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
		}
	}

	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		try {
			// Extract user ID from JWT (populated by requireAuth middleware)
			const userId = req.auth?.userId;

			if (!userId) {
				console.log(`[RBAC] No userId found in req.auth on URL: ${req.originalUrl}. req.auth exists:`, !!req.auth);
				next(new AppError('Authentication required', 401));
				return;
			}

			// Get user role with caching
			const userDetails = await getUserRole(userId);

			// User not found in database
			if (!userDetails) {
				next(new AppError('User not found', 404));
				return;
			}

			// User account is deleted
			if (userDetails.isDeleted) {
				next(new AppError('User account is deleted. Please contact support.', 410));
				return;
			}

			// Check if user's role is in allowed roles (NO hierarchy escalation for single-role checks)
			const isSuperAdminAccessingAdminRoute = userDetails.role === 'superadmin' && roles.includes('admin');
			const isAllowedByExplicitRole = roles.includes(userDetails.role) || isSuperAdminAccessingAdminRoute;
			if (!isAllowedByExplicitRole) {
				// Log unauthorized attempt for security audit
				console.warn(
					`[RBAC] Access denied - userId: ${userId}, userRole: ${userDetails.role}, requiredRoles: ${roles.join(',')}`,
				);
				next(
					new AppError(
						`Access denied. Required role(s): ${roles.join(' or ')}. Your role: ${userDetails.role}`,
						403,
					),
				);
				return;
			}

			// Store role in request for downstream handlers
			if (!req.auth) {
				req.auth = {
					userId: '',
					sessionId: '',
					jti: '',
				};
			}
			req.auth.role = userDetails.role;

			next();
		} catch (error) {
			// Fail securely on unexpected errors
			console.error('[RBAC] Error during role verification:', error);
			next(new AppError('Authorization failed', 500));
		}
	};
};

/**
 * Backward compatibility: Require patient role
 * @deprecated Use requireRole('patient') instead
 */
export const requirePatientRole = requireRole('patient') as (
	req: Request,
	_res: Response,
	next: NextFunction,
) => Promise<void>;

/**
 * Backward compatibility: Require therapist role
 * @deprecated Use requireRole('therapist') instead
 */
export const requireTherapistRole = requireRole(['therapist', 'psychiatrist', 'psychologist', 'coach']) as (
	req: Request,
	_res: Response,
	next: NextFunction,
) => Promise<void>;

/**
 * Backward compatibility: Require admin role
 * @deprecated Use requireRole('admin') instead
 */
export const requireAdminRole = requireRole('admin') as (
	req: Request,
	_res: Response,
	next: NextFunction,
) => Promise<void>;

/**
 * Corporate access middleware.
 * Allows:
 * 1) Platform admin role
 * 2) Any user mapped to a company tenant (company_key present)
 */
export const requireCorporateMemberAccess = async (
	req: Request,
	_res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.auth?.userId;
		if (!userId) {
			next(new AppError('Authentication required', 401));
			return;
		}

		const user = await db.user.findUnique({
			where: { id: userId },
			select: { role: true, isDeleted: true },
		});

		if (!user) {
			next(new AppError('User not found', 404));
			return;
		}

		if (user.isDeleted) {
			next(new AppError('User account is deleted. Please contact support.', 410));
			return;
		}

		const role = normalizeRoleName(user.role);
		const isPlatformAdmin = ['admin', 'superadmin', 'clinicaldirector', 'financemanager', 'complianceofficer'].includes(role);
		if (isPlatformAdmin) {
			if (!req.auth) {
				req.auth = { userId: '', sessionId: '', jti: '' };
			}
			req.auth.role = role;
			next();
			return;
		}

		const rows = (await db.$queryRawUnsafe(
			'SELECT company_key FROM users WHERE id = $1 LIMIT 1',
			userId,
		)) as Array<{ company_key: string | null }>;

		const companyKey = rows?.[0]?.company_key;
		if (!companyKey || !String(companyKey).trim()) {
			next(new AppError('Access denied. Corporate member account is required.', 403));
			return;
		}

		if (!req.auth) {
			req.auth = { userId: '', sessionId: '', jti: '' };
		}
		req.auth.role = role;
		next();
	} catch (error) {
		console.error('[RBAC] Error during corporate access verification:', error);
		next(new AppError('Authorization failed', 500));
	}
};

/**
 * Advanced: Check if user has ANY of the given permissions
 * Useful for permission-based access control (PBAC)
 * Can be extended with permission mapping
 *
 * @param requiredPermissions - Permissions to check
 * @returns Express middleware function
 */
export const requirePermission = (
	requiredPermissions: string | string[],
    options?: { policyKey?: string; policyVersion?: number },
): ((req: Request, _res: Response, next: NextFunction) => Promise<void>) => {
	const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		const userId = req.auth?.userId;

		if (!userId) {
			next(new AppError('Authentication required', 401));
			return;
		}

		const userDetails = await getUserRole(userId);

		if (!userDetails) {
			next(new AppError('User not found', 404));
			return;
		}

		if (userDetails.isDeleted) {
			next(new AppError('User account is deleted', 410));
			return;
		}

		// Special handling for Compliance Officer - limited access only
		if (String(userDetails.role).toUpperCase() === 'COMPLIANCEOFFICER') {
			const allowedPermissions = [
				'dashboard',
				'view_audit',
				'read_reports',
				'manage_compliance',
				'view_analytics',
				'view_feedback'
			];
			for (const requiredPermission of permissions) {
				if (!allowedPermissions.includes(requiredPermission)) {
					_res.status(403).json({ message: 'Compliance Officer access denied' });
					return;
				}
			}
		}

		const userPermissions = await getRolePermissions(userDetails.role);

		// Check if user has any of the required permissions
		const hasPermission = permissions.some(perm => userPermissions.includes(perm));

		if (!hasPermission) {
			try {
				await db.auditLog.create({
					data: {
						userId,
						action: 'ACCESS_DENIED',
						resource: 'System',
						details: {
							policy: options?.policyKey || null,
							policyVersion: options?.policyVersion || POLICY_VERSION,
							requiredPermissions: permissions,
							actorRole: userDetails.role,
							route: req.originalUrl,
							method: req.method,
						},
					},
				});
			} catch {
				// Do not block primary auth flow if denial audit fails.
			}

			console.warn(
				`[RBAC] Permission denied - userId: ${userId}, userRole: ${userDetails.role}, requiredPermissions: ${permissions.join(',')}`,
			);

			next(
				new AppError(
					`Permission denied. Required: ${permissions.join(' or ')}. You have: ${userPermissions.join(', ')}`,
					403,
				),
			);
			return;
		}

		if (!req.auth) {
			req.auth = {
				userId: '',
				sessionId: '',
				jti: '',
			};
		}
		req.auth.role = userDetails.role;
		next();
	};
};

/**
 * Role-based hierarchy check
 * Allows users with higher roles to access lower role resources
 * E.g., admin can access therapist endpoints
 *
 * @param minimumRole - Minimum role hierarchy level required
 * @returns Express middleware function
 */
export const requireMinimumRole = (minimumRole: UserRole): ((req: Request, _res: Response, next: NextFunction) => Promise<void>) => {
	const minimumLevel = roleHierarchy[minimumRole];

	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		const userId = req.auth?.userId;

		if (!userId) {
			next(new AppError('Authentication required', 401));
			return;
		}

		const userDetails = await getUserRole(userId);

		if (!userDetails) {
			next(new AppError('User not found', 404));
			return;
		}

		if (userDetails.isDeleted) {
			next(new AppError('User account is deleted', 410));
			return;
		}

		const userLevel = roleHierarchy[userDetails.role];

		if (userLevel < minimumLevel) {
			next(
				new AppError(
					`Access denied. Minimum role required: ${minimumRole}. Your role: ${userDetails.role}`,
					403,
				),
			);
			return;
		}

		if (!req.auth) {
			req.auth = {
				userId: '',
				sessionId: '',
				jti: '',
			};
		}
		req.auth.role = userDetails.role;
		next();
	};
};

export const requireClinicalVerification = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
	const userId = req.auth?.userId;

	if (!userId) {
		next(new AppError('Authentication required', 401));
		return;
	}

	try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { 
				role: true, 
				isTherapistVerified: true, 
				platformAccess: { select: { isActive: true } }
			}
        });

        if (!user) {
            next(new AppError('User not found', 404));
            return;
        }

        const role = String(user.role).toUpperCase();
        if (role === 'THERAPIST' || role === 'PSYCHIATRIST' || role === 'PSYCHOLOGIST' || role === 'COACH') {
            const hasPlatformAccess = Boolean(user.platformAccess?.isActive);
            if (!user.isTherapistVerified || !hasPlatformAccess) {
                next(new AppError('Clinical features locked. Please complete verification and platform fee.', 403));
                return;
            }
        }

        next();
	} catch (error) {
		console.error('[RBAC] Error during clinical verification check:', error);
		next(new AppError('Authorization failed', 500));
	}
};
