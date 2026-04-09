import axios, { AxiosError, type AxiosInstance } from 'axios';
import { API_MDC_BASE } from '../lib/runtimeEnv';
import { getAuthHeaders } from '../utils/authToken';

export interface ClinicSettings {
  autoPurgeEnabled: boolean;
  purgeHours: 24 | 48 | 72;
  [key: string]: unknown;
}

export interface UpdateClinicSettingsInput {
  autoPurgeEnabled: boolean;
  purgeHours: 24 | 48 | 72;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MdcClinicSettingsApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

const clinicSettingsHttp: AxiosInstance = axios.create({
  baseURL: API_MDC_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
clinicSettingsHttp.interceptors.request.use((config) => {
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

const toApiError = (error: unknown): MdcClinicSettingsApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>;
    return {
      message:
        axiosError.response?.data?.message
        || axiosError.response?.data?.error
        || axiosError.message
        || 'Clinic settings request failed',
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unexpected clinic settings error' };
};

export const getClinicSettings = async (): Promise<ClinicSettings> => {
  try {
    const response = await clinicSettingsHttp.get<ClinicSettings | ApiEnvelope<ClinicSettings>>('/api/mdc/clinic/settings');
    return unwrap<ClinicSettings>(response.data);
  } catch (error) {
    console.error('getClinicSettings failed, using mock fallback', toApiError(error));
    return {
      autoPurgeEnabled: false,
      purgeHours: 24,
    };
  }
};

export const updateClinicSettings = async (data: UpdateClinicSettingsInput): Promise<ClinicSettings> => {
  try {
    const response = await clinicSettingsHttp.put<ClinicSettings | ApiEnvelope<ClinicSettings>>('/api/mdc/clinic/settings', data);
    return unwrap<ClinicSettings>(response.data);
  } catch (error) {
    console.error('updateClinicSettings failed, using mock fallback', toApiError(error));
    return {
      autoPurgeEnabled: data.autoPurgeEnabled,
      purgeHours: data.purgeHours,
    };
  }
};
