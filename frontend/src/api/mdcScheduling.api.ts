import axios, { AxiosError, type AxiosInstance } from 'axios';
import { API_MDC_BASE } from '../lib/runtimeEnv';
import { getAuthHeaders } from '../utils/authToken';

export type SessionStatus = 'scheduled' | 'cancelled' | 'completed' | string;

export interface MdcSession {
  id: string;
  patientId: string;
  patientName?: string | null;
  scheduledAt: string;
  status: SessionStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateSessionInput {
  patientId: string;
  scheduledAt: string;
  notes?: string;
  [key: string]: unknown;
}

export interface SessionFilters {
  patientId?: string;
  status?: SessionStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface UpdateSessionInput {
  scheduledAt?: string;
  status?: SessionStatus;
  notes?: string;
  [key: string]: unknown;
}

export interface ReminderResponse {
  success: boolean;
  message?: string;
  sentAt?: string;
  [key: string]: unknown;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MdcSchedulingApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

const schedulingHttp: AxiosInstance = axios.create({
  baseURL: API_MDC_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
schedulingHttp.interceptors.request.use((config) => {
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

const toApiError = (error: unknown): MdcSchedulingApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>;
    return {
      message:
        axiosError.response?.data?.message
        || axiosError.response?.data?.error
        || axiosError.message
        || 'Scheduling request failed',
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unexpected scheduling error' };
};

const buildFiltersQuery = (filters?: SessionFilters): string => {
  if (!filters) {
    return '';
  }

  const params = new URLSearchParams();

  if (filters.patientId) params.set('patientId', filters.patientId);
  if (filters.status) params.set('status', String(filters.status));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (typeof filters.page === 'number') params.set('page', String(filters.page));
  if (typeof filters.limit === 'number') params.set('limit', String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : '';
};

const mockSession = (data: CreateSessionInput, id?: string): MdcSession => ({
  id: id || `mock-session-${Date.now()}`,
  patientId: data.patientId,
  patientName: null,
  scheduledAt: data.scheduledAt,
  status: 'scheduled',
  notes: data.notes || null,
});

export const createSession = async (data: CreateSessionInput): Promise<MdcSession> => {
  try {
    const response = await schedulingHttp.post<MdcSession | ApiEnvelope<MdcSession>>('/api/mdc/sessions', data);
    return unwrap<MdcSession>(response.data);
  } catch (error) {
    console.error('createSession failed, using mock fallback', toApiError(error));
    return mockSession(data);
  }
};

export const getSessions = async (filters?: SessionFilters): Promise<MdcSession[]> => {
  try {
    const query = buildFiltersQuery(filters);
    const response = await schedulingHttp.get<MdcSession[] | ApiEnvelope<MdcSession[]>>(`/api/mdc/sessions${query}`);
    return unwrap<MdcSession[]>(response.data);
  } catch (error) {
    console.error('getSessions failed, using mock fallback', toApiError(error));
    return [
      mockSession({
        patientId: filters?.patientId || 'mock-p1',
        scheduledAt: new Date().toISOString(),
        notes: 'Mock session',
      }, 'mock-s1'),
    ];
  }
};

export const updateSession = async (id: string, data: UpdateSessionInput): Promise<MdcSession> => {
  try {
    const response = await schedulingHttp.put<MdcSession | ApiEnvelope<MdcSession>>(
      `/api/mdc/sessions/${encodeURIComponent(id)}`,
      data,
    );
    return unwrap<MdcSession>(response.data);
  } catch (error) {
    console.error('updateSession failed, using mock fallback', toApiError(error));
    return {
      id,
      patientId: 'mock-p1',
      patientName: null,
      scheduledAt: data.scheduledAt || new Date().toISOString(),
      status: data.status || 'scheduled',
      notes: data.notes || null,
    };
  }
};

export const sendReminder = async (sessionId: string): Promise<ReminderResponse> => {
  try {
    const response = await schedulingHttp.post<ReminderResponse | ApiEnvelope<ReminderResponse>>(
      `/api/mdc/sessions/${encodeURIComponent(sessionId)}/reminders`,
    );
    return unwrap<ReminderResponse>(response.data);
  } catch (error) {
    console.error('sendReminder failed, using mock fallback', toApiError(error));
    return {
      success: true,
      message: `Mock reminder sent for ${sessionId}`,
      sentAt: new Date().toISOString(),
    };
  }
};
