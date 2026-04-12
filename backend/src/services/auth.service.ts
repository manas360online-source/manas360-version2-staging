// Role to permissions mapping for JWT
const permissionsMap: Record<string, Record<string, boolean>> = {
	super_admin: { dashboard: true, users_read: true, users_write: true, verifications_approve: true, pricing_edit: true, payouts_approve: true, crisis_respond: true, offers_edit: true, audit_read: true },
	clinical_director: { dashboard: true, users_read: true, verifications_approve: true, crisis_respond: true },
	finance_manager: { dashboard: true, revenue: true, payouts_approve: true, pricing_edit: true },
	therapist: { dashboard: true, own_earnings: true },
	// Add all 11 profiles as needed
	admin: { dashboard: true, users_read: true, users_write: true },
	patient: {},
	psychiatrist: { dashboard: true },
	psychologist: { dashboard: true },
	coach: { dashboard: true },
};
import { randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import {
	hashOpaqueToken,
	hashOtp,
	hashPassword,
	generateNumericOtp,
	verifyOtp,
	verifyPassword,
} from '../utils/hash';
import { createTokenPair, verifyRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { sendPlatformAdminPasswordResetEmail } from './email.service';
import { sendWhatsAppMessage } from './whatsapp.service';
import type { WhatsAppUserType } from './whatsapp.service';
import type {
	GoogleLoginInput,
	LoginInput,
	MfaSetupInput,
	MfaVerifyInput,
	PasswordResetInput,
	PasswordResetRequestInput,
	PublicUserRole,
	RefreshInput,
	RegisterPhoneInput,
	RequestMeta,
	VerifyPhoneOtpInput,
} from '../types/auth.types';

const googleClient = new OAuth2Client(env.googleClientId);
const db = prisma as any;

const nowPlusMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60 * 1000);

const nowPlusDays = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const toPrismaUserRole = (role: PublicUserRole): 'PATIENT' | 'THERAPIST' | 'PSYCHIATRIST' | 'PSYCHOLOGIST' | 'COACH' => {
	if (role === 'patient') return 'PATIENT';
	if (role === 'therapist') return 'THERAPIST';
	if (role === 'psychiatrist') return 'PSYCHIATRIST';
	if (role === 'psychologist') return 'PSYCHOLOGIST';
	return 'COACH';
};

const toWhatsAppUserType = (role: PublicUserRole): WhatsAppUserType => {
	if (role === 'patient') return 'patient';
	if (role === 'therapist') return 'therapist';
	if (role === 'psychiatrist') return 'psychiatrist';
	if (role === 'psychologist') return 'psychologist';
	if (role === 'coach') return 'coach';
	return 'user';
};

let supportedUserRolesCache: Set<string> | null = null;

const getCompanyAdminMeta = async (userId: string) => {
	try {
		const rows = (await db.$queryRawUnsafe(
			'SELECT company_key, is_company_admin FROM users WHERE id = $1 LIMIT 1',
			userId,
		)) as Array<{ company_key: string | null; is_company_admin: boolean | null }>;

		const row = rows?.[0] ?? { company_key: null, is_company_admin: false };
		return {
			companyKey: row.company_key,
			company_key: row.company_key,
			isCompanyAdmin: Boolean(row.is_company_admin),
			is_company_admin: Boolean(row.is_company_admin),
		};
	} catch {
		// Legacy databases may not yet have company columns; auth should continue gracefully.
		return {
			companyKey: null,
			company_key: null,
			isCompanyAdmin: false,
			is_company_admin: false,
		};
	}
};

const isPlatformAdminAccount = async (user: { id: string; role?: string | null }): Promise<boolean> => {
	const role = String(user.role || '').toUpperCase();
	const normalizedRole = role.replace(/[-\s]/g, '_');
	const platformRoles = new Set([
		'ADMIN',
		'SUPERADMIN',
		'SUPER_ADMIN',
		'CLINICALDIRECTOR',
		'CLINICAL_DIRECTOR',
		'FINANCEMANAGER',
		'FINANCE_MANAGER',
		'COMPLIANCEOFFICER',
		'COMPLIANCE_OFFICER',
	]);

	if (!platformRoles.has(normalizedRole) && !platformRoles.has(role.replace(/_/g, ''))) {
		return false;
	}

	const companyMeta = await getCompanyAdminMeta(String(user.id));
	return !companyMeta.company_key && !companyMeta.is_company_admin;
};

const getEmailDomain = (email?: string | null): string | null => {
	if (!email) return null;
	const parts = String(email).toLowerCase().split('@');
	if (parts.length !== 2) return null;
	const domain = parts[1].trim();
	return domain || null;
};

const resolveUserCompanyMeta = async (userId: string, email?: string | null) => {
	const existingMeta = await getCompanyAdminMeta(userId);
	if (existingMeta.company_key) {
		return existingMeta;
	}

	const domain = getEmailDomain(email);
	if (!domain) {
		return existingMeta;
	}

	try {
		const rows = (await db.$queryRawUnsafe(
			`SELECT "companyKey" FROM "companies" WHERE LOWER(COALESCE("domain", '')) = $1 LIMIT 1`,
			domain,
		)) as Array<{ companyKey: string | null }>;

		const companyKey = rows?.[0]?.companyKey;
		if (!companyKey) {
			return existingMeta;
		}

		await db.$executeRawUnsafe(
			'UPDATE users SET company_key = $2, is_company_admin = false WHERE id = $1',
			userId,
			companyKey,
		);

		return {
			companyKey,
			company_key: companyKey,
			isCompanyAdmin: false,
			is_company_admin: false,
		};
	} catch {
		return existingMeta;
	}
};

const ensureDevCorporateTestAccess = async (
	userId: string,
	phone: string | null | undefined,
	meta: { companyKey: string | null; company_key: string | null; isCompanyAdmin: boolean; is_company_admin: boolean },
) => {
	const isDevLikeEnv = env.nodeEnv !== 'production';
	if (!isDevLikeEnv || String(phone || '').trim() !== '+919000000001') {
		return meta;
	}

	const targetCompanyKey = meta.company_key || meta.companyKey || 'CORP-TEST';
	if (!meta.is_company_admin || !meta.company_key) {
		await db.$executeRawUnsafe(
			'UPDATE users SET company_key = COALESCE(company_key, $2), is_company_admin = true WHERE id = $1',
			userId,
			targetCompanyKey,
		);
	}

	return {
		companyKey: targetCompanyKey,
		company_key: targetCompanyKey,
		isCompanyAdmin: true,
		is_company_admin: true,
	};
};

const getSupportedUserRoles = async (): Promise<Set<string>> => {
	if (supportedUserRolesCache) {
		return supportedUserRolesCache;
	}

	try {
		const rows = (await db.$queryRawUnsafe(
			`SELECT e.enumlabel
			 FROM pg_type t
			 JOIN pg_enum e ON t.oid = e.enumtypid
			 WHERE t.typname = 'UserRole'`,
		)) as Array<{ enumlabel: string }>;

		supportedUserRolesCache = new Set((rows ?? []).map((row) => String(row.enumlabel).toUpperCase()));
	} catch {
		supportedUserRolesCache = new Set(['PATIENT', 'THERAPIST', 'ADMIN']);
	}

	return supportedUserRolesCache;
};

const audit = async (
	event: string,
	status: 'success' | 'failure',
	meta: RequestMeta,
	context: Record<string, unknown> = {},
): Promise<void> => {
	try {
		await db.authAuditLog.create({
			data: {
			event,
			status,
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
				...(context.userId ? { userId: String(context.userId) } : {}),
				email: typeof context.email === 'string' ? context.email : null,
				phone: typeof context.phone === 'string' ? context.phone : null,
				metadata: context,
			},
		});
	} catch (error: any) {
		// Auth flows must not fail when audit persistence is unavailable.
		logger.warn('[AuthService] Audit write failed', {
			event,
			status,
			error: error?.message || 'unknown_error',
		});
	}
};

const issueSessionTokens = async (userId: string, meta: RequestMeta) => {
	const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
	const createdSession = await db.authSession.create({
		data: {
			userId,
			jti: randomBytes(24).toString('hex'),
			refreshTokenHash: randomBytes(24).toString('hex'),
			expiresAt: nowPlusDays(7),
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
			device: meta.device,
		},
		select: { id: true },
	});

	// Normalize role to lower case for mapping
	const role = String(user?.role || '').toLowerCase();
	const permissions = permissionsMap[role] || {};

	const tokenPair = createTokenPair(userId, createdSession.id, permissions);
	const refreshTokenHash = hashOpaqueToken(tokenPair.refreshToken);

	await db.authSession.update({
		where: { id: createdSession.id },
		data: {
			jti: tokenPair.refreshJti,
			refreshTokenHash,
		},
	});

	return tokenPair;
};

type ProviderRegisterInput = {
	displayName: string;
	registrationNum: string;
	registrationType?: 'RCI' | 'NMC' | 'STATE_COUNCIL' | 'OTHER';
	yearsExperience: number;
	highestQual: string;
	specializations: string[];
	languages: string[];
	hourlyRate: number;
	bio?: string;
	documents?: Array<{
		documentType: 'DEGREE' | 'ID_PROOF' | 'LICENSE';
		url: string;
	}>;
};

const toProviderDisplayName = (displayName: string): string => {
	const normalized = String(displayName || '').trim();
	return normalized || 'Provider';
};

export const registerProviderProfile = async (userId: string, input: ProviderRegisterInput) => {
	const normalizedRegistrationNum = input.registrationNum.trim().toUpperCase();

	const profile = await db.$transaction(async (tx: any) => {
		const user = await tx.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				role: true,
				firstName: true,
				lastName: true,
				name: true,
				phone: true,
			},
		});

		if (!user) {
			throw new AppError('User not found', 404);
		}

		const userRole = String(user.role || '').toUpperCase();
		const allowedRoles = new Set(['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH']);
		if (!allowedRoles.has(userRole)) {
			throw new AppError('Provider role required', 403);
		}

		const existingProfile = await tx.therapistProfile.findUnique({ where: { userId: user.id } });
		if (existingProfile) {
			throw new AppError('Onboarding already in progress', 400);
		}

		const duplicateRegistration = await tx.therapistProfile.findFirst({
			where: {
				registrationNum: normalizedRegistrationNum,
				isDeleted: false,
			},
			select: { id: true },
		});

		if (duplicateRegistration) {
			throw new AppError('Registration number already exists', 400);
		}

		const displayName = toProviderDisplayName(input.displayName || String(user.name || `${user.firstName || ''} ${user.lastName || ''}`));

		const profile = await tx.therapistProfile.create({
			data: {
				userId: user.id,
				displayName,
				professionalType: userRole,
				registrationType: input.registrationType || 'OTHER',
				registrationNum: normalizedRegistrationNum,
				education: input.highestQual.trim(),
				highestQual: input.highestQual.trim(),
				licenseRci: input.registrationType === 'RCI' ? normalizedRegistrationNum : undefined,
				licenseNmc: input.registrationType === 'NMC' ? normalizedRegistrationNum : undefined,
				clinicalCategories: [],
				specializations: Array.from(new Set((input.specializations || []).map((item) => String(item).trim()).filter(Boolean))),
				languages: Array.from(new Set((input.languages || []).map((item) => String(item).trim()).filter(Boolean))),
				corporateReady: false,
				shiftPreferences: [],
				yearsExperience: Math.max(0, Number(input.yearsExperience || 0)),
				yearsOfExperience: Math.max(0, Number(input.yearsExperience || 0)),
				hourlyRate: Math.max(0, Number(input.hourlyRate || 0)),
				consultationFee: Math.max(0, Number(input.hourlyRate || 0)),
				bio: input.bio?.trim() || undefined,
				onboardingCompleted: false,
				isVerified: false,
				averageRating: 0,
				documents: input.documents?.length
					? {
						create: input.documents.map((document) => ({
							userId: user.id,
							documentType: document.documentType,
							url: String(document.url).trim(),
						})),
					}
					: undefined,
			},
			select: {
				id: true,
				userId: true,
				displayName: true,
				registrationType: true,
				registrationNum: true,
				yearsExperience: true,
				highestQual: true,
				hourlyRate: true,
				isVerified: true,
				documents: {
					select: {
						documentType: true,
						url: true,
					},
				},
				createdAt: true,
			},
		});

		await tx.user.update({
			where: { id: user.id },
			data: {
				onboardingStatus: 'PENDING',
			},
		});

		return { profile, phone: user.phone, role: userRole };
	});

	// Send WhatsApp provider welcome message (non-blocking)
	const userRole = String(profile.role || '').toLowerCase() as PublicUserRole;
	sendWhatsAppMessage({
		phoneNumber: profile.phone,
		templateType: 'provider_welcome',
		userType: toWhatsAppUserType(userRole),
		templateVariables: { displayName: profile.profile.displayName },
		language: 'en',
		flowEvent: 'USER_REGISTERED',
		flowRole: String(profile.role || '').toUpperCase(),
		flowData: {
			userId: String(profile.profile.userId || ''),
			name: String(profile.profile.displayName || ''),
			specialization: Array.isArray((profile.profile as any).specializations)
				? String((profile.profile as any).specializations[0] || '')
				: '',
		},
	}).catch((err) => {
		console.error('[Auth] Failed to send WhatsApp provider welcome message:', err.message);
	});

	return profile.profile;
};

