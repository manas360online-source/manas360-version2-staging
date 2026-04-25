import { createContext, useContext } from 'react';

export type ProviderDashboardMode = 'professional' | 'practice';

export type ProviderDashboardContextValue = {
  selectedPatientId: string;
  setSelectedPatientId: (patientId: string) => void;
  dashboardMode: ProviderDashboardMode;
  setDashboardMode: (mode: ProviderDashboardMode) => void;
};

export const ProviderDashboardContext = createContext<ProviderDashboardContextValue | null>(null);

export function useProviderDashboardContext(): ProviderDashboardContextValue {
  const context = useContext(ProviderDashboardContext);
  if (!context) {
    throw new Error('useProviderDashboardContext must be used within ProviderDashboardContext provider');
  }
  return context;
}
