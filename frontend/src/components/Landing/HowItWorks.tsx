import React, { useMemo, useState } from 'react';
import { ClipboardList, Bot, CalendarCheck2, Sprout, BadgeCheck, UserRound, Bell, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type FlowKey = 'patient' | 'provider';

interface FlowStep {
  number: number;
  title: string;
  description: string;
  time: string;
  emoji: string;
  icon: LucideIcon;
}

const patientFlow: FlowStep[] = [
  {
    number: 1,
    title: 'Free Clinical Assessment',
    description: 'Complete a quick screening in your preferred language to understand your baseline.',
    time: '3 min',
    emoji: '📋',
    icon: ClipboardList,
  },
  {
    number: 2,
    title: 'AI-Powered Matching',
    description: 'Get matched to the right therapist based on specialization, language, and availability.',
    time: 'Instant',
    emoji: '🤖',
    icon: Bot,
  },
  {
    number: 3,
    title: 'Book Your Session',
    description: 'Pick a slot and preferred format (video, audio, or in-person) with secure payment.',
    time: '2 min',
    emoji: '📅',
    icon: CalendarCheck2,
  },
  {
    number: 4,
    title: 'Sustained Recovery',
    description: 'Track progress over time with between-session support and guided tools.',
    time: 'Ongoing',
    emoji: '🌱',
    icon: Sprout,
  },
];

const providerFlow: FlowStep[] = [
  {
    number: 1,
    title: 'Apply & Get Verified',
    description: 'Submit credentials for professional verification and quality screening.',
    time: '48 hrs',
    emoji: '✅',
    icon: BadgeCheck,
  },
  {
    number: 2,
    title: 'Build Your Profile',
    description: 'Set expertise, languages, pricing, and session availability in one dashboard.',
    time: '15 min',
    emoji: '🖼️',
    icon: UserRound,
  },
  {
    number: 3,
    title: 'Receive Matched Patients',
    description: 'Get relevant, pre-screened leads aligned to your specialization.',
    time: 'Within 7 days',
    emoji: '🔔',
    icon: Bell,
  },
  {
    number: 4,
    title: 'Earn & Grow',
    description: 'Track outcomes, sessions, and earnings with built-in analytics and tools.',
    time: 'Ongoing',
    emoji: '💰',
    icon: Wallet,
  },
];

export const HowItWorks: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FlowKey>('patient');

  const activeFlow = useMemo(() => (activeTab === 'patient' ? patientFlow : providerFlow), [activeTab]);

  return (
    <section id="how-it-works" className="py-16 md:py-20" aria-labelledby="how-title">
      <div className="mx-auto max-w-3xl text-center">
        <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">How It Works</span>
        <h2 id="how-title" className="font-serif text-3xl font-light text-charcoal md:text-4xl lg:text-5xl">
          Start your care journey in minutes
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-charcoal/60">
          Whether you need support or provide it, MANAS360 simplifies every step.
        </p>

        <div className="mx-auto mt-8 inline-flex rounded-full border border-calm-sage/20 bg-cream p-1 shadow-soft-xs">
          <button
            type="button"
            onClick={() => setActiveTab('patient')}
            className={`rounded-full px-4 py-2 text-xs font-semibold md:px-6 md:text-sm ${
              activeTab === 'patient' ? 'bg-white text-calm-sage shadow-soft-xs' : 'text-charcoal/65'
            }`}
          >
            I Need Support
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('provider')}
            className={`rounded-full px-4 py-2 text-xs font-semibold md:px-6 md:text-sm ${
              activeTab === 'provider' ? 'bg-white text-calm-sage shadow-soft-xs' : 'text-charcoal/65'
            }`}
          >
            I'm a Provider
          </button>
        </div>
      </div>

      <div className="relative mt-10 grid grid-cols-1 gap-5 md:mt-12 md:grid-cols-2 xl:grid-cols-4">
        {activeFlow.map((step) => {
          const Icon = step.icon;
          return (
            <article
              key={`${activeTab}-${step.number}`}
              className="rounded-2xl border border-calm-sage/30 bg-white/95 p-6 shadow-[0_8px_26px_rgba(44,51,51,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-calm-sage/45 hover:shadow-[0_14px_32px_rgba(44,51,51,0.14)]"
            >
              <p className="text-[11px] font-semibold tracking-widest text-calm-sage/80">STEP {String(step.number).padStart(2, '0')}</p>
              <div className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-calm-sage/25 bg-calm-sage/18 text-lg shadow-[0_4px_14px_rgba(44,51,51,0.08)]">
                <span aria-hidden="true">{step.emoji}</span>
                <Icon className="sr-only" />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold text-charcoal">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-charcoal/78">{step.description}</p>
              <p className="mt-3 text-xs font-semibold text-calm-sage">⏱ {step.time}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default HowItWorks;