export const registerWithPhone = async (input: RegisterPhoneInput) => {
	const existing = await db.user.findFirst({
		where: { phone: input.phone },
		select: {
			id: true,
			isDeleted: true,
			role: true,
		},
	});
	if (existing?.isDeleted) {
		throw new AppError('Account is deleted. Contact support to restore access.', 410);
	}
	if (existing && (await isPlatformAdminAccount({ id: String(existing.id), role: String(existing.role || '') }))) {
		throw new AppError('Platform admin accounts must login using email and password', 403);
	}

	const otp = generateNumericOtp();
	const otpHash = await hashOtp(otp);
	const role = input.role ? toPrismaUserRole(input.role) : 'PATIENT';
	const trimmedName = String(input.name || '').trim();
	const user = existing
		? await db.user.update({
				where: { id: existing.id },
				data: {
					phoneVerificationOtpHash: otpHash,
					phoneVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
				},
				select: {
					id: true,
					phone: true,
				},
		  })
		: await db.user.create({
				data: {
					phone: input.phone,
					phoneVerificationOtpHash: otpHash,
					phoneVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
					phoneVerified: false,
					emailVerified: true,
					provider: 'PHONE',
					role,
					name: trimmedName || null,
					firstName: trimmedName || '',
					lastName: '',
				},
				select: {
					id: true,
					phone: true,
				},
		  });

	// Send WhatsApp OTP message (non-blocking)
	sendWhatsAppMessage({
		phoneNumber: user.phone,
		templateType: 'user_otp_login',
		userType: 'user',
		templateVariables: { otp },
		language: 'en',
		flowEvent: 'USER_REGISTERED',
		flowRole: String(role || 'PATIENT').toUpperCase(),
		flowData: {
			userId: String(user.id),
			name: trimmedName || 'User',
		},
	}).catch((err) => {
		console.error('[Auth] Failed to send WhatsApp OTP:', err.message);
	});

	return {
		userId: String(user.id),
		phone: user.phone,
		message: 'Phone OTP sent.',
		devOtp: env.nodeEnv !== 'production' ? otp : undefined,
	};
};

