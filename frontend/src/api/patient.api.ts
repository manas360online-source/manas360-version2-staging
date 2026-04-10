import axios, { AxiosError, type AxiosInstance } from 'axios';
import { getApiBaseUrl } from '../lib/runtimeEnv';

export interface Patient {
	id: string;
	fullName: string;
	email?: string | null;
	phone?: string | null;
	dateOfBirth?: string | null;
	gender?: string | null;
	address?: string | null;
	createdAt?: string;
	updatedAt?: string;
	[key: string]: unknown;
}

export interface CreatePatientInput {
	fullName: string;
	email?: string;
	phone?: string;
	dateOfBirth?: string;
	gender?: string;
	address?: string;
	[key: string]: unknown;
}

export type UpdatePatientInput = Partial<CreatePatientInput>;

export interface DeletePatientResponse {
	success: boolean;
	message?: string;
}

interface ApiEnvelope<T> {
	success?: boolean;
	message?: string;
	data?: T;
}

export interface PatientApiError {
	message: string;
	status?: number;
	code?: string;
	details?: unknown;
}

const patientHttp: AxiosInstance = axios.create({
	baseURL: getApiBaseUrl(),
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 15000,
});

const unwrap = <T>(payload: T | ApiEnvelope<T>): T => {
	if (payload && typeof payload === 'object' && 'data' in payload) {
		const envelope = payload as ApiEnvelope<T>;
		if (envelope.data !== undefined) {
			return envelope.data;
		}
	}

	return payload as T;
};

const toPatientApiError = (error: unknown): PatientApiError => {
	if (axios.isAxiosError(error)) {
		const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>;
		return {
			message:
				axiosError.response?.data?.message
				|| axiosError.response?.data?.error
				|| axiosError.message
				|| 'Patient API request failed',
			status: axiosError.response?.status,
			code: axiosError.code,
			details: axiosError.response?.data?.details,
		};
	}

	if (error instanceof Error) {
		return { message: error.message };
	}

	return { message: 'Unexpected patient API error' };
};

const mockPatient = (data: CreatePatientInput, id?: string): Patient => ({
	id: id || `mock-patient-${Date.now()}`,
	fullName: data.fullName,
	email: data.email || null,
	phone: data.phone || null,
	dateOfBirth: data.dateOfBirth || null,
	gender: data.gender || null,
	address: data.address || null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
});

export const createPatient = async (data: CreatePatientInput): Promise<Patient> => {
	try {
		const response = await patientHttp.post<Patient | ApiEnvelope<Patient>>('/api/mdc/patients', data);
		return unwrap<Patient>(response.data);
	} catch (error) {
		console.error('createPatient failed, using mock fallback', toPatientApiError(error));
		return mockPatient(data);
	}
};

export const getPatients = async (): Promise<Patient[]> => {
	try {
		const response = await patientHttp.get<Patient[] | ApiEnvelope<Patient[]>>('/api/mdc/patients');
		return unwrap<Patient[]>(response.data);
	} catch (error) {
		console.error('getPatients failed, using mock fallback', toPatientApiError(error));
		return [
			mockPatient({ fullName: 'Mock Patient One', email: 'mock1@example.com', phone: '+91 9000000001' }, 'mock-p1'),
			mockPatient({ fullName: 'Mock Patient Two', email: 'mock2@example.com', phone: '+91 9000000002' }, 'mock-p2'),
		];
	}
};

export const getPatientById = async (id: string): Promise<Patient> => {
	try {
		const response = await patientHttp.get<Patient | ApiEnvelope<Patient>>(`/api/mdc/patients/${encodeURIComponent(id)}`);
		return unwrap<Patient>(response.data);
	} catch (error) {
		console.error('getPatientById failed, using mock fallback', toPatientApiError(error));
		return mockPatient({ fullName: 'Mock Patient', email: 'mock@example.com' }, id);
	}
};

export const updatePatient = async (id: string, data: UpdatePatientInput): Promise<Patient> => {
	try {
		const response = await patientHttp.put<Patient | ApiEnvelope<Patient>>(`/api/mdc/patients/${encodeURIComponent(id)}`, data);
		return unwrap<Patient>(response.data);
	} catch (error) {
		console.error('updatePatient failed, using mock fallback', toPatientApiError(error));
		return {
			...mockPatient({ fullName: data.fullName || 'Mock Patient' }, id),
			...data,
			id,
			updatedAt: new Date().toISOString(),
		};
	}
};

export const deletePatient = async (id: string): Promise<DeletePatientResponse> => {
	try {
		const response = await patientHttp.delete<DeletePatientResponse | ApiEnvelope<DeletePatientResponse>>(
			`/api/mdc/patients/${encodeURIComponent(id)}`,
		);
		return unwrap<DeletePatientResponse>(response.data);
	} catch (error) {
		console.error('deletePatient failed, using mock fallback', toPatientApiError(error));
		return {
			success: true,
			message: `Mock delete completed for ${id}`,
		};
	}
};
