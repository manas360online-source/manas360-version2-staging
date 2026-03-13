import { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GlobalFallbackLoader } from './components/ui/FallbackLoader';
const LandingPage = lazy(() => import('./pages/LandingPage'));
import { AuthProvider, getPostLoginRoute, useAuth } from './context/AuthContext';
import { Assessment } from './pages/Assessment'
import { ResultsPage } from './pages/Results'
import { CrisisPage } from './pages/Crisis'
import { OnboardingName } from './pages/OnboardingName'
import { OnboardingEmail } from './pages/OnboardingEmail'
const SessionSocketDemo = lazy(() => import('./components/SessionSocketDemo'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const SessionDetailPage = lazy(() => import('./pages/therapist/SessionDetailPage'));
import ProtectedRoute from './components/ProtectedRoute'
import PlatformAdminRoute from './components/PlatformAdminRoute'
import CorporateRoute from './components/CorporateRoute'
const PatientDashboardLayout = lazy(() => import('./components/layout/PatientDashboardLayout'));
const TherapistDashboardLayout = lazy(() => import('./components/layout/TherapistDashboardLayout'));
const DashboardPage = lazy(() => import('./pages/patient/DashboardPage'));
const BookSessionPage = lazy(() => import('./pages/patient/BookSessionPage'));
const SessionsPage = lazy(() => import('./pages/patient/SessionsPage'));
const PatientSessionDetailPage = lazy(() => import('./pages/patient/SessionDetailPage'));
const AIChatPage = lazy(() => import('./pages/patient/AIChatPage'));
const ProfilePage = lazy(() => import('./pages/patient/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/patient/SettingsPage'));
const LiveSessionPage = lazy(() => import('./pages/patient/LiveSessionPage'));
const AssessmentsPage = lazy(() => import('./pages/patient/AssessmentsPage'));
const DocumentsPage = lazy(() => import('./pages/patient/DocumentsPage'));
const ProgressPage = lazy(() => import('./pages/patient/ProgressPage'));
const SupportPage = lazy(() => import('./pages/patient/SupportPage'));
const CBTSessionPlayerPage = lazy(() => import('./pages/patient/CBTSessionPlayerPage'));
const TherapyPlanPage = lazy(() => import('./pages/patient/TherapyPlanPage'));
const ExercisesPage = lazy(() => import('./pages/patient/ExercisesPage'));

const PricingPage = lazy(() => import('./pages/patient/PricingPage'));
const PatientTimelinePage = lazy(() => import('./pages/patient/PatientTimelinePage'));
const MoodTrackerPage = lazy(() => import('./pages/patient/MoodTrackerPage'));
const ReportsPage = lazy(() => import('./pages/patient/ReportsPage'));
const NotificationsPage = lazy(() => import('./pages/patient/NotificationsPage'));
const SoundTherapyPage = lazy(() => import('./pages/patient/SoundTherapyPage'));
const ProviderMessagesPage = lazy(() => import('./pages/patient/ProviderMessagesPage'));
const PatientOnboardingPage = lazy(() => import('./pages/patient/PatientOnboardingPage'));
const DailyCheckInPage = lazy(() => import('./pages/patient/DailyCheckInPage'));
const AdminPortalLoginPage = lazy(() => import('./pages/admin/AdminPortalLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/Dashboard'));
const AdminShellLayout = lazy(() => import('./components/admin/AdminShellLayout'));
const AdminEntryGate = lazy(() => import('./components/admin/AdminEntryGate'));
const AdminUsersPage = lazy(() => import('./pages/admin/Users'));
const AdminRolesPage = lazy(() => import('./pages/admin/Roles'));
const AdminCompaniesPage = lazy(() => import('./pages/admin/Companies'));
const AdminCompanySubscriptionsPage = lazy(() => import('./pages/admin/CompanySubscriptions'));
const AdminCompanyReportsPage = lazy(() => import('./pages/admin/CompanyReports'));
const AdminPlatformHealthPage = lazy(() => import('./pages/admin/PlatformHealth'));
const AdminVerificationPage = lazy(() => import('./pages/admin/Verification'));
const AdminRevenuePage = lazy(() => import('./pages/admin/Revenue'));
const AdminSettingsPage = lazy(() => import('./pages/admin/Settings'));
const AdminPricingManagementPage = lazy(() => import('./pages/admin/PricingManagement'));
const ClinicalAssistantPage = lazy(() => import('./pages/admin/ClinicalAssistantPage'));
const AdminSectionPage = lazy(() => import('./pages/admin/AdminSectionPage'));
const AdminTemplatesPage = lazy(() => import('./pages/admin/Templates'));
const CertificationsPage = lazy(() => import('./pages/CertificationsPage'));
const TherapistDashboardPage = lazy(() => import('./pages/therapist/TherapistDashboardPage'));
const TherapistPatientsPage = lazy(() => import('./pages/therapist/TherapistPatientsPage'));
const TherapistSessionsPage = lazy(() => import('./pages/therapist/TherapistSessionsPage'));
const TherapistSessionNotesPage = lazy(() => import('./pages/therapist/TherapistSessionNotesPage'));
const TherapistEarningsPage = lazy(() => import('./pages/therapist/TherapistEarningsPage'));
const TherapistPayoutHistoryPage = lazy(() => import('./pages/therapist/TherapistPayoutHistoryPage'));
const TherapistMessagesPage = lazy(() => import('./pages/therapist/TherapistMessagesPage'));
const TherapistExerciseLibraryPage = lazy(() => import('./pages/therapist/TherapistExerciseLibraryPage'));
const TherapistAnalyticsPage = lazy(() => import('./pages/therapist/TherapistAnalyticsPage'));
const TherapistSettingsPage = lazy(() => import('./pages/therapist/TherapistSettingsPage'));
const TherapistHelpSupportPage = lazy(() => import('./pages/therapist/TherapistHelpSupportPage'));
const TherapistProfilePage = lazy(() => import('./pages/therapist/Profile'));
const TherapistMoodTrackingPage = lazy(() => import('./pages/therapist/TherapistMoodTrackingPage'));
const TherapistCbtModulesPage = lazy(() => import('./pages/therapist/TherapistCbtModulesPage'));
const TherapistAssessmentsPage = lazy(() => import('./pages/therapist/TherapistAssessmentsPage'));
const TherapistResourcesPage = lazy(() => import('./pages/therapist/TherapistResourcesPage'));
const TherapistCareTeamPage = lazy(() => import('./pages/therapist/TherapistCareTeamPage'));
import TherapistRouteModeGuard from './components/therapist/dashboard/TherapistRouteModeGuard';
const PsychiatristDashboardLayout = lazy(() => import('./components/layout/PsychiatristDashboardLayout'));
const PsychiatristDashboardPage = lazy(() => import('./pages/psychiatrist/PsychiatristDashboardPage'));
const PsychiatristPatientsPage = lazy(() => import('./pages/psychiatrist/PsychiatristPatientsPage'));
const PsychiatristAssessmentsPage = lazy(() => import('./pages/psychiatrist/PsychiatristAssessmentsPage'));
const PsychiatristPrescriptionsPage = lazy(() => import('./pages/psychiatrist/PsychiatristPrescriptionsPage'));
const PsychiatristParameterTrackingPage = lazy(() => import('./pages/psychiatrist/PsychiatristParameterTrackingPage'));
const PsychiatristMedicationHistoryPage = lazy(() => import('./pages/psychiatrist/PsychiatristMedicationHistoryPage'));
const PsychiatristCareTeamPage = lazy(() => import('./pages/psychiatrist/PsychiatristCareTeamPage'));
const PsychiatristMessagesPage = lazy(() => import('./pages/psychiatrist/PsychiatristMessagesPage'));
const PsychiatristReportsPage = lazy(() => import('./pages/psychiatrist/PsychiatristReportsPage'));
const PsychiatristConsultationsPage = lazy(() => import('./pages/psychiatrist/PsychiatristConsultationsPage'));
const PsychiatristDrugInteractionsPage = lazy(() => import('./pages/psychiatrist/PsychiatristDrugInteractionsPage'));
const PsychiatristHelpSupportPage = lazy(() => import('./pages/psychiatrist/PsychiatristHelpSupportPage'));
const PsychiatristConsultationAnalyticsPage = lazy(() => import('./pages/psychiatrist/PsychiatristConsultationAnalyticsPage'));
const PsychiatristPrescriptionAnalyticsPage = lazy(() => import('./pages/psychiatrist/PsychiatristPrescriptionAnalyticsPage'));
const PsychiatristMedicationLibraryPage = lazy(() => import('./pages/psychiatrist/PsychiatristMedicationLibraryPage'));
const PsychiatristAssessmentTemplatesPage = lazy(() => import('./pages/psychiatrist/PsychiatristAssessmentTemplatesPage'));
const PsychiatristEarningsPage = lazy(() => import('./pages/psychiatrist/PsychiatristEarningsPage'));
const PsychiatristSettingsPage = lazy(() => import('./pages/psychiatrist/PsychiatristSettingsPage'));
const PsychologistDashboardPage = lazy(() => import('./pages/psychologist/PsychologistDashboardPage'));
const PsychologistPatientsPage = lazy(() => import('./pages/psychologist/PsychologistPatientsPage'));
const PsychologistAssessmentsPage = lazy(() => import('./pages/psychologist/PsychologistAssessmentsPage'));
const PsychologistSchedulePage = lazy(() => import('./pages/psychologist/PsychologistSchedulePage'));
const PsychologistMessagesPage = lazy(() => import('./pages/psychologist/PsychologistMessagesPage'));
const PsychologistProfilePage = lazy(() => import('./pages/psychologist/PsychologistProfilePage'));
const PsychologistSettingsPage = lazy(() => import('./pages/psychologist/PsychologistSettingsPage'));
const PsychologistDiagnosticReportsPage = lazy(() => import('./pages/psychologist/PsychologistDiagnosticReportsPage'));
const PsychologistCognitiveTestsPage = lazy(() => import('./pages/psychologist/PsychologistCognitiveTestsPage'));
const PsychologistMoodAnalyticsPage = lazy(() => import('./pages/psychologist/PsychologistMoodAnalyticsPage'));
const PsychologistRiskMonitoringPage = lazy(() => import('./pages/psychologist/PsychologistRiskMonitoringPage'));
const PsychologistTreatmentPlansPage = lazy(() => import('./pages/psychologist/PsychologistTreatmentPlansPage'));
const PsychologistCareTeamPage = lazy(() => import('./pages/psychologist/PsychologistCareTeamPage'));
const PsychologistAiClinicalAssistantPage = lazy(() => import('./pages/psychologist/PsychologistAiClinicalAssistantPage'));
const PsychologistResearchInsightsPage = lazy(() => import('./pages/psychologist/PsychologistResearchInsightsPage'));
const PsychologistResourcesPage = lazy(() => import('./pages/psychologist/PsychologistResourcesPage'));
const PsychologistPersonalMoodPage = lazy(() => import('./pages/psychologist/PsychologistPersonalMoodPage'));
const PsychologistSelfAssessmentsPage = lazy(() => import('./pages/psychologist/PsychologistSelfAssessmentsPage'));
const PsychologistSelfCbtExercisesPage = lazy(() => import('./pages/psychologist/PsychologistSelfCbtExercisesPage'));
const PsychologistMeditationPage = lazy(() => import('./pages/psychologist/PsychologistMeditationPage'));
const PsychologistJournalPage = lazy(() => import('./pages/psychologist/PsychologistJournalPage'));
const PsychologistInsightsPage = lazy(() => import('./pages/psychologist/PsychologistInsightsPage'));
const PsychologistAiChatPage = lazy(() => import('./pages/psychologist/PsychologistAiChatPage'));
const ProviderDocumentVerificationPage = lazy(() => import('./pages/providers/ProviderDocumentVerificationPage'));
import ProviderDocumentVerificationGuard from './components/providers/ProviderDocumentVerificationGuard';
const CancellationRefundPolicyPage = lazy(() => import('./pages/legal/CancellationRefundPolicyPage'));
const TermsOfUsePage = lazy(() => import('./pages/legal/TermsOfUsePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage'));
const CorporateAnalyticsPage = lazy(() => import('./pages/corporate/CorporateAnalyticsPage'));
const CorporateEmployeeDirectoryPage = lazy(() => import('./pages/corporate/CorporateEmployeeDirectoryPage'));
const CorporateEnrollmentPage = lazy(() => import('./pages/corporate/CorporateEnrollmentPage'));
const CorporateSessionAllocationPage = lazy(() => import('./pages/corporate/CorporateSessionAllocationPage'));
const CorporateUtilizationReportsPage = lazy(() => import('./pages/corporate/CorporateUtilizationReportsPage'));
const CorporateWellbeingReportsPage = lazy(() => import('./pages/corporate/CorporateWellbeingReportsPage'));
const CorporateEngagementReportsPage = lazy(() => import('./pages/corporate/CorporateEngagementReportsPage'));
const CorporateInvoicesPage = lazy(() => import('./pages/corporate/CorporateInvoicesPage'));
const CorporatePaymentMethodsPage = lazy(() => import('./pages/corporate/CorporatePaymentMethodsPage'));
const CorporatePlanPage = lazy(() => import('./pages/corporate/CorporatePlanPage'));
const CorporateHelpPage = lazy(() => import('./pages/corporate/CorporateHelpPage'));
const SSOSettingsPage = lazy(() => import('./pages/corporate/SSOSettingsPage'));
const CorporateDashboardPage = lazy(() => import('./pages/corporate/CorporateDashboardPage'));
const CorporateOnboardingPage = lazy(() => import('./pages/corporate/CorporateOnboardingPage'));

interface AssessmentData {
  symptoms?: string[];
  impact?: string;
  selfHarm?: string;
  totalScore?: number;
  severityLevel?: string;
  interpretation?: string;
  recommendation?: string;
  action?: string;
}

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={getPostLoginRoute(user)} replace />;
}

function App() {
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [userName, setUserName] = useState<string>('');

  const handleAssessmentSubmit = (data: AssessmentData, isCritical: boolean) => {
    setAssessmentData(data);
    if (isCritical) {
      window.location.href = '/#/crisis';
    } else {
      window.location.href = '/#/results';
    }
  };

  const handleOnboardingName = (data: { firstName: string; lastName: string; pronouns: string }) => {
    setUserName(data.firstName);
    window.location.href = '/#/onboarding/email';
  };

  return (
    <AuthProvider>
      <Suspense fallback={<GlobalFallbackLoader />}>
        <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/assessment" element={<Assessment onSubmit={handleAssessmentSubmit} />} />
      <Route path="/certifications" element={<CertificationsPage />} />
      <Route path="/results" element={<ResultsPage data={assessmentData} />} />
      <Route path="/crisis" element={<CrisisPage />} />
      <Route path="/onboarding/name" element={<OnboardingName onNext={handleOnboardingName} />} />
      <Route path="/onboarding/email" element={<OnboardingEmail userName={userName} />} />
        <Route
          path="/session-demo"
          element={
            <ProtectedRoute>
              <SessionSocketDemo sessionId={new URLSearchParams(window.location.hash.split('?')[1]).get('sessionId')} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/therapist-dashboard"
          element={
            <ProtectedRoute>
              <Navigate to="/therapist/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/therapist"
          element={
            <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'coach']}>
              <TherapistDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TherapistDashboardPage />} />
          <Route
            path="patients"
            element={
              <ProviderDocumentVerificationGuard redirectTo="/therapist/document-verification">
                <TherapistPatientsPage />
              </ProviderDocumentVerificationGuard>
            }
          />
          <Route path="document-verification" element={<ProviderDocumentVerificationPage />} />
          <Route path="sessions" element={<TherapistSessionsPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route
            path="session-notes"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']}>
                <TherapistSessionNotesPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="earnings"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']}>
                <TherapistEarningsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="payout-history"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']}>
                <TherapistPayoutHistoryPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route path="messages" element={<TherapistMessagesPage />} />
          <Route
            path="exercise-library"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']}>
                <TherapistExerciseLibraryPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="cbt-modules"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']}>
                <TherapistCbtModulesPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="assessments"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']}>
                <TherapistAssessmentsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="mood-tracking"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']}>
                <TherapistMoodTrackingPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="resources"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']}>
                <TherapistResourcesPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="care-team"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']}>
                <TherapistCareTeamPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="analytics"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']}>
                <TherapistAnalyticsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="profile"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']}>
                <TherapistProfilePage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="settings"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']}>
                <TherapistSettingsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="help-support"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']}>
                <TherapistHelpSupportPage />
              </TherapistRouteModeGuard>
            }
          />
        </Route>

        <Route
          path="/psychiatrist"
          element={
            <ProtectedRoute allowedRoles={['psychiatrist']}>
              <PsychiatristDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PsychiatristDashboardPage />} />
          <Route
            path="patients"
            element={
              <ProviderDocumentVerificationGuard redirectTo="/psychiatrist/document-verification">
                <PsychiatristPatientsPage />
              </ProviderDocumentVerificationGuard>
            }
          />
          <Route path="document-verification" element={<ProviderDocumentVerificationPage />} />
          <Route
            path="consultations"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristConsultationsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="assessments"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristAssessmentsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="prescriptions"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristPrescriptionsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="drug-interactions"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristDrugInteractionsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="parameter-tracking"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristParameterTrackingPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="medication-history"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristMedicationHistoryPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="care-team"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristCareTeamPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route path="messages" element={<PsychiatristMessagesPage />} />
          <Route
            path="reports"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristReportsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="consultation-analytics"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristConsultationAnalyticsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="prescription-analytics"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristPrescriptionAnalyticsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="medication-library"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristMedicationLibraryPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="assessment-templates"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristAssessmentTemplatesPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="earnings"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristEarningsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="settings"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychiatrist/dashboard">
                <PsychiatristSettingsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route path="help-support" element={<PsychiatristHelpSupportPage />} />
        </Route>

        <Route
          path="/psychologist"
          element={
            <ProtectedRoute allowedRoles={['psychologist']}>
              <TherapistDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PsychologistDashboardPage />} />
          <Route
            path="patients"
            element={
              <TherapistRouteModeGuard allowedModes={['professional', 'practice']} redirectTo="/psychologist/dashboard">
                <ProviderDocumentVerificationGuard redirectTo="/psychologist/document-verification">
                  <PsychologistPatientsPage />
                </ProviderDocumentVerificationGuard>
              </TherapistRouteModeGuard>
            }
          />
          <Route path="document-verification" element={<ProviderDocumentVerificationPage />} />
          <Route
            path="assessments"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistAssessmentsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="diagnostic-reports"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistDiagnosticReportsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="cognitive-tests"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistCognitiveTestsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="mood-analytics"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistMoodAnalyticsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="risk-monitoring"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistRiskMonitoringPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="treatment-plans"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistTreatmentPlansPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="care-team"
            element={
              <TherapistRouteModeGuard allowedModes={['professional', 'practice']} redirectTo="/psychologist/dashboard">
                <PsychologistCareTeamPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="ai-clinical-assistant"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistAiClinicalAssistantPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="research-insights"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistResearchInsightsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="resources"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistResourcesPage />
              </TherapistRouteModeGuard>
            }
          />

          <Route
            path="personal-mood"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychologist/dashboard">
                <PsychologistPersonalMoodPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="self-assessments"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychologist/dashboard">
                <PsychologistSelfAssessmentsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="self-cbt-exercises"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychologist/dashboard">
                <PsychologistSelfCbtExercisesPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="meditation"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychologist/dashboard">
                <PsychologistMeditationPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="journal"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychologist/dashboard">
                <PsychologistJournalPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="insights"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychologist/dashboard">
                <PsychologistInsightsPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="ai-chat"
            element={
              <TherapistRouteModeGuard allowedModes={['practice']} redirectTo="/psychologist/dashboard">
                <PsychologistAiChatPage />
              </TherapistRouteModeGuard>
            }
          />

          <Route path="reports" element={<Navigate to="/psychologist/diagnostic-reports" replace />} />
          <Route path="tests" element={<Navigate to="/psychologist/cognitive-tests" replace />} />
          <Route
            path="schedule"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistSchedulePage />
              </TherapistRouteModeGuard>
            }
          />
          <Route
            path="messages"
            element={
              <TherapistRouteModeGuard allowedModes={['professional']} redirectTo="/psychologist/dashboard">
                <PsychologistMessagesPage />
              </TherapistRouteModeGuard>
            }
          />
          <Route path="profile" element={<PsychologistProfilePage />} />
          <Route path="settings" element={<PsychologistSettingsPage />} />
        </Route>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin-portal/login" element={<AdminPortalLoginPage />} />
        <Route path="/corporate/login" element={<Navigate to="/auth/login" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PlatformAdminRoute>
              <AdminEntryGate />
            </PlatformAdminRoute>
          }
        >
          <Route element={<AdminShellLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="platform-analytics" element={<AdminSectionPage title="Platform Analytics" description="Growth, monetization, retention, and operational analytics across the platform." bullets={['User growth by role', 'Revenue trends and cohorts', 'Session completion and drop rates', 'Subscription funnel and churn intelligence']} />} />

          <Route path="user-approvals" element={<AdminSectionPage title="User Approvals" description="Approve, reject, and monitor pending user onboarding requests." bullets={['Pending approval queue', 'KYC validation status', 'Approval SLA tracking', 'Escalation workflow']} />} />
          <Route path="therapist-verification" element={<AdminVerificationPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="roles" element={<AdminRolesPage />} />

          <Route path="companies" element={<AdminCompaniesPage />} />
          <Route path="company-subscriptions" element={<AdminCompanySubscriptionsPage />} />
          <Route path="company-reports" element={<AdminCompanyReportsPage />} />

          <Route path="live-sessions" element={<AdminSectionPage title="Live Sessions" description="Monitor active sessions, disruptions, and quality metrics in real-time." bullets={['Live session monitor', 'Drop/disconnect alerts', 'Therapist capacity overview', 'Session intervention controls']} />} />
          <Route path="templates" element={<AdminTemplatesPage />} />
          <Route path="crisis-alerts" element={<AdminSectionPage title="Crisis Alerts" description="Triage and escalate high-risk events with defined safety protocols." bullets={['Suicide risk alerts', 'Escalate to psychiatrist', 'Emergency protocol status', 'Resolution timeline']} />} />

          <Route path="revenue" element={<AdminRevenuePage />} />
          <Route path="pricing-management" element={<AdminPricingManagementPage />} />
          <Route path="payouts" element={<AdminSectionPage title="Payouts" description="Review provider payouts, schedules, holds, and reconciliation exceptions." bullets={['Scheduled payout runs', 'Manual adjustments', 'Failed transfer handling', 'Payout audit log']} />} />
          <Route path="invoices" element={<AdminSectionPage title="Invoices" description="Track invoices, collections, refunds, and payment disputes." bullets={['Invoice lifecycle tracking', 'Corporate and individual invoices', 'Refund analytics', 'Collection status by segment']} />} />

          <Route path="user-growth" element={<AdminSectionPage title="User Growth Analytics" description="Analyze growth trends across patients, therapists, corporate users, and partners." bullets={['Monthly active users by role', 'Acquisition vs activation', 'Retention cohorts', 'Regional growth patterns']} />} />
          <Route path="session-analytics" element={<AdminSectionPage title="Session Analytics" description="Track platform-wide session quality, throughput, and completion metrics." bullets={['Sessions per day/week/month', 'Completion and dropout rates', 'Average session duration', 'Service line distribution']} />} />
          <Route path="therapist-performance" element={<AdminSectionPage title="Therapist Performance" description="Benchmark provider outcomes, ratings, and engagement effectiveness." bullets={['Sessions completed', 'Patient ratings', 'Improvement score trend', 'Retention and revisit rates']} />} />
          <Route path="mental-health-trends" element={<AdminSectionPage title="Mental Health Trends" description="Monitor category-level trends to plan interventions and workforce readiness." bullets={['Depression and anxiety trends', 'Sleep and stress categories', 'High-risk cluster detection', 'Program outcome comparisons']} />} />

          <Route path="support-tickets" element={<AdminSectionPage title="Support Tickets" description="Operational support queue with category insights and SLA compliance." bullets={['Open vs resolved volume', 'Ticket category analytics', 'Average resolution time', 'Satisfaction tracking']} />} />
          <Route path="feedback" element={<AdminSectionPage title="Feedback" description="Collect and analyze user and provider feedback loops for product quality." bullets={['NPS and CSAT trends', 'Feedback themes', 'Feature request clusters', 'Escalation tagging']} />} />

          <Route path="audit-logs" element={<AdminSectionPage title="Audit Logs" description="Security-grade activity timeline for admin actions and sensitive operations." bullets={['User login and role changes', 'Account suspension events', 'Payment and billing actions', 'Immutable audit export']} />} />
          <Route path="compliance" element={<AdminSectionPage title="Compliance" description="Track DPDPA/HIPAA controls, policy adherence, and privacy operations." bullets={['Consent lifecycle logs', 'Data access events', 'Compliance readiness status', 'Policy exception management']} />} />
          <Route path="data-requests" element={<AdminSectionPage title="Data Requests" description="Manage export, deletion, and data-subject requests with approvals." bullets={['Export requests', 'Deletion requests', 'Legal hold checks', 'Request SLA and closure']} />} />

          <Route path="platform-health" element={<AdminPlatformHealthPage />} />
          <Route path="ai-monitoring" element={<AdminSectionPage title="AI Monitoring" description="Supervise AI safety, moderation outcomes, and risk alert precision." bullets={['Self-harm detection quality', 'Prompt/response moderation', 'Flagged response queue', 'Model safety policy controls']} />} />
          <Route path="clinical-assistant" element={<ClinicalAssistantPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />

          </Route>
        </Route>
        <Route
          path="/corporate/dashboard"
          element={
            <CorporateRoute>
              <CorporateDashboardPage />
            </CorporateRoute>
          }
        />
        <Route path="/corporate" element={<CorporateOnboardingPage />} />
        <Route
          path="/corporate/analytics"
          element={
            <CorporateRoute>
              <CorporateAnalyticsPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/employees/directory"
          element={
            <CorporateRoute>
              <CorporateEmployeeDirectoryPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/employees/enrollment"
          element={
            <CorporateRoute>
              <CorporateEnrollmentPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/employees/allocation"
          element={
            <CorporateRoute>
              <CorporateSessionAllocationPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/reports/utilization"
          element={
            <CorporateRoute>
              <CorporateUtilizationReportsPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/reports/wellbeing"
          element={
            <CorporateRoute>
              <CorporateWellbeingReportsPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/reports/engagement"
          element={
            <CorporateRoute>
              <CorporateEngagementReportsPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/billing/invoices"
          element={
            <CorporateRoute>
              <CorporateInvoicesPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/billing/payment-methods"
          element={
            <CorporateRoute>
              <CorporatePaymentMethodsPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/billing/plan"
          element={
            <CorporateRoute>
              <CorporatePlanPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/account/help"
          element={
            <CorporateRoute>
              <CorporateHelpPage />
            </CorporateRoute>
          }
        />
        <Route
          path="/corporate/sso"
          element={
            <CorporateRoute>
              <SSOSettingsPage />
            </CorporateRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/signup" replace />} />

        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="onboarding" element={<PatientOnboardingPage />} />
          <Route path="therapy-plan" element={<TherapyPlanPage />} />
          <Route path="care-team" element={<Navigate to="/patient/sessions" replace />} />
          <Route path="providers" element={<Navigate to="/patient/sessions" replace />} />
          <Route path="providers/:id" element={<Navigate to="/patient/sessions" replace />} />
          <Route path="book/:providerId" element={<BookSessionPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:id" element={<PatientSessionDetailPage />} />
          <Route path="cbt/:sessionId" element={<CBTSessionPlayerPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="sessions/:id/live" element={<LiveSessionPage />} />
          <Route path="mood" element={<MoodTrackerPage />} />
          <Route path="sound-therapy" element={<SoundTherapyPage />} />
          <Route path="provider-messages" element={<ProviderMessagesPage />} />
          <Route path="messages" element={<AIChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="assessments" element={<AssessmentsPage />} />
          <Route path="assessment-reports" element={<Navigate to="/patient/progress?tab=clinical" replace />} />
          <Route path="billing" element={<Navigate to="/patient/settings?section=billing" replace />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="timeline" element={<PatientTimelinePage />} />
          <Route path="insights" element={<Navigate to="/patient/progress?tab=mood" replace />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="check-in" element={<DailyCheckInPage />} />
          </Route>
        <Route path="/providers/:id" element={<Navigate to="/patient/sessions" replace />} />
        <Route path="/book/:providerId" element={<Navigate to="/patient/sessions" replace />} />
        <Route path="/sessions" element={<Navigate to="/patient/sessions" replace />} />
        <Route path="/sessions/:id/live" element={<Navigate to="/patient/sessions" replace />} />
        <Route path="/ai-chat" element={<Navigate to="/patient/messages" replace />} />
        <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
        <Route path="/settings" element={<Navigate to="/patient/settings" replace />} />
        <Route path="/terms" element={<TermsOfUsePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/refunds" element={<CancellationRefundPolicyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
