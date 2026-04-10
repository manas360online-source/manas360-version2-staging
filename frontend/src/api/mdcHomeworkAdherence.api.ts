import axios, { AxiosError, type AxiosInstance } from 'axios';
import { API_MDC_BASE } from '../lib/runtimeEnv';
import { getAuthHeaders } from '../utils/authToken';

export type HomeworkStatus = 'assigned' | 'completed' | 'skipped';

export interface HomeworkAdherenceItem {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: HomeworkStatus | string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MdcHomeworkAdherenceApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

const adherenceHttp: AxiosInstance = axios.create({
  baseURL: API_MDC_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
adherenceHttp.interceptors.request.use((config) => {
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

const toApiError = (error: unknown): MdcHomeworkAdherenceApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>;
    return {
      message:
        axiosError.response?.data?.message
        || axiosError.response?.data?.error
        || axiosError.message
        || 'Homework adherence request failed',
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unexpected homework adherence error' };
};

const normalizeStatus = (status: string): HomeworkStatus => {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized === 'skipped') return 'skipped';
  return 'assigned';
};

export const getHomework = async (patientId: string): Promise<HomeworkAdherenceItem[]> => {
  try {
    const response = await adherenceHttp.get<HomeworkAdherenceItem[] | ApiEnvelope<HomeworkAdherenceItem[]>>(
      `/api/mdc/patients/${encodeURIComponent(patientId)}/homework`,
    );

    const items = unwrap<HomeworkAdherenceItem[]>(response.data);
    return items.map((item) => ({ ...item, status: normalizeStatus(String(item.status || 'assigned')) }));
  } catch (error) {
    console.error('getHomework adherence failed, using mock fallback', toApiError(error));
    return [
      {
        id: `mock-homework-${Date.now()}-1`,
        patientId,
        title: 'Daily breathing exercise',
        description: '10 minutes every morning',
        dueDate: new Date().toISOString(),
        status: 'assigned',
      },
    ];
  }
};

export const updateHomeworkStatus = async (id: string, status: HomeworkStatus): Promise<HomeworkAdherenceItem> => {
  try {
    const response = await adherenceHttp.put<HomeworkAdherenceItem | ApiEnvelope<HomeworkAdherenceItem>>(
      `/api/mdc/homework/${encodeURIComponent(id)}`,
      { status },
    );

    const item = unwrap<HomeworkAdherenceItem>(response.data);
    return {
      ...item,
      status: normalizeStatus(String(item.status || status)),
    };
  } catch (error) {
    console.error('updateHomeworkStatus failed, using mock fallback', toApiError(error));
    return {
      id,
      patientId: 'mock-p1',
      title: 'Mock homework',
      description: '',
      dueDate: new Date().toISOString(),
      status,
      updatedAt: new Date().toISOString(),
    };
  }
};
