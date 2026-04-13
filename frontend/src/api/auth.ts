import type { AxiosError } from 'axios';
import { http } from '../lib/http';

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

export interface LegalDocument {
	id: string;
	type: string;
	version: number;
	title: string;
	publishedAt?: string;
}

export interface AuthUser {
	id: string;
	email: string | null;
	phone: string | null;
	role: 'patient' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach' | 'admin' | string;
	companyKey?: string | null;
	company_key?: string | null;
	isCompanyAdmin?: boolean | null;
	is_company_admin?: boolean | null;
	firstName?: string | null;
	lastName?: string | null;
	emailVerified?: boolean;
	phoneVerified?: boolean;
	mfaEnabled?: boolean;
	isTherapistVerified?: boolean;
	therapistVerifiedAt?: string | null;
	onboardingStatus?: 'PENDING' | 'COMPLETED' | 'REJECTED' | string | null;
	providerOnboardingCompleted?: boolean;
	providerProfileVerified?: boolean;
	requiresPlatformPayment?: boolean;
	platformAccessActive?: boolean;
	legalAcceptanceRequired?: boolean;
	nriTermsAccepted?: boolean;
	pendingLegalDocuments?: LegalDocument[];
	permissions?: string[];
	adminPolicies?: Record<string, string[]>;
	adminPolicyVersion?: number;
}

export interface LoginPayload {
	identifier: string;
	password: string;
}

export interface ProviderRegisterPayload {
	professionalType: string;
	fullName: string;
	email: string;
	registrationNum: string;
	yearsOfExperience: number;
	education: string;
	licenseRci?: string;
	licenseNmc?: string;
	clinicalCategories: string[];
	specializations: string[];
	languages: string[];
	certifications?: string[];
	corporateReady: boolean;
	nriSessionEnabled: boolean;
	shiftPreferences: string[];
	consultationFee: number;
	bankDetails: {
		accountName: string;
		accountNumber: string;
		ifsc: string;
		bankName: string;
		upiId?: string;
	};
	tagline: string;
	bio: string;
	digitalSignature: string;
}

export interface SignupConsentPayload {
	acceptedTerms: boolean;
	acceptedDocuments?: string[];
	nri_declared?: boolean;
	nri_tos_accepted?: boolean;
	nri_tos_accepted_at?: string;
}

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
	const axiosError = error as AxiosError<{ message?: string }>;
	return axiosError.response?.data?.message ?? fallback;
};

const normalizePhoneForAuth = (value: string): string => {
	const compactPhone = String(value || '').trim().replace(/[\s()-]/g, '');

	if (/^\d{10}$/.test(compactPhone)) {
		return `+91${compactPhone}`;
	}

	if (/^91\d{10}$/.test(compactPhone)) {
		return `+${compactPhone}`;
	}

	return compactPhone;
};

export const login = async (payload: LoginPayload): Promise<AuthUser> => {
	const response = await http.post<ApiEnvelope<{ user: AuthUser; sessionId: string }>>('/v1/auth/login', payload);
	const loggedInUser = response.data.data.user;

	if (!loggedInUser?.role) {
		try {
			return await me();
		} catch {
			return loggedInUser;
		}
	}

	return loggedInUser;
};

export const providerRegister = async (payload: ProviderRegisterPayload): Promise<void> => {
	await http.post<ApiEnvelope<unknown>>('/v1/provider/onboarding', payload);
};

export const googleLogin = async (idToken: string): Promise<AuthUser> => {
	const response = await http.post<ApiEnvelope<{ user: AuthUser; sessionId: string }>>('/v1/auth/login/google', { idToken });
	return response.data.data.user;
};

export const signupWithPhone = async (
	phone: string,
	profile?: { name?: string; role?: 'patient' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach' },
): Promise<{ userId: string; phone: string; message: string; devOtp?: string }> => {
	const normalizedPhone = normalizePhoneForAuth(phone);
	const response = await http.post<ApiEnvelope<{ userId: string; phone: string; message: string; devOtp?: string }>>('/v1/auth/signup/phone', {
		phone: normalizedPhone,
		...(profile || {}),
	});
	return response.data.data;
};

export const verifyPhoneSignupOtp = async (
	phone: string,
	otp: string,
	consent?: SignupConsentPayload,
): Promise<{ user: AuthUser; sessionId: string }> => {
	const normalizedPhone = normalizePhoneForAuth(phone);
	const response = await http.post<ApiEnvelope<{ user: AuthUser; sessionId: string }>>('/v1/auth/verify/phone-otp', {
		phone: normalizedPhone,
		otp,
		...(consent || {}),
	});
	return response.data.data;
};

export const me = async (): Promise<AuthUser> => {
	const response = await http.get<ApiEnvelope<AuthUser>>('/v1/auth/me');
	return response.data.data;
};

export const getRequiredLegalDocuments = async (): Promise<{
	legalAcceptanceRequired: boolean;
	pendingDocuments: LegalDocument[];
}> => {
	const response = await http.get<ApiEnvelope<{
		legalAcceptanceRequired: boolean;
		pendingDocuments: LegalDocument[];
	}>>('/v1/auth/legal/required');

	return response.data.data;
};

export const acceptLegalDocuments = async (documentIds: string[]): Promise<{
	legalAcceptanceRequired: boolean;
	pendingDocuments: LegalDocument[];
}> => {
	const response = await http.post<ApiEnvelope<{
		legalAcceptanceRequired: boolean;
		pendingDocuments: LegalDocument[];
	}>>('/v1/auth/legal/accept', {
		documentIds,
	});

	return response.data.data;
};

const getCookieValue = (cookieName: string): string | null => {
	const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
};

export const logout = async (): Promise<void> => {
	const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token';
	const csrfToken = getCookieValue(csrfCookieName);

	await http.post('/v1/auth/logout', {}, {
		headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
	});
};
