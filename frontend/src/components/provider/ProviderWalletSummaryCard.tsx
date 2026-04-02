type ProviderWalletSummaryCardProps = {
  title: string;
  amountMinor: number;
  note: string;
  accent?: 'emerald' | 'slate' | 'amber';
};

const formatCurrency = (minor: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format((Number.isFinite(minor) ? minor : 0) / 100);

const accentClass = (accent: ProviderWalletSummaryCardProps['accent']): string => {
  if (accent === 'emerald') return 'border-emerald-200 bg-emerald-50/50 text-emerald-800';
  if (accent === 'amber') return 'border-amber-200 bg-amber-50/60 text-amber-800';
  return 'border-slate-200 bg-white text-slate-800';
};

export default function ProviderWalletSummaryCard({
  title,
  amountMinor,
  note,
  accent = 'slate',
}: ProviderWalletSummaryCardProps) {
  return (
    <article className={`rounded-[22px] border p-5 shadow-sm ${accentClass(accent)}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{formatCurrency(amountMinor)}</p>
      <p className="mt-2 text-xs opacity-80">{note}</p>
    </article>
  );
}
