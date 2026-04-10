import type { RoiStat } from './CorporateDashboard.types';

type RoiStatsSectionProps = {
  stats: RoiStat[];
};

export default function RoiStatsSection({ stats }: RoiStatsSectionProps) {
  return (
    <section className="rounded-xl border border-ink-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-900">ROI Stats</h2>
        <span className="text-xs font-medium text-ink-500">Quarter to date</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.id} className="rounded-lg border border-ink-100 bg-ink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{stat.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{stat.value}</p>
            <p className="mt-1 text-xs text-ink-500">{stat.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
