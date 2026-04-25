import { http } from '../lib/http';

type Envelope<T> = { success?: boolean; message?: string; data?: T } & T;

const unwrap = <T>(response: Envelope<T>): T => {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as unknown as T;
};

export type PsychologistDashboardResponse = {
  cards: { totalPatients: number; pendingEvaluations: number; reportsSubmitted: number; upcomingEvaluations: number };
  charts: any;
  recentActivity: any[];
};

export type PsychologistPatientItem = {
  patientProfileId: string;
  patientUserId: string;
  patientName: string;
  age: number;
  gender: string;
  assignedAt: string | null;
};

export type PsychologistAssessmentItem = {
  id: string;
  patient_id: string;
  assessment_type: string;
  title?: string | null;
  score?: number | null;
  status?: string | null;
  evaluated_at?: string | null;
  updated_at?: string | null;
};

export type PsychologistReportItem = {
  id: string;
  patient_id: string;
  title: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PsychologistPatientReportCloneItem = {
  id: string;
  source_report_id: string;
  patient_id: string;
  title: string;
  status?: string | null;
  shared_timestamp?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PsychologistPatientOverview = {
  patient: {
    id: string;
    userId: string;
    name: string;
    age: number;
    gender: string;
    email?: string | null;
    phone?: string | null;
    medicalHistory?: string | null;
    emergencyContact?: any;
  };
  summary: {
    assessmentCount: number;
    reportCount: number;
    submittedReports: number;
    careTeamCount: number;
    lastAssessmentAt?: string | null;
    lastReportAt?: string | null;
  };
  careTeam: Array<{
    assignmentId: string;
    role: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    assignedAt?: string | null;
    canConnect: boolean;
  }>;
};

export const psychologistApi = {
  getDashboard: async (): Promise<PsychologistDashboardResponse> => {
    const res = await http.get('/v1/psychologist/me/dashboard');
    return unwrap<PsychologistDashboardResponse>(res.data);
  },
  getPatients: async (params?: { search?: string }): Promise<{ items: PsychologistPatientItem[] }> => {
    const res = await http.get('/v1/psychologist/me/patients', { params });
    return unwrap<{ items: PsychologistPatientItem[] }>(res.data);
  },
  getPatientOverview: async (patientId: string): Promise<PsychologistPatientOverview> => {
    const res = await http.get(`/v1/psychologist/me/patients/${encodeURIComponent(patientId)}/overview`);
    return unwrap<PsychologistPatientOverview>(res.data);
  },
  getAssessments: async (params?: { patientId?: string }): Promise<{ items: PsychologistAssessmentItem[] }> => {
    const res = await http.get('/v1/psychologist/me/assessments', { params });
    return unwrap<{ items: PsychologistAssessmentItem[] }>(res.data);
  },
  getReports: async (params?: { patientId?: string }): Promise<{ items: PsychologistReportItem[] }> => {
    const res = await http.get('/v1/psychologist/me/reports', { params });
    return unwrap<{ items: PsychologistReportItem[] }>(res.data);
  },
  cloneReportForPatient: async (reportId: string): Promise<{ id: string; status: string }> => {
    const res = await http.post(`/v1/psychologist/me/reports/${encodeURIComponent(reportId)}/clone-for-patient`);
    return unwrap<{ id: string; status: string }>(res.data);
  },
  getPatientReportClones: async (params?: { patientId?: string }): Promise<{ items: PsychologistPatientReportCloneItem[] }> => {
    const res = await http.get('/v1/psychologist/me/patient-reports', { params });
    return unwrap<{ items: PsychologistPatientReportCloneItem[] }>(res.data);
  },
  sharePatientReportClone: async (cloneId: string): Promise<{ id: string; status: string; sharePath: string; expiresAt: string }> => {
    const res = await http.post(`/v1/psychologist/me/patient-reports/${encodeURIComponent(cloneId)}/share`);
    return unwrap<{ id: string; status: string; sharePath: string; expiresAt: string }>(res.data);
  },
  getTests: async (params?: { patientId?: string }): Promise<{ items: Array<any> }> => {
    const res = await http.get('/v1/psychologist/me/tests', { params });
    return unwrap<{ items: Array<any> }>(res.data);
  },
  getSchedule: async (): Promise<{ items: Array<any> }> => {
    const res = await http.get('/v1/psychologist/me/schedule');
    return unwrap<{ items: Array<any> }>(res.data);
  },
  getMessages: async (): Promise<{ items: Array<any> }> => {
    const res = await http.get('/v1/psychologist/me/messages');
    return unwrap<{ items: Array<any> }>(res.data);
  },
};
