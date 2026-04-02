import { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GlobalFallbackLoader } from './components/ui/FallbackLoader';
import ScrollToTop from './components/common/ScrollToTop';
import { GlobalAudioProvider } from './context/GlobalAudioContext';
import GlobalAudioPlayerConsole from './components/audio/GlobalAudioPlayerConsole';
const LandingPage = lazy(() => import('./pages/LandingPage'));
import { AuthProvider, getPostLoginRoute, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Assessment } from './pages/Assessment'
import { ResultsPage } from './pages/Results'
import { CrisisPage } from './pages/Crisis'
import { OnboardingName } from './pages/OnboardingName'
import { OnboardingEmail } from './pages/OnboardingEmail'
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
import ProtectedRoute from './components/ProtectedRoute'
import PlatformAdminRoute from './components/PlatformAdminRoute'
import CorporateRoute from './components/CorporateRoute'
const PatientDashboardLayout = lazy(() => import('./components/layout/PatientDashboardLayout'));
const DashboardPage = lazy(() => import('./pages/patient/DashboardPage'));
const BookSessionPage = lazy(() => import('./pages/patient/BookSessionPage'));
const SessionsPage = lazy(() => import('./pages/patient/SessionsPage'));
const PatientSessionDetailPage = lazy(() => import('./pages/patient/SessionDetailPage'));
const AIChatPage = lazy(() => import('./pages/patient/AIChatPage'));
const ProfilePage = lazy(() => import('./pages/patient/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/patient/SettingsPage'));
const LiveSessionPage = lazy(() => import('./pages/patient/LiveSessionPage'));
const DocumentsPage = lazy(() => import('./pages/patient/DocumentsPage'));
const ProgressPage = lazy(() => import('./pages/patient/ProgressPage'));
const SupportPage = lazy(() => import('./pages/patient/SupportPage'));
const TherapyPlanPage = lazy(() => import('./pages/patient/TherapyPlanPage'));
const PricingPage = lazy(() => import('./pages/patient/PricingPage'));
const SubscriptionAddonsPage = lazy(() => import('./pages/patient/SubscriptionAddonsPage'));
const SubscriptionCheckoutPage = lazy(() => import('./pages/patient/SubscriptionCheckoutPage'));
const SubscriptionConfirmationPage = lazy(() => import('./pages/patient/SubscriptionConfirmationPage'));
const PatientTimelinePage = lazy(() => import('./pages/patient/PatientTimelinePage'));
const ReportsPage = lazy(() => import('./pages/patient/ReportsPage'));
const PatientReportDownloadPage = lazy(() => import('./pages/patient/PatientReportDownloadPage'));
const NotificationsPage = lazy(() => import('./pages/patient/NotificationsPage'));
const SoundTherapyPage = lazy(() => import('./pages/patient/SoundTherapyPage'));
const SleepTherapyPage = lazy(() => import('./pages/patient/SleepTherapyPage'));
const WellnessLibraryPage = lazy(() => import('./pages/patient/WellnessLibraryPage'));
const BuddyChatPage = lazy(() => import('./pages/patient/BuddyChatPage'));
const ProviderMessagesPage = lazy(() => import('./pages/patient/ProviderMessagesPage'));
const PatientOnboardingPage = lazy(() => import('./pages/patient/PatientOnboardingPage'));
const DailyCheckInPage = lazy(() => import('./pages/patient/DailyCheckInPage'));
const HitASixerGamePage = lazy(() => import('./pages/patient/HitASixerGamePage'));
const WalletPage = lazy(() => import('./pages/patient/WalletPage'));
const GroupTherapySessionsPage = lazy(() => import('./pages/patient/GroupTherapySessionsPage'));
const VideoSessionPage = lazy(() => import('./pages/shared/VideoSessionPage'));
const AdminPortalLoginPage = lazy(() => import('./pages/admin/AdminPortalLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/Dashboard'));
const AdminDataPrivacyHubPage = lazy(() => import('./pages/admin/AdminDataPrivacyHubPage'));
const CentralizedLegalDocumentManagement = lazy(() => import('./pages/admin/CentralizedLegalDocumentManagement'));
const ComplianceDashboard = lazy(() => import('./pages/admin/ComplianceDashboard'));
const LegalDocuments = lazy(() => import('./pages/admin/LegalDocuments'));
const AdminShellLayout = lazy(() => import('./components/admin/AdminShellLayout'));
const AdminEntryGate = lazy(() => import('./components/admin/AdminEntryGate'));
const AdminUsersPage = lazy(() => import('./pages/admin/Users'));
const AdminRolesPage = lazy(() => import('./pages/admin/Roles'));
const AdminCompaniesPage = lazy(() => import('./pages/admin/Companies'));
const AdminCompanySubscriptionsPage = lazy(() => import('./pages/admin/CompanySubscriptions'));
const AdminReportsPage = lazy(() => import('./pages/admin/Reports'));
const PlatformAnalytics = lazy(() => import('./pages/admin/PlatformAnalytics'));
const AdminPlatformHealthPage = lazy(() => import('./pages/admin/PlatformHealth'));
const TherapistVerification = lazy(() => import('./pages/admin/TherapistVerification'));
const AdminPendingProvidersPage = lazy(() => import('./pages/admin/PendingProviders'));
const AdminRevenuePage = lazy(() => import('./pages/admin/Revenue'));
const AdminSettingsPage = lazy(() => import('./pages/admin/Settings'));
const AdminPricingManagementPage = lazy(() => import('./pages/admin/PricingManagement'));
const ClinicalAssistantPage = lazy(() => import('./pages/admin/ClinicalAssistantPage'));
const AdminSectionPage = lazy(() => import('./pages/admin/AdminSectionPage'));
const AdminTemplatesPage = lazy(() => import('./pages/admin/Templates'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/Payouts'));
const ZohoDeskPanel = lazy(() => import('./pages/admin/ZohoDeskPanel'));
const OfferMarqueeEditor = lazy(() => import('./pages/admin/OfferMarqueeEditor'));
const PricingContracts = lazy(() => import('./pages/admin/PricingContracts'));
const CrisisConsole = lazy(() => import('./pages/admin/CrisisConsole'));
const AuditTrail = lazy(() => import('./pages/admin/AuditTrail'));
const GroupManagement = lazy(() => import('./pages/admin/GroupManagement'));
const PricingVersions = lazy(() => import('./pages/admin/PricingVersions'));
const TherapistPerformance = lazy(() => import('./pages/admin/TherapistPerformance'));
const SessionAnalytics = lazy(() => import('./pages/admin/SessionAnalytics'));
const UserGrowthAnalytics = lazy(() => import('./pages/admin/UserGrowthAnalytics'));
const RoleManagement = lazy(() => import('./pages/admin/RoleManagement'));
const UserApprovals = lazy(() => import('./pages/admin/UserApprovals'));
const LiveSessions = lazy(() => import('./pages/admin/LiveSessions'));
const Feedback = lazy(() => import('./pages/admin/Feedback'));
const AllUsers = lazy(() => import('./pages/admin/AllUsers'));
const CertificationsPage = lazy(() => import('./pages/CertificationsPage'));
const CertificationLandingPage = lazy(() => import('./pages/CertificationLandingPage'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const RefundAndCancellationPolicy = lazy(() => import('./pages/legal/RefundAndCancellationPolicy'));
const TherapistICAgr = lazy(() => import('./pages/legal/TherapistICAgr'));
const TherapistNDA = lazy(() => import('./pages/legal/TherapistNDA'));
const TherapistDataProcessingAgr = lazy(() => import('./pages/legal/TherapistDataProcessingAgr'));
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
const MyDigitalClinicPage = lazy(() => import('./pages/clinic/MyDigitalClinicPage'));
const ProviderCalendarPage = lazy(() => import('./pages/provider/Calendar'));
const ProviderInboxPage = lazy(() => import('./pages/provider/Messages'));
const ProviderEarningsPage = lazy(() => import('./pages/provider/Earnings'));
const ProviderSettingsPage = lazy(() => import('./pages/provider/Settings'));
const ProviderDashboard = lazy(() => import('./pages/provider/Dashboard/ProviderDashboard'));
const ProviderPortalPage = lazy(() => import('./pages/provider/ProviderPortalPage'));
const ProviderSubscriptionPage = lazy(() => import('./pages/provider/ProviderSubscriptionPage'));
const ProviderSubscriptionAddonsPage = lazy(() => import('./pages/provider/ProviderSubscriptionAddonsPage'));
const ProviderSubscriptionCheckoutPage = lazy(() => import('./pages/provider/ProviderSubscriptionCheckoutPage'));
const ProviderSubscriptionConfirmationPage = lazy(() => import('./pages/provider/ProviderSubscriptionConfirmationPage'));
const AppointmentRequestsPage = lazy(() => import('./pages/provider/AppointmentRequests'));
const ProviderOnboardingPage = lazy(() => import('./pages/provider/ProviderOnboardingPage'));
const ProviderVerificationPendingPage = lazy(() => import('./pages/provider/ProviderVerificationPendingPage'));
const TherapistLiveSessionPage = lazy(() => import('./pages/therapist/TherapistLiveSessionPage'));

const PaymentStatusPage = lazy(() => import('./pages/shared/PaymentStatus'));
const HubLayout = lazy(() => import('./components/layout/HubLayout'));
const PatientList = lazy(() => import('./pages/provider/Patients/PatientList'));
const PatientChartLayout = lazy(() => import('./components/layout/PatientChartLayout'));
const ChartOverview = lazy(() => import('./pages/provider/Patients/Tabs/ChartOverview'));
const SessionNotes = lazy(() => import('./pages/provider/Patients/Tabs/SessionNotes'));
const Assessments = lazy(() => import('./pages/provider/Patients/Tabs/Assessments'));
const PlanStudio = lazy(() => import('./pages/provider/Patients/Tabs/PlanStudio'));
const Prescriptions = lazy(() => import('./pages/provider/PrescriptionGateway'));
const LabOrders = lazy(() => import('./pages/provider/Patients/Tabs/LabOrders'));
const GoalsAndHabits = lazy(() => import('./pages/provider/Patients/Tabs/GoalsAndHabits'));

// Certification Pages
const CertificationLayout = lazy(() => import('./components/CertificationLayout'));
const MyCertificationsPage = lazy(() => import('./pages/MyCertificationsPage'));
const CheckoutPage = lazy(() => import('./pages/CertificationCheckoutPage').then(m => ({ default: m.CheckoutPage })));
const EnrollmentRegistrationPage = lazy(() => import('./pages/EnrollmentRegistrationPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('./pages/PaymentFailedPage'));
const JourneyWireframePage = lazy(() => import('./pages/JourneyWireframePage'));
const EnrollmentConfirmedPage = lazy(() => import('./pages/EnrollmentConfirmedPage'));
const CertificationDetailsPage = lazy(() => import('./pages/CertificationDetailsPage').then(m => ({ default: m.CertificationDetailsPage })));
const CertificationModulesPage = lazy(() => import('./pages/CertificationModulesPage').then(m => ({ default: m.CertificationModulesPage })));
const CertificationLessonPage = lazy(() => import('./pages/CertificationLessonPage').then(m => ({ default: m.CertificationLessonPage })));
const CertificationAssignmentPage = lazy(() => import('./pages/CertificationAssignmentPage').then(m => ({ default: m.CertificationAssignmentPage })));
const CertificationQuizPage = lazy(() => import('./pages/CertificationQuizPage').then(m => ({ default: m.CertificationQuizPage })));
const CertificationCertificatePage = lazy(() => import('./pages/CertificationCertificatePage'));
const CertificateVerificationPage = lazy(() => import('./pages/CertificateVerificationPage'));
const LeadBoastDashboard = lazy(() => import('./pages/LeadBoastDashboard'));

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

function AdminDashboardGate() {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase().replace(/_/g, '');
  if (role === 'complianceofficer') {
    return <Navigate to="/admin/compliance" replace />;
  }
  return <AdminDashboardPage />;
}

function LegacyProviderLiveSessionRedirect() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  return <Navigate to={`/provider/live-session/${sessionId}`} replace />;
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
      <SocketProvider>
        <GlobalAudioProvider>
          <Toaster
            position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '16px',
              background: '#F8FCFA',
              color: '#23313A',
              border: '1px solid #D8EAE1',
              boxShadow: '0 12px 32px rgba(23, 39, 54, 0.12)',
            },
            success: {
              iconTheme: {
                primary: '#2F7A5F',
                secondary: '#F8FCFA',
              },
            },
          }}
        />
        <Suspense fallback={<GlobalFallbackLoader />}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/assessment" element={<Assessment onSubmit={handleAssessmentSubmit} />} />

            {/* ── Certification Sub-App ── */}
            <Route element={<CertificationLayout />}>
              <Route path="/certifications" element={<CertificationLandingPage />} />
              <Route path="/certifications/:slug" element={<CertificationDetailsPage />} />
              <Route path="/certifications/details" element={<CertificationsPage />} />
              <Route path="/my-certifications" element={<MyCertificationsPage />} />
              <Route path="/checkout/:slug" element={<CheckoutPage />} />
              <Route path="/registration" element={<EnrollmentRegistrationPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/payment-failed" element={<PaymentFailedPage />} />
              <Route path="/journey" element={<JourneyWireframePage />} />

              {/* ── Both /confirmed (legacy) and /enrollment-confirmed point to same page ── */}
              <Route path="/confirmed" element={<EnrollmentConfirmedPage />} />
              <Route path="/enrollment-confirmed" element={<EnrollmentConfirmedPage />} />

              <Route path="/certifications/modules/:enrollmentId" element={<CertificationModulesPage />} />
              <Route path="/certifications/lessons/:lessonId" element={<CertificationLessonPage />} />
              <Route path="/certifications/assignments/:assignmentId" element={<CertificationAssignmentPage />} />
              <Route path="/certifications/quiz/:enrollmentId" element={<CertificationQuizPage />} />
              <Route path="/certifications/certificate/:enrollmentId" element={<CertificationCertificatePage />} />
              <Route path="/dashboard" element={<LeadBoastDashboard />} />
            </Route>

            <Route path="/results" element={<ResultsPage data={assessmentData} />} />
            <Route path="/crisis" element={<CrisisPage />} />
            <Route path="/my-digital-clinic" element={<MyDigitalClinicPage />} />
            <Route path="/clinic" element={<Navigate to="/my-digital-clinic" replace />} />
            <Route path="/onboarding/name" element={<OnboardingName onNext={handleOnboardingName} />} />
            <Route path="/onboarding/email" element={<OnboardingEmail userName={userName} />} />
            
            <Route
              path="/therapist-dashboard"
              element={
                <ProtectedRoute>
                  <Navigate to="/provider/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <HubLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ProviderDashboard />} />
              <Route path="portal" element={<ProviderPortalPage />} />
              <Route path="patients" element={<PatientList />} />
              <Route path="patient/:patientId" element={<PatientChartLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<ChartOverview />} />
                <Route path="notes" element={<SessionNotes />} />
                <Route path="session-notes" element={<Navigate to="../notes" replace />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="plan-builder" element={<PlanStudio />} />
                <Route path="goals" element={<GoalsAndHabits />} />
                <Route path="prescriptions" element={<Prescriptions />} />
                <Route path="labs" element={<LabOrders />} />
                <Route path="lab-orders" element={<Navigate to="../labs" replace />} />
                <Route path="clinical-notes" element={<SessionNotes />} />
              </Route>
              <Route path="calendar" element={<ProviderCalendarPage />} />
              <Route path="notes" element={<Navigate to="patient/123/notes" replace />} />
              <Route path="assessments" element={<Navigate to="patient/123/assessments" replace />} />
              <Route path="prescriptions" element={<Navigate to="patient/123/prescriptions" replace />} />
              <Route path="labs" element={<Navigate to="patient/123/labs" replace />} />
              <Route path="goals" element={<Navigate to="patient/123/goals" replace />} />
              <Route path="earnings" element={<ProviderEarningsPage />} />
              <Route path="appointments" element={<AppointmentRequestsPage />} />
              <Route path="subscription" element={<ProviderSubscriptionPage />} />
              <Route path="platform-payment" element={<Navigate to="/provider/subscription" replace />} />
              <Route path="plans" element={<ProviderSubscriptionPage />} />
              <Route path="plans/addons" element={<ProviderSubscriptionAddonsPage />} />
              <Route path="checkout" element={<ProviderSubscriptionCheckoutPage />} />
              <Route path="confirmation" element={<ProviderSubscriptionConfirmationPage />} />
              <Route path="messages" element={<ProviderInboxPage />} />

              <Route path="settings" element={<ProviderSettingsPage />} />
              <Route path="live-session/:sessionId" element={<TherapistLiveSessionPage />} />
            </Route>
            <Route
              path="/onboarding/provider-setup"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <ProviderOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/provider/onboarding" element={<Navigate to="/onboarding/provider-setup" replace />} />
            <Route
              path="/provider/platform-payment"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <Navigate to="/provider/subscription" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/plans"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <ProviderSubscriptionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/plans/addons"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <ProviderSubscriptionAddonsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/checkout"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <ProviderSubscriptionCheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/confirmation"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <ProviderSubscriptionConfirmationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/verification-pending"
              element={
                <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <ProviderVerificationPendingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/therapist/*" element={<Navigate to="/provider/dashboard" replace />} />
            <Route path="/psychiatrist/*" element={<Navigate to="/provider/dashboard" replace />} />
            <Route path="/psychologist/*" element={<Navigate to="/provider/dashboard" replace />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/payment/status" element={<PaymentStatusPage />} />
            <Route
              path="/plans"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PricingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans/addons"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <SubscriptionAddonsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <SubscriptionCheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/confirmation"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <SubscriptionConfirmationPage />
                </ProtectedRoute>
              }
            />
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
              path="/video-session/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['patient', 'therapist', 'psychiatrist', 'psychologist', 'coach']}>
                  <VideoSessionPage />
                </ProtectedRoute>
              }
            />
            <Route path="/therapist/live-session/:sessionId" element={<LegacyProviderLiveSessionRedirect />} />
            <Route path="/psychiatrist/live-session/:sessionId" element={<LegacyProviderLiveSessionRedirect />} />
            <Route path="/psychologist/live-session/:sessionId" element={<LegacyProviderLiveSessionRedirect />} />
            <Route
              path="/admin"
              element={
                <PlatformAdminRoute>
                  <AdminEntryGate />
                </PlatformAdminRoute>
              }
            >
              <Route element={<AdminShellLayout />}>
                <Route index element={<DashboardRedirect />} />
                <Route path="dashboard" element={<AdminDashboardGate />} />
                <Route path="platform-analytics" element={<PlatformAnalytics />} />
                <Route path="user-approvals" element={<UserApprovals />} />
                <Route path="therapist-verification" element={<TherapistVerification />} />
                <Route path="pending-providers" element={<AdminPendingProvidersPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="roles" element={<AdminRolesPage />} />
                <Route path="companies" element={<AdminCompaniesPage />} />
                <Route path="company-subscriptions" element={<AdminCompanySubscriptionsPage />} />
                <Route path="company-reports" element={<AdminReportsPage />} />
                <Route path="live-sessions" element={<LiveSessions />} />
                <Route path="feedback" element={<Feedback />} />
                <Route path="all-users" element={<AllUsers />} />
                <Route path="templates" element={<AdminTemplatesPage />} />
                <Route path="revenue" element={<AdminRevenuePage />} />
                <Route path="pricing-management" element={<AdminPricingManagementPage />} />
                <Route path="payouts" element={<AdminPayoutsPage />} />
                <Route path="invoices" element={<AdminSectionPage title="Invoices" description="Track invoices, collections, refunds, and payment disputes." bullets={['Invoice lifecycle tracking', 'Corporate and individual invoices', 'Refund analytics', 'Collection status by segment']} />} />
                <Route path="payment-reliability" element={<AdminSectionPage title="Payment Reliability" description="Monitor payment success, retries, failures, and settlement reliability trends." bullets={['Success vs failed transactions', 'Retry conversion trends', 'Decline reason distribution', 'Settlement health indicators']} />} />
                <Route path="user-growth" element={<UserGrowthAnalytics />} />
                <Route path="session-analytics" element={<SessionAnalytics />} />
                <Route path="therapist-performance" element={<TherapistPerformance />} />
                <Route path="mental-health-trends" element={<AdminSectionPage title="Mental Health Trends" description="Monitor category-level trends to plan interventions and workforce readiness." bullets={['Depression and anxiety trends', 'Sleep and stress categories', 'High-risk cluster detection', 'Program outcome comparisons']} />} />
                <Route path="zoho-desk" element={<ZohoDeskPanel />} />
                <Route path="offer-marquee" element={<OfferMarqueeEditor />} />
                <Route path="pricing-versions" element={<PricingVersions />} />
                <Route path="pricing-contracts" element={<PricingContracts />} />
                <Route path="crisis-console" element={<CrisisConsole />} />
                <Route path="audit-trail" element={<AuditTrail />} />
                <Route path="groups" element={<GroupManagement />} />
                <Route path="roles" element={<RoleManagement />} />
                <Route path="feedback" element={<AdminSectionPage title="Feedback" description="Collect and analyze user and provider feedback loops for product quality." bullets={['NPS and CSAT trends', 'Feedback themes', 'Feature request clusters', 'Escalation tagging']} />} />
                <Route path="audit-logs" element={<AuditTrail />} />
                <Route path="/admin/compliance-documents" element={<LegalDocuments />} />
                <Route path="/admin/compliance" element={<ComplianceDashboard />} />
                <Route path="/admin/compliance-status" element={<ComplianceDashboard />} />
                <Route path="data-requests" element={<AdminSectionPage title="Data Requests" description="Manage export, deletion, and data-subject requests with approvals." bullets={['Export requests', 'Deletion requests', 'Legal hold checks', 'Request SLA and closure']} />} />
                <Route path="data-privacy-hub" element={<AdminDataPrivacyHubPage />} />
                <Route path="legal-documents" element={<CentralizedLegalDocumentManagement />} />
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
            <Route path="/corporate/analytics" element={<CorporateRoute><CorporateAnalyticsPage /></CorporateRoute>} />
            <Route path="/corporate/employees/directory" element={<CorporateRoute><CorporateEmployeeDirectoryPage /></CorporateRoute>} />
            <Route path="/corporate/employees/enrollment" element={<CorporateRoute><CorporateEnrollmentPage /></CorporateRoute>} />
            <Route path="/corporate/employees/allocation" element={<CorporateRoute><CorporateSessionAllocationPage /></CorporateRoute>} />
            <Route path="/corporate/reports/utilization" element={<CorporateRoute><CorporateUtilizationReportsPage /></CorporateRoute>} />
            <Route path="/corporate/reports/wellbeing" element={<CorporateRoute><CorporateWellbeingReportsPage /></CorporateRoute>} />
            <Route path="/corporate/reports/engagement" element={<CorporateRoute><CorporateEngagementReportsPage /></CorporateRoute>} />
            <Route path="/corporate/billing/invoices" element={<CorporateRoute><CorporateInvoicesPage /></CorporateRoute>} />
            <Route path="/corporate/billing/payment-methods" element={<CorporateRoute><CorporatePaymentMethodsPage /></CorporateRoute>} />
            <Route path="/corporate/billing/plan" element={<CorporateRoute><CorporatePlanPage /></CorporateRoute>} />
            <Route path="/corporate/account/help" element={<CorporateRoute><CorporateHelpPage /></CorporateRoute>} />
            <Route path="/corporate/sso" element={<CorporateRoute><SSOSettingsPage /></CorporateRoute>} />
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
              <Route path="exercises" element={<Navigate to="/patient/check-in?tab=daily-mood" replace />} />
              <Route path="sessions/:id/live" element={<LiveSessionPage />} />
              <Route path="mood" element={<Navigate to="/patient/check-in?tab=daily-mood" replace />} />
              <Route path="wellness-library" element={<WellnessLibraryPage />} />
              <Route path="sleep-therapy" element={<SleepTherapyPage />} />
              <Route path="sound-therapy" element={<SoundTherapyPage />} />
              <Route path="buddy/:mode" element={<BuddyChatPage />} />
              <Route path="provider-messages" element={<ProviderMessagesPage />} />
              <Route path="provider-messages/:providerId" element={<ProviderMessagesPage />} />
              <Route path="messages" element={<AIChatPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="assessments" element={<Navigate to="/patient/care-team" replace />} />
              <Route path="assessment-reports" element={<Navigate to="/patient/progress?tab=clinical" replace />} />
              <Route path="billing" element={<Navigate to="/patient/settings?section=billing" replace />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="timeline" element={<PatientTimelinePage />} />
              <Route path="insights" element={<Navigate to="/patient/progress?tab=mood" replace />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/shared/:id" element={<PatientReportDownloadPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="plans/addons" element={<SubscriptionAddonsPage />} />
              <Route path="checkout" element={<SubscriptionCheckoutPage />} />
              <Route path="confirmation" element={<SubscriptionConfirmationPage />} />
              <Route path="check-in" element={<DailyCheckInPage />} />
              <Route path="game" element={<HitASixerGamePage />} />
              <Route path="hit-a-sixer" element={<HitASixerGamePage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="group-therapy" element={<GroupTherapySessionsPage />} />
            </Route>
            <Route path="/providers/:id" element={<Navigate to="/patient/sessions" replace />} />
            <Route path="/book/:providerId" element={<Navigate to="/patient/sessions" replace />} />
            <Route path="/sessions" element={<Navigate to="/patient/sessions" replace />} />
            <Route path="/sessions/:id/live" element={<Navigate to="/patient/sessions" replace />} />
            <Route path="/ai-chat" element={<Navigate to="/patient/messages" replace />} />
            <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
            <Route path="/settings" element={<Navigate to="/patient/settings" replace />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refunds" element={<RefundAndCancellationPolicy />} />
            <Route path="/legal/therapist-ic-agreement" element={<TherapistICAgr />} />
            <Route path="/legal/therapist-nda" element={<TherapistNDA />} />
            <Route path="/legal/therapist-data-processing" element={<TherapistDataProcessingAgr />} />
            {/* Certificate verification — standalone, no layout, accessible via QR scan */}
            <Route path="/verify/:certId" element={<CertificateVerificationPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <GlobalAudioPlayerConsole />
      </GlobalAudioProvider>
    </SocketProvider>
  </AuthProvider>
  )
}

export default App