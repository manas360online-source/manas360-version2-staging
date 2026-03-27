import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../../api/patient';
import {
  HitASixerGame,
  ResultScreenFour,
  ResultScreenOut,
  ResultScreenSixer,
  SubscribeToPlayGate,
  WalletWidget,
  WinnersFeed,
  type GameEligibility,
  type GameOutcome,
  type GameResult,
  type WalletBalance,
  type WinnerItem,
} from '../../components/patient/HitASixerGame';

const isSubscriptionActive = (subscription: any): boolean => {
  if (!subscription) return false;

  const status = String(subscription?.status || '').toLowerCase();
  const freeLike = Number(subscription?.price || 0) <= 0 || String(subscription?.planName || '').toLowerCase().includes('free');
  const activeLike = ['active', 'trial', 'trialing', 'grace', 'renewal_pending'].includes(status);

  if (subscription?.isActive === true || subscription?.active === true) return true && !freeLike;
  if (status === 'active' || status === 'trialing') return !freeLike;

  return activeLike && !freeLike;
};

const normalizeEligibility = (raw: any): GameEligibility => {
  const payload = raw?.data ?? raw ?? {};
  return {
    eligible: Boolean(payload?.eligible),
    error: payload?.error ?? null,
    data: payload?.data ?? null,
  };
};

const normalizeWinners = (raw: any): WinnerItem[] => {
  const payload = raw?.data ?? raw ?? {};
  const winners = payload?.winners ?? payload;
  if (!Array.isArray(winners)) return [];
  return winners.map((entry: any) => ({
    display_name: String(entry?.display_name || 'Player'),
    outcome: (entry?.outcome || 'out') as GameOutcome,
    amount_won: Number(entry?.amount_won || 0),
    played_at: String(entry?.played_at || new Date().toISOString()),
  }));
};

const normalizeWallet = (raw: any): WalletBalance | null => {
  const payload = raw?.data ?? raw ?? null;
  if (!payload) return null;
  return {
    total_balance: Number(payload?.total_balance || 0),
    game_credits: Number(payload?.game_credits || 0),
    referral_credits: Number(payload?.referral_credits || 0),
    promo_credits: Number(payload?.promo_credits || 0),
    lifetime_earned: Number(payload?.lifetime_earned || 0),
    lifetime_spent: Number(payload?.lifetime_spent || 0),
    lifetime_expired: Number(payload?.lifetime_expired || 0),
    last_transaction_at: payload?.last_transaction_at || null,
  };
};

export default function HitASixerGamePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [eligibility, setEligibility] = useState<GameEligibility | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = async () => {
    try {
      const response = await patientApi.getWalletBalance();
      setWallet(normalizeWallet(response));
    } catch {
      setWallet(null);
    }
  };

  const refreshWinners = async () => {
    setWinnersLoading(true);
    try {
      const response = await patientApi.getGameWinners(12);
      setWinners(normalizeWinners(response));
    } catch {
      setWinners([]);
    } finally {
      setWinnersLoading(false);
    }
  };

  const refreshEligibility = async () => {
    try {
      const response = await patientApi.getGameEligibility();
      const normalized = normalizeEligibility(response);
      setEligibility(normalized);

      // If eligibility returns null/undefined (e.g., bypass mode), treat as eligible for play UI
      if (normalized.eligible === undefined || normalized.eligible === null) {
        setEligibility({ eligible: true, error: null, data: null });
      }

      if (!normalized.eligible && normalized.error === 'ALREADY PLAYED TODAY') {
        const outcome = (normalized.data?.today_result?.outcome || 'out') as GameOutcome;
        const amount = Number(normalized.data?.today_result?.amount_won || 0);
        setResult({
          success: true,
          outcome,
          prizeAmount: amount,
          nextPlayAt: normalized.data?.next_play_at || null,
          message: 'You already played today. Check your wallet credit.'
        });
      }
    } catch {
      setEligibility({ eligible: false, error: 'ELIGIBILITY_UNAVAILABLE', data: null });
    }
  };

  useEffect(() => {
    let winnersInterval: number | null = null;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const subscription = await patientApi.getSubscription().catch(() => null);
        const subscriptionPayload = (subscription as any)?.data ?? subscription;
        const active = isSubscriptionActive(subscriptionPayload);
        setSubscriptionActive(active);

        await Promise.all([
          refreshWallet(),
          refreshWinners(),
          active ? refreshEligibility() : Promise.resolve(),
        ]);

        winnersInterval = window.setInterval(() => {
          void refreshWinners();
        }, 20000);
      } catch (err: any) {
        setError(err?.message || 'Unable to load game data.');
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      if (winnersInterval) window.clearInterval(winnersInterval);
    };
  }, []);

  const playGame = async () => {
    if (!eligibility?.eligible || isPlaying) return;

    setIsPlaying(true);
    setError(null);

    try {
      const response = await patientApi.playGame();
      const payload = (response as any)?.data ?? response ?? {};

      if (!payload?.success) {
        setError(payload?.error || 'Unable to play right now.');
        return;
      }

      const outcome = (payload?.outcome || 'out') as GameOutcome;
      const amount = Number(payload?.prize?.amount ?? payload?.wallet?.credit_added ?? 0);
      setResult({
        success: true,
        outcome,
        prizeAmount: amount,
        message: payload?.message || undefined,
        nextPlayAt: null,
      });

      await Promise.all([
        refreshWallet(),
        refreshWinners(),
      ]);

      const updatedEligibility = await patientApi.getGameEligibility().catch(() => null);
      if (updatedEligibility) {
        const normalized = normalizeEligibility(updatedEligibility);
        setEligibility(normalized);
        if (!normalized.eligible && normalized.error === 'ALREADY PLAYED TODAY') {
          setResult((prev) => prev ? { ...prev, nextPlayAt: normalized.data?.next_play_at || null } : prev);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to play right now.');
    } finally {
      setIsPlaying(false);
    }
  };

  const resultBlock = useMemo(() => {
    if (!result) return null;
    if (result.outcome === 'sixer') {
      return <ResultScreenSixer amount={result.prizeAmount} nextPlayAt={result.nextPlayAt} message={result.message} />;
    }
    if (result.outcome === 'four') {
      return <ResultScreenFour amount={result.prizeAmount} nextPlayAt={result.nextPlayAt} message={result.message} />;
    }
    return <ResultScreenOut amount={result.prizeAmount} nextPlayAt={result.nextPlayAt} message={result.message} />;
  }, [result]);

  return (
    <div className="min-h-screen bg-[#fbfbf6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">STORY 11.5</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Hit a Sixer Daily</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Play once every day. Win wallet credits to reduce therapy session costs.</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {loading ? (
              <div className="rounded-[32px] border border-slate-200 bg-white/80 p-6 shadow-sm">
                <div className="h-6 w-48 rounded bg-slate-100" />
                <div className="mt-4 h-4 w-64 rounded bg-slate-100" />
                <div className="mt-6 h-40 rounded-3xl bg-slate-100" />
              </div>
            ) : !subscriptionActive ? (
              <SubscribeToPlayGate onSubscribe={() => navigate('/plans')} />
            ) : resultBlock ? (
              resultBlock
            ) : (
              <HitASixerGame eligibility={eligibility} isPlaying={isPlaying} onPlay={playGame} />
            )}

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rules</p>
              <ul className="mt-3 space-y-2">
                <li>One play per day. Game closes at 6:00 PM IST.</li>
                <li>Win between INR 10 to INR 100 in credits.</li>
                <li>Credits expire after 30 days if unused.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <WalletWidget balance={wallet} />
            <WinnersFeed winners={winners} loading={winnersLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
