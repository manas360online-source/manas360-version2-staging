import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProviderSidebar } from './ProviderSidebar';
import { useAuth } from '../../context/AuthContext';
import PersistentVideoLayout from './PersistentVideoLayout';
import { Lock, FileCheck, CreditCard } from 'lucide-react';

export const HubLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isProviderLiveSessionRoute = /^\/provider\/live-session\/.+/.test(location.pathname);
  const isSessionFocusMode = isProviderLiveSessionRoute && new URLSearchParams(location.search).get('focus') === '1';

  const providerRoles = ['THERAPIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'COACH'];
  const isProvider = providerRoles.includes(String(user?.role).toUpperCase());
  const isClinicalRoute = location.pathname.includes('/patients') || 
                          location.pathname.includes('/calendar') || 
                          location.pathname.includes('/appointments') || 
                          location.pathname.includes('/portal') ||
                          location.pathname.includes('/dashboard');

  const needsPlatformFee = isProvider && !user?.platformAccessActive;
  const needsVerification = isProvider && user?.isTherapistVerified === false;
  
  const showClinicalLockout = isProvider && isClinicalRoute && (needsPlatformFee || needsVerification);

  const handleHeaderLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/auth/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      {isSessionFocusMode ? null : <ProviderSidebar />}

      <div className={`flex-1 flex flex-col ${isSessionFocusMode ? '' : 'ml-64'}`}>
        {isSessionFocusMode ? null : (
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
            <div>
              <h1 className="font-bold text-lg text-gray-800">Workspace</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#4A6741] bg-[#f0f5ee] px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-[#4A6741] rounded-full animate-pulse"></span>
                Online
              </div>
 
              {/* Notification Bell */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Avatar */}
              <button
                type="button"
                onClick={() => void handleHeaderLogout()}
                disabled={isLoggingOut}
                title={isLoggingOut ? 'Logging out...' : 'Logout'}
                className="flex items-center gap-2 p-1 pr-3 rounded-lg hover:bg-gray-100 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="w-8 h-8 rounded-full bg-[#E8EFE6] flex items-center justify-center text-[#4A6741] font-bold text-xs">
                  {user?.firstName ? user.firstName.charAt(0) : 'U'}
                </div>
                <span className="text-xs font-semibold text-gray-600">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto relative ${isSessionFocusMode ? 'p-0' : 'p-6'}`}>
          <PersistentVideoLayout>
            {showClinicalLockout ? (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                  
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-10 h-10 text-emerald-600" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Clinical Dashboard Locked</h2>
                  <p className="text-gray-500 mb-8 leading-relaxed">
                    You currently have certification-only access. To unlock lead matching, patient calendar, and full clinical tools, you must complete the clinical verification process.
                  </p>
                  
                  <div className="space-y-4 mb-8 text-left bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!needsPlatformFee ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-400'}`}>
                        <CreditCard size={16} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${!needsPlatformFee ? 'text-emerald-800' : 'text-gray-700'}`}>1. Platform Fee</p>
                        <p className="text-xs text-gray-500">Pay the initial onboarding fee</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-400`}>
                        <FileCheck size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700">2. Clinical Verification</p>
                        <p className="text-xs text-gray-500">Submit RCI / NMC documents for review</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(needsPlatformFee ? '/provider/subscription' : '/onboarding/provider-setup')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>{needsPlatformFee ? 'Pay Platform Fee to Start' : 'Complete Verification'}</span>
                  </button>
                  
                  {needsVerification && !needsPlatformFee && (
                    <p className="mt-4 text-xs text-gray-500 font-medium">Pending Admin Approval</p>
                  )}
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </PersistentVideoLayout>
        </main>
      </div>
    </div>
  );
};

export default HubLayout;