export const verifyPhoneOtp = async (input: VerifyPhoneOtpInput, meta: RequestMeta) => {
	const user = await db.user.findFirst({
		where: { phone: input.phone },
		select: {
			id: true,
			email: true,
			phone: true,
			role: true,
			emailVerified: true,
			phoneVerified: true,
			mfaEnabled: true,
			isTherapistVerified: true,
			therapistVerifiedAt: true,
			phoneVerificationOtpHash: true,
			phoneVerificationOtpExpiresAt: true,
		},
	});
	if (!user || !user.phoneVerificationOtpHash || !user.phoneVerificationOtpExpiresAt) {
		throw new AppError('Invalid verification request', 400);
	}
	if (await isPlatformAdminAccount({ id: String(user.id), role: String(user.role || '') })) {
		throw new AppError('Platform admin accounts must login using email and password', 403);
	}

	if (user.phoneVerificationOtpExpiresAt < new Date()) {
		throw new AppError('OTP expired', 400);
	}

	const validOtp = await verifyOtp(input.otp, user.phoneVerificationOtpHash);
	if (!validOtp) {
		throw new AppError('Invalid OTP', 400);
	}

	const isFirstPhoneVerification = !Boolean(user.phoneVerified);
	if (isFirstPhoneVerification && !input.acceptedTerms) {
		throw new AppError('Please accept Terms & Conditions to register', 422);
	}

	await db.user.update({
		where: { id: user.id },
		data: {
			phoneVerified: true,
			phoneVerificationOtpHash: null,
			phoneVerificationOtpExpiresAt: null,
		},
		select: { id: true },
	});

	if (isFirstPhoneVerification && input.acceptedTerms) {
		const defaultConsentTypes = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'INFORMED_CONSENT'];
		const optionalConsentTypes = new Set([
			'THERAPIST_IC_AGREEMENT',
			'THERAPIST_NDA',
			'THERAPIST_DATA_PROCESSING_AGREEMENT',
		]);

		const acceptedFromInput = Array.isArray(input.acceptedDocuments)
			? input.acceptedDocuments
				.map((doc) => String(doc).trim().toUpperCase())
				.filter((doc) => optionalConsentTypes.has(doc))
			: [];

		const consentTypes = Array.from(new Set([...defaultConsentTypes, ...acceptedFromInput]));
		const existing = await db.consent.findMany({
			where: {
				userId: String(user.id),
				status: 'GRANTED',
				consentType: { in: consentTypes },
			},
			select: { consentType: true },
		});

		const existingTypes = new Set<string>(existing.map((entry: { consentType: string }) => entry.consentType));
		const now = new Date();
		const toCreate = consentTypes
			.filter((consentType) => !existingTypes.has(consentType))
			.map((consentType) => ({
				userId: String(user.id),
				consentType,
				purpose: 'REGISTRATION',
				status: 'GRANTED',
				grantedAt: now,
				metadata: {
					source: 'signup_phone_otp',
					ipAddress: meta.ipAddress || null,
					userAgent: meta.userAgent || null,
					version: 1,
				},
			}));

		if (toCreate.length > 0) {
			await db.consent.createMany({ data: toCreate });
		}

		// Send WhatsApp welcome message for first-time users (non-blocking)
		const userRole = String(user.role || '').toLowerCase() as PublicUserRole;
		sendWhatsAppMessage({
			phoneNumber: user.phone,
			templateType: 'user_welcome',
			userType: toWhatsAppUserType(userRole),
			templateVariables: { name: user.email?.split('@')[0] || 'User' },
			language: 'en',
			flowEvent: 'USER_REGISTERED',
			flowRole: String(user.role || '').toUpperCase(),
			flowData: {
				userId: String(user.id),
				name: String(user.email?.split('@')[0] || 'User'),
				email: String(user.email || ''),
			},
		}).catch((err) => {
			console.error('[Auth] Failed to send WhatsApp welcome message:', err.message);
		});
	}

	const tokenPair = await issueSessionTokens(String(user.id), meta);
	const therapistProfile = await db.therapistProfile.findUnique({
		where: { userId: String(user.id) },
		select: { onboardingCompleted: true, isVerified: true },
	});
	const resolvedCompanyMeta = await resolveUserCompanyMeta(String(user.id), user.email);
	const companyAdminMeta = await ensureDevCorporateTestAccess(String(user.id), user.phone, resolvedCompanyMeta);

	await audit('LOGIN_SUCCESS', 'success', meta, { userId: user.id, phone: user.phone });


	// Determine if provider needs to pay the platform fee before onboarding
	let requiresPlatformPayment = false;
	try {
		const providerRoles = new Set(['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH']);
		const roleUpper = String(user.role || '').toUpperCase();
		if (providerRoles.has(roleUpper)) {
			const activeSub = await db.providerSubscription.findFirst({ where: { providerId: String(user.id), status: 'active' } });
			const onboardingCompleted = Boolean((therapistProfile as any)?.onboardingCompleted);
			if (!activeSub && !onboardingCompleted) {
				requiresPlatformPayment = true;
			}
		}
	} catch (err) {
		// Fail closed: if DB check errors, do not block login — just log and continue
		console.error('[AUTH] Error checking provider subscription status:', err);
	}

	return {
		user: {
			id: String(user.id),
			email: user.email,
			phone: user.phone,
			role: user.role,
			emailVerified: user.emailVerified,
			phoneVerified: true,
			mfaEnabled: user.mfaEnabled,
			isTherapistVerified: Boolean((user as any).isTherapistVerified),
			therapistVerifiedAt: (user as any).therapistVerifiedAt ?? null,
			providerOnboardingCompleted: Boolean((therapistProfile as any)?.onboardingCompleted),
			providerProfileVerified: Boolean((therapistProfile as any)?.isVerified),
			requiresPlatformPayment,
			...companyAdminMeta,
		},
		...tokenPair,
	};
};

