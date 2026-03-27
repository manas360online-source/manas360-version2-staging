import { useMemo } from 'react';
import { Sparkles, Trophy, Wallet2 } from 'lucide-react';

export type GameOutcome = 'sixer' | 'four' | 'out';

export type GameEligibility = {
  eligible: boolean;
  error?: string | null;
  data?: Record<string, any> | null;
};

export type GameResult = {
  success: boolean;
  outcome: GameOutcome;
  prizeAmount: number;
  message?: string;
  nextPlayAt?: string | null;
};

export type WalletBalance = {
  total_balance: number;
  game_credits: number;
  referral_credits: number;
  promo_credits: number;
  lifetime_earned: number;
  lifetime_spent: number;
  lifetime_expired: number;
  last_transaction_at?: string | null;
};

export type WinnerItem = {
  display_name: string;
  outcome: GameOutcome;
  amount_won: number;
  played_at: string;
};

type HitASixerGameProps = {
  eligibility: GameEligibility | null;
  isPlaying: boolean;
  onPlay: () => void;
};

type WalletWidgetProps = {
  balance: WalletBalance | null;
};

type ResultScreenProps = {
  amount: number;
  nextPlayAt?: string | null;
  message?: string;
};

type WinnersFeedProps = {
  winners: WinnerItem[];
  loading?: boolean;
};

type SubscribeToPlayGateProps = {
  onSubscribe: () => void;
};

const formatInr = (value: number): string => `INR ${Number(value || 0).toFixed(0)}`;

const formatTime = (value?: string | null): string => {
  if (!value) return 'Tomorrow';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tomorrow';
  return date.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' });
};

