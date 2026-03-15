import { http } from '../lib/http';

export interface DashboardSessionItem {
  id: string;
  patientName: string;
  patientInitials: string;
  time: string;
  type: string;
  status: string;
}

export interface SmartAlertItem {
  patientId: string;
  patientName: string;
  severity: 'high' | 'medium';
  trigger: 'mood_decline' | 'stress_spike' | 'sleep_risk';
  message: string;
}

export interface DashboardData {
  stats: Record<string, string | number>;
  smartAlerts?: SmartAlertItem[];
  todaySessions: DashboardSessionItem[];
}

export interface PatientListItem {
  id: string;
  name: string;
  email: string | null;
  primaryConcern: string;
  lastSessionDate: string | null;
  nextSessionDate: string | null;
  status: 'Active' | 'At Risk' | 'Needs Review';
}

export interface PatientOverviewAssessment {
  id: string;
  type: 'PHQ-9' | 'GAD-7';
  score: number;
  severity: string;
  date: string | null;
}

export interface PatientOverviewActivity {
  title: string;
  description: string;
  time: string;
}

export interface PatientOverviewData {
  patient: {
    id: string;
    name: string;
    age: number | null;
    diagnosis: string;
    email: string | null;
  };
  upcomingSession: {
    id: string;
    dateTime: string | null;
  } | null;
  lastSession: {
    id: string;
    dateTime: string | null;
  } | null;
  recentAssessments: PatientOverviewAssessment[];
  recentActivity: PatientOverviewActivity[];
}

export interface AssessmentAnswerData {
  prompt: string;
  answer: string;
  points: number;
}

export interface AssessmentData {
  id: string;
  type: 'PHQ-9' | 'GAD-7';
  date: string;
  totalScore: number;
  severity: string;
  answers: AssessmentAnswerData[];
}

export type CBTModuleStatus = 'Pending' | 'In Progress' | 'Completed';

export interface CBTModuleAnswerData {
  id: string;
  question: string;
  answer: string;
  rawResponse: unknown;
  answeredAt: string;
}

export interface CBTModuleData {
  id: string;
  moduleType: string;
  assignmentDate: string;
  status: CBTModuleStatus;
  submittedAnswers: CBTModuleAnswerData[];
  therapistFeedback: string;
  completedAt: string | null;
}

export interface CbtAssignmentTemplateOption {
  templateType: string;
  title: string;
  description: string;
  stepCount: number;
}

export interface QuickAssignedCbtTask {
  id: string;
  templateType: string;
  status: string;
  title: string;
  description: string;
  createdAt: string;
}

export type PrescriptionStatus = 'Active' | 'Discontinued';

export interface PrescriptionData {
  id: string;
  drugName: string;
  dosage: string;
  instructions: string;
  prescribedDate: string;
  refillsRemaining: number;
  status: PrescriptionStatus;
  adherenceRate: number;
  warnings: string[];
}

export type LabOrderStatus = 'Pending' | 'Results Ready' | 'Reviewed';
export type LabBiomarkerStatus = 'High' | 'Normal' | 'Low';

export interface LabBiomarkerData {
  name: string;
  value: string;
  referenceRange: string;
  status: LabBiomarkerStatus;
}

export interface LabOrderData {
  id: string;
  testName: string;
  dateOrdered: string;
  status: LabOrderStatus;
  orderingPhysician: string;
  interpretation: string;
  biomarkers: LabBiomarkerData[];
}

export type GoalTrackerStatus = 'completed' | 'missed' | 'empty';

export interface GoalData {
  id: string;
  title: string;
  category: string;
  startDate: string;
  streak: number;
  completionRate: number;
  weeklyTracker: GoalTrackerStatus[];
}

export interface GoalMessageResponse {
  goalId: string;
  message: string;
  sentAt: string;
  status: 'sent';
}

export type AssignmentType = 'ASSESSMENT' | 'GOAL' | 'CBT';

export interface AssignPatientItemPayload {
  assignmentType: AssignmentType;
  title: string;
  templateId?: string;
  referenceId?: string;
  estimatedMinutes?: number;
  frequency?: 'DAILY_RITUAL' | 'WEEKLY_MILESTONE' | 'ONE_TIME';
}

