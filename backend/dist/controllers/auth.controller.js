"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSessionController = exports.sessionsController = exports.logoutController = exports.mfaVerifyController = exports.mfaSetupController = exports.resetPasswordController = exports.requestPasswordResetController = exports.refreshTokenController = exports.googleLoginController = exports.loginController = exports.verifyPhoneOtpController = exports.signupWithPhoneController = exports.verifyEmailOtpController = exports.signupWithEmailController = exports.meController = exports.providerRegisterController = exports.registerController = void 0;
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const auth_service_1 = require("../services/auth.service");
const response_1 = require("../utils/response");
const auth_validator_1 = require("../validators/auth.validator");
const error_middleware_1 = require("../middleware/error.middleware");
const getRequestMeta = (req) => ({
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    device: req.get('x-device-id') ?? undefined,
});
const resolveCookieDomain = () => {
    const rawDomain = env_1.env.cookieDomain?.trim();
    if (!rawDomain) {
        return undefined;
    }
    const normalized = rawDomain.toLowerCase();
    if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
        return undefined;
    }
    return rawDomain;
};
const configuredCookieDomain = resolveCookieDomain();
const resolveRuntimeCookieDomain = (hostname) => {
    if (configuredCookieDomain) {
        return configuredCookieDomain;
    }
    const host = String(hostname || '').split(':')[0].trim().toLowerCase();
    if (!host) {
        return undefined;
    }
    if (env_1.env.nodeEnv === 'production' || env_1.env.nodeEnv === 'staging') {
        if (host === 'manas360.com' || host.endsWith('.manas360.com')) {
            return '.manas360.com';
        }
    }
    return undefined;
};
const shouldUseSecureCookies = env_1.env.cookieSecure || (env_1.env.nodeEnv !== 'development' && env_1.env.nodeEnv !== 'test');
const cookieSameSite = shouldUseSecureCookies ? 'none' : 'lax';
const buildTokenCookieOptions = (req) => ({
    httpOnly: true,
    secure: shouldUseSecureCookies,
    sameSite: cookieSameSite,
    domain: resolveRuntimeCookieDomain(req.hostname),
    path: '/',
});
const setAuthCookies = (req, res, accessToken, refreshToken) => {
    const tokenCookieOptions = buildTokenCookieOptions(req);
    res.cookie('access_token', accessToken, {
        ...tokenCookieOptions,
        maxAge: 15 * 60 * 1000,
    });
    res.cookie(env_1.env.refreshCookieName, refreshToken, {
        ...tokenCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie(env_1.env.csrfCookieName, (0, crypto_1.randomBytes)(24).toString('hex'), {
        httpOnly: false,
        secure: shouldUseSecureCookies,
        sameSite: cookieSameSite,
        domain: tokenCookieOptions.domain,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};
const registerController = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
        throw new error_middleware_1.AppError('name is required', 400);
    }
    const result = await (0, auth_service_1.registerWithEmail)({
        email: (0, auth_validator_1.validateEmail)(req.body.email),
        password: (0, auth_validator_1.validatePassword)(req.body.password),
        name,
        role: (0, auth_validator_1.validatePublicSignupRole)(req.body.role),
    }, getRequestMeta(req));
    (0, response_1.sendSuccess)(res, result, 'Registration successful', 201);
};
exports.registerController = registerController;
const providerRegisterController = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const requiredString = (value, field) => {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (!normalized) {
            throw new error_middleware_1.AppError(`${field} is required`, 400);
        }
        return normalized;
    };
    const result = await (0, auth_service_1.registerProviderProfile)(userId, {
        displayName: requiredString(req.body.fullName ?? req.body.displayName, 'displayName'),
        registrationType: (typeof req.body.registrationType === 'string'
            ? req.body.registrationType.trim().toUpperCase()
            : typeof req.body.licenseRci === 'string' && req.body.licenseRci.trim()
                ? 'RCI'
                : typeof req.body.licenseNmc === 'string' && req.body.licenseNmc.trim()
                    ? 'NMC'
                    : 'OTHER'),
        registrationNum: requiredString(req.body.registrationNum, 'registrationNum'),
        yearsExperience: Number(req.body.yearsOfExperience ?? req.body.yearsExperience ?? 0),
        highestQual: requiredString(req.body.education ?? req.body.highestQual, 'highestQual'),
        specializations: Array.isArray(req.body.specializations) ? req.body.specializations.map(String) : [],
        languages: Array.isArray(req.body.languages) ? req.body.languages.map(String) : [],
        hourlyRate: Number(req.body.consultationFee ?? req.body.hourlyRate ?? 0),
        bio: typeof req.body.bio === 'string' ? req.body.bio : undefined,
        documents: Array.isArray(req.body.documents)
            ? req.body.documents.map((document) => ({
                documentType: requiredString(document?.documentType, 'documents.documentType'),
                url: requiredString(document?.url, 'documents.url'),
            }))
            : [],
    });
    (0, response_1.sendSuccess)(res, result, 'Provider onboarding submitted', 201);
};
exports.providerRegisterController = providerRegisterController;
const meController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const user = await db_1.prisma.user.findUnique({
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
        throw new error_middleware_1.AppError('User not found', 404);
    }
    const companyRows = (await db_1.prisma.$queryRawUnsafe('SELECT company_key, is_company_admin FROM users WHERE id = $1 LIMIT 1', user.id));
    const companyMeta = companyRows?.[0] ?? { company_key: null, is_company_admin: false };
    (0, response_1.sendSuccess)(res, {
        id: String(user.id),
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        mfaEnabled: user.mfaEnabled,
        isTherapistVerified: Boolean(user.isTherapistVerified),
        therapistVerifiedAt: user.therapistVerifiedAt ?? null,
        onboardingStatus: user.onboardingStatus ?? null,
        providerOnboardingCompleted: Boolean(user.therapistProfile?.onboardingCompleted),
        providerProfileVerified: Boolean(user.therapistProfile?.isVerified),
        companyKey: companyMeta.company_key,
        company_key: companyMeta.company_key,
        isCompanyAdmin: Boolean(companyMeta.is_company_admin),
        is_company_admin: Boolean(companyMeta.is_company_admin),
    }, 'Authenticated user fetched');
};
exports.meController = meController;
const signupWithEmailController = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
        throw new error_middleware_1.AppError('name is required', 400);
    }
    const result = await (0, auth_service_1.registerWithEmail)({
        email: (0, auth_validator_1.validateEmail)(req.body.email),
        password: (0, auth_validator_1.validatePassword)(req.body.password),
        name,
        role: (0, auth_validator_1.validatePublicSignupRole)(req.body.role),
    }, getRequestMeta(req));
    (0, response_1.sendSuccess)(res, result, 'Registration successful', 201);
};
exports.signupWithEmailController = signupWithEmailController;
const verifyEmailOtpController = async (req, res) => {
    await (0, auth_service_1.verifyEmailOtp)({
        email: (0, auth_validator_1.validateEmail)(req.body.email),
        otp: (0, auth_validator_1.validateOtp)(req.body.otp),
    });
    (0, response_1.sendSuccess)(res, null, 'Email verified');
};
exports.verifyEmailOtpController = verifyEmailOtpController;
const signupWithPhoneController = async (req, res) => {
    const result = await (0, auth_service_1.registerWithPhone)({
        phone: (0, auth_validator_1.validatePhone)(req.body.phone),
    });
    (0, response_1.sendSuccess)(res, result, 'Phone OTP sent', 201);
};
exports.signupWithPhoneController = signupWithPhoneController;
const verifyPhoneOtpController = async (req, res) => {
    await (0, auth_service_1.verifyPhoneOtp)({
        phone: (0, auth_validator_1.validatePhone)(req.body.phone),
        otp: (0, auth_validator_1.validateOtp)(req.body.otp),
    });
    (0, response_1.sendSuccess)(res, null, 'Phone verified');
};
exports.verifyPhoneOtpController = verifyPhoneOtpController;
const loginController = async (req, res) => {
    const result = await (0, auth_service_1.loginWithPassword)({
        identifier: String(req.body.identifier ?? '').trim(),
        password: (0, auth_validator_1.validatePassword)(req.body.password),
        mfaCode: req.body.mfaCode ? (0, auth_validator_1.validateOtp)(req.body.mfaCode) : undefined,
    }, getRequestMeta(req));
    setAuthCookies(req, res, result.accessToken, result.refreshToken);
    (0, response_1.sendSuccess)(res, { user: result.user, sessionId: result.sessionId }, 'Login successful');
};
exports.loginController = loginController;
const googleLoginController = async (req, res) => {
    if (typeof req.body.idToken !== 'string' || !req.body.idToken.trim()) {
        throw new error_middleware_1.AppError('idToken is required', 400);
    }
    const result = await (0, auth_service_1.loginWithGoogle)({ idToken: req.body.idToken.trim() }, getRequestMeta(req));
    setAuthCookies(req, res, result.accessToken, result.refreshToken);
    (0, response_1.sendSuccess)(res, { user: result.user, sessionId: result.sessionId }, 'Google login successful');
};
exports.googleLoginController = googleLoginController;
const refreshTokenController = async (req, res) => {
    const refreshToken = req.cookies?.[env_1.env.refreshCookieName];
    if (!refreshToken) {
        throw new error_middleware_1.AppError('Refresh token is required', 401);
    }
    const result = await (0, auth_service_1.refreshAuthTokens)({ refreshToken }, getRequestMeta(req));
    setAuthCookies(req, res, result.accessToken, result.refreshToken);
    (0, response_1.sendSuccess)(res, { sessionId: result.sessionId }, 'Token refreshed');
};
exports.refreshTokenController = refreshTokenController;
const requestPasswordResetController = async (req, res) => {
    const identifier = String(req.body.identifier ?? '').trim();
    if (!identifier) {
        throw new error_middleware_1.AppError('identifier is required', 400);
    }
    const result = await (0, auth_service_1.requestPasswordReset)({ identifier }, getRequestMeta(req));
    (0, response_1.sendSuccess)(res, result, 'Password reset initiated');
};
exports.requestPasswordResetController = requestPasswordResetController;
const resetPasswordController = async (req, res) => {
    const identifier = String(req.body.identifier ?? '').trim();
    if (!identifier) {
        throw new error_middleware_1.AppError('identifier is required', 400);
    }
    await (0, auth_service_1.resetPassword)({
        identifier,
        otp: (0, auth_validator_1.validateOtp)(req.body.otp),
        newPassword: (0, auth_validator_1.validatePassword)(req.body.newPassword),
    }, getRequestMeta(req));
    (0, response_1.sendSuccess)(res, null, 'Password reset successful');
};
exports.resetPasswordController = resetPasswordController;
const mfaSetupController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const result = await (0, auth_service_1.setupMfa)({ userId: req.auth.userId });
    (0, response_1.sendSuccess)(res, result, 'MFA setup initialized');
};
exports.mfaSetupController = mfaSetupController;
const mfaVerifyController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    await (0, auth_service_1.verifyAndEnableMfa)({
        userId: req.auth.userId,
        code: (0, auth_validator_1.validateOtp)(req.body.code),
    });
    (0, response_1.sendSuccess)(res, null, 'MFA enabled');
};
exports.mfaVerifyController = mfaVerifyController;
const logoutController = async (req, res) => {
    if (!req.auth?.userId || !req.auth.sessionId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    await (0, auth_service_1.logoutSession)(req.auth.sessionId, req.auth.userId, getRequestMeta(req));
    const tokenCookieOptions = buildTokenCookieOptions(req);
    res.clearCookie('access_token', tokenCookieOptions);
    res.clearCookie(env_1.env.refreshCookieName, tokenCookieOptions);
    res.clearCookie(env_1.env.csrfCookieName, {
        httpOnly: false,
        secure: shouldUseSecureCookies,
        sameSite: cookieSameSite,
        domain: tokenCookieOptions.domain,
        path: '/',
    });
    (0, response_1.sendSuccess)(res, null, 'Logged out');
};
exports.logoutController = logoutController;
const sessionsController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    const sessions = await (0, auth_service_1.getActiveSessions)(req.auth.userId);
    (0, response_1.sendSuccess)(res, sessions, 'Active sessions fetched');
};
exports.sessionsController = sessionsController;
const revokeSessionController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    await (0, auth_service_1.revokeSession)(req.auth.userId, String(req.params.sessionId));
    (0, response_1.sendSuccess)(res, null, 'Session revoked');
};
exports.revokeSessionController = revokeSessionController;
