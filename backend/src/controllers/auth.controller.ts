import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../config/db';
import {
	getActiveSessions,
	loginWithGoogle,
	loginWithPassword,
	logoutSession,
	refreshAuthTokens,
	registerProviderProfile,
	registerWithPhone,
	requestPasswordReset,
	resetPassword,
	revokeSession,
	setupMfa,
	verifyAndEnableMfa,
	verifyPhoneOtp,
} from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { ADMIN_POLICIES, POLICY_VERSION, getRolePermissionsForRole, type UserRole } from '../middleware/rbac.middleware';
import {
	validateOtp,
	validatePassword,
	validatePhone,
	validatePublicSignupRole,
} from '../validators/auth.validator';
import { AppError } from '../middleware/error.middleware';
import { generateNumericOtp, hashOtp, hashPassword, verifyOtp } from '../utils/hash';
import {
	getActiveLegalDocuments,
	hasAcceptedNriTerms,
	getPendingLegalDocumentsForUser,
	recordUserAcceptances,
} from '../services/legal-compliance.service';

const getRequestMeta = (req: Request) => ({
	ipAddress: req.ip,
	userAgent: req.get('user-agent'),
	device: req.get('x-device-id') ?? undefined,
});

const resolveCookieDomain = (): string | undefined => {
	const rawDomain = env.cookieDomain?.trim();
	if (!rawDomain) {
		return undefined;
	}

	const normalized = rawDomain.toLowerCase();
	if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
		return undefined;
	}

	const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(normalized);
	const isBracketedIpv6 = /^\[[0-9a-f:]+\]$/i.test(normalized);
	const isBareIpv6 = normalized.includes(':') && /^[0-9a-f:]+$/i.test(normalized);
	if (isIpv4 || isBracketedIpv6 || isBareIpv6) {
		return undefined;
	}

	return rawDomain;
};

const configuredCookieDomain = resolveCookieDomain();

const resolveRuntimeCookieDomain = (hostname?: string): string | undefined => {
	if (configuredCookieDomain) {
		return configuredCookieDomain;
	}

	const host = String(hostname || '').split(':')[0].trim().toLowerCase();
	if (!host) {
		return undefined;
	}

	if (env.nodeEnv === 'production' || env.nodeEnv === 'staging') {
		if (host === 'manas360.com' || host.endsWith('.manas360.com')) {
			return '.manas360.com';
		}
	}

	return undefined;
};

const shouldUseSecureCookies = (req: Request): boolean => (
	env.cookieSecure || req.secure || (env.nodeEnv !== 'development' && env.nodeEnv !== 'test')
);

const resolveCookieSameSite = (useSecureCookies: boolean): 'none' | 'lax' => (
	useSecureCookies ? 'none' : 'lax'
);

const buildTokenCookieOptions = (req: Request) => {
	const useSecureCookies = shouldUseSecureCookies(req);

	return {
		httpOnly: true,
		secure: useSecureCookies,
		sameSite: resolveCookieSameSite(useSecureCookies),
		domain: resolveRuntimeCookieDomain(req.hostname),
		path: '/',
	};
};

