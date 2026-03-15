import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type ModuleCard = {
  id: string;
  code: string;
  title: string;
  emoji: string;
  description: string;
  highlights: string[];
  goal: string;
  cta: string;
  to: string;
  themeClass: string;
  badge: 'FREE CONTENT' | 'ACTIVE' | 'PREMIUM';
};

const modules: ModuleCard[] = [
  {
    id: 'sound-therapy',
    code: 'PT04',
    title: 'Sound Therapy',
    emoji: '🎵',
    description: '200+ guided tracks across Indian Classical, Binaural Journeys, and restorative ambient soundscapes.',
    highlights: ['Raga Therapy sub-section', 'Deep focus sessions', 'Anxiety relief playlists'],
    goal: 'Anxiety Relief & Focus',
    cta: 'Explore Sounds →',
    to: '/patient/sound-therapy',
    themeClass: 'from-[#1f2f6d]/85 via-[#273c82]/80 to-[#2f4ea3]/75',
    badge: 'FREE CONTENT',
  },
  {
    id: 'sleep-therapy',
    code: 'PT02',
    title: 'Sleep Therapy',
    emoji: '🌙',
    description: 'Insomnia-oriented recovery plans with sleep hygiene protocols, body scans, and bedtime decompression flows.',
    highlights: ['Insomnia care tracks', 'Body Scan routines', 'Night reset protocols'],
    goal: 'Insomnia & Sleep Disorders',
    cta: 'Start Sleep Program →',
    to: '/patient/sleep-therapy',
    themeClass: 'from-[#0d2142]/90 via-[#16305b]/85 to-[#24437b]/80',
    badge: 'FREE CONTENT',
  },
  {
    id: 'anytime-buddy',
    code: 'PT07',
    title: 'AnytimeBuddy',
    emoji: '🤖',
    description: '24/7 AI companion for emotional check-ins, between-session support, and regulation coaching.',
    highlights: ['Real-time check-ins', 'Private support channel', '₹150/call or Premium Free'],
    goal: 'Between-Session Support',
    cta: 'Start Chat →',
    to: '/patient/buddy/anytime',
    themeClass: 'from-[#2f5f4f]/85 via-[#3b7863]/80 to-[#4f8a71]/75',
    badge: 'ACTIVE',
  },
  {
    id: 'vent-buddy',
    code: 'PT09',
    title: 'VentBuddy',
    emoji: '🔥',
    description: 'Voice/text emotional release room with empathetic AI listening and immediate calming prompts.',
    highlights: ['Voice-first venting', 'Text journaling mode', 'Anger and overload release'],
    goal: 'Emotional Release & Anger Mgmt',
    cta: 'Vent Now →',
    to: '/patient/buddy/vent',
    themeClass: 'from-[#9b4f2a]/85 via-[#bb6435]/80 to-[#cf7c4a]/75',
    badge: 'PREMIUM',
  },
  {
    id: 'digital-pets',
    code: 'PT06',
    title: 'Digital Pets Hub',
    emoji: '🐾',
    description: 'Habit-building companion pets that reinforce consistency, calm routines, and anti-loneliness rituals.',
    highlights: ['Koi, Puppy, and Owl companions', 'Daily habit nudges', 'Progressive care rewards'],
    goal: 'Engagement & Loneliness',
    cta: 'Meet Your Pet →',
    to: '/patient/therapy-plan',
    themeClass: 'from-[#0e5558]/85 via-[#146a6f]/80 to-[#1f7f86]/75',
    badge: 'PREMIUM',
  },
];

const badgeClass = (badge: ModuleCard['badge']) => {
  if (badge === 'FREE CONTENT') return 'bg-gray-100 text-gray-600 border-gray-200';
  if (badge === 'ACTIVE') return 'bg-[#f5e9c8] text-[#816116] border-[#e8d39d]';
  return 'bg-[#f3e5bf] text-[#7a5b1a] border-[#e4cc8f]';
};

export default function WellnessLibraryPage() {
  return (
    <section className="mx-auto w-full max-w-[1380px] pb-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/50 bg-gradient-to-br from-[#e8f4f0] via-[#edf4f7] to-[#f7efe7] p-6 shadow-[0_18px_42px_rgba(20,44,68,0.08)] sm:p-7 lg:p-8">
        <div className="absolute -right-14 -top-12 h-56 w-56 rounded-full bg-white/35 blur-3xl" />
        <p className="inline-flex rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/60">
          Wellness Command Center
        </p>
        <h1 className="mt-3 text-2xl font-bold text-charcoal sm:text-3xl" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Premium wellness modules for daily regulation and resilience
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-charcoal/70">
          Lifestyle-first care hub with focused modules for sleep, sound, emotional release, and AI companionship.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {modules.map((module) => (
          <article
            key={module.id}
            className="group overflow-hidden rounded-[20px] border border-white/40 bg-white/35 shadow-[0_14px_32px_rgba(23,41,61,0.10)] backdrop-blur-[10px]"
          >
            <div className={`bg-gradient-to-br ${module.themeClass} p-5 text-white`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-90">{module.code}</p>
                  <h2 className="mt-1 text-xl font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {module.title}
                  </h2>
                </div>
                <span className="text-2xl" aria-hidden="true">{module.emoji}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/92">{module.description}</p>
            </div>

            <div className="space-y-4 p-5">
              <ul className="space-y-1.5 text-sm text-charcoal/75">
                {module.highlights.map((highlight) => (
                  <li key={highlight}>• {highlight}</li>
                ))}
              </ul>

              <div className="rounded-xl bg-[#f7f8f8] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/55">
                Rx Goal: {module.goal}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Link
                  to={module.to}
                  className="inline-flex items-center rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                >
                  {module.cta}
                </Link>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${badgeClass(module.badge)}`}>
                  ● {module.badge}
                </span>
              </div>
            </div>
          </article>
        ))}
      </motion.div>
    </section>
  );
}
