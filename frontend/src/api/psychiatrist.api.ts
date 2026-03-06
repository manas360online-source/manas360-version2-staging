import { http } from '../lib/http';

type Envelope<T> = { success?: boolean; message?: string; data?: T } & T;

const unwrap = <T>(response: Envelope<T>): T => {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as unknown as T;
};

export type PsychiatristPatient = {
  patientId: string;
  patientUserId: string;
  name: string;
  age: number;
  lastSessionAt: string | null;
};

export type PsychiatristDashboard = {
  mode: 'professional' | 'self' | string;
  patientSelected: boolean;
  todaysConsultations?: number;
  medicationReviewsDue?: number;
  drugInteractionAlerts?: number;
  nonAdherenceAlerts?: number;
  worseningSymptoms?: number;
  patientOverview?: {
    name: string;
    age: number;
    diagnosis: string;
    currentMedications: Array<{ drugName: string; dose: string; frequency: string; duration: string }>;
    lastSession: string | null;
    nextFollowUp: string | null;
  };
  psychologistWellnessPlan?: {
    readOnly: boolean;
    available: boolean;
    items: Array<{ label?: string; progress?: string }>;
    notes: string;
    adherenceScore: number;
    emptyMessage?: string | null;
  };
  psychiatricAssessmentSummary?: {
    clinicalImpression: string;
    severity: string;
    assessedAt: string;
  } | null;
};

export type PsychiatristSelfMode = {
  mode: 'self' | string;
  totalPatients: number;
  activePrescriptions: number;
  consultationsThisWeek: number;
  incomeMinor: number;
};

export const psychiatristApi = {
  getDashboard: async (patientId?: string): Promise<PsychiatristDashboard> => {
    const res = await http.get('/v1/psychiatrist/me/dashboard', { params: patientId ? { patientId } : undefined });
    return unwrap<PsychiatristDashboard>(res.data);
  },
  getSelfMode: async (): Promise<PsychiatristSelfMode> => {
    const res = await http.get('/v1/psychiatrist/me/self-mode');
    return unwrap<PsychiatristSelfMode>(res.data);
  },
  getPatients: async (): Promise<{ items: PsychiatristPatient[] }> => {
    const res = await http.get('/v1/psychiatrist/me/patients');
    return unwrap<{ items: PsychiatristPatient[] }>(res.data);
  },
  createAssessment: async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const res = await http.post('/v1/psychiatrist/me/assessments', payload);
    return unwrap<{ id: string }>(res.data);
  },
  listAssessments: async (patientId?: string): Promise<{ items: any[] }> => {
    const res = await http.get('/v1/psychiatrist/me/assessments', { params: patientId ? { patientId } : undefined });
    return unwrap<{ items: any[] }>(res.data);
  },
  createPrescription: async (payload: Record<string, unknown>): Promise<{ id: string; instructions: string }> => {
    const res = await http.post('/v1/psychiatrist/me/prescriptions', payload);
    return unwrap<{ id: string; instructions: string }>(res.data);
  },
  listPrescriptions: async (patientId?: string): Promise<{ items: any[] }> => {
    const res = await http.get('/v1/psychiatrist/me/prescriptions', { params: patientId ? { patientId } : undefined });
    return unwrap<{ items: any[] }>(res.data);
  },
  checkInteractions: async (payload: Record<string, unknown>): Promise<{ level: string; warnings: any[] }> => {
    const res = await http.post('/v1/psychiatrist/me/drug-interactions/check', payload);
    return unwrap<{ level: string; warnings: any[] }>(res.data);
  },
  getParameterTracking: async (patientId: string): Promise<any> => {
    const res = await http.get(`/v1/psychiatrist/me/parameter-tracking/${encodeURIComponent(patientId)}`);
    return unwrap<any>(res.data);
  },
  createMedicationHistory: async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const res = await http.post('/v1/psychiatrist/me/medication-history', payload);
    return unwrap<{ id: string }>(res.data);
  },
  listMedicationHistory: async (patientId?: string): Promise<{ items: any[] }> => {
    const res = await http.get('/v1/psychiatrist/me/medication-history', { params: patientId ? { patientId } : undefined });
    return unwrap<{ items: any[] }>(res.data);
  },
  createFollowUp: async (payload: Record<string, unknown>): Promise<any> => {
    const res = await http.post('/v1/psychiatrist/me/follow-ups', payload);
    return unwrap<any>(res.data);
  },
};