const setAuthCookies = (req: Request, res: Response, accessToken: string, refreshToken: string): void => {
	const tokenCookieOptions = buildTokenCookieOptions(req);
	res.cookie('access_token', accessToken, {
		...tokenCookieOptions,
		maxAge: 15 * 60 * 1000,
	});

	res.cookie(env.refreshCookieName, refreshToken, {
		...tokenCookieOptions,
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});

	res.cookie(env.csrfCookieName, randomBytes(24).toString('hex'), {
		httpOnly: false,
		secure: tokenCookieOptions.secure,
		sameSite: tokenCookieOptions.sameSite,
		domain: tokenCookieOptions.domain,
		path: '/',
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
};

export const providerRegisterController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.auth?.userId;
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	// Ensure provider has active platform access before allowing onboarding submission
	const platformAccessRecord = await prisma.$queryRawUnsafe(
		`SELECT status, expiry_date FROM platform_access WHERE provider_id = $1 LIMIT 1`,
		userId,
	).catch(() => [] as any[]) as Array<{ status: string; expiry_date: Date | null }>;
	const paRecord = platformAccessRecord?.[0];
	const platformAccessActive = Boolean(
		paRecord
			&& paRecord.status === 'active'
			&& paRecord.expiry_date
			&& new Date(paRecord.expiry_date).getTime() > Date.now(),
	);
	if (!platformAccessActive) {
		throw new AppError('Platform access required. Please complete platform fee payment before onboarding.', 403);
	}

	const requiredString = (value: unknown, field: string): string => {
		const normalized = typeof value === 'string' ? value.trim() : '';
		if (!normalized) {
			throw new AppError(`${field} is required`, 400);
		}
		return normalized;
	};

	const result = await registerProviderProfile(userId, {
		professionalType: (typeof req.body.professionalType === 'string' ? req.body.professionalType.trim().toUpperCase() : undefined) as 'THERAPIST' | 'PSYCHIATRIST' | 'PSYCHOLOGIST' | 'COACH' | undefined,
		displayName: requiredString(req.body.fullName ?? req.body.displayName, 'displayName'),
		registrationType: (typeof req.body.registrationType === 'string'
			? req.body.registrationType.trim().toUpperCase()
			: typeof req.body.licenseRci === 'string' && req.body.licenseRci.trim()
				? 'RCI'
				: typeof req.body.licenseNmc === 'string' && req.body.licenseNmc.trim()
					? 'NMC'
					: 'OTHER') as 'RCI' | 'NMC' | 'STATE_COUNCIL' | 'OTHER',
		registrationNum: requiredString(req.body.registrationNum, 'registrationNum'),
		yearsExperience: Number(req.body.yearsOfExperience ?? req.body.yearsExperience ?? 0),
		highestQual: requiredString(req.body.education ?? req.body.highestQual, 'highestQual'),
		specializations: Array.isArray(req.body.specializations) ? req.body.specializations.map(String) : [],
		languages: Array.isArray(req.body.languages) ? req.body.languages.map(String) : [],
		hourlyRate: Number(req.body.consultationFee ?? req.body.hourlyRate ?? 0),
		bio: typeof req.body.bio === 'string' ? req.body.bio : undefined,
		documents: Array.isArray(req.body.documents)
			? req.body.documents.map((document: Record<string, unknown>) => ({
				documentType: requiredString(document?.documentType, 'documents.documentType') as 'DEGREE' | 'ID_PROOF' | 'LICENSE',
				url: requiredString(document?.url, 'documents.url'),
			}))
			: [],
	});

	sendSuccess(res, result, 'Provider onboarding submitted', 201);
};

export const legacyRegisterController = async (req: Request, res: Response): Promise<void> => {
	const email = String(req.body?.email || '').trim().toLowerCase();
	const password = String(req.body?.password || '');
	const roleRaw = String(req.body?.role || 'patient').trim().toUpperCase();
	const name = String(req.body?.name || '').trim();

	if (!email || !email.includes('@')) throw new AppError('Valid email is required', 422);
	validatePassword(password);
	validatePublicSignupRole(roleRaw.toLowerCase() as any);

	const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
	if (existingUser) throw new AppError('Email already registered', 409);

	const otp = generateNumericOtp();
	const otpHash = await hashOtp(otp);
	const passwordHash = await hashPassword(password);

	const [firstName, ...rest] = name.split(' ').filter(Boolean);
	const lastName = rest.join(' ');

	const user = await prisma.user.create({
		data: {
			email,
			passwordHash,
			role: roleRaw as any,
			provider: 'LOCAL',
			name: name || email.split('@')[0],
			firstName: firstName || '',
			lastName: lastName || '',
			emailVerified: false,
			emailVerificationOtpHash: otpHash,
			emailVerificationOtpExpiresAt: new Date(Date.now() + env.otpTtlMinutes * 60 * 1000),
		},
		select: { id: true, email: true, role: true },
	});

	sendSuccess(res, {
		id: user.id,
		email: user.email,
		role: String(user.role).toLowerCase(),
		devOtp: env.nodeEnv !== 'production' ? otp : undefined,
	}, 'User registered', 201);
};

export const legacyVerifyEmailOtpController = async (req: Request, res: Response): Promise<void> => {
	const email = String(req.body?.email || '').trim().toLowerCase();
	const otp = String(req.body?.otp || '').trim();
	if (!email || !otp) throw new AppError('email and otp are required', 422);

	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			emailVerificationOtpHash: true,
			emailVerificationOtpExpiresAt: true,
		},
	});

	if (!user || !user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
		throw new AppError('Email OTP not found', 400);
	}
	if (user.emailVerificationOtpExpiresAt < new Date()) throw new AppError('OTP expired', 400);

	const validOtp = await verifyOtp(otp, user.emailVerificationOtpHash);
	if (!validOtp) throw new AppError('Invalid OTP', 400);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			emailVerified: true,
			emailVerificationOtpHash: null,
			emailVerificationOtpExpiresAt: null,
		},
	});

	sendSuccess(res, { email, verified: true }, 'Email verified');
};