export interface AssignPatientItemResponse {
  assignmentType: AssignmentType;
  id: string;
  title?: string;
  activityType?: string;
  status: string;
  createdAt: string;
}

export interface WeeklyPlanActivityPayload {
  title: string;
  frequency?: 'DAILY_RITUAL' | 'WEEKLY_MILESTONE' | 'ONE_TIME';
  activityType?: 'MOOD_CHECKIN' | 'EXERCISE' | 'AUDIO_THERAPY' | 'CLINICAL_ASSESSMENT' | 'READING_MATERIAL' | 'SESSION_BOOKING';
  referenceId?: string;
  estimatedMinutes?: number;
  orderIndex?: number;
  category?: string;
}

export interface UpdateWeeklyPlanPayload {
  weekNumber: number;
  activities: WeeklyPlanActivityPayload[];
}

export interface UpdateWeeklyPlanResponse {
  planId: string;
  patientId: string;
  weekNumber: number;
  deletedCount: number;
  insertedCount: number;
  updatedCount?: number;
}

export interface PublishWeeklyPlanPayload {
  weekNumber: number;
}

export interface PublishWeeklyPlanResponse {
  planId: string;
  patientId: string;
  weekNumber: number;
  publishedCount: number;
}

export interface ScheduleNextSessionPayload {
  startTime: string;
  duration: number;
}

export interface ScheduleNextSessionResponse {
  sessionId: string;
  bookingReferenceId: string;
  patientId: string;
  startTime: string;
  durationMinutes: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | string;
  isLocked: boolean;
  event: 'NEW_SESSION_SCHEDULED' | string;
}

export interface ProviderConversationSummary {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail?: string | null;
  patientAvatar?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  hasSessionHistory: boolean;
  hasMessageHistory: boolean;
}

export interface ProviderDirectMessage {
  id: string;
  role: 'patient' | 'provider' | 'system';
  content: string;
  messageType: 'TEXT' | 'SYSTEM' | 'ASSESSMENT' | 'SESSION_SUMMARY' | string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string | null;
}

export interface SendProviderMessagePayload {
  conversationId?: string;
  patientId?: string;
  content: string;
}

export interface ProviderEarningsSummary {
  totalEarningsMinor: number;
  pendingPayoutsMinor: number;
  sessionsThisMonth: number;
  sessionRateMinor: number;
}

export interface ProviderMonthlyTrendItem {
  key: string;
  label: string;
  amountMinor: number;
  sessions: number;
}

export interface ProviderRecentTransaction {
  id: string;
  bookingReferenceId: string;
  date: string;
  patientName: string;
  amountMinor: number;
  status: string;
}

export interface ProviderEarningsResponse {
  summary: ProviderEarningsSummary;
  monthlyTrend: ProviderMonthlyTrendItem[];
  recentTransactions: ProviderRecentTransaction[];
}

export interface ProviderCalendarSession {
  id: string;
  bookingReferenceId: string;
  dateTime: string;
  durationMinutes: number;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  patientId: string;
  patientName: string;
}

export interface ProviderAvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface ProviderSettingsResponse {
  providerId: string;
  displayName: string;
  email: string;
  bio: string;
  specializations: string[];
  profileImageUrl: string;
  availabilitySlots: ProviderAvailabilitySlot[];
  // Onboarding-sourced fields (read from TherapistProfile)
  languages?: string[];
  consultationFee?: number;
  tagline?: string;
  registrationNum?: string;
  registrationType?: string;
  highestQual?: string;
  licenseRci?: string;
  licenseNmc?: string;
  onboardingStatus?: string;
}

export interface UpdateProviderSettingsPayload {
  bio: string;
  specializations: string[];
  profileImageUrl: string;
  availabilitySlots: ProviderAvailabilitySlot[];
  languages?: string[];
  consultationFee?: number;
  tagline?: string;
}

export type NoteStatus = 'Draft' | 'Signed';

export interface NoteData {
  id: string;
  sessionId: string;
  sessionDate: string;
  date: string | null;
  providerName: string;
  sessionType: string;
  duration: string;
  status: NoteStatus;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string;
}

