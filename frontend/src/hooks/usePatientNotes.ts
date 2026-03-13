import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPatientNote,
  fetchPatientNotes,
  type CreatePatientNotePayload,
  updatePatientNote,
} from '../api/provider';

export const usePatientNotes = (patientId?: string) => {
  return useQuery({
    queryKey: ['patientNotes', patientId],
    queryFn: () => fetchPatientNotes(String(patientId)),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreatePatientNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, noteData }: { patientId: string; noteData: CreatePatientNotePayload }) =>
      createPatientNote(patientId, noteData),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['patientNotes', variables.patientId] });
    },
  });
};

export const useUpdatePatientNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, noteId, noteData }: { patientId: string; noteId: string; noteData: CreatePatientNotePayload }) =>
      updatePatientNote(patientId, noteId, noteData),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['patientNotes', variables.patientId] });
    },
  });
};
