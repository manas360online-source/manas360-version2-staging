import { useQuery } from '@tanstack/react-query';
import { fetchProviderPatients } from '../api/provider';

export const useProviderPatients = () => {
  return useQuery({
    queryKey: ['provider-patients'],
    queryFn: fetchProviderPatients,
    staleTime: 5 * 60 * 1000,
  });
};
