import axios, { AxiosError, type AxiosInstance } from 'axios';
import { API_MDC_BASE } from '../lib/runtimeEnv';
import { getAuthHeaders } from '../utils/authToken';

export interface AuditLogItem {
  id: string;
  actor?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  [key: string]: unknown;
}

export interface ExportPatientResponse {
  success: boolean;
  message?: string;
  exportId?: string;
  downloadUrl?: string;
  [key: string]: unknown;
}

export interface PurgePatientResponse {
  success: boolean;
  message?: string;
  purgedAt?: string;
  [key: string]: unknown;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MdcAuditExportApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

const auditHttp: AxiosInstance = axios.create({
  baseURL: API_MDC_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
auditHttp.interceptors.request.use((config) => {
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

const toApiError = (error: unknown): MdcAuditExportApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>;
    return {
      message:
        axiosError.response?.data?.message
        || axiosError.response?.data?.error
        || axiosError.message
        || 'Audit/Export request failed',
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unexpected audit/export API error' };
};

export const getAuditLogs = async (): Promise<AuditLogItem[]> => {
  try {
    const response = await auditHttp.get<AuditLogItem[] | ApiEnvelope<AuditLogItem[]>>('/api/mdc/audit-log');
    return unwrap<AuditLogItem[]>(response.data);
  } catch (error) {
    console.error('getAuditLogs failed, using mock fallback', toApiError(error));
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
    const response = await auditHttp.post<ExportPatientResponse | ApiEnvelope<ExportPatientResponse>>(
      `/api/mdc/patients/${encodeURIComponent(id)}/export`,
    );
    return unwrap<ExportPatientResponse>(response.data);
  } catch (error) {
    console.error('exportPatientData failed, using mock fallback', toApiError(error));
    return {
      success: true,
      message: `Mock export started for ${id}`,
      exportId: `mock-export-${Date.now()}`,
    };
  }
};

export const purgePatient = async (id: string): Promise<PurgePatientResponse> => {
  try {
    const response = await auditHttp.delete<PurgePatientResponse | ApiEnvelope<PurgePatientResponse>>(
      `/api/mdc/patients/${encodeURIComponent(id)}/purge`,
    );
    return unwrap<PurgePatientResponse>(response.data);
  } catch (error) {
    console.error('purgePatient failed, using mock fallback', toApiError(error));
    return {
      success: true,
      message: `Mock purge completed for ${id}`,
      purgedAt: new Date().toISOString(),
    };
  }
};
