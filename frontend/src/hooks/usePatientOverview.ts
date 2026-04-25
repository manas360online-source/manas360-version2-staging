import { useQuery } from '@tanstack/react-query';
import { fetchPatientOverview } from '../api/provider';

export const usePatientOverview = (patientId?: string) => {
  return useQuery({
    queryKey: ['patientOverview', patientId],
    queryFn: () => fetchPatientOverview(String(patientId)),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });
};
