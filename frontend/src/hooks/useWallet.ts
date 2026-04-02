import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patientApi } from '@/api/patient';

export interface WalletBalance {
  total_balance: number;
  game_credits: number;
  referral_credits: number;
  promo_credits: number;
  lifetime_earned: number;
  lifetime_spent: number;
  lifetime_expired: number;
}

export const useWallet = () => {
  const queryClient = useQueryClient();

  // Fetch current wallet (used in HitASixerGame, header, etc.)
  // Normalize API response to the expected WalletBalance shape.
  const { data: balance = null, refetch: refreshWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const resp = await patientApi.getWalletBalance();
      return (resp && (resp.data ?? resp)) ?? null;
    },
    staleTime: 0, // always fresh after game play
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
    applyWalletToPayment: applyWalletToPayment.mutateAsync,
    isApplying: applyWalletToPayment.isPending,
  };
};
