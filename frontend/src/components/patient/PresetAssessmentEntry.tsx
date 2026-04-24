import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getPresetConfig, parseUtmParams, isValidPresetEntryType } from '../../config/presetDefaults';
import {
  CLINICAL_ASSESSMENT_OPTIONS,
  CLINICAL_ASSESSMENT_TEMPLATE_KEYS,
} from '../../utils/clinicalAssessments';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

type PresetAssessmentDraft = {
  entryType: string;
  answers: number[];
  source: {
    entryType: string;
    landingPage: string;
    utmCampaign?: string;
    utmMedium?: string;
    utmSource?: string;
    timezoneRegion?: string;
    primaryConcerns?: string[];
    languagePreference?: string;
  };
  savedAt: number;
};

const PRESET_ASSESSMENT_DRAFT_KEY = 'manas360.preset-assessment-draft-v1';
const NRI_TIMEZONE_OPTIONS = [
  { value: 'US_EST', label: 'US East (EST)' },
  { value: 'US_PST', label: 'US West (PST)' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'UAE', label: 'UAE' },
  { value: 'OTHER', label: 'Other' },
] as const;

const NRI_CONCERN_OPTIONS = [
  'Career pressure abroad',
  'Family guilt and distance',
  'Identity and belonging',
  'Loneliness and isolation',
  'Cross-cultural relationship stress',
  'Immigration or visa anxiety',
  'Parenting across cultures',
  'Aging parents in India',
  'Return to India dilemma',
  'Discrimination stress',
] as const;

const NRI_LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'] as const;

const mapBrowserTimezoneToNriRegion = (timezone: string): string => {
  const tz = String(timezone || '').trim();
  if (!tz) return 'OTHER';

  const explicitMap: Record<string, string> = {
    'America/New_York': 'US_EST',
    'America/Detroit': 'US_EST',
    'America/Toronto': 'US_EST',
    'America/Chicago': 'US_EST',
    'America/Los_Angeles': 'US_PST',
    'America/Vancouver': 'US_PST',
    'America/Denver': 'US_PST',
    'Europe/London': 'UK',
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Asia/Singapore': 'SG',
    'Asia/Dubai': 'UAE',
  };

  if (explicitMap[tz]) return explicitMap[tz];

  if (tz.startsWith('America/')) return 'US_EST';
  if (tz.startsWith('Europe/')) return 'UK';
  if (tz.startsWith('Australia/')) return 'AU';
  if (tz.startsWith('Asia/')) {
    if (tz.includes('Singapore')) return 'SG';
    if (tz.includes('Dubai')) return 'UAE';
  }

  return 'OTHER';
};