const resolveUserByIdentifier = async (identifier: string) => {
	if (identifier.includes('@')) {
		return db.user.findUnique({ where: { email: identifier.toLowerCase() } });
	}
	return db.user.findFirst({ where: { phone: identifier } });
};

export const loginWithPassword = async (input: LoginInput, meta: RequestMeta) => {
	const user = await resolveUserByIdentifier(input.identifier);
	if (!user || !user.passwordHash) {
		await audit('LOGIN_FAILED', 'failure', meta, { phone: input.identifier, email: input.identifier });
		throw new AppError('Invalid credentials', 401);
	}

	const isPlatformAdmin = await isPlatformAdminAccount({ id: String(user.id), role: String(user.role || '') });
	const companyMeta = await getCompanyAdminMeta(String(user.id));
	const hasCorporateAccess = Boolean(companyMeta.company_key) || Boolean(companyMeta.is_company_admin);
	if (!isPlatformAdmin && !hasCorporateAccess) {
		await audit('LOGIN_BLOCKED_NON_ADMIN_PASSWORD', 'failure', meta, { userId: user.id, phone: user.phone, email: user.email });
		throw new AppError('Use phone OTP login for this account', 403);
	}
	if (!input.identifier.includes('@')) {
		throw new AppError('Email identifier is required for admin/corporate login', 400);
	}

	if (user.isDeleted) {
		await audit('LOGIN_FAILED', 'failure', meta, { phone: input.identifier, userId: user.id });
		throw new AppError('User account is deleted', 410);
	}

	if (user.lockUntil && user.lockUntil > new Date()) {
		throw new AppError('Account temporarily locked. Try again later.', 423);
	}

	const validPassword = await verifyPassword(input.password, user.passwordHash);
	if (!validPassword) {
		const nextFailedAttempts = (user.failedLoginAttempts ?? 0) + 1;
		const willLock = nextFailedAttempts >= env.maxLoginAttempts;
		await db.user.update({
			where: { id: user.id },
			data: {
				failedLoginAttempts: nextFailedAttempts,
				lockUntil: willLock ? nowPlusMinutes(env.lockoutWindowMinutes) : user.lockUntil,
			},
		});

		if (willLock) {
			await audit('LOCKOUT_TRIGGERED', 'failure', meta, { userId: user.id, phone: user.phone });
		}
		await audit('LOGIN_FAILED', 'failure', meta, { userId: user.id, phone: user.phone });
		throw new AppError('Invalid credentials', 401);
	}

	const shouldEnforcePhoneVerification = !(env.allowDevVerificationBypass && env.nodeEnv === 'development');
	if (shouldEnforcePhoneVerification && user.phone && !user.phoneVerified) {
		await audit('LOGIN_BLOCKED_PHONE_UNVERIFIED', 'failure', meta, { userId: user.id, phone: user.phone });
		throw new AppError('Phone verification required before login', 403);
	}

	if (user.mfaEnabled) {
		if (!input.mfaCode || !user.mfaSecret || !authenticator.check(input.mfaCode, user.mfaSecret)) {
			throw new AppError('Invalid MFA code', 401);
		}
	}

	await db.user.update({
		where: { id: user.id },
		data: {
			failedLoginAttempts: 0,
			lockUntil: null,
			lastLoginAt: new Date(),
		},
	});

	const tokenPair = await issueSessionTokens(String(user.id), meta);
	const therapistProfile = await db.therapistProfile.findUnique({
		where: { userId: String(user.id) },
		select: { onboardingCompleted: true, isVerified: true },
	});
	const resolvedCompanyMeta = await resolveUserCompanyMeta(String(user.id), user.email);
	const companyAdminMeta = await ensureDevCorporateTestAccess(String(user.id), user.phone, resolvedCompanyMeta);
	await audit('LOGIN_SUCCESS', 'success', meta, { userId: user.id, email: user.email, phone: user.phone });

	// Determine if provider needs to pay the platform fee before onboarding
	let requiresPlatformPayment = false;
	try {
		const providerRoles = new Set(['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH']);
		const roleUpper = String(user.role || '').toUpperCase();
		if (providerRoles.has(roleUpper)) {
			const activeSub = await db.providerSubscription.findFirst({ where: { providerId: String(user.id), status: 'active' } });
			const onboardingCompleted = Boolean((therapistProfile as any)?.onboardingCompleted);
			if (!activeSub && !onboardingCompleted) {
				requiresPlatformPayment = true;
			}
		}
	} catch (err) {
		console.error('[AUTH] Error checking provider subscription status:', err);
	}

	return {
		user: {
			id: String(user.id),
			email: user.email,
			phone: user.phone,
			role: user.role,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			mfaEnabled: user.mfaEnabled,
			isTherapistVerified: Boolean((user as any).isTherapistVerified),
			therapistVerifiedAt: (user as any).therapistVerifiedAt ?? null,
			providerOnboardingCompleted: Boolean((therapistProfile as any)?.onboardingCompleted),
			providerProfileVerified: Boolean((therapistProfile as any)?.isVerified),
			requiresPlatformPayment,
			...companyAdminMeta,
		},
		...tokenPair,
	};
};

