import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patientApi } from '@/api/patient';
import { useAuth } from '@/context/AuthContext';

export interface WalletBalance {
  total_balance: number;
  game_credits: number;
  referral_credits: number;
  promo_credits: number;
  lifetime_earned: number;
  lifetime_spent: number;
  lifetime_expired: number;
}

export const useWallet = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, loading, user } = useAuth();
  const isPatientUser = String(user?.role || '').toLowerCase() === 'patient';
  const enabled = options?.enabled ?? (!loading && isAuthenticated && isPatientUser);

  // Fetch current wallet (used in HitASixerGame, header, etc.)
  // Normalize API response to the expected WalletBalance shape.
  const { data: balance = null, refetch: refreshWallet, isFetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      try {
        const resp = await patientApi.getWalletBalance();
        const normalized = (resp && (resp.data ?? resp)) ?? null;
        // eslint-disable-next-line no-console
        console.log('[useWallet] Fetched balance:', normalized);
        return normalized;
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('[useWallet] Error fetching balance:', error?.response?.status, error?.message);
        // Provider/admin routes can mount shared UI pieces that reference wallet.
        // Avoid noisy 401/403s and treat wallet as unavailable for non-patient contexts.
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 0, // always fresh after game play
    enabled,
    retry: enabled,
  });

  // 🔥 AUTO-APPLY wallet credits to ANY payment (bookings, subscriptions, etc.)
  const applyWalletToPayment = useMutation({
    mutationFn: (payload: { referenceId?: string; referenceType?: string; bookingId?: string; amount: number }) => patientApi.applyWalletCredits(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      if (data.used > 0) {
        toast.success(`₹${data.used} wallet credits applied!`, {
          description: `Final amount: ₹${data.finalAmount}`,
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to apply wallet credits');
    },
  });

  return {
    balance,
    refreshWallet,
    isFetching,
    applyWalletToPayment: applyWalletToPayment.mutateAsync,
    isApplying: applyWalletToPayment.isPending,
  };
};