export const meController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const user = await prisma.user.findUnique({
		where: { id: req.auth.userId },
		select: {
			id: true,
			email: true,
			phone: true,
			role: true,
			firstName: true,
			lastName: true,
			emailVerified: true,
			phoneVerified: true,
			mfaEnabled: true,
			isTherapistVerified: true,
			therapistVerifiedAt: true,
			onboardingStatus: true,
			therapistProfile: {
				select: {
					onboardingCompleted: true,
					isVerified: true,
				},
			},
		},
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	const normalizedRole = String(user.role || '').toLowerCase().replace(/[_\s-]/g, '') as UserRole;
	const rolePermissions = await getRolePermissionsForRole(normalizedRole).catch(() => [] as string[]);

	const companyRows = (await prisma.$queryRawUnsafe(
		'SELECT company_key, is_company_admin FROM users WHERE id = $1 LIMIT 1',
		user.id,
	)) as Array<{ company_key: string | null; is_company_admin: boolean | null }>;
	const companyMeta = companyRows?.[0] ?? { company_key: null, is_company_admin: false };

	// Check platform access status
	const platformAccessRecord = await prisma.$queryRawUnsafe(
		`SELECT status, expiry_date FROM platform_access WHERE provider_id = $1 LIMIT 1`,
		user.id,
	).catch(() => [] as any[]) as Array<{ status: string; expiry_date: Date | null }>;
	const paRecord = platformAccessRecord?.[0];
	const platformAccessActive = Boolean(
		paRecord
			&& paRecord.status === 'active'
			&& paRecord.expiry_date
			&& new Date(paRecord.expiry_date).getTime() > Date.now(),
	);

	// Check patient subscription status
	const patientSubRecord = await prisma.$queryRawUnsafe(
		`SELECT status, plan_name, price FROM patient_subscriptions WHERE user_id = $1 LIMIT 1`,
		user.id,
	).catch(() => [] as any[]) as Array<{ status: string | null; plan_name?: string | null; price?: number | null }>;
	const psRecord = patientSubRecord?.[0];
	const patientSubscriptionActive = Boolean(psRecord && ['active', 'trial', 'grace', 'trialing'].includes(String(psRecord.status || '').toLowerCase()));
	const patientSubscriptionPlan = String(psRecord?.plan_name || 'free');

	// Determine if provider needs to pay the platform fee before onboarding
	let requiresPlatformPayment = false;
	try {
		const providerRoles = new Set(['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH']);
		const roleUpper = String(user.role || '').toUpperCase();
		const onboardingCompleted = Boolean((user as any).therapistProfile?.onboardingCompleted);
		if (providerRoles.has(roleUpper) && !platformAccessActive && !onboardingCompleted) {
			requiresPlatformPayment = true;
		}
	} catch (err) {
		console.error('[ME] Error computing requiresPlatformPayment:', err);
	}

	// Determine if patient needs a subscription to access booking
	let requiresSubscription = false;
	try {
		const roleUpper = String(user.role || '').toUpperCase();
		if (roleUpper === 'PATIENT' && !patientSubscriptionActive) {
			requiresSubscription = true;
		}
	} catch (err) {
		console.error('[ME] Error computing requiresSubscription:', err);
	}

	const legalStatus = await getPendingLegalDocumentsForUser(String(user.id));
	const nriTermsAccepted = await hasAcceptedNriTerms(String(user.id)).catch(() => false);

	sendSuccess(
		res,
		{
			id: String(user.id),
			email: user.email,
			phone: user.phone,
			role: user.role,
			firstName: user.firstName,
			lastName: user.lastName,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			mfaEnabled: user.mfaEnabled,
			isTherapistVerified: Boolean((user as any).isTherapistVerified),
			therapistVerifiedAt: (user as any).therapistVerifiedAt ?? null,
			onboardingStatus: (user as any).onboardingStatus ?? null,
			providerOnboardingCompleted: Boolean((user as any).therapistProfile?.onboardingCompleted),
			providerProfileVerified: Boolean((user as any).therapistProfile?.isVerified),
			requiresPlatformPayment,
			platformAccessActive,
			requiresSubscription,
			patientSubscriptionActive,
			patientSubscriptionPlan,
			companyKey: companyMeta.company_key,
			company_key: companyMeta.company_key,
			isCompanyAdmin: Boolean(companyMeta.is_company_admin),
			is_company_admin: Boolean(companyMeta.is_company_admin),
			permissions: rolePermissions,
			adminPolicies: ADMIN_POLICIES,
			adminPolicyVersion: POLICY_VERSION,
			legalAcceptanceRequired: legalStatus.pendingCount > 0,
			nriTermsAccepted,
			pendingLegalDocuments: legalStatus.pending.map((doc: any) => ({
				id: doc.id,
				type: doc.type,
				version: doc.version,
				title: doc.title,
				publishedAt: doc.publishedAt,
			})),
		},
		'Authenticated user fetched',
	);
};

export const getRequiredLegalDocumentsController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const [activeDocuments, pendingStatus] = await Promise.all([
		getActiveLegalDocuments(),
		getPendingLegalDocumentsForUser(req.auth.userId),
	]);

	sendSuccess(
		res,
		{
			activeDocuments: activeDocuments.map((doc: any) => ({
				id: doc.id,
				type: doc.type,
				version: doc.version,
				title: doc.title,
				content: doc.content,
				publishedAt: doc.publishedAt,
			})),
			pendingDocuments: pendingStatus.pending.map((doc: any) => ({
				id: doc.id,
				type: doc.type,
				version: doc.version,
				title: doc.title,
				content: doc.content,
				publishedAt: doc.publishedAt,
			})),
			legalAcceptanceRequired: pendingStatus.pendingCount > 0,
		},
		'Required legal documents fetched',
	);
};

