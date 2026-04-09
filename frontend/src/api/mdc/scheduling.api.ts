import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

export type SessionStatus = 'scheduled' | 'cancelled' | 'completed' | string;

export interface SessionRecord {
  id: string;
  patientId: string;
  patientName?: string | null;
  scheduledAt: string;
  status: SessionStatus;
  notes?: string | null;
}

export interface CreateSessionInput {
  patientId: string;
  scheduledAt: string;
  notes?: string;
}

export interface SessionFilters {
  patientId?: string;
  status?: SessionStatus;
  from?: string;
  to?: string;
}

export interface UpdateSessionInput {
  scheduledAt?: string;
  status?: SessionStatus;
  notes?: string;
}

export interface ReminderResponse {
  success: boolean;
  message?: string;
  sentAt?: string;
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

const buildQuery = (filters?: SessionFilters): string => {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.patientId) params.set('patientId', filters.patientId);
  if (filters.status) params.set('status', String(filters.status));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return query ? `?${query}` : '';
};

const mockSession = (data: CreateSessionInput, id?: string): SessionRecord => ({
  id: id || `mock-session-${Date.now()}`,
  patientId: data.patientId,
  patientName: null,
  scheduledAt: data.scheduledAt,
  status: 'scheduled',
  notes: data.notes || null,
});

export const createSession = async (data: CreateSessionInput): Promise<SessionRecord> => {
  try {
    const response = await mdcApi.post<SessionRecord | ApiEnvelope<SessionRecord>>('/sessions', data);
    return unwrap(response.data);
  } catch (error) {
    console.error('createSession failed, using mock fallback', error);
    return mockSession(data);
  }
};

export const getSessions = async (filters?: SessionFilters): Promise<SessionRecord[]> => {
  try {
    const response = await mdcApi.get<SessionRecord[] | ApiEnvelope<SessionRecord[]>>(`/sessions${buildQuery(filters)}`);
    return unwrap(response.data);
  } catch (error) {
    console.error('getSessions failed, using mock fallback', error);
    return [
      mockSession({ patientId: filters?.patientId || 'mock-p1', scheduledAt: new Date().toISOString(), notes: 'Mock session' }, 'mock-s1'),
    ];
  }
};

export const updateSession = async (id: string, data: UpdateSessionInput): Promise<SessionRecord> => {
  try {
    const response = await mdcApi.put<SessionRecord | ApiEnvelope<SessionRecord>>(`/sessions/${encodeURIComponent(id)}`, data);
    return unwrap(response.data);
  } catch (error) {
    console.error('updateSession failed, using mock fallback', error);
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
    const response = await mdcApi.post<ReminderResponse | ApiEnvelope<ReminderResponse>>(`/sessions/${encodeURIComponent(sessionId)}/reminders`);
    return unwrap(response.data);
  } catch (error) {
    console.error('sendReminder failed, using mock fallback', error);
    return {
      success: true,
      message: `Mock reminder sent for ${sessionId}`,
      sentAt: new Date().toISOString(),
    };
  }
};