export interface CreatePatientNotePayload {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  sessionDate: string;
  sessionType: string;
  duration: string;
  status: NoteStatus;
  sessionId?: string;
}

type Envelope<T> = { success?: boolean; message?: string; data?: T } & T;

const unwrap = <T>(response: Envelope<T>): T => {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as unknown as T;
};

export const fetchProviderDashboard = async (): Promise<DashboardData> => {
  const response = await http.get<Envelope<DashboardData>>('/v1/provider/dashboard');
  return unwrap<DashboardData>(response.data);
};

export const fetchProviderPatients = async (): Promise<PatientListItem[]> => {
  const response = await http.get<Envelope<PatientListItem[]>>('/v1/provider/patients');
  return unwrap<PatientListItem[]>(response.data);
};

export const fetchProviderEarnings = async (): Promise<ProviderEarningsResponse> => {
	const response = await http.get<Envelope<ProviderEarningsResponse>>('/v1/provider/earnings');
	return unwrap<ProviderEarningsResponse>(response.data);
};

export const fetchProviderCalendarSessions = async (): Promise<ProviderCalendarSession[]> => {
  const response = await http.get<Envelope<ProviderCalendarSession[]>>('/v1/provider/calendar');
  return unwrap<ProviderCalendarSession[]>(response.data);
};

export const fetchProviderSettings = async (): Promise<ProviderSettingsResponse> => {
  const response = await http.get<Envelope<ProviderSettingsResponse>>('/v1/provider/settings');
  return unwrap<ProviderSettingsResponse>(response.data);
};

export const updateProviderSettings = async (
  payload: UpdateProviderSettingsPayload,
): Promise<ProviderSettingsResponse> => {
  const response = await http.put<Envelope<ProviderSettingsResponse>>('/v1/provider/settings', payload);
  return unwrap<ProviderSettingsResponse>(response.data);
};

export const fetchProviderConversations = async (): Promise<ProviderConversationSummary[]> => {
  const response = await http.get<Envelope<ProviderConversationSummary[]>>('/v1/provider/messages/conversations');
  return unwrap<ProviderConversationSummary[]>(response.data);
};

export const fetchProviderMessages = async (conversationId: string): Promise<ProviderDirectMessage[]> => {
  const response = await http.get<Envelope<ProviderDirectMessage[]>>(`/v1/provider/messages/${conversationId}`);
  return unwrap<ProviderDirectMessage[]>(response.data);
};

export const sendProviderMessage = async (payload: SendProviderMessagePayload): Promise<ProviderDirectMessage> => {
  const response = await http.post<Envelope<ProviderDirectMessage>>('/v1/provider/messages', payload);
  return unwrap<ProviderDirectMessage>(response.data);
};

export const fetchPatientOverview = async (patientId: string): Promise<PatientOverviewData> => {
  const response = await http.get<Envelope<PatientOverviewData>>(`/v1/provider/patient/${patientId}/overview`);
  return unwrap<PatientOverviewData>(response.data);
};

export const fetchPatientAssessments = async (patientId: string): Promise<AssessmentData[]> => {
  const response = await http.get<Envelope<AssessmentData[]>>(`/v1/provider/patient/${patientId}/assessments`);
  return unwrap<AssessmentData[]>(response.data);
};

export const assignPatientItem = async (
  patientId: string,
  payload: AssignPatientItemPayload,
): Promise<AssignPatientItemResponse> => {
  const response = await http.post<Envelope<AssignPatientItemResponse>>(`/v1/provider/patient/${patientId}/assign`, payload);
  return unwrap<AssignPatientItemResponse>(response.data);
};

export const updatePatientWeeklyPlan = async (
  patientId: string,
  payload: UpdateWeeklyPlanPayload,
): Promise<UpdateWeeklyPlanResponse> => {
  const response = await http.post<Envelope<UpdateWeeklyPlanResponse>>(`/v1/provider/patient/${patientId}/weekly-plan`, payload);
  return unwrap<UpdateWeeklyPlanResponse>(response.data);
};