export const PresetAssessmentEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0); // 0 = warmup, 1-N = questions, final = completion
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  const entryType = searchParams.get('entry');
  const presetConfig = entryType && isValidPresetEntryType(entryType) ? getPresetConfig(entryType) : null;
  const assessmentType = presetConfig?.assessmentType || 'PHQ-9';
  const [questions, setQuestions] = useState<string[]>([]);
  const options = CLINICAL_ASSESSMENT_OPTIONS.map((option: any) => ({ label: option.label, value: option.points }));
  const utmParams = parseUtmParams(searchParams);
  const totalQuestions = questions.length;
  const completionStep = totalQuestions + 1;
  const currentRoute = `${location.pathname}${location.search}`;
  const isNriEntry = useMemo(() => String(entryType || '').startsWith('nri_'), [entryType]);
  const sessionsRedirectPath = useMemo(() => {
    if (!(entryType && isValidPresetEntryType(entryType))) return '/patient/sessions';
    const params = new URLSearchParams({ adEntry: entryType });
    if (isNriEntry && selectedTimezone) {
      params.set('timezoneRegion', selectedTimezone);
    }
    return `/patient/sessions?${params.toString()}`;
  }, [entryType, isNriEntry, selectedTimezone]);

  // Redirect if entry type is invalid
  useEffect(() => {
    if (entryType && !isValidPresetEntryType(entryType)) {
      navigate('/assessment');
    }
  }, [entryType, navigate]);

  useEffect(() => {
    if (!isNriEntry) return;
    if (selectedTimezone) return;

    const browserTimezone =
      typeof window !== 'undefined' && typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : '';

    const detectedRegion = mapBrowserTimezoneToNriRegion(browserTimezone || '');
    setSelectedTimezone(detectedRegion);
  }, [isNriEntry, selectedTimezone]);

  const handleStart = async () => {
    if (isNriEntry) {
      if (!selectedTimezone) {
        setMetaError('Please select your timezone region.');
        return;
      }
      if (selectedConcerns.length === 0) {
        setMetaError('Please select at least one primary concern.');
        return;
      }
    }

    if (!presetConfig) {
      setMetaError('Unable to load assessment questions.');
      return;
    }

    setMetaError(null);
    setHasError(false);
    setIsSubmitting(true);

    try {
      if (questions.length === 0) {
        const response = await patientApi.startStructuredAssessment({
          templateKey: CLINICAL_ASSESSMENT_TEMPLATE_KEYS[assessmentType],
        });
        setQuestions(response.questions.map((question) => String(question.prompt || '')));
      }
      setStep(1);
      setAnswers([]);
    } catch (error) {
      console.error('Unable to load assessment questions:', error);
      setMetaError('Unable to load assessment questions. Please try again.');
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) => {
      if (prev.includes(concern)) {
        return prev.filter((item) => item !== concern);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, concern];
    });
  };

  const handleAnswer = async (value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (step < totalQuestions) {
      setStep(step + 1);
    } else {
      await submitAssessment(newAnswers);
    }
  };

  const submitAssessment = async (finalAnswers: number[]) => {
    try {
      setIsSubmitting(true);
      setHasError(false);

      if (!entryType || !presetConfig) {
        throw new Error('Invalid preset type');
      }

      if (!authLoading && !isAuthenticated) {
        const draft: PresetAssessmentDraft = {
          entryType,
          answers: finalAnswers,
          source: {
            entryType,
            landingPage: 'preset_entry_assessment',
            utmCampaign: utmParams.utmCampaign,
            utmMedium: utmParams.utmMedium,
            utmSource: utmParams.utmSource,
            timezoneRegion: isNriEntry ? selectedTimezone || undefined : undefined,
            primaryConcerns: isNriEntry ? selectedConcerns : undefined,
            languagePreference: isNriEntry ? selectedLanguage : undefined,
          },
          savedAt: Date.now(),
        };

        localStorage.setItem(PRESET_ASSESSMENT_DRAFT_KEY, JSON.stringify(draft));
        navigate(`/auth/signup?next=${encodeURIComponent(currentRoute)}`, { replace: true });
        return;
      }

      await patientApi.submitPresetAssessment({
        entryType,
        responses: finalAnswers,
        source: {
          entryType,
          landingPage: 'preset_entry_assessment',
          utmCampaign: utmParams.utmCampaign,
          utmMedium: utmParams.utmMedium,
          utmSource: utmParams.utmSource,
          timezoneRegion: isNriEntry ? selectedTimezone || undefined : undefined,
          primaryConcerns: isNriEntry ? selectedConcerns : undefined,
          languagePreference: isNriEntry ? selectedLanguage : undefined,
        },
      });

      setStep(completionStep);
    } catch (error) {
      console.error('Assessment submission failed:', error);
      setHasError(true);
      setStep(Math.max(1, step - 1));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !entryType || !presetConfig) {
      return;
    }

    const storedDraftRaw = localStorage.getItem(PRESET_ASSESSMENT_DRAFT_KEY);
    if (!storedDraftRaw) {
      return;
    }

    try {
      const storedDraft = JSON.parse(storedDraftRaw) as PresetAssessmentDraft;
      if (storedDraft.entryType !== entryType || !Array.isArray(storedDraft.answers) || storedDraft.answers.length === 0) {
        return;
      }

      if (storedDraft.source?.timezoneRegion) {
        setSelectedTimezone(String(storedDraft.source.timezoneRegion));
      }
      if (Array.isArray(storedDraft.source?.primaryConcerns)) {
        setSelectedConcerns(storedDraft.source.primaryConcerns.map((item) => String(item)));
      }
      if (storedDraft.source?.languagePreference) {
        setSelectedLanguage(String(storedDraft.source.languagePreference));
      }

      localStorage.removeItem(PRESET_ASSESSMENT_DRAFT_KEY);
      void (async () => {
        try {
          setIsSubmitting(true);
          await patientApi.submitPresetAssessment({
            entryType: storedDraft.entryType,
            responses: storedDraft.answers,
            source: storedDraft.source,
          });
          setStep(completionStep);
        } catch (error) {
          console.error('Assessment submission failed after auth:', error);
          setHasError(true);
          setStep(Math.max(1, step - 1));
        } finally {
          setIsSubmitting(false);
        }
      })();
    } catch {
      localStorage.removeItem(PRESET_ASSESSMENT_DRAFT_KEY);
    }
  }, [authLoading, completionStep, entryType, isAuthenticated, navigate, presetConfig, step, user]);

  const handleReturn = () => {
    navigate(sessionsRedirectPath);
  };

  useEffect(() => {
    if (step !== completionStep) return;

    const timer = window.setTimeout(() => {
      navigate(sessionsRedirectPath, { replace: true });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [completionStep, navigate, step]);

  const progressPercentage = step >= 1 && step < completionStep ? ((step - 1) / totalQuestions) * 100 : 0;

  if (!presetConfig) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-charcoal to-charcoal/90">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-charcoal mb-2">Invalid Assessment Type</h2>
          <p className="text-charcoal/70 mb-6">The assessment type you requested is not available.</p>
          <button
            onClick={() => navigate('/assessment')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Take Regular Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-charcoal/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-charcoal/5">
        
        {/* Progress Bar Header for Questions */}
        {step >= 1 && step < completionStep && (
          <div className="h-1.5 w-full bg-calm-sage/20 relative">
            <div 
              className="absolute left-0 top-0 h-full bg-teal-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        <div className="p-8 md:p-10 relative">
          
          {/* STEP 0: Warm Up */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight text-charcoal">{presetConfig.displayName}</h2>
                <p className="text-charcoal/70 leading-relaxed max-w-md mx-auto">
                  {presetConfig.description}
                </p>
              </div>

              {isNriEntry ? (
                <div className="space-y-4 rounded-2xl border border-calm-sage/25 bg-calm-sage/5 p-4 text-left">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-charcoal">Timezone region</label>
                    <select
                      value={selectedTimezone}
                      onChange={(event) => setSelectedTimezone(event.target.value)}
                      className="w-full rounded-lg border border-calm-sage/30 bg-white px-3 py-2 text-sm text-charcoal"
                    >
                      <option value="">Select your region</option>
                      {NRI_TIMEZONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-charcoal">Preferred language</label>
                    <select
                      value={selectedLanguage}
                      onChange={(event) => setSelectedLanguage(event.target.value)}
                      className="w-full rounded-lg border border-calm-sage/30 bg-white px-3 py-2 text-sm text-charcoal"
                    >
                      {NRI_LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>{language}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-charcoal">Top concerns (choose up to 3)</p>
                    <div className="flex flex-wrap gap-2">
                      {NRI_CONCERN_OPTIONS.map((concern) => {
                        const selected = selectedConcerns.includes(concern);
                        return (
                          <button
                            key={concern}
                            type="button"
                            onClick={() => toggleConcern(concern)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${selected
                              ? 'border-teal-600 bg-teal-50 text-teal-700'
                              : 'border-calm-sage/35 bg-white text-charcoal hover:border-teal-400'}`}
                          >
                            {concern}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {metaError ? (
                    <p className="text-sm text-red-600">{metaError}</p>
                  ) : null}
                </div>
              ) : null}

              <button
                onClick={handleStart}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-4 text-base font-medium text-white shadow-sm transition-all hover:bg-teal-700 active:scale-[0.98]"
              >
                {presetConfig.ctaText} (Takes ~2 mins)
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* STEPS 1-N: Questions */}
          {step >= 1 && step < completionStep && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium tracking-wide text-teal-600 uppercase">
                  Question {step} of {totalQuestions}
                </p>
                <div className="inline-block rounded-full bg-calm-sage/30 px-3 py-1 text-xs font-medium text-teal-800">
                  {presetConfig.displayName}
                </div>
                <h3 className="text-2xl font-semibold leading-tight text-charcoal mt-2">
                  {questions[step - 1]}
                </h3>
              </div>

              <div className="grid gap-3">
                {options.map((option: any) => (
                  <button
                    key={option.value}
                    disabled={isSubmitting}
                    onClick={() => handleAnswer(option.value)}
                    className="flex w-full items-center justify-center rounded-xl border-2 border-calm-sage/30 bg-white p-5 text-lg font-medium text-charcoal transition-all hover:border-teal-400 hover:bg-teal-50 active:scale-[0.98] disabled:opacity-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {hasError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  Failed to submit your response. Please try again.
                </div>
              )}
            </div>
          )}

          {/* COMPLETION: Thank You */}
          {step === completionStep && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-400">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle className="h-10 w-10" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight text-charcoal">Thank you for sharing</h2>
                <p className="text-charcoal/70 leading-relaxed max-w-md mx-auto">
                  Your assessment has been securely submitted. We're analyzing your responses to find the best match for you.
                </p>
              </div>
              <div className="rounded-2xl border border-calm-sage/20 bg-calm-sage/5 p-4 text-left text-sm text-charcoal/80">
                <p className="font-semibold text-charcoal">What happens next</p>
                <ul className="mt-2 space-y-1.5">
                  <li>1. Sign in or register if you are new.</li>
                  <li>2. Open the Sessions page to see matched therapists.</li>
                  <li>3. Complete subscription/payment if your plan requires it.</li>
                  <li>4. Pick a provider and book the session.
                  </li>
                </ul>
              </div>
              <button
                onClick={handleReturn}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-4 text-base font-medium text-white shadow-sm transition-all hover:bg-teal-700 active:scale-[0.98]"
              >
                Go to Sessions
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
