// Provider Types
export type ProviderRole = 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH';

// Journey recommendation type
export type JourneyRecommendation = {
  pathway?: string;
  selectedPathway?: string;
  severity?: string;
  urgency?: string;
  recommendedProvider?: string;
  followUpDays?: number;
  rationale?: string[];
  actions?: string[];
};

export type Provider = {
  id: string;
  userId?: string;
  name: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: ProviderRole;
  providerType?: ProviderRole;
  bio?: string;
  specializations?: string[];
  consultationFee?: number;
  averageRating?: number;
  profileImageUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type NormalizedProvider = Provider & {
  normalizedName: string;
  bookingUrl: string;
  lastConnectedAt?: string;
};

// Assessment Types
export type ClinicalAssessmentKey = 'PHQ-9' | 'GAD-7';

export type AssessmentHistoryEntry = {
  id?: string;
  type?: string;
  score?: number;
  maxScore?: number;
  level?: string;
  createdAt?: string;
};

export type ClinicalFlowPhase = 'intro' | 'question' | 'loading-next' | 'next-phase' | 'provider-list';

export type SmartMatchProviderType = 'ALL' | 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH';

export type AssessmentDraft = {
  savedAt: number;
  dayKey: string;
  clinicalFlowPhase: ClinicalFlowPhase;
  clinicalStartWith: ClinicalAssessmentKey;
  assessmentOrder: ClinicalAssessmentKey[];
  activeAssessmentIndex: number;
  structuredAttempt: StructuredAssessmentStartResponse | null;
  structuredAnswers: Record<string, number>;
  currentStructuredQuestionIndex: number;
  clinicalJourney: JourneyRecommendation | null;
  clinicalResults: Array<{ type: ClinicalAssessmentKey; score: number; severity: string }>;
  suggestedProviders: Provider[];
  activeCarePathLabel: string;
};

export interface StructuredAssessmentStartResponse {
  assessmentId: string;
  sessionId: string;
  providerId: string;
  startTime: Date;
  estimatedDuration: number;
}

export interface PatientJourneyPayload {
  patientId: string;
  assessmentId: string;
  journeySteps: string[];
  currentStep: number;
  completedSteps: string[];
}

// Session Types
export type Session = {
  id: string;
  provider: Provider;
  scheduledAt: string;
  scheduled_at?: string;
  status: string;
  paymentStatus?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Booking Context Types
export type BookingContext = {
  fromAssessment: boolean;
  carePath?: 'recommended' | 'direct' | 'urgent';
  preferredSpecialization?: string;
} | null;

// API Response Types
export type ApiResponse<T> = {
  data: T;
  success?: boolean;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
};