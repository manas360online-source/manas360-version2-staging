import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { patientApi } from '../../api/patient';

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
  badge: 'FREE CONTENT' | 'ACTIVE' | 'PREMIUM LIBRARY';
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
    to: '/sound-therapy',
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
    id: 'digital-pets',
    code: 'PT06',
    title: 'Digital Pets Hub',
    emoji: '🐾',
    description: 'Habit-building companion pets that reinforce consistency, calm routines, and anti-loneliness rituals.',
    highlights: ['Koi, Puppy, and Owl companions', 'Daily habit nudges', 'Progressive care rewards'],
    goal: 'Engagement & Loneliness',
    cta: 'Meet Your Pet →',
    to: '/pet',
    themeClass: 'from-[#0e5558]/85 via-[#146a6f]/80 to-[#1f7f86]/75',
    badge: 'PREMIUM LIBRARY',
  },
  {
    id: 'vr-companion-sanctuary',
    code: 'PT10',
    title: 'VR Companion Sanctuary',
    emoji: '🦋',
    description: 'Immersive AR/VR companion launchpad for premium emotional support experiences.',
    highlights: ['Phoenix Friend, Guardian Dragon, Wisdom Peacock', 'Tap a companion to launch', 'High-engagement premium flow'],
    goal: 'Transformation & Deep Engagement',
    cta: 'Enter VR Sanctuary →',
    to: '/patient/vr-sanctuary',
    themeClass: 'from-[#29304f]/90 via-[#3a4670]/85 to-[#5166a1]/80',
    badge: 'PREMIUM LIBRARY',
  },
];

const badgeClass = (badge: ModuleCard['badge']) => {
  if (badge === 'FREE CONTENT') return 'bg-gray-100 text-gray-600 border-gray-200';
  if (badge === 'ACTIVE') return 'bg-[#f5e9c8] text-[#816116] border-[#e8d39d]';
  return 'bg-[#f3e5bf] text-[#7a5b1a] border-[#e4cc8f]';
};

type PremiumLibraryUsage = {
  hasPremiumLibraryAccess: boolean;
  totalSeconds: number;
  consumedSeconds: number;
  remainingSeconds: number;
  totalMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
};

const formatMinutes = (seconds: number): string => {
  const mins = Math.max(0, Math.ceil(seconds / 60));
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
  }
  return `${mins}m`;
};

export default function WellnessLibraryPage() {
  const [usage, setUsage] = useState<PremiumLibraryUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string>('');
  const visibleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadUsage = async () => {
      setUsageLoading(true);
      try {
        const data = await patientApi.getPremiumLibraryUsage();
        if (!mounted) return;
        setUsage(data);
        setUsageError('');
      } catch (error: any) {
        if (!mounted) return;
        setUsage(null);
        setUsageError(String(error?.response?.data?.message || error?.message || 'Unable to load usage'));
      } finally {
        if (mounted) setUsageLoading(false);
      }
    };

    void loadUsage();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const shouldTrack = Boolean(usage?.hasPremiumLibraryAccess);
    if (!shouldTrack) {
      visibleSinceRef.current = null;
      return;
    }

    visibleSinceRef.current = Date.now();

    const flushUsage = async (source: string) => {
      if (!usage?.hasPremiumLibraryAccess) return;
      const startedAt = visibleSinceRef.current;
      if (!startedAt) return;

      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);
      if (elapsedSeconds < 5) {
        visibleSinceRef.current = now;
        return;
      }

      visibleSinceRef.current = now;
      try {
        const updated = await patientApi.consumePremiumLibraryUsage({
          secondsSpent: elapsedSeconds,
          source: `wellness-library:${source}`,
        });
        setUsage(updated);
      } catch {
        // Silent fail; next visible segment will retry consumption.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flushUsage('hidden');
      } else {
        visibleSinceRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      void flushUsage('unload');
    };

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void flushUsage('heartbeat');
      }
    }, 60000);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void flushUsage('unmount');
    };
  }, [usage?.hasPremiumLibraryAccess]);

  return (
    <section className="mx-auto w-full max-w-[1380px] pb-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/50 bg-gradient-to-br from-[#e8f4f0] via-[#edf4f7] to-[#f7efe7] p-6 shadow-[0_18px_42px_rgba(20,44,68,0.08)] sm:p-7 lg:p-8">
        <div className="absolute -right-14 -top-12 h-56 w-56 rounded-full bg-white/35 blur-3xl" />
        <p className="inline-flex rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/60">
          Wellness Command Center
        </p>
        <h1 className="mt-3 text-2xl font-bold text-charcoal sm:text-3xl" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Premium Library modules for daily regulation and resilience
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-charcoal/70">
          Lifestyle-first care hub with focused modules for sleep, sound, and AI companionship.
        </p>

        <div className="mt-4 rounded-2xl border border-white/60 bg-white/65 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
            <Sparkles className="h-[19px] w-[19px] text-wellness-sky" aria-hidden="true" />
            <span>Premium Library Screen-Time Meter</span>
          </div>
          {usageLoading ? (
            <p className="mt-2 text-xs text-charcoal/65">Loading Premium Library usage...</p>
          ) : usage ? (
            <div className="mt-2 text-xs text-charcoal/80">
              <p>
                Remaining time: <strong>{formatMinutes(usage.remainingSeconds)}</strong> of{' '}
                <strong>{formatMinutes(usage.totalSeconds)}</strong>
              </p>
              <p className="mt-1 text-charcoal/60">
                Time is automatically consumed while this page is open and visible.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-rose-700">{usageError || 'Premium Library usage unavailable.'}</p>
          )}
        </div>
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
                  to={
                    module.id === 'digital-pets'
                      ? `/pet?returnTo=${encodeURIComponent('/patient/wellness-library')}`
                      : module.to
                  }
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
