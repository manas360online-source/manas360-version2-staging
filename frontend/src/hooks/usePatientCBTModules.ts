import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPatientCBTModules, reviewCBTModule } from '../api/provider';

export const usePatientCBTModules = (patientId?: string) => {
  return useQuery({
    queryKey: ['patientCBTModules', patientId],
    queryFn: () => fetchPatientCBTModules(String(patientId)),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useReviewCBTModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, moduleId, feedback }: { patientId: string; moduleId: string; feedback: string }) =>
      reviewCBTModule(patientId, moduleId, feedback),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['patientCBTModules', variables.patientId] });
    },
  });
};
