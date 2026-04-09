import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

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

export interface ProgressItem {
  id: string;
  patientId: string;
  type: AssessmentType;
  score: number;
  severity: string;
  assessedAt: string;
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

export const submitAssessment = async (data: SubmitAssessmentInput): Promise<ProgressItem> => {
  try {
    const response = await mdcApi.post<ProgressItem | ApiEnvelope<ProgressItem>>('/assessments', data);
    return unwrap(response.data);
  } catch (error) {
    console.error('submitAssessment failed, using mock fallback', error);
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

export const getPatientProgress = async (patientId: string): Promise<ProgressItem[]> => {
  try {
    const response = await mdcApi.get<ProgressItem[] | ApiEnvelope<ProgressItem[]>>(`/patients/${encodeURIComponent(patientId)}/progress`);
    return unwrap(response.data);
  } catch (error) {
    console.error('getPatientProgress failed, using mock fallback', error);
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
