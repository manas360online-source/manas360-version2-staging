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
  activePatients?: number;
  activePrescriptions: number;
  medicationReviewsDue?: number;
  adherenceAlerts?: number;
  consultationsThisWeek: number;
  incomeMinor: number;
  ratings?: number | null;
  prescriptionTrends?: Array<{ label: string; count: number }>;
  patientOutcomes?: Array<{ label: string; score: number }>;
  revenue?: Array<{ label: string; amountMinor: number }>;
};

export type PsychiatristMedicationLibraryItem = {
  id: string;
  drugName: string;
  startingDose: string;
  maxDose: string;
  sideEffects: string;
  notes: string;
};

export type PsychiatristAssessmentTemplateItem = {
  id: string;
  name: string;
  checklist: string;
  severityScale: string;
  durationField: string;
  notes: string;
};

export type PsychiatristAssessmentDraftPayload = {
  chiefComplaint: string;
  symptoms: Record<string, number>;
  durationWeeks: number;
  chronicConditions: string;
  currentMedications: string;
  allergies: string;
  substanceUse: string;
  familyPsychHistory: string;
  cbc: string;
  tsh: string;
  vitaminD: string;
  vitaminB12: string;
  clinicalImpression: string;
  severity: string;
};

export type PsychiatristSettingsPayload = Record<string, unknown>;

export const psychiatristApi = {
  getDashboard: async (patientId?: string): Promise<PsychiatristDashboard> => {
    const res = await http.get('/psychiatrist/me/dashboard', { params: patientId ? { patientId } : undefined });
    return unwrap<PsychiatristDashboard>(res.data);
  },
  getSelfMode: async (): Promise<PsychiatristSelfMode> => {
    const res = await http.get('/psychiatrist/me/self-mode');
    return unwrap<PsychiatristSelfMode>(res.data);
  },
  getPatients: async (): Promise<{ items: PsychiatristPatient[] }> => {
    const res = await http.get('/psychiatrist/me/patients');
    return unwrap<{ items: PsychiatristPatient[] }>(res.data);
  },
  createAssessment: async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const res = await http.post('/psychiatrist/me/assessments', payload);
    return unwrap<{ id: string }>(res.data);
  },
  listAssessments: async (patientId?: string): Promise<{ items: any[] }> => {
    const res = await http.get('/psychiatrist/me/assessments', { params: patientId ? { patientId } : undefined });
    return unwrap<{ items: any[] }>(res.data);
  },
  createPrescription: async (payload: Record<string, unknown>): Promise<{ id: string; instructions: string }> => {
    const res = await http.post('/psychiatrist/me/prescriptions', payload);
    return unwrap<{ id: string; instructions: string }>(res.data);
  },
  listPrescriptions: async (patientId?: string): Promise<{ items: any[] }> => {
    const res = await http.get('/psychiatrist/me/prescriptions', { params: patientId ? { patientId } : undefined });
    return unwrap<{ items: any[] }>(res.data);
  },
  checkInteractions: async (payload: Record<string, unknown>): Promise<{ level: string; warnings: any[] }> => {
    const res = await http.post('/psychiatrist/me/drug-interactions/check', payload);
    return unwrap<{ level: string; warnings: any[] }>(res.data);
  },
  getParameterTracking: async (patientId: string): Promise<any> => {
    const res = await http.get(`/v1/psychiatrist/me/parameter-tracking/${encodeURIComponent(patientId)}`);
    return unwrap<any>(res.data);
  },
  createMedicationHistory: async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const res = await http.post('/psychiatrist/me/medication-history', payload);
    return unwrap<{ id: string }>(res.data);
  },
  listMedicationHistory: async (patientId?: string): Promise<{ items: any[] }> => {
    const res = await http.get('/psychiatrist/me/medication-history', { params: patientId ? { patientId } : undefined });
    return unwrap<{ items: any[] }>(res.data);
  },
  createFollowUp: async (payload: Record<string, unknown>): Promise<any> => {
    const res = await http.post('/psychiatrist/me/follow-ups', payload);
    return unwrap<any>(res.data);
  },
  listMedicationLibrary: async (): Promise<{ items: PsychiatristMedicationLibraryItem[] }> => {
    const res = await http.get('/psychiatrist/me/medication-library');
    return unwrap<{ items: PsychiatristMedicationLibraryItem[] }>(res.data);
  },
  createMedicationLibraryItem: async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const res = await http.post('/psychiatrist/me/medication-library', payload);
    return unwrap<{ id: string }>(res.data);
  },
  listAssessmentTemplates: async (): Promise<{ items: PsychiatristAssessmentTemplateItem[] }> => {
    const res = await http.get('/psychiatrist/me/assessment-templates');
    return unwrap<{ items: PsychiatristAssessmentTemplateItem[] }>(res.data);
  },
  createAssessmentTemplate: async (payload: Record<string, unknown>): Promise<{ id: string }> => {
    const res = await http.post('/psychiatrist/me/assessment-templates', payload);
    return unwrap<{ id: string }>(res.data);
  },
  getAssessmentDraft: async (patientId: string): Promise<{ patientId: string; payload: PsychiatristAssessmentDraftPayload | null; updatedAt: string | null }> => {
    const res = await http.get(`/v1/psychiatrist/me/assessment-drafts/${encodeURIComponent(patientId)}`);
    return unwrap<{ patientId: string; payload: PsychiatristAssessmentDraftPayload | null; updatedAt: string | null }>(res.data);
  },
  saveAssessmentDraft: async (patientId: string, payload: PsychiatristAssessmentDraftPayload): Promise<{ patientId: string }> => {
    const res = await http.put(`/v1/psychiatrist/me/assessment-drafts/${encodeURIComponent(patientId)}`, payload);
    return unwrap<{ patientId: string }>(res.data);
  },
  clearAssessmentDraft: async (patientId: string): Promise<{ patientId: string }> => {
    const res = await http.delete(`/v1/psychiatrist/me/assessment-drafts/${encodeURIComponent(patientId)}`);
    return unwrap<{ patientId: string }>(res.data);
  },
  getSettings: async (): Promise<{ payload: PsychiatristSettingsPayload; updatedAt: string | null }> => {
    const res = await http.get('/psychiatrist/me/settings');
    return unwrap<{ payload: PsychiatristSettingsPayload; updatedAt: string | null }>(res.data);
  },
  saveSettings: async (payload: PsychiatristSettingsPayload): Promise<{ ok: boolean }> => {
    const res = await http.put('/psychiatrist/me/settings', payload);
    return unwrap<{ ok: boolean }>(res.data);
  },
};
