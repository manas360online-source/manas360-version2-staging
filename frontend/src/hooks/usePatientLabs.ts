import { useQuery } from '@tanstack/react-query';
import { fetchPatientLabs } from '../api/provider';

export const usePatientLabs = (patientId?: string) => {
  return useQuery({
    queryKey: ['patientLabs', patientId],
    queryFn: () => fetchPatientLabs(String(patientId)),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });
};
