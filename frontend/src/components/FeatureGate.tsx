import React from 'react';
import { useAuth } from '../context/AuthContext';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * FeatureGate component for MDC-specific feature access control.
 * In a non-MDC context (standard user), it allows everything by default
 * unless specified otherwise.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback = null }) => {
  useAuth();
  
  // Detect if we are in MDC mode
  const mdcUserStr = localStorage.getItem('mdc_user');
  const isMdcMode = !!mdcUserStr;
  
  if (!isMdcMode) {
    // Standard platform user - has access to everything for now
    return <>{children}</>;
  }

  try {
    const mdcUser = JSON.parse(mdcUserStr!);
    const selectedFeatures = mdcUser.selectedFeatures || [];
    
    if (selectedFeatures.includes(feature)) {
      return <>{children}</>;
    }
  } catch (e) {
    console.error('Failed to parse mdc_user for FeatureGate', e);
  }

  return <>{fallback}</>;
};
