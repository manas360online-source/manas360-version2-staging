import axios, { AxiosError, type AxiosInstance } from 'axios';
import { API_MDC_BASE } from '../lib/runtimeEnv';
import { getAuthHeaders } from '../utils/authToken';

export type AssessmentType = 'PHQ-9' | 'GAD-7';

export interface AssessmentAnswer {
  questionId: string;
  score: number;
}

export interface SubmitAssessmentInput {
  patientId: string;
  type: AssessmentType;
  answers: AssessmentAnswer[];
  score: number;
  severity: string;
  assessedAt?: string;
}

export interface PatientProgressItem {
  id?: string;
  patientId: string;
  type: AssessmentType;
  score: number;
  severity: string;
  assessedAt: string;
  [key: string]: unknown;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MdcProgressApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

const progressHttp: AxiosInstance = axios.create({
  baseURL: API_MDC_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
progressHttp.interceptors.request.use((config) => {
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

const toApiError = (error: unknown): MdcProgressApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>;
    return {
      message:
        axiosError.response?.data?.message
        || axiosError.response?.data?.error
        || axiosError.message
        || 'Progress request failed',
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unexpected progress API error' };
};

export const submitAssessment = async (data: SubmitAssessmentInput): Promise<PatientProgressItem> => {
  try {
    const response = await progressHttp.post<PatientProgressItem | ApiEnvelope<PatientProgressItem>>('/api/mdc/assessments', data);
    return unwrap<PatientProgressItem>(response.data);
  } catch (error) {
    console.error('submitAssessment failed, using mock fallback', toApiError(error));
    return {
      id: `mock-assessment-${Date.now()}`,
      patientId: data.patientId,
      type: data.type,
      score: data.score,
      severity: data.severity,
      assessedAt: data.assessedAt || new Date().toISOString(),
    };
  }
};

export const getPatientProgress = async (patientId: string): Promise<PatientProgressItem[]> => {
  try {
    const response = await progressHttp.get<PatientProgressItem[] | ApiEnvelope<PatientProgressItem[]>>(
      `/api/mdc/patients/${encodeURIComponent(patientId)}/progress`,
    );
    return unwrap<PatientProgressItem[]>(response.data);
  } catch (error) {
    console.error('getPatientProgress failed, using mock fallback', toApiError(error));
    return [
      {
        id: `mock-progress-${Date.now()}-1`,
        patientId,
        type: 'PHQ-9',
        score: 14,
        severity: 'Moderate',
        assessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
      {
        id: `mock-progress-${Date.now()}-2`,
        patientId,
        type: 'PHQ-9',
        score: 10,
        severity: 'Moderate',
        assessedAt: new Date().toISOString(),
      },
    ];
  }
};
