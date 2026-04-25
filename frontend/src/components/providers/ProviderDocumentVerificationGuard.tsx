import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type ProviderDocumentVerificationGuardProps = {
  children: ReactNode;
  redirectTo: string;
};

const providerRoles = new Set(['therapist', 'psychiatrist', 'psychologist', 'coach']);

export default function ProviderDocumentVerificationGuard({ children, redirectTo }: ProviderDocumentVerificationGuardProps) {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  if (!providerRoles.has(role)) {
    return <>{children}</>;
  }

  const verified = Boolean(user?.isTherapistVerified);
  if (!verified) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
