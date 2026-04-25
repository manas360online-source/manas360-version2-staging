import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patient';
import { useTherapyData } from '../../hooks/useTherapyData';

type CheckInType = 'morning' | 'evening';
type EnergyLevel = 'low' | 'medium' | 'high';

const checkInTypes: Array<{ id: CheckInType; label: string; emoji: string; description: string }> = [
  { id: 'morning', label: 'Morning', emoji: '☀️', description: 'Set your intention for the day' },
  { id: 'evening', label: 'Evening', emoji: '🌙', description: 'Reflect on your day' },
];

const morningMoodFaces: Array<{ value: number; emoji: string; label: string }> = [
  { value: 1, emoji: '😞', label: 'Very Low' },
  { value: 2, emoji: '🙁', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😁', label: 'Great' },
];

const eveningMoodFaces: Array<{ value: number; emoji: string; label: string }> = [
  { value: 1, emoji: '😞', label: 'Very Difficult' },
  { value: 2, emoji: '🙁', label: 'Hard' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😁', label: 'Great' },
];

const moodContextTags = [
  'Work / Study',
  'Health',
  'Family',
  'Relationships',
  'Finances',
  'Sleep',
  'Nothing specific'
];

export default function DailyCheckInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCheckInType, setActiveCheckInType] = useState<CheckInType>('morning');

  // Morning Check-in State
  const [morningMood, setMorningMood] = useState<number | null>(null);
  const [morningEnergy, setMorningEnergy] = useState<EnergyLevel | null>(null);
  const [morningSleep, setMorningSleep] = useState<string | null>(null);
  const [morningContext, setMorningContext] = useState<string[]>([]);
  const [morningIntention, setMorningIntention] = useState('');

  // Evening Check-in State
  const [eveningMood, setEveningMood] = useState<number | null>(null);
  const [eveningGood, setEveningGood] = useState('');
  const [eveningChallenging, setEveningChallenging] = useState('');
  const [eveningStress, setEveningStress] = useState<number>(5);
  const [eveningGratitude, setEveningGratitude] = useState('');

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Use shared therapy data hook for streak synchronization
  const { streak, refreshStreak } = useTherapyData();

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'morning' || typeParam === 'evening') {
      setActiveCheckInType(typeParam);
    }

    // Handle initialMood parameter from Dashboard
    const initialMoodParam = searchParams.get('initialMood');
    if (initialMoodParam && activeCheckInType === 'morning') {
      const initialMoodValue = Number(initialMoodParam);
      if (!isNaN(initialMoodValue) && initialMoodValue >= 1 && initialMoodValue <= 5) {
        setMorningMood(initialMoodValue);
      }
    }
  }, [searchParams, activeCheckInType]);

  useEffect(() => {
    // Reset step when switching check-in types
    setCurrentStep(0);
  }, [activeCheckInType]);

  const setCheckInType = (type: CheckInType) => {
    setActiveCheckInType(type);
    setSearchParams({ type });
  };

  const toggleContextTag = (tag: string) => {
    setMorningContext((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag]
    );
  };

  const getCurrentStepData = () => {
    if (activeCheckInType === 'morning') {
      return [
        { step: 0, title: 'How are you feeling right now?', completed: morningMood !== null },
        { step: 1, title: 'Your energy level today', completed: morningEnergy !== null },
        { step: 2, title: 'How well did you sleep last night?', completed: morningSleep !== null },
        { step: 3, title: 'What might affect your mood today?', completed: morningContext.length > 0 },
        { step: 4, title: 'One intention for today', completed: morningIntention.trim().length > 0 },
      ];
    } else {
      return [
        { step: 0, title: 'How was your day overall?', completed: eveningMood !== null },
        { step: 1, title: 'What went well today?', completed: eveningGood.trim().length > 0 },
        { step: 2, title: 'What was challenging today?', completed: eveningChallenging.trim().length > 0 },
        { step: 3, title: 'Stress level today', completed: true },
        { step: 4, title: 'One thing you are grateful for', completed: eveningGratitude.trim().length > 0 },
      ];
    }
  };

  const steps = getCurrentStepData();
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.completed).length;
  const canProceed = steps[currentStep]?.completed || false;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      void saveCheckIn();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveCheckIn = async () => {
    setSaving(true);
    try {
      const checkInData = activeCheckInType === 'morning' ? {
        type: 'morning' as const,
        mood: morningMood ?? undefined,
        energy: morningEnergy ?? undefined,
        sleep: morningSleep ?? undefined,
        context: morningContext,
        intention: morningIntention,
      } : {
        type: 'evening' as const,
        mood: eveningMood ?? undefined,
        reflectionGood: eveningGood,
        reflectionBad: eveningChallenging,
        stressLevel: eveningStress,
        gratitude: eveningGratitude,
      };

      await patientApi.addDailyCheckIn(checkInData);

      // Refresh streak from shared hook
      await refreshStreak();

      toast.success(`${activeCheckInType === 'morning' ? 'Morning' : 'Evening'} check-in saved!`);

      // Reset form
      if (activeCheckInType === 'morning') {
        setMorningMood(null);
        setMorningEnergy(null);
        setMorningSleep(null);
        setMorningContext([]);
        setMorningIntention('');
      } else {
        setEveningMood(null);
        setEveningGood('');
        setEveningChallenging('');
        setEveningStress(5);
        setEveningGratitude('');
      }
      setCurrentStep(0);

    } catch (error) {
      toast.error('Could not save check-in right now.');
    } finally {
      setSaving(false);
    }
  };

  const renderMorningStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">How are you feeling right now?</h3>
              <p className="text-sm text-charcoal/60">Set the tone for your day</p>
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              {morningMoodFaces.map((face) => (
                <button
                  key={face.value}
                  type="button"
                  onClick={() => {
                    setMorningMood(face.value);
                    setTimeout(() => nextStep(), 300); // Small delay for visual feedback
                  }}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                    morningMood === face.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl mb-2">{face.emoji}</span>
                  <span className="text-sm font-medium text-charcoal">{face.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">Your energy level today</h3>
              <p className="text-sm text-charcoal/60">How energized do you feel?</p>
            </div>
            <div className="flex justify-center gap-3">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setMorningEnergy(level);
                    setTimeout(() => nextStep(), 300);
                  }}
                  className={`flex-1 max-w-[120px] rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    morningEnergy === level
                      ? 'border-charcoal bg-charcoal text-white'
                      : 'border-ink-200 bg-white text-charcoal/70 hover:border-charcoal/50'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">How well did you sleep last night?</h3>
              <p className="text-sm text-charcoal/60">Quality rest affects your day</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['<4', '4–6', '6–8', '8+'].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => {
                    setMorningSleep(hours);
                    setTimeout(() => nextStep(), 300);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    morningSleep === hours
                      ? 'border-charcoal bg-charcoal text-white'
                      : 'border-ink-200 bg-white text-charcoal/70 hover:border-charcoal/50'
                  }`}
                >
                  {hours} hours
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">What might affect your mood today?</h3>
              <p className="text-sm text-charcoal/60">Select all that apply</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {moodContextTags.map((tag) => {
                const active = morningContext.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleContextTag(tag)}
                    className={`rounded-full border px-3 py-2 text-sm transition-all ${
                      active
                        ? 'border-calm-sage bg-calm-sage text-white'
                        : 'border-ink-200 bg-white text-charcoal/65 hover:border-calm-sage/50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">One intention for today</h3>
              <p className="text-sm text-charcoal/60">What would make today a good day?</p>
            </div>
            <textarea
              rows={3}
              value={morningIntention}
              onChange={(e) => setMorningIntention(e.target.value)}
              placeholder="Example: Finish my assignment, go for a walk, stay calm in meetings..."
              className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage placeholder:text-charcoal/40"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderEveningStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">How was your day overall?</h3>
              <p className="text-sm text-charcoal/60">Reflect on your day</p>
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              {eveningMoodFaces.map((face) => (
                <button
                  key={face.value}
                  type="button"
                  onClick={() => {
                    setEveningMood(face.value);
                    setTimeout(() => nextStep(), 300); // Small delay for visual feedback
                  }}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                    eveningMood === face.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl mb-2">{face.emoji}</span>
                  <span className="text-sm font-medium text-charcoal">{face.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">What went well today?</h3>
              <p className="text-sm text-charcoal/60">Something positive from today</p>
            </div>
            <textarea
              rows={3}
              value={eveningGood}
              onChange={(e) => setEveningGood(e.target.value)}
              placeholder="Example: Completed my work, talked with a friend, had a relaxing evening..."
              className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage placeholder:text-charcoal/40"
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">What was challenging today?</h3>
              <p className="text-sm text-charcoal/60">Anything stressful or difficult?</p>
            </div>
            <textarea
              rows={3}
              value={eveningChallenging}
              onChange={(e) => setEveningChallenging(e.target.value)}
              placeholder="Example: Work pressure, argument with someone..."
              className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage placeholder:text-charcoal/40"
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">Stress level today</h3>
              <p className="text-sm text-charcoal/60">How stressed did you feel?</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-charcoal/60">
                <span>Very Calm</span>
                <span className="font-semibold text-charcoal">{eveningStress}/10</span>
                <span>Very Stressed</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={eveningStress}
                onChange={(e) => setEveningStress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-calm-sage"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-charcoal mb-2">One thing you are grateful for</h3>
              <p className="text-sm text-charcoal/60">End your day with gratitude</p>
            </div>
            <textarea
              rows={3}
              value={eveningGratitude}
              onChange={(e) => setEveningGratitude(e.target.value)}
              placeholder="Example: My family, good health, finished a task..."
              className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage placeholder:text-charcoal/40"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-24">
      <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#d8efe8] via-[#edf8f4] to-[#f9f6ee] p-4 shadow-wellness-md sm:p-6 lg:p-8">
        <div className="absolute inset-y-0 right-0 w-[45%] bg-[radial-gradient(circle_at_center,_rgba(25,53,77,0.13),transparent_70%)]" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/55">Daily Check-in</p>
            <h1 className="mt-4 max-w-3xl font-serif text-2xl font-semibold tracking-tight text-charcoal sm:text-3xl lg:text-4xl">Start or end your day with reflection</h1>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-charcoal/70 sm:text-sm lg:text-base">Quick check-ins help you understand your patterns and build healthier habits.</p>
          </div>
          <div className="hidden lg:block rounded-[24px] border border-white/60 bg-white/75 p-5 shadow-wellness-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/45">Progress</p>
            <p className="mt-3 text-2xl font-semibold text-charcoal">🔥 {streak} day streak</p>
            <p className="mt-1 text-sm text-charcoal/65">Keep it up! Daily check-ins build better mental health habits.</p>
          </div>
        </div>
        {/* Mobile streak indicator */}
        <div className="lg:hidden mt-4 inline-flex gap-2 rounded-full bg-white/50 px-3 py-1.5">
          <span className="text-sm font-semibold text-charcoal">🔥 {streak} day streak</span>
        </div>
      </section>

      <section className="wellness-panel rounded-[24px] p-3 sm:rounded-[26px] sm:p-4">
        {/* Check-in Type Tabs */}
        <div className="flex h-11 items-center rounded-full bg-gray-100 p-1 mb-6">
          {checkInTypes.map((type) => {
            const isActive = activeCheckInType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setCheckInType(type.id)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-charcoal shadow-sm'
                    : 'text-charcoal/60 hover:text-charcoal/80'
                }`}
              >
                <span className="mr-2">{type.emoji}</span>
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-charcoal/60">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-charcoal/60">
              {completedSteps}/{totalSteps} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-calm-sage h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Check-in Content */}
        <div className="min-h-[400px] flex flex-col">
          {activeCheckInType === 'morning' ? renderMorningStep() : renderEveningStep()}

          {/* Navigation */}
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={prevStep}
                className="flex-1 rounded-full border border-ink-200 px-4 py-3 text-sm font-semibold text-charcoal/75 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canProceed || saving}
                onClick={nextStep}
                className="flex-1 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : currentStep === totalSteps - 1 ? 'Complete' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
