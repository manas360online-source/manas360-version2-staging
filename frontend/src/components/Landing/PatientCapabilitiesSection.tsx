import React from 'react';

const cards = [
  {
    title: '🤖 AnytimeBuddy — AI Companion',
    description: '24/7 AI-guided support for mood check-ins, emotional grounding, and between-session continuity.',
    features: ['24/7 availability', 'Mood tracking', 'Crisis escalation support'],
  },
  {
    title: '📊 Progress Tracking',
    description: 'Comprehensive mood tracking and therapy progress monitoring with visual insights.',
    features: ['Daily mood logs', 'Progress charts', 'Goal setting support'],
  },
  {
    title: '👥 Group Support Programs',
    description: 'Join moderated circles for anxiety, grief, and recovery with safe, structured facilitation.',
    features: ['Topic-based groups', 'Guided participation', 'Privacy-first approach'],
  },
  {
    title: '🎵 Sound & Meditation Therapy',
    description: 'Therapeutic audio journeys and focus tracks to support sleep, calm, and emotional regulation.',
    features: ['Sleep tracks', 'Focus tracks', 'Guided relaxation'],
  },
  {
    title: '📊 Wellness Insights Dashboard',
    description: 'Track self-assessment trends, progress patterns, and outcomes over time with visual clarity.',
    features: ['Progress graphs', 'Check-in history', 'Shareable reports'],
  },
  {
    title: '🥽 AR-Enabled Therapy Modules',
    description: 'Immersive modules for exposure and mindfulness experiences on supported devices.',
    features: ['Exposure practice', 'Mindfulness overlays', 'Mobile-first experience'],
  },
];

export const PatientCapabilitiesSection: React.FC = () => {
  return (
    <section id="for-patients" className="py-16 md:py-20" aria-labelledby="patients-title">
      <span className="inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">For Patients</span>
      <h2 id="patients-title" className="mt-3 font-serif text-3xl font-light text-charcoal md:text-4xl">Everything you need to heal, in one place</h2>
      <p className="mt-3 max-w-3xl text-base text-charcoal/65">From first assessment to long-term growth, MANAS360 supports the full care journey.</p>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <article className="rounded-3xl border border-calm-sage/20 bg-charcoal p-7 text-cream shadow-soft-md lg:col-span-2">
          <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cream/80">Featured</p>
          <h3 className="mt-4 text-2xl font-semibold">🎥 1-on-1 Therapy & Psychiatry Sessions</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/75">
            Connect with licensed psychologists, psychiatrists, and counselors through secure video, audio, or in-person sessions.
            Choose by specialization, language, and availability.
          </p>
          <div className="mt-5 grid gap-2 text-[15px] text-cream/85 sm:grid-cols-2">
            <p>✓ Video, audio, and in-person options</p>
            <p>✓ Anxiety, depression, trauma, and stress support</p>
            <p>✓ Regional language compatibility</p>
            <p>✓ Flexible pricing and plan options</p>
          </div>
        </article>

        {cards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-calm-sage/15 bg-white p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-sm">
            <h3 className="text-[17px] font-semibold text-charcoal">{card.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-charcoal/65">{card.description}</p>
            <ul className="mt-4 space-y-1.5 text-[13px] text-charcoal/75">
              {card.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PatientCapabilitiesSection;
