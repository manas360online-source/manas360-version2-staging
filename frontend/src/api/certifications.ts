import type { AxiosError } from 'axios';
import { http } from '../lib/http';

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

export interface Certification {
	id: string;
	slug: string;
	code: string;
	title: string;
	shortTitle?: string | null;
	subtitle: string;
	level: 'ENTRY' | 'PROFESSIONAL' | 'MASTERY';
	levelBadge: string;
	journeyDescription: string;
	durationLabel: string;
	investmentLabel: string;
	monthlyIncomeLabel?: string | null;
	modulesCount?: number | null;
	deliveryMode?: string | null;
	sessionRateLabel?: string | null;
	outcomeLabel?: string | null;
	prerequisitesLabel: string;
	primaryCtaLabel: string;
	secondaryCtaLabel: string;
	isInvitationOnly: boolean;
	enrollmentOpen: boolean;
	sortOrder: number;
	isActive: boolean;
	metadata?: {
		journeyBadge?: string;
		comparisonDuration?: string;
		detailTitle?: string;
		detailFields?: Array<{ label: string; value: string }>;
		future?: {
			enrollment?: { enabled: boolean };
			eligibilityTracking?: { enabled: boolean };
			certificateGeneration?: { templateKey: string; status: string };
		};
		[key: string]: unknown;
	} | null;
	createdAt: string;
	updatedAt: string;
}

export interface MyCertificationState {
	userId: string;
	certificationStatus: 'NONE' | 'ENROLLED' | 'COMPLETED' | 'VERIFIED' | string;
	certificationCompletedAt: string | null;
	certificationPaymentId: string | null;
	leadBoostScore: number;
	certifications: Array<{
		id: string;
		slug: string;
		code: string;
		title: string;
		level: string;
		isActive: boolean;
	}>;
}

export interface RegisterCertificationEnrollmentPayload {
	certSlug: string;
	paymentPlan?: 'full' | 'installment';
	installmentCount?: number;
	bypassPayment?: boolean;
}

export interface RegisterCertificationEnrollmentResult {
	transactionId: string;
	paymentUrl: string | null;
	userId: string;
	enrollmentMode: 'free' | 'paid' | 'bypassed';
}

export const getCertificationsErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
	const axiosError = error as AxiosError<{ message?: string }>;
	return axiosError.response?.data?.message ?? fallback;
};

export const getCertifications = async (): Promise<{ items: Certification[]; total: number }> => {
	const response = await http.get<ApiEnvelope<{ items: Certification[]; total: number }>>('/v1/certifications');
	return response.data.data;
};

export const getCertificationById = async (id: string): Promise<Certification> => {
	const response = await http.get<ApiEnvelope<Certification>>(`/v1/certifications/${encodeURIComponent(id)}`);
	return response.data.data;
};

export const getMyCertificationState = async (): Promise<MyCertificationState> => {
	const response = await http.get<ApiEnvelope<MyCertificationState>>('/v1/certifications/me');
	return response.data.data;
};

export const registerCertificationEnrollment = async (
	payload: RegisterCertificationEnrollmentPayload,
): Promise<RegisterCertificationEnrollmentResult> => {
	const response = await http.post<ApiEnvelope<RegisterCertificationEnrollmentResult>>('/v1/certifications/register', payload);
	return response.data.data;
};

export const completeCertification = async (certSlug: string): Promise<MyCertificationState> => {
	const response = await http.post<ApiEnvelope<MyCertificationState>>('/v1/certifications/complete', { certSlug });
	return response.data.data;
};

export const payCertificationInstallment = async (enrollmentId: string): Promise<any> => {
	const response = await http.post<ApiEnvelope<any>>('/v1/certifications/pay-installment', { enrollmentId });
	return response.data.data;
};