export const publishPatientWeeklyPlan = async (
  patientId: string,
  payload: PublishWeeklyPlanPayload,
): Promise<PublishWeeklyPlanResponse> => {
  const response = await http.post<Envelope<PublishWeeklyPlanResponse>>(`/v1/provider/patient/${patientId}/weekly-plan/publish`, payload);
  return unwrap<PublishWeeklyPlanResponse>(response.data);
};

export const scheduleNextSession = async (
  patientId: string,
  payload: ScheduleNextSessionPayload,
): Promise<ScheduleNextSessionResponse> => {
  const response = await http.post<Envelope<ScheduleNextSessionResponse>>(`/v1/provider/patient/${patientId}/sessions/schedule`, payload);
  return unwrap<ScheduleNextSessionResponse>(response.data);
};

export const fetchPatientCBTModules = async (patientId: string): Promise<CBTModuleData[]> => {
  const response = await http.get<Envelope<CBTModuleData[]>>(`/v1/provider/patient/${patientId}/cbt`);
  return unwrap<CBTModuleData[]>(response.data);
};

export const fetchCbtAssignmentTemplates = async (): Promise<CbtAssignmentTemplateOption[]> => {
  const response = await http.get<Envelope<CbtAssignmentTemplateOption[]>>('/v1/provider/cbt-assignments/templates');
  return unwrap<CbtAssignmentTemplateOption[]>(response.data);
};

export const quickAssignCbtTemplate = async (
  patientId: string,
  templateType: string,
): Promise<QuickAssignedCbtTask> => {
  const response = await http.post<Envelope<QuickAssignedCbtTask>>(
    `/v1/provider/patient/${patientId}/cbt-assignments`,
    { templateType },
  );
  return unwrap<QuickAssignedCbtTask>(response.data);
};

export const reviewCBTModule = async (
  patientId: string,
  moduleId: string,
  feedback: string,
): Promise<CBTModuleData> => {
  const response = await http.put<Envelope<CBTModuleData>>(
    `/v1/provider/patient/${patientId}/cbt/${moduleId}/review`,
    { feedback },
  );
  return unwrap<CBTModuleData>(response.data);
};

export const fetchPatientPrescriptions = async (patientId: string): Promise<PrescriptionData[]> => {
  const response = await http.get<Envelope<PrescriptionData[]>>(`/v1/provider/patient/${patientId}/prescriptions`);
  return unwrap<PrescriptionData[]>(response.data);
};

export const fetchPatientLabs = async (patientId: string): Promise<LabOrderData[]> => {
  const response = await http.get<Envelope<LabOrderData[]>>(`/v1/provider/patient/${patientId}/labs`);
  return unwrap<LabOrderData[]>(response.data);
};

export const fetchPatientGoals = async (patientId: string): Promise<GoalData[]> => {
  const response = await http.get<Envelope<GoalData[]>>(`/v1/provider/patient/${patientId}/goals`);
  return unwrap<GoalData[]>(response.data);
};

export const sendGoalMessage = async (
  patientId: string,
  goalId: string,
  message: string,
): Promise<GoalMessageResponse> => {
  const response = await http.post<Envelope<GoalMessageResponse>>(
    `/v1/provider/patient/${patientId}/goals/${goalId}/message`,
    { message },
  );
  return unwrap<GoalMessageResponse>(response.data);
};

export const fetchPatientNotes = async (patientId: string): Promise<NoteData[]> => {
  const response = await http.get<Envelope<NoteData[]>>(`/v1/provider/patient/${patientId}/notes`);
  return unwrap<NoteData[]>(response.data);
};

export const createPatientNote = async (
  patientId: string,
  noteData: CreatePatientNotePayload,
): Promise<NoteData> => {
  const response = await http.post<Envelope<NoteData>>(`/v1/provider/patient/${patientId}/notes`, noteData);
  return unwrap<NoteData>(response.data);
};

export const updatePatientNote = async (
  patientId: string,
  noteId: string,
  noteData: CreatePatientNotePayload,
): Promise<NoteData> => {
  const response = await http.put<Envelope<NoteData>>(`/v1/provider/patient/${patientId}/notes/${noteId}`, noteData);
  return unwrap<NoteData>(response.data);
};