export const loginWithGoogle = async (input: GoogleLoginInput, meta: RequestMeta) => {
	if (!env.googleClientId) {
		throw new AppError('Google OAuth is not configured', 500);
	}

	const ticket = await googleClient.verifyIdToken({
		idToken: input.idToken,
		audience: env.googleClientId,
	});

	const payload = ticket.getPayload();
	if (!payload?.sub) {
		throw new AppError('Invalid Google token', 401);
	}

	let user = await db.user.findFirst({
		where: {
			OR: [{ googleId: payload.sub }, { email: payload.email?.toLowerCase() ?? undefined }],
		},
	});

	if (user?.isDeleted) {
		throw new AppError('User account is deleted', 410);
	}

	if (!user) {
		user = await db.user.create({
			data: {
				email: payload.email?.toLowerCase() ?? null,
				emailVerified: payload.email_verified ?? false,
				googleId: payload.sub,
				provider: 'GOOGLE',
				role: 'PATIENT',
				firstName: payload.given_name ?? '',
				lastName: payload.family_name ?? '',
				name: payload.name ?? null,
			},
		});
	} else if (!user.googleId) {
		user = await db.user.update({
			where: { id: user.id },
			data: {
				googleId: payload.sub,
				provider: 'GOOGLE',
				emailVerified: payload.email_verified ?? user.emailVerified,
			},
		});
	}

	const tokenPair = await issueSessionTokens(String(user.id), meta);
	const therapistProfile = await db.therapistProfile.findUnique({
		where: { userId: String(user.id) },
		select: { onboardingCompleted: true, isVerified: true },
	});
	const companyAdminMeta = await resolveUserCompanyMeta(String(user.id), user.email);
	await audit('LOGIN_SUCCESS', 'success', meta, { userId: user.id, email: user.email });

	// Determine if provider needs to pay the platform fee before onboarding
	let requiresPlatformPayment = false;
	try {
		const providerRoles = new Set(['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH']);
		const roleUpper = String(user.role || '').toUpperCase();
		if (providerRoles.has(roleUpper)) {
			const activeSub = await db.providerSubscription.findFirst({ where: { providerId: String(user.id), status: 'active' } });
			const onboardingCompleted = Boolean((therapistProfile as any)?.onboardingCompleted);
			if (!activeSub && !onboardingCompleted) {
				requiresPlatformPayment = true;
			}
		}
	} catch (err) {
		console.error('[AUTH] Error checking provider subscription status:', err);
	}

	return {
		user: {
			id: String(user.id),
			email: user.email,
			phone: user.phone,
			role: user.role,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			mfaEnabled: user.mfaEnabled,
			isTherapistVerified: Boolean((user as any).isTherapistVerified),
			therapistVerifiedAt: (user as any).therapistVerifiedAt ?? null,
			providerOnboardingCompleted: Boolean((therapistProfile as any)?.onboardingCompleted),
			providerProfileVerified: Boolean((therapistProfile as any)?.isVerified),
			requiresPlatformPayment,
			...companyAdminMeta,
		},
		...tokenPair,
	};
};

