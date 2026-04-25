export type DailyCheckInEnergy = 'low' | 'medium' | 'high';

export type DailyCheckInMetadata = {
  intensity?: number | null;
  tags: string[];
  energy?: DailyCheckInEnergy | null;
  sleepHours?: string | null;
};

export const MOOD_OPTIONS = [
  { value: 1, emoji: '😭', label: 'Awful', accent: 'from-rose-400 to-rose-500' },
  { value: 2, emoji: '😟', label: 'Sad', accent: 'from-amber-400 to-orange-400' },
  { value: 3, emoji: '😐', label: 'Flat', accent: 'from-slate-300 to-slate-400' },
  { value: 4, emoji: '🙂', label: 'Good', accent: 'from-emerald-300 to-teal-400' },
  { value: 5, emoji: '😄', label: 'Great', accent: 'from-sky-300 to-cyan-400' },
] as const;

export const DAILY_CHECK_IN_TAGS = [
  { value: 'work', label: 'Work', emoji: '💼' },
  { value: 'sleep', label: 'Sleep', emoji: '🛌' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'health', label: 'Health', emoji: '🏃' },
  { value: 'finances', label: 'Finances', emoji: '💸' },
  { value: 'exercise', label: 'Exercise', emoji: '💪' },
  { value: 'relationships', label: 'Relationships', emoji: '💬' },
  { value: 'selfcare', label: 'Self-care', emoji: '🕯️' },
] as const;

export const ENERGY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

export const SLEEP_OPTIONS = ['<4 hours', '5-6 hours', '7-8 hours', '8+ hours'] as const;

export const getMoodOption = (value?: number | null) => MOOD_OPTIONS.find((option) => option.value === value) || null;

export const getDailyCheckInPlaceholder = (mood?: number | null) => {
  if (mood === 5) return 'What went well today?';
  if (mood === 4) return 'What helped you feel more grounded today?';
  if (mood === 3) return 'Anything worth noting from today?';
  if (mood === 2) return 'Get it off your chest...';
  if (mood === 1) return 'What feels heaviest right now?';
  return 'Write a few words if you want to remember this moment.';
};

export const formatTagLabel = (tag: string) => DAILY_CHECK_IN_TAGS.find((item) => item.value === tag)?.label || tag;
