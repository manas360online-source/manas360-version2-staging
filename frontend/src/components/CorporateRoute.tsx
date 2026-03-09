import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasCorporateAccess, isPlatformAdminUser, useAuth } from '../context/AuthContext';

type CorporateRouteProps = {
  children: ReactNode;
};

export default function CorporateRoute({ children }: CorporateRouteProps) {
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
    return <>{children}</>;
  }

  if (isPlatformAdminUser(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/auth/login" replace />;
}
