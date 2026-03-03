import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { recentMessages } from './dashboardData';

export default function TherapistMessagesPage() {
  return (
    <TherapistPageShell title="Messages" subtitle="Stay connected with your patients and follow-up promptly.">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <TherapistCard className="overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-sm font-bold text-ink-800">Conversations</h3>
          </div>
          <div className="divide-y divide-ink-100/60">
            {recentMessages.map((chat) => (
              <button key={chat.id} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-bg">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage-50 font-display text-xs font-bold text-sage-500">
                  {chat.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-800">{chat.name}</span>
                  <span className="block truncate text-xs text-ink-500">{chat.text}</span>
                </span>
                <span className="text-[10px] text-ink-500">{chat.time}</span>
              </button>
            ))}
          </div>
        </TherapistCard>

        <TherapistCard className="flex min-h-[420px] flex-col">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-sm font-bold text-ink-800">Deepak K.</h3>
            <TherapistBadge variant="sage" label="Online" />
          </div>

          <div className="flex-1 space-y-3 bg-surface-bg px-4 py-4">
            <div className="max-w-[80%] rounded-xl bg-surface-card px-3 py-2 text-sm text-ink-800 shadow-soft-xs">
              Thank you for the breathing recommendation. I feel calmer.
            </div>
            <div className="ml-auto max-w-[80%] rounded-xl bg-sage-500 px-3 py-2 text-sm text-white">
              Great progress. Keep the 5-minute breathing routine before bed.
            </div>
          </div>

          <div className="border-t border-ink-100 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-500 focus:border-sage-500 focus:ring-0"
              />
              <button className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-600">
                Send
              </button>
            </div>
          </div>
        </TherapistCard>
      </section>
    </TherapistPageShell>
  );
}