export const refreshAuthTokens = async (input: RefreshInput, meta: RequestMeta) => {
	const payload = verifyRefreshToken(input.refreshToken);
	const refreshTokenHash = hashOpaqueToken(input.refreshToken);

	const session = await db.authSession.findFirst({
		where: {
			id: payload.sessionId,
			jti: payload.jti,
			refreshTokenHash,
			revokedAt: null,
			expiresAt: { gt: new Date() },
		},
	});

	if (!session) {
		throw new AppError('Invalid refresh token', 401);
	}

	await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

	const tokenPair = await issueSessionTokens(payload.sub, meta);
	await audit('TOKEN_REFRESHED', 'success', meta, { userId: payload.sub });

	return tokenPair;
};

export const logoutSession = async (sessionId: string, userId: string, meta: RequestMeta): Promise<void> => {
	await db.authSession.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });

	await audit('LOGOUT', 'success', meta, { userId });
};

export const requestPasswordReset = async (input: PasswordResetRequestInput, meta: RequestMeta) => {
	const user = await resolveUserByIdentifier(input.identifier);

	if (user) {
		// Only platform/admin accounts may perform password reset via email/password flow.
		const isAdmin = await isPlatformAdminAccount({ id: String(user.id), role: String(user.role || '') });
		if (!isAdmin) {
			// Do not generate password-reset OTPs for non-admins (they use phone OTPs).
			await audit('PASSWORD_RESET_REQUEST_IGNORED_NON_ADMIN', 'failure', meta, { userId: user.id, phone: user.phone });
			return { message: 'If the account exists, reset instructions were sent.' };
		}

		const otp = generateNumericOtp();
		await db.user.update({
			where: { id: user.id },
			data: {
				passwordResetOtpHash: await hashOtp(otp),
				passwordResetOtpExpiresAt: nowPlusMinutes(env.resetOtpTtlMinutes),
			},
		});

		await audit('PASSWORD_RESET_REQUESTED', 'success', meta, { userId: user.id, phone: user.phone });

		// Send admin password reset via configured email/Zoho flow if email exists
		try {
			const adminLoginUrl = String(process.env.ADMIN_INVITE_LOGIN_URL || `${String(env.frontendUrl || '').replace(/\/$/, '')}/admin-portal/login`).trim();
			if (user.email) {
				// Fire-and-forget
				void sendPlatformAdminPasswordResetEmail({ to: String(user.email), name: String(user.email), loginUrl: adminLoginUrl, otp });
			}
		} catch (err) {
			logger.warn('[Auth] Failed sending admin password reset email', { error: String(err?.message || err) });
		}

		return {
			message: 'Password reset OTP sent.',
			devOtp: env.nodeEnv !== 'production' ? otp : undefined,
		};
	}

	return { message: 'If the account exists, reset instructions were sent.' };
};

