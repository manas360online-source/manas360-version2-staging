import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TenantAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-center text-slate-600">Checking permissions...</div>;

  // Backend may return either camelCase or snake_case keys; tolerate both.
  const isCompanyAdmin = Boolean((user as any)?.isCompanyAdmin || (user as any)?.is_company_admin);

  if (!isCompanyAdmin) {
    return <Navigate to="/corporate/dashboard" replace />;
  }

  return <>{children}</>;
}
