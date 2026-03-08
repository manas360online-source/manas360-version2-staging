import { Navigate, Outlet } from 'react-router-dom';
import { isCorporateAdminUser, useAuth } from '../../context/AuthContext';

export default function AdminEntryGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Checking permissions...</div>;
  }

  if (isCorporateAdminUser(user)) {
    return <Navigate to="/corporate/dashboard" replace />;
  }

  return <Outlet />;
}
