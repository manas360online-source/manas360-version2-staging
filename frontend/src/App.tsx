import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import { AuthProvider } from './context/AuthContext';
import { Assessment } from './pages/Assessment'
import { ResultsPage } from './pages/Results'
import { CrisisPage } from './pages/Crisis'
import { OnboardingName } from './pages/OnboardingName'
import { OnboardingEmail } from './pages/OnboardingEmail'
import SessionSocketDemo from './components/SessionSocketDemo'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import SessionDetailPage from './pages/therapist/SessionDetailPage'
import ProtectedRoute from './components/ProtectedRoute'
import PlatformAdminRoute from './components/PlatformAdminRoute'
import CorporateRoute from './components/CorporateRoute'
import PatientDashboardLayout from './components/layout/PatientDashboardLayout'
import TherapistDashboardLayout from './components/layout/TherapistDashboardLayout'
import DashboardPage from './pages/patient/DashboardPage'
import ProvidersPage from './pages/patient/ProvidersPage'
import ProviderDetailPage from './pages/patient/ProviderDetailPage'
import BookSessionPage from './pages/patient/BookSessionPage'
import SessionsPage from './pages/patient/SessionsPage'
import PatientSessionDetailPage from './pages/patient/SessionDetailPage'
import AIChatPage from './pages/patient/AIChatPage'
import ProfilePage from './pages/patient/ProfilePage'
import SettingsPage from './pages/patient/SettingsPage'
import LiveSessionPage from './pages/patient/LiveSessionPage'
import AssessmentsPage from './pages/patient/AssessmentsPage'
import DocumentsPage from './pages/patient/DocumentsPage'
import SupportPage from './pages/patient/SupportPage'
import NotificationsPage from './pages/patient/NotificationsPage'
import CBTSessionPlayerPage from './pages/patient/CBTSessionPlayerPage'
import MoodTrackerPage from './pages/patient/MoodTrackerPage'
import MyProgressPage from './pages/patient/MyProgressPage'
import AdminPortalLoginPage from './pages/admin/AdminPortalLoginPage'
import AdminDashboardPage from './pages/admin/Dashboard'
import AdminShellLayout from './components/admin/AdminShellLayout'
import AdminEntryGate from './components/admin/AdminEntryGate'
import AdminUsersPage from './pages/admin/Users'
import AdminRolesPage from './pages/admin/Roles'
import AdminCompaniesPage from './pages/admin/Companies'
import AdminCompanySubscriptionsPage from './pages/admin/CompanySubscriptions'
import AdminCompanyReportsPage from './pages/admin/CompanyReports'
import AdminPlatformHealthPage from './pages/admin/PlatformHealth'
import AdminVerificationPage from './pages/admin/Verification'
import AdminRevenuePage from './pages/admin/Revenue'
import AdminSettingsPage from './pages/admin/Settings'
import ClinicalAssistantPage from './pages/admin/ClinicalAssistantPage'
import AdminSectionPage from './pages/admin/AdminSectionPage'
import CertificationsPage from './pages/CertificationsPage'
import TherapistDashboardPage from './pages/therapist/TherapistDashboardPage'
import TherapistPatientsPage from './pages/therapist/TherapistPatientsPage'
import TherapistSessionsPage from './pages/therapist/TherapistSessionsPage'
import TherapistSessionNotesPage from './pages/therapist/TherapistSessionNotesPage'
import TherapistEarningsPage from './pages/therapist/TherapistEarningsPage'
import TherapistPayoutHistoryPage from './pages/therapist/TherapistPayoutHistoryPage'
import TherapistMessagesPage from './pages/therapist/TherapistMessagesPage'
import TherapistExerciseLibraryPage from './pages/therapist/TherapistExerciseLibraryPage'
import TherapistAnalyticsPage from './pages/therapist/TherapistAnalyticsPage'
import TherapistSettingsPage from './pages/therapist/TherapistSettingsPage'
import TherapistHelpSupportPage from './pages/therapist/TherapistHelpSupportPage'
import TherapistProfilePage from './pages/therapist/Profile';
import TherapistMoodTrackingPage from './pages/therapist/TherapistMoodTrackingPage';
import TherapistCbtModulesPage from './pages/therapist/TherapistCbtModulesPage';
import TherapistAssessmentsPage from './pages/therapist/TherapistAssessmentsPage';
import TherapistResourcesPage from './pages/therapist/TherapistResourcesPage';
import TherapistCareTeamPage from './pages/therapist/TherapistCareTeamPage';
import TherapistRouteModeGuard from './components/therapist/dashboard/TherapistRouteModeGuard';
import PsychiatristDashboardLayout from './components/layout/PsychiatristDashboardLayout';
import PsychiatristDashboardPage from './pages/psychiatrist/PsychiatristDashboardPage';
import PsychiatristPatientsPage from './pages/psychiatrist/PsychiatristPatientsPage';
import PsychiatristAssessmentsPage from './pages/psychiatrist/PsychiatristAssessmentsPage';
import PsychiatristPrescriptionsPage from './pages/psychiatrist/PsychiatristPrescriptionsPage';
import PsychiatristParameterTrackingPage from './pages/psychiatrist/PsychiatristParameterTrackingPage';
import PsychiatristMedicationHistoryPage from './pages/psychiatrist/PsychiatristMedicationHistoryPage';
import PsychiatristCareTeamPage from './pages/psychiatrist/PsychiatristCareTeamPage';
import PsychiatristMessagesPage from './pages/psychiatrist/PsychiatristMessagesPage';
import PsychiatristReportsPage from './pages/psychiatrist/PsychiatristReportsPage';
import PsychiatristConsultationsPage from './pages/psychiatrist/PsychiatristConsultationsPage';
import PsychiatristDrugInteractionsPage from './pages/psychiatrist/PsychiatristDrugInteractionsPage';
import PsychiatristHelpSupportPage from './pages/psychiatrist/PsychiatristHelpSupportPage';
import PsychiatristConsultationAnalyticsPage from './pages/psychiatrist/PsychiatristConsultationAnalyticsPage';
import PsychiatristPrescriptionAnalyticsPage from './pages/psychiatrist/PsychiatristPrescriptionAnalyticsPage';
import PsychiatristMedicationLibraryPage from './pages/psychiatrist/PsychiatristMedicationLibraryPage';
import PsychiatristAssessmentTemplatesPage from './pages/psychiatrist/PsychiatristAssessmentTemplatesPage';
import PsychiatristEarningsPage from './pages/psychiatrist/PsychiatristEarningsPage';
import PsychiatristSettingsPage from './pages/psychiatrist/PsychiatristSettingsPage';
import CancellationRefundPolicyPage from './pages/legal/CancellationRefundPolicyPage';
import TermsOfUsePage from './pages/legal/TermsOfUsePage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import SubscribePage from './pages/SubscribePage';
import CorporateAnalyticsPage from './pages/corporate/CorporateAnalyticsPage';
import CorporateEmployeeDirectoryPage from './pages/corporate/CorporateEmployeeDirectoryPage';
import CorporateEnrollmentPage from './pages/corporate/CorporateEnrollmentPage';
import CorporateSessionAllocationPage from './pages/corporate/CorporateSessionAllocationPage';
import CorporateUtilizationReportsPage from './pages/corporate/CorporateUtilizationReportsPage';
import CorporateWellbeingReportsPage from './pages/corporate/CorporateWellbeingReportsPage';
import CorporateEngagementReportsPage from './pages/corporate/CorporateEngagementReportsPage';
import CorporateInvoicesPage from './pages/corporate/CorporateInvoicesPage';
import CorporatePaymentMethodsPage from './pages/corporate/CorporatePaymentMethodsPage';
import CorporatePlanPage from './pages/corporate/CorporatePlanPage';
import CorporateHelpPage from './pages/corporate/CorporateHelpPage';
import SSOSettingsPage from './pages/corporate/SSOSettingsPage';
import CorporateDashboardPage from './pages/corporate/CorporateDashboardPage';
import CorporateOnboardingPage from './pages/corporate/CorporateOnboardingPage';

