import { useQuery } from '@tanstack/react-query';
import { fetchPatientAssessments } from '../api/provider';

export const usePatientAssessments = (patientId?: string) => {
  return useQuery({
    queryKey: ['patientAssessments', patientId],
    queryFn: () => fetchPatientAssessments(String(patientId)),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });
};
