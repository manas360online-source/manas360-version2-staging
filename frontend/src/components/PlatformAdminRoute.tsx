import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasCorporateAccess, isPlatformAdminUser, useAuth } from '../context/AuthContext';

type PlatformAdminRouteProps = {
  children: ReactNode;
};

export default function PlatformAdminRoute({ children }: PlatformAdminRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    const redirectPath = `${location.pathname}${location.search}`;
    return <Navigate to="/auth/login" replace state={{ from: redirectPath }} />;
  }

  if (hasCorporateAccess(user)) {
    return <Navigate to="/corporate/dashboard" replace />;
  }

  if (!isPlatformAdminUser(user)) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}
