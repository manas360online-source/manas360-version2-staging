import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMDCAuth } from '../contexts/MDCAuthContext';

interface MDCGuardedRouteProps {
  children: ReactNode;
}

export const MDCGuardedRoute: React.FC<MDCGuardedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useMDCAuth();
  if (!isAuthenticated) {
    return <Navigate to="/mdc/login" replace />;
  }
  return <>{children}</>;
};