export const acceptLegalDocumentsController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const documentIds = Array.isArray(req.body?.documentIds)
		? req.body.documentIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
		: [];

	if (documentIds.length === 0) {
		throw new AppError('documentIds must be a non-empty array', 400);
	}

	await recordUserAcceptances({
		userId: req.auth.userId,
		documentIds,
		ipAddress: req.ip,
		userAgent: req.get('user-agent') || undefined,
		source: 'auth_legal_accept',
	});

	const pendingStatus = await getPendingLegalDocumentsForUser(req.auth.userId);

	sendSuccess(
		res,
		{
			legalAcceptanceRequired: pendingStatus.pendingCount > 0,
			pendingDocuments: pendingStatus.pending.map((doc: any) => ({
				id: doc.id,
				type: doc.type,
				version: doc.version,
				title: doc.title,
			})),
		},
		'Legal documents accepted',
	);
};

export const signupWithPhoneController = async (req: Request, res: Response): Promise<void> => {
	const result = await registerWithPhone({
		phone: validatePhone(req.body.phone),
		name: typeof req.body.name === 'string' ? req.body.name.trim() : undefined,
		role: req.body.role ? validatePublicSignupRole(req.body.role) : undefined,
	});

	sendSuccess(res, result, 'Phone OTP sent', 201);
};

