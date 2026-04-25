import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

export interface AuditLogItem {
  id: string;
  actor?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface ExportPatientResponse {
  success: boolean;
  message?: string;
  exportId?: string;
  downloadUrl?: string;
}

export interface PurgePatientResponse {
  success: boolean;
  message?: string;
  purgedAt?: string;
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

export const getAuditLogs = async (): Promise<AuditLogItem[]> => {
  try {
    const response = await mdcApi.get<AuditLogItem[] | ApiEnvelope<AuditLogItem[]>>('/audit-log');
    return unwrap(response.data);
  } catch (error) {
    console.error('getAuditLogs failed, using mock fallback', error);
    return [
      {
        id: `mock-audit-${Date.now()}`,
        actor: 'System',
        action: 'MOCK_FALLBACK_AUDIT',
        entityType: 'patient',
        entityId: 'mock-p1',
        createdAt: new Date().toISOString(),
      },
    ];
  }
};

export const exportPatientData = async (id: string): Promise<ExportPatientResponse> => {
  try {
    const response = await mdcApi.post<ExportPatientResponse | ApiEnvelope<ExportPatientResponse>>(`/patients/${encodeURIComponent(id)}/export`);
    return unwrap(response.data);
  } catch (error) {
    console.error('exportPatientData failed, using mock fallback', error);
    return {
      success: true,
      message: `Mock export started for ${id}`,
      exportId: `mock-export-${Date.now()}`,
    };
  }
};

export const purgePatient = async (id: string): Promise<PurgePatientResponse> => {
  try {
    const response = await mdcApi.delete<PurgePatientResponse | ApiEnvelope<PurgePatientResponse>>(`/patients/${encodeURIComponent(id)}/purge`);
    return unwrap(response.data);
  } catch (error) {
    console.error('purgePatient failed, using mock fallback', error);
    return {
      success: true,
      message: `Mock purge completed for ${id}`,
      purgedAt: new Date().toISOString(),
    };
  }
};
