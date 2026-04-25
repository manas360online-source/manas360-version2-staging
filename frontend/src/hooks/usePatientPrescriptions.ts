import { useQuery } from '@tanstack/react-query';
import { fetchPatientPrescriptions } from '../api/provider';

export const usePatientPrescriptions = (patientId?: string) => {
  return useQuery({
    queryKey: ['patientPrescriptions', patientId],
    queryFn: () => fetchPatientPrescriptions(String(patientId)),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });
};
