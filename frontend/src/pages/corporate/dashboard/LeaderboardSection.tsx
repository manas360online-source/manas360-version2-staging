import type { LeaderboardEntry } from './CorporateDashboard.types';

type LeaderboardSectionProps = {
  entries: LeaderboardEntry[];
};

export default function LeaderboardSection({ entries }: LeaderboardSectionProps) {
  return (
    <section className="rounded-xl border border-ink-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-900">Leaderboard</h2>
        <span className="text-xs font-medium text-ink-500">Top performers</span>
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-ink-900">
                #{index + 1} {entry.name}
              </p>
              <p className="text-xs text-ink-500">{entry.department}</p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-ink-800">{entry.points} pts</p>
              <p className="text-xs text-ink-500">{entry.streakDays}-day streak</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
