type WalletLike = {
  total_balance?: number;
  game_credits?: number;
  referral_credits?: number;
  promo_credits?: number;
};

type Props = {
  balance?: WalletLike | null;
  loading?: boolean;
  compact?: boolean;
};

const formatInr = (value: number) => `\u20b9${Number(value || 0).toFixed(0)}`;

export default function PatientWalletWidget({ balance, loading = false, compact = false }: Props) {
  const total = Number(balance?.total_balance || 0);
  const game = Number(balance?.game_credits || 0);
  const referral = Number(balance?.referral_credits || 0);
  const promo = Number(balance?.promo_credits || 0);
  const displayTotal = loading ? '\u20b9\u2014' : formatInr(total);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-800/70">Wallet</span>
        <span>{displayTotal}</span>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Patient Wallet</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{displayTotal}</p>
      <p className="mt-1 text-sm text-slate-600">Credits available for eligible sessions.</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-emerald-50 p-2">
          <p className="text-[11px] text-emerald-700">Game</p>
          <p className="text-sm font-semibold text-slate-900">{formatInr(game)}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-2">
          <p className="text-[11px] text-blue-700">Referral</p>
          <p className="text-sm font-semibold text-slate-900">{formatInr(referral)}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-2">
          <p className="text-[11px] text-amber-700">Promo</p>
          <p className="text-sm font-semibold text-slate-900">{formatInr(promo)}</p>
        </div>
      </div>
    </section>
  );
}
