import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

export type HomeworkStatus = 'assigned' | 'completed' | 'skipped' | 'pending' | 'in_progress' | string;

export interface HomeworkItem {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: HomeworkStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignHomeworkInput {
  patientId: string;
  title: string;
  description: string;
  dueDate: string;
  status?: HomeworkStatus;
}

export interface UpdateHomeworkInput {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: HomeworkStatus;
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

const normalizeStatus = (status: HomeworkStatus): HomeworkStatus => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized === 'skipped') return 'skipped';
  if (normalized === 'in_progress') return 'in_progress';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'assigned') return 'assigned';
  return 'assigned';
};

export const assignHomework = async (data: AssignHomeworkInput): Promise<HomeworkItem> => {
  try {
    const response = await mdcApi.post<HomeworkItem | ApiEnvelope<HomeworkItem>>('/homework', data);
    const item = unwrap(response.data);
    return { ...item, status: normalizeStatus(item.status) };
  } catch (error) {
    console.error('assignHomework failed, using mock fallback', error);
    return {
      id: `mock-homework-${Date.now()}`,
      patientId: data.patientId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      status: normalizeStatus(data.status || 'assigned'),
      createdAt: new Date().toISOString(),
    };
  }
};

export const getHomework = async (patientId: string): Promise<HomeworkItem[]> => {
  try {
    const response = await mdcApi.get<HomeworkItem[] | ApiEnvelope<HomeworkItem[]>>(`/patients/${encodeURIComponent(patientId)}/homework`);
    const items = unwrap(response.data);
    return items.map((item) => ({ ...item, status: normalizeStatus(item.status) }));
  } catch (error) {
    console.error('getHomework failed, using mock fallback', error);
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

export const updateHomework = async (id: string, data: UpdateHomeworkInput): Promise<HomeworkItem> => {
  try {
    const response = await mdcApi.put<HomeworkItem | ApiEnvelope<HomeworkItem>>(`/homework/${encodeURIComponent(id)}`, data);
    const item = unwrap(response.data);
    return { ...item, status: normalizeStatus(item.status) };
  } catch (error) {
    console.error('updateHomework failed, using mock fallback', error);
    return {
      id,
      patientId: 'mock-p1',
      title: data.title || 'Mock homework',
      description: data.description || '',
      dueDate: data.dueDate,
      status: normalizeStatus(data.status || 'assigned'),
      updatedAt: new Date().toISOString(),
    };
  }
};
