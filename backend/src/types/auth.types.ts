export interface RequestMeta {
	ipAddress?: string;
	userAgent?: string;
	device?: string;
}

export type PublicUserRole = 'patient' | 'learner' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach';

export interface RegisterPhoneInput {
	phone: string;
	name?: string;
	role?: PublicUserRole;
}

export interface VerifyPhoneOtpInput {
	phone: string;
	otp: string;
	acceptedTerms?: boolean;
	acceptedDocuments?: string[];
	nri_declared?: boolean;
	nri_tos_accepted?: boolean;
	nri_tos_accepted_at?: string;
}

export interface LoginInput {
	identifier: string;
	password: string;
	mfaCode?: string;
}

export interface GoogleLoginInput {
	idToken: string;
}

export interface RefreshInput {
	refreshToken: string;
}

export interface PasswordResetRequestInput {
	identifier: string;
}

export interface PasswordResetInput {
	identifier: string;
	otp: string;
	newPassword: string;
}

export interface MfaSetupInput {
	userId: string;
}

export interface MfaVerifyInput {
	userId: string;
	code: string;
}

export interface JwtAccessPayload {
	sub: string;
	type: 'access';
	sessionId: string;
	jti: string;
}

export interface JwtRefreshPayload {
	sub: string;
	type: 'refresh';
	sessionId: string;
	jti: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
	refreshJti: string;
	sessionId: string;
}

