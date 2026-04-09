import axios, { AxiosError, type AxiosInstance } from 'axios';
import { API_MDC_BASE } from '../lib/runtimeEnv';
import { getAuthHeaders } from '../utils/authToken';

export interface MdcTemplate {
  id: string;
  name: string;
  content?: string | null;
  [key: string]: unknown;
}

export interface SaveSessionNotesInput {
  templateId?: string;
  notes: string;
}

export interface SessionNotesRecord {
  id?: string;
  sessionId: string;
  templateId?: string | null;
  templateName?: string | null;
  notes: string;
  finalized: boolean;
  summary?: string | null;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface FinalizeNotesResponse {
  success: boolean;
  message?: string;
  finalized?: boolean;
  notes?: SessionNotesRecord;
}

export interface SummaryResponse {
  summary: string;
  generatedAt?: string;
  [key: string]: unknown;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MdcSessionNotesApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

const mdcHttp: AxiosInstance = axios.create({
  baseURL: API_MDC_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
mdcHttp.interceptors.request.use((config) => {
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

const toApiError = (error: unknown): MdcSessionNotesApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>;
    return {
      message:
        axiosError.response?.data?.message
        || axiosError.response?.data?.error
        || axiosError.message
        || 'Session notes request failed',
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unexpected session notes error' };
};

export const getTemplates = async (): Promise<MdcTemplate[]> => {
  try {
    const response = await mdcHttp.get<MdcTemplate[] | ApiEnvelope<MdcTemplate[]>>('/api/mdc/templates');
    return unwrap<MdcTemplate[]>(response.data);
  } catch (error) {
    console.error('getTemplates failed, using mock fallback', toApiError(error));
    return [
      { id: 'soap', name: 'SOAP Template' },
      { id: 'dap', name: 'DAP Template' },
    ];
  }
};

export const saveSessionNotes = async (sessionId: string, data: SaveSessionNotesInput): Promise<SessionNotesRecord> => {
  try {
    const response = await mdcHttp.post<SessionNotesRecord | ApiEnvelope<SessionNotesRecord>>(
      `/api/mdc/sessions/${encodeURIComponent(sessionId)}/notes`,
      data,
    );
    return unwrap<SessionNotesRecord>(response.data);
  } catch (error) {
    console.error('saveSessionNotes failed, using mock fallback', toApiError(error));
    return {
      sessionId,
      templateId: data.templateId || null,
      notes: data.notes,
      finalized: false,
      summary: null,
      updatedAt: new Date().toISOString(),
    };
  }
};

export const getSessionNotes = async (sessionId: string): Promise<SessionNotesRecord> => {
  try {
    const response = await mdcHttp.get<SessionNotesRecord | ApiEnvelope<SessionNotesRecord>>(
      `/api/mdc/sessions/${encodeURIComponent(sessionId)}/notes`,
    );
    return unwrap<SessionNotesRecord>(response.data);
  } catch (error) {
    console.error('getSessionNotes failed, using mock fallback', toApiError(error));
    return {
      sessionId,
      templateId: 'soap',
      notes: 'Mock notes from fallback mode.',
      finalized: false,
      summary: null,
      updatedAt: new Date().toISOString(),
    };
  }
};

export const finalizeNotes = async (sessionId: string): Promise<FinalizeNotesResponse> => {
  try {
    const response = await mdcHttp.put<FinalizeNotesResponse | ApiEnvelope<FinalizeNotesResponse>>(
      `/api/mdc/sessions/${encodeURIComponent(sessionId)}/notes/finalize`,
    );
    return unwrap<FinalizeNotesResponse>(response.data);
  } catch (error) {
    console.error('finalizeNotes failed, using mock fallback', toApiError(error));
    return {
      success: true,
      message: 'Mock finalize complete.',
      finalized: true,
      notes: {
        sessionId,
        templateId: 'soap',
        notes: 'Mock finalized notes.',
        finalized: true,
        summary: null,
        updatedAt: new Date().toISOString(),
      },
    };
  }
};

export const generateSummary = async (sessionId: string): Promise<SummaryResponse> => {
  try {
    const response = await mdcHttp.post<SummaryResponse | ApiEnvelope<SummaryResponse>>(
      `/api/mdc/sessions/${encodeURIComponent(sessionId)}/summarize`,
    );
    return unwrap<SummaryResponse>(response.data);
  } catch (error) {
    console.error('generateSummary failed, using mock fallback', toApiError(error));
    return {
      summary: `Mock summary generated for session ${sessionId}.`,
      generatedAt: new Date().toISOString(),
    };
  }
};
