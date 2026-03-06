import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useProviderDashboardContext, type ProviderDashboardMode } from '../../../context/ProviderDashboardContext';

type TherapistRouteModeGuardProps = {
  allowedModes: ProviderDashboardMode[];
  redirectTo?: string;
  children: ReactNode;
};

export default function TherapistRouteModeGuard({
  allowedModes,
  redirectTo = '/therapist/dashboard',
  children,
}: TherapistRouteModeGuardProps) {
  const { dashboardMode } = useProviderDashboardContext();

  if (!allowedModes.includes(dashboardMode)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
