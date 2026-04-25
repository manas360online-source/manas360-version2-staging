import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProviderSidebar } from './ProviderSidebar';
import { useAuth } from '../../context/AuthContext';
import PersistentVideoLayout from './PersistentVideoLayout';

export const HubLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isProviderLiveSessionRoute = /^\/provider\/live-session\/.+/.test(location.pathname);
  const isSessionFocusMode = isProviderLiveSessionRoute && new URLSearchParams(location.search).get('focus') === '1';

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

        <main className={`flex-1 overflow-y-auto ${isSessionFocusMode ? 'p-0' : 'p-6'}`}>
          <PersistentVideoLayout>
            <Outlet />
          </PersistentVideoLayout>
        </main>
      </div>
    </div>
  );
};

export default HubLayout;
