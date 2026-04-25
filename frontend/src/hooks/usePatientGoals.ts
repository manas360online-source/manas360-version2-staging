import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPatientGoals, sendGoalMessage } from '../api/provider';

export const usePatientGoals = (patientId?: string) => {
  return useQuery({
    queryKey: ['patientGoals', patientId],
    queryFn: () => fetchPatientGoals(String(patientId)),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSendGoalMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, goalId, message }: { patientId: string; goalId: string; message: string }) =>
      sendGoalMessage(patientId, goalId, message),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['patientGoals', variables.patientId] });
    },
  });
};
