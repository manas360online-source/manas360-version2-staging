import { useQuery } from '@tanstack/react-query';
import { fetchProviderDashboard } from '../api/provider';

export const useProviderDashboard = () => {
  return useQuery({
    queryKey: ['provider-dashboard'],
    queryFn: fetchProviderDashboard,
    staleTime: 5 * 60 * 1000,
  });
};
