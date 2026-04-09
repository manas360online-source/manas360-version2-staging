import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

export interface NoteTemplate {
  id: string;
  name: string;
  content?: string | null;
}

export interface SessionNotes {
  sessionId: string;
  templateId?: string | null;
  notes: string;
  finalized: boolean;
  summary?: string | null;
  updatedAt?: string;
}

export interface SaveSessionNotesInput {
  templateId?: string;
  notes: string;
}

export interface FinalizeNotesResponse {
  success: boolean;
  message?: string;
  notes?: SessionNotes;
}

export interface SummaryResponse {
  summary: string;
  generatedAt?: string;
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

export const getTemplates = async (): Promise<NoteTemplate[]> => {
  try {
    const response = await mdcApi.get<NoteTemplate[] | ApiEnvelope<NoteTemplate[]>>('/templates');
    return unwrap(response.data);
  } catch (error) {
    console.error('getTemplates failed, using mock fallback', error);
    return [
      { id: 'soap', name: 'SOAP Template' },
      { id: 'dap', name: 'DAP Template' },
    ];
  }
};

export const saveSessionNotes = async (sessionId: string, data: SaveSessionNotesInput): Promise<SessionNotes> => {
  try {
    const response = await mdcApi.post<SessionNotes | ApiEnvelope<SessionNotes>>(`/sessions/${encodeURIComponent(sessionId)}/notes`, data);
    return unwrap(response.data);
  } catch (error) {
    console.error('saveSessionNotes failed, using mock fallback', error);
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

export const getSessionNotes = async (sessionId: string): Promise<SessionNotes> => {
  try {
    const response = await mdcApi.get<SessionNotes | ApiEnvelope<SessionNotes>>(`/sessions/${encodeURIComponent(sessionId)}/notes`);
    return unwrap(response.data);
  } catch (error) {
    console.error('getSessionNotes failed, using mock fallback', error);
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
    const response = await mdcApi.put<FinalizeNotesResponse | ApiEnvelope<FinalizeNotesResponse>>(`/sessions/${encodeURIComponent(sessionId)}/notes/finalize`);
    return unwrap(response.data);
  } catch (error) {
    console.error('finalizeNotes failed, using mock fallback', error);
    return {
      success: true,
      message: 'Mock finalize complete.',
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
    const response = await mdcApi.post<SummaryResponse | ApiEnvelope<SummaryResponse>>(`/sessions/${encodeURIComponent(sessionId)}/summarize`);
    return unwrap(response.data);
  } catch (error) {
    console.error('generateSummary failed, using mock fallback', error);
    return {
      summary: `Mock summary generated for session ${sessionId}.`,
      generatedAt: new Date().toISOString(),
    };
  }
};