export const resetPassword = async (input: PasswordResetInput, meta: RequestMeta): Promise<void> => {
	const user = await resolveUserByIdentifier(input.identifier);
	if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
		throw new AppError('Invalid reset request', 400);
	}

	// Ensure password reset flow only applies to platform/admin accounts
	if (!(await isPlatformAdminAccount({ id: String(user.id), role: String(user.role || '') }))) {
		throw new AppError('Password reset is only available for platform admin accounts', 403);
	}

	if (user.passwordResetOtpExpiresAt < new Date()) {
		throw new AppError('Reset OTP expired', 400);
	}

	const validOtp = await verifyOtp(input.otp, user.passwordResetOtpHash);
	if (!validOtp) {
		throw new AppError('Invalid OTP', 400);
	}

	await db.user.update({
		where: { id: user.id },
		data: {
			passwordHash: await hashPassword(input.newPassword),
			passwordResetOtpHash: null,
			passwordResetOtpExpiresAt: null,
			passwordChangedAt: new Date(),
		},
	});

	await db.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
	await audit('PASSWORD_RESET_SUCCESS', 'success', meta, { userId: user.id, phone: user.phone });
};

export const setupMfa = async (input: MfaSetupInput) => {
	const user = await db.user.findUnique({ where: { id: input.userId } });
	if (!user) {
		throw new AppError('User not found', 404);
	}

	const secret = authenticator.generateSecret();
	await db.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });

	const otpauthUrl = authenticator.keyuri(user.email ?? user.phone ?? String(user.id), env.mfaIssuer, secret);

	return {
		secret,
		otpauthUrl,
	};
};

export const verifyAndEnableMfa = async (input: MfaVerifyInput): Promise<void> => {
	const user = await db.user.findUnique({ where: { id: input.userId } });
	if (!user || !user.mfaSecret) {
		throw new AppError('MFA setup not initialized', 400);
	}

	if (!authenticator.check(input.code, user.mfaSecret)) {
		throw new AppError('Invalid MFA verification code', 400);
	}

	await db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
};

export const getActiveSessions = async (userId: string) => {
	const sessions = await db.authSession.findMany({
		where: {
			userId,
			revokedAt: null,
			expiresAt: { gt: new Date() },
		},
		orderBy: { createdAt: 'desc' },
	});

	return sessions.map((session) => ({
		id: String(session.id),
		ipAddress: session.ipAddress,
		userAgent: session.userAgent,
		device: session.device,
		createdAt: session.createdAt,
		lastActiveAt: session.lastActiveAt,
	}));
};

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
	const session = await db.authSession.findFirst({ where: { id: sessionId, userId, revokedAt: null } });
	if (!session) {
		throw new AppError('Session not found', 404);
	}

	await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
};