export const WalletWidget = ({ balance }: WalletWidgetProps) => {
  if (!balance) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Wallet2 className="h-4 w-4" /> Wallet
        </div>
        <div className="mt-3 text-sm text-slate-500">Wallet data is loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Wallet2 className="h-4 w-4" /> Wallet Balance
        </div>
        <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{formatInr(balance.total_balance)}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Game Credits</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{formatInr(balance.game_credits)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Referral Credits</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{formatInr(balance.referral_credits)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Promo Credits</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{formatInr(balance.promo_credits)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Lifetime Earned</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{formatInr(balance.lifetime_earned)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>Spent: {formatInr(balance.lifetime_spent)}</span>
        <span>Expired: {formatInr(balance.lifetime_expired)}</span>
      </div>
    </div>
  );
};

export const SubscribeToPlayGate = ({ onSubscribe }: SubscribeToPlayGateProps) => (
  <div className="rounded-[32px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/70 p-6 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Subscribe to Play</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Hit a Sixer, win wallet credits</h2>
        <p className="mt-2 text-sm text-slate-600">Activate a paid plan to unlock the daily cricket game and surprise rewards.</p>
      </div>
      <button
        type="button"
        onClick={onSubscribe}
        className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
      >
        View Plans
      </button>
    </div>
  </div>
);

export const ResultScreenSixer = ({ amount, nextPlayAt, message }: ResultScreenProps) => (
  <div className="relative overflow-hidden rounded-[32px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 p-6 shadow-sm">
    <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-emerald-300/40 blur-2xl" />
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">SIXER!</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">You smashed it.</h2>
        <p className="mt-2 text-sm text-slate-600">{message || 'Big hit. Big reward.'}</p>
      </div>
      <div className="rounded-3xl bg-emerald-600 px-6 py-4 text-center text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em]">Won</p>
        <p className="mt-1 text-2xl font-bold">{formatInr(amount)}</p>
      </div>
    </div>
    <p className="mt-4 text-xs text-slate-500">Next play: {formatTime(nextPlayAt)}</p>
  </div>
);

export const ResultScreenFour = ({ amount, nextPlayAt, message }: ResultScreenProps) => (
  <div className="relative overflow-hidden rounded-[32px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/60 p-6 shadow-sm">
    <div className="absolute -left-8 -top-6 h-24 w-24 rounded-full bg-sky-300/40 blur-2xl" />
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">FOUR!</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Clean boundary.</h2>
        <p className="mt-2 text-sm text-slate-600">{message || 'Nice timing, nice reward.'}</p>
      </div>
      <div className="rounded-3xl bg-sky-500 px-6 py-4 text-center text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em]">Won</p>
        <p className="mt-1 text-2xl font-bold">{formatInr(amount)}</p>
      </div>
    </div>
    <p className="mt-4 text-xs text-slate-500">Next play: {formatTime(nextPlayAt)}</p>
  </div>
);

export const ResultScreenOut = ({ amount, nextPlayAt, message }: ResultScreenProps) => (
  <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/60 p-6 shadow-sm">
    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-slate-300/40 blur-2xl" />
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">OUT</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Still earned credits.</h2>
        <p className="mt-2 text-sm text-slate-600">{message || 'Come back tomorrow for another shot.'}</p>
      </div>
      <div className="rounded-3xl bg-slate-700 px-6 py-4 text-center text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em]">Won</p>
        <p className="mt-1 text-2xl font-bold">{formatInr(amount)}</p>
      </div>
    </div>
    <p className="mt-4 text-xs text-slate-500">Next play: {formatTime(nextPlayAt)}</p>
  </div>
);

export const WinnersFeed = ({ winners, loading }: WinnersFeedProps) => {
  const items = useMemo(() => winners.slice(0, 10), [winners]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Trophy className="h-4 w-4" /> Winners Feed
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live</span>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading winners...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">No winners yet. Be the first today.</p>
          ) : (
            items.map((winner, index) => (
              <div key={`${winner.display_name}-${winner.played_at}-${index}`} className="flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {winner.display_name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-medium text-slate-700">{winner.display_name}</p>
                    <p className="text-xs text-slate-400">{winner.outcome.toUpperCase()}</p>
                  </div>
                </div>
                <span className="font-semibold text-slate-700">{formatInr(winner.amount_won)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const HitASixerGame = ({ eligibility, isPlaying, onPlay }: HitASixerGameProps) => {
  // If eligibility is still loading/undefined but user reached this screen, allow the button; only block when explicitly ineligible.
  const disabled = (eligibility?.eligible === false) || isPlaying;
  const statusMessage = eligibility?.eligible
    ? 'One play per day. Finish before 6 PM IST.'
    : eligibility?.error === 'GAME CLOSED'
      ? 'Game closed for today. Try again tomorrow.'
      : eligibility?.error === 'ALREADY PLAYED TODAY'
        ? 'You already played today.'
      : 'Loading eligibility…';

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-6 shadow-sm">
      <style>{`
        @keyframes ball-flight {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          40% { transform: translate(120px, -80px) scale(0.9); opacity: 1; }
          100% { transform: translate(240px, -140px) scale(0.7); opacity: 0; }
        }
        @keyframes bat-swing {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(-18deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 0 rgba(16, 185, 129, 0.0); }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.28); }
        }
      `}</style>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hit A Sixer</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Cricket shot, daily reward.</h2>
          <p className="mt-2 text-sm text-slate-600">{statusMessage}</p>
        </div>
        <button
          type="button"
          onClick={onPlay}
          disabled={disabled}
          className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white transition ${disabled ? 'bg-slate-300' : 'bg-emerald-500 hover:bg-emerald-600'}`}
        >
          {isPlaying ? 'Playing...' : 'Play Now'}
        </button>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Sparkles className="h-4 w-4" /> Stadium View
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">IST</span>
        </div>

        <div className="relative mt-6 flex h-40 items-end justify-between rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 p-4">
          <div className="relative flex h-full w-full items-center">
            <div className={`absolute bottom-2 left-6 h-16 w-2 rounded-full bg-amber-400 ${isPlaying ? 'animate-[bat-swing_0.6s_ease-in-out]' : ''}`} />
            <div className={`absolute bottom-8 left-8 h-3 w-3 rounded-full bg-red-500 ${isPlaying ? 'animate-[ball-flight_0.9s_ease-in-out]' : ''}`} />
            <div className="absolute bottom-2 right-10 flex h-10 w-10 items-end justify-center rounded-xl bg-emerald-500/20">
              <div className="h-8 w-2 rounded-full bg-emerald-700" />
              <div className="mx-0.5 h-10 w-2 rounded-full bg-emerald-700" />
              <div className="h-8 w-2 rounded-full bg-emerald-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
