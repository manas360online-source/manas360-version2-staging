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
import {
	validateOtp,
	validatePassword,
	validatePhone,
	validatePublicSignupRole,
} from '../validators/auth.validator';
import { AppError } from '../middleware/error.middleware';

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

	const requiredString = (value: unknown, field: string): string => {
		const normalized = typeof value === 'string' ? value.trim() : '';
		if (!normalized) {
			throw new AppError(`${field} is required`, 400);
		}
		return normalized;
	};

	const result = await registerProviderProfile(userId, {
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

	const companyRows = (await prisma.$queryRawUnsafe(
		'SELECT company_key, is_company_admin FROM users WHERE id = $1 LIMIT 1',
		user.id,
	)) as Array<{ company_key: string | null; is_company_admin: boolean | null }>;
	const companyMeta = companyRows?.[0] ?? { company_key: null, is_company_admin: false };

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
			companyKey: companyMeta.company_key,
			company_key: companyMeta.company_key,
			isCompanyAdmin: Boolean(companyMeta.is_company_admin),
			is_company_admin: Boolean(companyMeta.is_company_admin),
		},
		'Authenticated user fetched',
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
	}, getRequestMeta(req));

	setAuthCookies(req, res, result.accessToken, result.refreshToken);
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
	sendSuccess(res, { user: result.user, sessionId: result.sessionId }, 'Login successful');
};

export const googleLoginController = async (req: Request, res: Response): Promise<void> => {
	if (typeof req.body.idToken !== 'string' || !req.body.idToken.trim()) {
		throw new AppError('idToken is required', 400);
	}

	const result = await loginWithGoogle({ idToken: req.body.idToken.trim() }, getRequestMeta(req));

	setAuthCookies(req, res, result.accessToken, result.refreshToken);
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
		secure: shouldUseSecureCookies,
		sameSite: cookieSameSite,
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
