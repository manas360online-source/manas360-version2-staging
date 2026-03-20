import React, { Suspense, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/CertificationLayout';
import { CardSkeleton } from './components/CertificationSkeleton';
import JourneyWireframePage from './pages/JourneyWireframePage';
import { CertificationModulesPage } from "./pages/CertificationModulesPage";
import { CertificationLessonPage } from "./pages/CertificationLessonPage";
import { CertificationAssignmentPage } from "./pages/CertificationAssignmentPage";
import { CertificationQuizPage } from "./pages/CertificationQuizPage";

const LandingPage = React.lazy(() => import('./pages/CertificationLandingPage').then(module => ({ default: module.CertificationLandingPage })));
const CertificationDetailsPage = React.lazy(() => import('./pages/CertificationDetailsPage').then(module => ({ default: module.CertificationDetailsPage })));
const LeadBoostDashboard = React.lazy(() => import('./pages/CertificationLeadBoostDashboard').then(module => ({ default: module.LeadBoostDashboard })));
const AdminDashboard = React.lazy(() => import('./pages/CertificationAdminDashboard').then(module => ({ default: module.AdminDashboard })));
const CheckoutPage = React.lazy(() => import('./pages/CertificationCheckoutPage').then(module => ({ default: module.CheckoutPage })));
const PaymentSuccessPage = React.lazy(() => import('./pages/CertificationPaymentSuccessPage').then(module => ({ default: module.PaymentSuccessPage })));
const PaymentFailedPage = React.lazy(() => import('./pages/CertificationPaymentFailedPage').then(module => ({ default: module.PaymentFailedPage })));
const MyCertificationsPage = React.lazy(() => import('./pages/CertificationMyCertificationsPage').then(module => ({ default: module.MyCertificationsPage })));
const EnrollmentRegistrationPage = React.lazy(() => import('./pages/EnrollmentRegistrationPage'));
const EnrollmentConfirmedPage = React.lazy(() => import('./pages/EnrollmentConfirmedPage'));

const LoadingFallback = () => (
  <div className="max-w-7xl mx-auto px-4 py-24 grid md:grid-cols-3 gap-8">
    <CardSkeleton /><CardSkeleton /><CardSkeleton />
  </div>
);

const PaymentLandingRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const returnUrl = params.get('returnUrl') || '';
    const slugMatch = returnUrl.match(/slug=([^&]+)/);
    const planMatch = returnUrl.match(/plan=([^&]+)/);
    const slug = slugMatch ? decodeURIComponent(slugMatch[1]) : '';
    const plan = planMatch ? decodeURIComponent(planMatch[1]) : 'full';
    if (slug) { navigate(`/checkout/${slug}?plan=${plan}`); } else { navigate('/'); }
  }, [navigate, location]);
  return null;
};

const LayoutRoutes: React.FC = () => (
  <Layout>
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cert/:slug" element={<CertificationDetailsPage />} />
        <Route path="/checkout/:slug" element={<CheckoutPage />} />
        <Route path="/enrollment-registration" element={<EnrollmentRegistrationPage />} />
        <Route path="/enrollment-confirmed" element={<EnrollmentConfirmedPage />} />
        <Route path="/payment-landing" element={<PaymentLandingRedirect />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-failed" element={<PaymentFailedPage />} />
        <Route path="/my-certifications" element={<MyCertificationsPage />} />
        <Route path="/dashboard" element={<LeadBoostDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/certification/modules/:enrollmentId" element={<CertificationModulesPage />} />
        <Route path="/certification/lessons/:moduleId" element={<CertificationLessonPage />} />
        <Route path="/certification/assignment/:lessonId" element={<CertificationAssignmentPage />} />
        <Route path="/certification/quiz/:enrollmentId" element={<CertificationQuizPage />} />
      </Routes>
    </Suspense>
  </Layout>
);

interface AppProps {
  basePath?: string;
  initialPath?: string;
}

const App: React.FC<AppProps> = ({ basePath: _basePath = '/', initialPath = '/' }) => {
  return (
    <Router initialEntries={[initialPath]} initialIndex={0}>
      <Routes>
        <Route path="/journey-wireframe" element={<JourneyWireframePage />} />
        <Route path="/*" element={<LayoutRoutes />} />
      </Routes>
    </Router>
  );
};

export default App;
