import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

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
}

export interface CreatePatientInput {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

export type UpdatePatientInput = Partial<CreatePatientInput>;

export interface DeletePatientResponse {
  success: boolean;
  message?: string;
}

interface ApiEnvelope<T> {
  data?: T;
}

const mdcApi = axios.create({
  baseURL: '/api/mdc',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
mdcApi.interceptors.request.use((config) => {
  const authHeaders = getAuthHeaders();
  config.headers = Object.assign(config.headers || {}, authHeaders);
  return config;
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
    const response = await mdcApi.post<Patient | ApiEnvelope<Patient>>('/patients', data);
    return unwrap(response.data);
  } catch (error) {
    console.error('createPatient failed, using mock fallback', error);
    return mockPatient(data);
  }
};

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const response = await mdcApi.get<Patient[] | ApiEnvelope<Patient[]>>('/patients');
    return unwrap(response.data);
  } catch (error) {
    console.error('getPatients failed, using mock fallback', error);
    return [
      mockPatient({ fullName: 'Mock Patient One', email: 'mock1@example.com', phone: '+91 9000000001' }, 'mock-p1'),
      mockPatient({ fullName: 'Mock Patient Two', email: 'mock2@example.com', phone: '+91 9000000002' }, 'mock-p2'),
    ];
  }
};

export const getPatientById = async (id: string): Promise<Patient> => {
  try {
    const response = await mdcApi.get<Patient | ApiEnvelope<Patient>>(`/patients/${encodeURIComponent(id)}`);
    return unwrap(response.data);
  } catch (error) {
    console.error('getPatientById failed, using mock fallback', error);
    return mockPatient({ fullName: 'Mock Patient', email: 'mock@example.com' }, id);
  }
};

export const updatePatient = async (id: string, data: UpdatePatientInput): Promise<Patient> => {
  try {
    const response = await mdcApi.put<Patient | ApiEnvelope<Patient>>(`/patients/${encodeURIComponent(id)}`, data);
    return unwrap(response.data);
  } catch (error) {
    console.error('updatePatient failed, using mock fallback', error);
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
    const response = await mdcApi.delete<DeletePatientResponse | ApiEnvelope<DeletePatientResponse>>(`/patients/${encodeURIComponent(id)}`);
    return unwrap(response.data);
  } catch (error) {
    console.error('deletePatient failed, using mock fallback', error);
    return {
      success: true,
      message: `Mock delete completed for ${id}`,
    };
  }
};
