import { useState, useEffect, useId } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate as fmAnimate,
} from 'framer-motion';
import { X } from 'lucide-react';
import {
  MOOD_OPTIONS,
  DAILY_CHECK_IN_TAGS,
  ENERGY_OPTIONS,
  SLEEP_OPTIONS,
  getDailyCheckInPlaceholder,
  type DailyCheckInEnergy,
} from '../../utils/dailyCheckIn';
import { patientApi } from '../../api/patient';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DailyCheckInModalProps {
  initialMood?: number | null;
  onClose: () => void;
  onComplete?: (newStreak: number) => void;
}

// ─── Card slide variants (spring physics) ────────────────────────────────────
const cardVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '60%' : '-60%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 30, mass: 0.8 },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-60%' : '60%',
    opacity: 0,
    scale: 0.95,
    transition: { type: 'spring' as const, stiffness: 380, damping: 30, mass: 0.8 },
  }),
};

// ─── Tag stagger variants ────────────────────────────────────────────────────
const tagContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const tagItemVariants = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 500, damping: 25 } },
};

// ─── Animated streak counter ─────────────────────────────────────────────────
function AnimatedCounter({ from, to }: { from: number; to: number }) {
  const count = useMotionValue(Math.max(0, from));
  const rounded = useTransform(count, (v) => Math.round(v));
  useEffect(() => {
    const controls = fmAnimate(count, to, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [count, from, to]);
  return <motion.span>{rounded}</motion.span>;
}

// ─── Step 1: Core Emotion ─────────────────────────────────────────────────────
function Step1({
  mood,
  intensity,
  showSlider,
  onMoodSelect,
  onIntensityChange,
  onNext,
}: {
  mood: number | null;
  intensity: number;
  showSlider: boolean;
  onMoodSelect: (v: number) => void;
  onIntensityChange: (v: number) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-calm-sage">Step 1 of 3</p>
      <h2 className="mt-2 text-2xl font-bold text-charcoal">How are you feeling?</h2>
      <p className="mt-1 text-sm text-ink-500">Tap the emoji that matches your mood right now.</p>

      {/* Emoji Row */}
      <div className="mt-8 flex items-end justify-between gap-1 sm:gap-2">
        {MOOD_OPTIONS.map((option) => {
          const isSelected = mood === option.value;
          const hasSelection = mood !== null;
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onMoodSelect(option.value)}
              animate={{
                scale: isSelected ? 1.22 : hasSelection ? 0.84 : 1,
                opacity: hasSelection && !isSelected ? 0.38 : 1,
              }}
              whileHover={!isSelected ? { y: -5 } : {}}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-4 transition-colors ${
                isSelected ? 'bg-calm-sage/10 ring-2 ring-calm-sage/40' : 'bg-ink-50/60 hover:bg-ink-100/60'
              }`}
            >
              <span className="text-3xl leading-none">{option.emoji}</span>
              <span
                className={`text-xs font-medium leading-none transition-colors ${
                  isSelected ? 'text-calm-sage font-bold' : 'text-ink-400'
                }`}
              >
                {option.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Intensity Slider – revealed only after mood selection */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-calm-sage/15 bg-ink-50/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-charcoal">Mood Intensity</p>
                <span className="rounded-full bg-calm-sage/15 px-2.5 py-0.5 text-sm font-bold text-calm-sage">
                  {intensity}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={intensity}
                onChange={(e) => onIntensityChange(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-calm-sage/20 accent-calm-sage"
              />
              <div className="mt-1.5 flex justify-between text-xs text-ink-400">
                <span>Barely noticeable</span>
                <span>Overwhelming</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onNext}
        disabled={mood === null}
        className="mt-8 w-full rounded-2xl bg-charcoal py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue →
      </button>
    </div>
  );
}

// ─── Step 2: Context ──────────────────────────────────────────────────────────
function Step2({
  tags,
  energy,
  sleepHours,
  onTagToggle,
  onEnergyChange,
  onSleepChange,
  onNext,
  onBack,
}: {
  tags: string[];
  energy: DailyCheckInEnergy | null;
  sleepHours: string | null;
  onTagToggle: (tag: string) => void;
  onEnergyChange: (v: DailyCheckInEnergy) => void;
  onSleepChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const layoutId = useId();

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-calm-sage">Step 2 of 3</p>
      <h2 className="mt-2 text-2xl font-bold text-charcoal">What's going on?</h2>
      <p className="mt-1 text-sm text-ink-500">Help us understand your day a little better.</p>

      {/* Staggered Tags */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
          What's affecting your mood? (choose any)
        </p>
        <motion.div
          variants={tagContainerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2"
        >
          {DAILY_CHECK_IN_TAGS.map((tag) => {
            const isActive = tags.includes(tag.value);
            return (
              <motion.button
                key={tag.value}
                type="button"
                variants={tagItemVariants}
                onClick={() => onTagToggle(tag.value)}
                whileTap={{ scale: 0.88 }}
                animate={isActive ? { scale: [1, 0.92, 1.04, 1] } : {}}
                transition={{ duration: 0.28 }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-calm-sage bg-calm-sage text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-calm-sage/50 hover:bg-calm-sage/5'
                }`}
              >
                <span className="text-base leading-none">{tag.emoji}</span>
                {tag.label}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Energy Segmented Control with sliding layoutId highlight */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Energy Level</p>
        <div className="relative flex rounded-xl border border-ink-200 bg-ink-50/50 p-1">
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onEnergyChange(opt.value as DailyCheckInEnergy)}
              className="relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors z-10"
              style={{ color: energy === opt.value ? 'white' : '#6B7280' }}
            >
              {energy === opt.value && (
                <motion.div
                  layoutId={`${layoutId}-energy`}
                  className="absolute inset-0 rounded-lg bg-charcoal"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sleep Hours */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Hours of Sleep</p>
        <div className="flex flex-wrap gap-2">
          {SLEEP_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onSleepChange(opt)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                sleepHours === opt
                  ? 'border-calm-sage bg-calm-sage text-white'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-calm-sage/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-ink-200 px-5 py-3.5 text-sm font-semibold text-charcoal transition hover:bg-ink-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-2xl bg-charcoal py-3.5 text-sm font-semibold text-white transition hover:bg-black"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Reflection ───────────────────────────────────────────────────────
function Step3({
  mood,
  note,
  isFocused,
  saving,
  onNoteChange,
  onFocusChange,
  onSave,
  onBack,
}: {
  mood: number | null;
  note: string;
  isFocused: boolean;
  saving: boolean;
  onNoteChange: (v: string) => void;
  onFocusChange: (v: boolean) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-calm-sage">Step 3 of 3</p>
      <h2 className="mt-2 text-2xl font-bold text-charcoal">Anything to capture?</h2>
      <p className="mt-1 text-sm text-ink-500">Optional — just for you, not visible to your provider.</p>

      {/* Glowing textarea */}
      <motion.div
        animate={
          isFocused
            ? { boxShadow: '0 0 0 3px rgba(76, 115, 98, 0.25)', borderColor: 'rgba(76, 115, 98, 0.6)' }
            : { boxShadow: '0 0 0 0px rgba(76, 115, 98, 0)', borderColor: 'rgba(203, 213, 225, 1)' }
        }
        transition={{ duration: 0.2 }}
        className="mt-5 rounded-2xl border bg-white overflow-hidden"
      >
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder={getDailyCheckInPlaceholder(mood)}
          rows={4}
          className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-charcoal placeholder-ink-300 outline-none"
        />
      </motion.div>

      <div className="mt-3 text-right text-xs text-ink-400">{note.length}/300</div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-ink-200 px-5 py-3.5 text-sm font-semibold text-charcoal transition hover:bg-ink-50"
        >
          ← Back
        </button>

        {/* Breathing save button */}
        <motion.button
          type="button"
          onClick={onSave}
          disabled={saving}
          animate={saving ? {} : { scale: [1, 1.025, 1] }}
          transition={saving ? {} : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex-1 rounded-2xl bg-calm-sage py-3.5 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
        >
          {saving ? 'Saving...' : '✓ Save Check-in'}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({ streak, onClose }: { streak: number; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white p-10 text-center shadow-2xl"
      >
        {/* Radial glow */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 3, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(76,115,98,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          {/* SVG Checkmark Path Animation */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-calm-sage/10">
            <svg viewBox="0 0 100 100" fill="none" className="h-12 w-12">
              <motion.path
                d="M22 50 L42 70 L78 28"
                stroke="#4C7362"
                strokeWidth={5.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-charcoal">Check-in Complete!</h2>
          <p className="mt-2 text-sm text-ink-500">You're building a powerful self-awareness habit.</p>

          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
              className="relative mt-7 inline-flex items-center gap-3 rounded-2xl bg-warm-terracotta/10 px-6 py-4"
            >
              {/* Streak milestone glow */}
              {streak % 5 === 0 && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.6 }}
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-warm-terracotta/20"
                />
              )}
              <span className="text-3xl">🔥</span>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-warm-terracotta/70">Current Streak</p>
                <p className="text-3xl font-bold text-warm-terracotta">
                  <AnimatedCounter from={Math.max(0, streak - 1)} to={streak} />
                  <span className="ml-1 text-base font-medium">days</span>
                </p>
              </div>
            </motion.div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-8 w-full rounded-2xl bg-charcoal py-3.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function DailyCheckInModal({ initialMood, onClose, onComplete }: DailyCheckInModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [mood, setMood] = useState<number | null>(initialMood ?? null);
  const [intensity, setIntensity] = useState(5);
  const [showSlider, setShowSlider] = useState(initialMood != null);
  const [tags, setTags] = useState<string[]>([]);
  const [energy, setEnergy] = useState<DailyCheckInEnergy | null>(null);
  const [sleepHours, setSleepHours] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [streak, setStreak] = useState(0);

  const progressTarget = ((step + 1) / 3) * 100;

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2));
  };
  const goPrev = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleMoodSelect = (value: number) => {
    setMood(value);
    if (!showSlider) setShowSlider(true);
  };

  const handleTagToggle = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSave = async () => {
    if (saving || mood == null) return;
    setSaving(true);
    try {
      const res = await patientApi.addMoodLog({
        mood,
        note: note.trim() || undefined,
        intensity,
        tags,
        energy: energy ?? undefined,
        sleepHours: sleepHours ?? undefined,
      });
      const payload = (res as any)?.data ?? res;
      const newStreak = Number(payload?.streak ?? payload?.currentStreak ?? 0);
      setStreak(newStreak);
      // Broadcast to other pages (DashboardPage, TherapyPlanPage)
      window.dispatchEvent(
        new CustomEvent('check-in-complete', {
          detail: { mood, intensity, tags, energy, sleepHours, streak: newStreak },
        }),
      );
      onComplete?.(newStreak);
      setShowSuccess(true);
    } catch {
      // Show success even if API fails — don't punish the user
      setShowSuccess(true);
      window.dispatchEvent(new CustomEvent('check-in-complete', { detail: { mood, streak: 0 } }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg">
          {/* Progress Bar + Close */}
          <div className="mb-3 flex items-center gap-3">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                animate={{ width: `${progressTarget}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 28 }}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/35"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Animated Card */}
          <div className="relative overflow-hidden rounded-3xl">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="bg-white p-7 shadow-2xl"
              >
                {step === 0 && (
                  <Step1
                    mood={mood}
                    intensity={intensity}
                    showSlider={showSlider}
                    onMoodSelect={handleMoodSelect}
                    onIntensityChange={setIntensity}
                    onNext={goNext}
                  />
                )}
                {step === 1 && (
                  <Step2
                    tags={tags}
                    energy={energy}
                    sleepHours={sleepHours}
                    onTagToggle={handleTagToggle}
                    onEnergyChange={setEnergy}
                    onSleepChange={setSleepHours}
                    onNext={goNext}
                    onBack={goPrev}
                  />
                )}
                {step === 2 && (
                  <Step3
                    mood={mood}
                    note={note}
                    isFocused={isFocused}
                    saving={saving}
                    onNoteChange={setNote}
                    onFocusChange={setIsFocused}
                    onSave={handleSave}
                    onBack={goPrev}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step dots */}
          <div className="mt-4 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ width: i === step ? 24 : 6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-1.5 rounded-full bg-white/60"
                style={{ backgroundColor: i === step ? 'white' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Success overlay (on top of everything) */}
      <AnimatePresence>
        {showSuccess && <SuccessOverlay streak={streak} onClose={onClose} />}
      </AnimatePresence>
    </>
  );
}
