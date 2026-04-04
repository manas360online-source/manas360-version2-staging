import type { AxiosError } from 'axios';
import { http } from '../lib/http';

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

export interface LandingMetric {
	key: string;
	label: string;
	value: number;
	displayValue: string;
}

export interface LandingMetricsResponse {
	metrics: LandingMetric[];
	updatedAt: string;
}

export const getLandingMetricsErrorMessage = (error: unknown, fallback = 'Unable to load metrics'): string => {
	const axiosError = error as AxiosError<{ message?: string }>;
	return axiosError.response?.data?.message ?? fallback;
};

export const getLandingMetrics = async (): Promise<LandingMetricsResponse> => {
	const response = await http.get<ApiEnvelope<LandingMetricsResponse>>('/v1/landing/metrics');
	return response.data.data;
};
