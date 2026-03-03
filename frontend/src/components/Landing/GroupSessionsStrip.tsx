import React from 'react';

const sessions = [
  {
    id: 'live-anxiety',
    theme: '😰 Anxiety Circle',
    host: 'Dr. Priya',
    language: 'English',
    seats: '11/12 joined',
    status: 'LIVE',
    cta: '⚡ Join Now — Free',
    tone: 'live' as const,
  },
  {
    id: 'soon-grief',
    theme: '🕊️ Grief & Loss',
    host: 'Dr. Rajan',
    language: 'Hindi',
    seats: '8/10 joined',
    status: 'Starts in 12m',
    cta: '🔥 Join — Starting Soon',
    tone: 'soon' as const,
  },
  {
    id: 'upcoming-parenting',
    theme: '👨‍👧 Mindful Parenting',
    host: 'Ms. Kavitha',
    language: 'Tamil',
    seats: '6/15 joined',
    status: 'In 1h 35m',
    cta: '🔔 Remind Me',
    tone: 'upcoming' as const,
  },
];

const toneClasses = {
  live: {
    card: 'border-accent-coral/35 bg-accent-coral/10',
    badge: 'bg-accent-coral text-white',
    button: 'bg-accent-coral text-white hover:bg-accent-coral/90',
  },
  soon: {
    card: 'border-gentle-blue/35 bg-gentle-blue/10',
    badge: 'bg-gentle-blue text-charcoal',
    button: 'bg-gentle-blue text-charcoal hover:bg-gentle-blue/90',
  },
  upcoming: {
    card: 'border-calm-sage/35 bg-calm-sage/15',
    badge: 'bg-charcoal/15 text-charcoal',
    button: 'bg-charcoal text-cream hover:bg-charcoal/90',
  },
};

export const GroupSessionsStrip: React.FC = () => {
  return (
    <section className="border-b border-calm-sage/15 bg-white/85 px-4 py-5 sm:px-6 md:px-8 lg:px-12 xl:px-16" aria-label="Live and upcoming group sessions">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔴</span>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/80">Live & Next 2 Hours</p>
            <span className="rounded-full bg-calm-sage/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-charcoal">Free</span>
          </div>
          <button type="button" className="text-xs font-semibold text-charcoal/70 transition hover:text-charcoal">
            View full schedule →
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {sessions.map((session) => {
            const tone = toneClasses[session.tone];
            return (
              <article
                key={session.id}
                className={`rounded-2xl border p-4 shadow-soft-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-soft-sm ${tone.card}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-charcoal">{session.theme}</h3>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone.badge}`}>
                    {session.status}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-3 text-[11px] text-charcoal/70">
                  <span>👨‍⚕️ {session.host}</span>
                  <span>🌐 {session.language}</span>
                </div>

                <p className="mb-3 text-[11px] font-medium text-charcoal/70">👥 {session.seats}</p>

                <button type="button" className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition ${tone.button}`}>
                  {session.cta}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GroupSessionsStrip;