export const verifyPhoneOtpController = async (req: Request, res: Response): Promise<void> => {
	const result = await verifyPhoneOtp({
		phone: validatePhone(req.body.phone),
		otp: validateOtp(req.body.otp),
		acceptedTerms: Boolean(req.body.acceptedTerms),
		acceptedDocuments: Array.isArray(req.body.acceptedDocuments)
			? req.body.acceptedDocuments.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
			: undefined,
	}, getRequestMeta(req));

	setAuthCookies(req, res, result.accessToken, result.refreshToken);
	// Augment user payload with subscription flags for immediate client routing
	try {
		if (result?.user?.id) {
			const patientSub = await prisma.$queryRawUnsafe(
				`SELECT status, plan_name FROM patient_subscriptions WHERE user_id = $1 LIMIT 1`,
				result.user.id,
			).catch(() => [] as any[]) as Array<{ status: string | null; plan_name?: string | null }>;
			const ps = patientSub?.[0];
			const isActive = Boolean(ps && ['active', 'trial', 'grace', 'trialing'].includes(String(ps.status || '').toLowerCase()));
			(result.user as any).requiresSubscription = Boolean(result.user.role && String(result.user.role).toUpperCase() === 'PATIENT' && !isActive);
			(result.user as any).patientSubscriptionActive = isActive;
			(result.user as any).patientSubscriptionPlan = String(ps?.plan_name || 'free');
		}
	} catch (err) {
		console.error('[VERIFY-OTP] Failed to augment user subscription flags', err);
	}

	sendSuccess(res, { user: result.user, sessionId: result.sessionId }, 'Phone verified and login successful');
};

export const loginController = async (req: Request, res: Response): Promise<void> => {
	const result = await loginWithPassword(
		{
			identifier: String(req.body.identifier ?? '').trim(),
			password: validatePassword(req.body.password),
			mfaCode: req.body.mfaCode ? validateOtp(req.body.mfaCode) : undefined,
		},
		getRequestMeta(req),
	);

	setAuthCookies(req, res, result.accessToken, result.refreshToken);
	// Augment user payload with subscription flags for immediate client routing
	try {
		if (result?.user?.id) {
			const patientSub = await prisma.$queryRawUnsafe(
				`SELECT status, plan_name FROM patient_subscriptions WHERE user_id = $1 LIMIT 1`,
				result.user.id,
			).catch(() => [] as any[]) as Array<{ status: string | null; plan_name?: string | null }>;
			const ps = patientSub?.[0];
			const isActive = Boolean(ps && ['active', 'trial', 'grace', 'trialing'].includes(String(ps.status || '').toLowerCase()));
			(result.user as any).requiresSubscription = Boolean(result.user.role && String(result.user.role).toUpperCase() === 'PATIENT' && !isActive);
			(result.user as any).patientSubscriptionActive = isActive;
			(result.user as any).patientSubscriptionPlan = String(ps?.plan_name || 'free');
		}
	} catch (err) {
		console.error('[LOGIN] Failed to augment user subscription flags', err);
	}

	sendSuccess(res, { user: result.user, sessionId: result.sessionId }, 'Login successful');
};