interface AssessmentData {
  symptoms: string[];
  impact: string;
  selfHarm: string;
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
          <Route path="patients" element={<TherapistPatientsPage />} />
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
          <Route path="patients" element={<PsychiatristPatientsPage />} />
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
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin-portal/login" element={<AdminPortalLoginPage />} />
        <Route path="/corporate/login" element={<Navigate to="/auth/login" replace />} />
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
          <Route path="templates" element={<AdminSectionPage title="Template Management" description="Manage intervention templates, exercises, and standardized care workflows." bullets={['CBT template library', 'Versioning and rollback', 'Usage analytics', 'Quality review']} />} />
          <Route path="crisis-alerts" element={<AdminSectionPage title="Crisis Alerts" description="Triage and escalate high-risk events with defined safety protocols." bullets={['Suicide risk alerts', 'Escalate to psychiatrist', 'Emergency protocol status', 'Resolution timeline']} />} />

          <Route path="revenue" element={<AdminRevenuePage />} />
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
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="providers/:id" element={<ProviderDetailPage />} />
          <Route path="book/:providerId" element={<BookSessionPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:id" element={<PatientSessionDetailPage />} />
          <Route path="cbt/:sessionId" element={<CBTSessionPlayerPage />} />
          <Route path="sessions/:id/live" element={<LiveSessionPage />} />
          <Route path="messages" element={<AIChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="assessments" element={<AssessmentsPage />} />
          <Route path="billing" element={<Navigate to="/patient/settings?section=billing" replace />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="mood" element={<MoodTrackerPage />} />
          <Route path="progress" element={<MyProgressPage />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/patient/dashboard" replace />} />
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/providers" element={<Navigate to="/patient/providers" replace />} />
        <Route path="/providers/:id" element={<Navigate to="/patient/providers" replace />} />
        <Route path="/book/:providerId" element={<Navigate to="/patient/providers" replace />} />
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
    </AuthProvider>
  )
}

export default App