export const googleLoginController = async (req: Request, res: Response): Promise<void> => {
	if (typeof req.body.idToken !== 'string' || !req.body.idToken.trim()) {
		throw new AppError('idToken is required', 400);
	}

	const result = await loginWithGoogle({ idToken: req.body.idToken.trim() }, getRequestMeta(req));

	setAuthCookies(req, res, result.accessToken, result.refreshToken);
	// Augment user payload with subscription flags for immediate client routing
	try {
		if (result?.user?.id) {
			const patientSub = await prisma.$queryRawUnsafe(
				`SELECT status, plan_name FROM patient_subscriptions WHERE user_id = $1 LIMIT 1`,
				result.user.id,
			).catch(() => [] as any[]) as Array<{ status: string | null; plan_name?: string | null }>;
			const ps = patientSub?.[0];
			const isActive = Boolean(ps && ['active', 'trial', 'grace', 'trialing'].includes(String(ps.status || '').toLowerCase()));
			(result.user as any).requiresSubscription = Boolean(result.user.role && String(result.user.role).toUpperCase() === 'PATIENT' && !isActive);
			(result.user as any).patientSubscriptionActive = isActive;
			(result.user as any).patientSubscriptionPlan = String(ps?.plan_name || 'free');
		}
	} catch (err) {
		console.error('[GOOGLE-LOGIN] Failed to augment user subscription flags', err);
	}

	sendSuccess(res, { user: result.user, sessionId: result.sessionId }, 'Google login successful');
};

export const refreshTokenController = async (req: Request, res: Response): Promise<void> => {
	const refreshToken = req.cookies?.[env.refreshCookieName] as string | undefined;
	if (!refreshToken) {
		throw new AppError('Refresh token is required', 401);
	}

	const result = await refreshAuthTokens({ refreshToken }, getRequestMeta(req));
	setAuthCookies(req, res, result.accessToken, result.refreshToken);

	sendSuccess(res, { sessionId: result.sessionId }, 'Token refreshed');
};

export const requestPasswordResetController = async (req: Request, res: Response): Promise<void> => {
	const identifier = String(req.body.identifier ?? '').trim();
	if (!identifier) {
		throw new AppError('identifier is required', 400);
	}

	const result = await requestPasswordReset({ identifier }, getRequestMeta(req));
	sendSuccess(res, result, 'Password reset initiated');
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
	const identifier = String(req.body.identifier ?? '').trim();
	if (!identifier) {
		throw new AppError('identifier is required', 400);
	}

	await resetPassword(
		{
			identifier,
			otp: validateOtp(req.body.otp),
			newPassword: validatePassword(req.body.newPassword),
		},
		getRequestMeta(req),
	);

	sendSuccess(res, null, 'Password reset successful');
};

export const mfaSetupController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await setupMfa({ userId: req.auth.userId });
	sendSuccess(res, result, 'MFA setup initialized');
};

export const mfaVerifyController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	await verifyAndEnableMfa({
		userId: req.auth.userId,
		code: validateOtp(req.body.code),
	});

	sendSuccess(res, null, 'MFA enabled');
};

export const logoutController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId || !req.auth.sessionId) {
		throw new AppError('Authentication required', 401);
	}

	await logoutSession(req.auth.sessionId, req.auth.userId, getRequestMeta(req));

	const tokenCookieOptions = buildTokenCookieOptions(req);

	res.clearCookie('access_token', tokenCookieOptions);
	res.clearCookie(env.refreshCookieName, tokenCookieOptions);
	res.clearCookie(env.csrfCookieName, {
		httpOnly: false,
		secure: tokenCookieOptions.secure,
		sameSite: tokenCookieOptions.sameSite,
		domain: tokenCookieOptions.domain,
		path: '/',
	});

	sendSuccess(res, null, 'Logged out');
};

export const sessionsController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const sessions = await getActiveSessions(req.auth.userId);
	sendSuccess(res, sessions, 'Active sessions fetched');
};

export const revokeSessionController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	await revokeSession(req.auth.userId, String(req.params.sessionId));
	sendSuccess(res, null, 'Session revoked');
};
