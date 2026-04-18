import { useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { patientApi } from '../../../api/patient';

interface ProviderMatch {
  id: string;
  name: string;
  displayName?: string;
  providerType: string;
  profileId?: string;
  consultationFee?: number;
  specializations?: string[];
  averageRating?: number;
  score?: number;
  tier?: 'HOT' | 'WARM' | 'COLD';
  matchBand?: 'PLATINUM' | 'HOT' | 'WARM' | 'COLD';
  matchChancePct?: number;
  breakdown?: {
    expertise: number;
    communication: number;
    quality: number;
  };
  providerSubscriptionStatus?: string;
  providerSubscriptionGraceEndDate?: string;
  metadata?: {
    graceEndDate?: string;
  };
}

interface ProviderSelectionStepProps {
  availabilityPrefs: {
    daysOfWeek: number[];
    timeSlots: Array<{ startMinute: number; endMinute: number }>;
  };
  providerType?: string;
  presetEntryType?: string;
  sourceFunnel?: string;
  timezoneRegion?: string;
  onSuccess: (providers: ProviderMatch[]) => void;
  onBack: () => void;
  onCancel: () => void;
  onBrowseDirectory?: () => void;
}

const CONTEXT_OPTIONS: Array<'Standard' | 'Corporate' | 'Night' | 'Buddy' | 'Crisis'> = [
  'Standard',
  'Corporate',
  'Night',
  'Buddy',
  'Crisis',
];

const getProviderTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    THERAPIST: 'Therapist',
    PSYCHOLOGIST: 'Psychologist',
    PSYCHIATRIST: 'Psychiatrist',
    COACH: 'Coach',
  };
  return labels[type] || type;
};

const formatPrice = (minor: number): string => {
  return `₹${(minor / 100).toFixed(0)}`;
};

const getNriFixedFeeMinor = (entryType?: string): number | null => {
  if (entryType === 'nri_psychologist') return 2999 * 100;
  if (entryType === 'nri_psychiatrist') return 3499 * 100;
  if (entryType === 'nri_therapist') return 3599 * 100;
  return null;
};

const barWidth = (value: number, max: number): string => {
  const pct = Math.max(0, Math.min(100, Math.round((Number(value || 0) / Math.max(1, max)) * 100)));
  return `${pct}%`;
};

const tierChipClass = (tier?: 'HOT' | 'WARM' | 'COLD'): string => {
  if (tier === 'HOT') return 'bg-orange-100 text-orange-700';
  if (tier === 'WARM') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const getTierLabel = (provider: ProviderMatch): string => {
  if (provider.matchBand === 'PLATINUM') return 'PLATINUM HOT';
  if (provider.tier === 'HOT') return 'HOT';
  if (provider.tier === 'WARM') return 'WARM';
  return 'COLD';
};

const getProviderBanner = (provider: ProviderMatch): { type: 'grace' | 'locked'; text: string } | null => {
  const rawStatus = String(
    provider.providerSubscriptionStatus
    || (provider as any).subscriptionStatus
    || (provider as any).status
    || '',
  ).toLowerCase();

  if (rawStatus === 'locked') {
    return { type: 'locked', text: 'Provider leads paused - not available now' };
  }

  if (rawStatus === 'grace') {
    const graceDateRaw = provider.providerSubscriptionGraceEndDate
      || provider.metadata?.graceEndDate
      || (provider as any).graceEndDate;
    const graceDate = graceDateRaw ? new Date(graceDateRaw) : null;
    const formatted = graceDate && !Number.isNaN(graceDate.getTime())
      ? graceDate.toLocaleDateString()
      : 'soon';
    return { type: 'grace', text: `Grace until ${formatted}` };
  }

  return null;
};

const getEstimatedMatchChance = (provider: ProviderMatch): number => {
  const score = Number(provider.score || 0);
  if (provider.matchBand === 'PLATINUM' || score >= 85) return 90;
  if (provider.tier === 'HOT' || provider.matchBand === 'HOT' || score >= 70) return 75;
  if (provider.tier === 'WARM' || provider.matchBand === 'WARM' || score >= 50) return 50;
  return 25;
};

export default function ProviderSelectionStep({
  availabilityPrefs,
  providerType,
  presetEntryType,
  sourceFunnel,
  timezoneRegion,
  onSuccess,
  onBack,
  onCancel,
  onBrowseDirectory,
}: ProviderSelectionStepProps) {
  const nriFixedFeeMinor = getNriFixedFeeMinor(presetEntryType);
  const [providers, setProviders] = useState<ProviderMatch[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [concernsInput, setConcernsInput] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [preferredMode, setPreferredMode] = useState('');
  const [matchContext, setMatchContext] = useState<'Standard' | 'Corporate' | 'Night' | 'Buddy' | 'Crisis'>('Standard');

  const parsedConcerns = concernsInput
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await patientApi.getAvailableProvidersForSmartMatch(
          availabilityPrefs,
          providerType,
          {
            concerns: parsedConcerns,
            languages: preferredLanguage ? [preferredLanguage] : [],
            modes: preferredMode ? [preferredMode] : [],
            context: matchContext,
            presetEntryType,
            sourceFunnel,
            timezoneRegion,
          },
        );
        const nextProviders = Array.isArray(result?.providers) ? result.providers : [];
        setProviders(nextProviders);
        setSelectedIds((prev) => prev.filter((id) => nextProviders.some((provider) => provider.id === id)));
      } catch (err: any) {
        setError(err?.message || 'Failed to load available providers');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [availabilityPrefs, providerType, concernsInput, preferredLanguage, preferredMode, matchContext, presetEntryType, sourceFunnel, timezoneRegion]);

  const toggleProvider = (providerId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(providerId)) {
        return prev.filter((id) => id !== providerId);
      } else if (prev.length < 3) {
        return [...prev, providerId];
      }
      return prev;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;

    try {
      setSubmitting(true);
      setError(null);
       // Collect selected provider data
       const selectedProviders = providers.filter((p) => selectedIds.includes(p.id));
       // Pass back selected providers without creating request yet (payment happens first)
       onSuccess(selectedProviders);
    } catch (err: any) {
      setError(err?.message || 'Failed to continue with selected providers');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = selectedIds.length > 0;
  const providerTypeLabel = providerType && providerType !== 'ALL'
    ? getProviderTypeLabel(providerType)
    : 'Providers';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Step Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            2
          </div>
          <h3 className="text-lg font-semibold text-charcoal">Choose providers</h3>
        </div>
        <p className="text-sm text-charcoal/60 ml-10">
          {loading
            ? `Checking available ${providerTypeLabel.toLowerCase()} for your selected time...`
            : `${providers.length} ${providerTypeLabel.toLowerCase()} available. Select 1-3 providers you'd like to work with`}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
          <p className="text-sm text-charcoal/60">Finding available providers...</p>
        </div>
      )}

      {!loading && (
        <div className="rounded-xl border border-calm-sage/20 bg-calm-sage/5 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">Personalize your match</p>
          <div className="space-y-2">
            <p className="text-xs text-charcoal/70">Context</p>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_OPTIONS.map((context) => (
                <button
                  key={context}
                  type="button"
                  onClick={() => setMatchContext(context)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    matchContext === context
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-calm-sage/20 bg-white text-charcoal hover:border-teal-300 hover:text-teal-700'
                  }`}
                >
                  {context}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-charcoal/70">
              Preferred Language
              <input
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                placeholder="English"
                className="mt-1 w-full rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-teal-400"
              />
            </label>
            <label className="text-xs text-charcoal/70">
              Session Mode
              <select
                value={preferredMode}
                onChange={(e) => setPreferredMode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-teal-400"
              >
                <option value="">Any</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="chat">Chat</option>
                <option value="in-person">In-Person</option>
              </select>
            </label>
            <label className="text-xs text-charcoal/70">
              Top Concerns (comma separated)
              <input
                value={concernsInput}
                onChange={(e) => setConcernsInput(e.target.value)}
                placeholder="anxiety, sleep, relationships"
                className="mt-1 w-full rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-teal-400"
              />
            </label>
          </div>
        </div>
      )}

      {/* Providers List */}
      {!loading && providers.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {providers.map((provider) => {
            const providerBanner = getProviderBanner(provider);
            const estimatedChance = getEstimatedMatchChance(provider);
            return (
            <button
              key={provider.id}
              onClick={() => toggleProvider(provider.id)}
              className={`w-full rounded-lg border px-4 py-4 text-left transition-all ${
                selectedIds.includes(provider.id)
                  ? 'border-teal-500 bg-teal-50 shadow-sm'
                  : 'border-calm-sage/20 hover:border-teal-300 hover:bg-teal-50/30'
              }`}
            >
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 border-calm-sage/20 mt-0.5">
                  {selectedIds.includes(provider.id) && (
                    <Check className="h-4 w-4 text-teal-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-charcoal">{provider.name}</h4>
                    <div className="flex items-center gap-2">
                      {provider.tier && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierChipClass(provider.tier)}`}>
                          {provider.matchBand === 'PLATINUM'
                            ? '🔥 PLATINUM HOT'
                            : provider.tier === 'HOT'
                              ? '🔥 HOT'
                              : provider.tier === 'WARM'
                                ? '🌟 WARM'
                                : '❄️ COLD'}
                        </span>
                      )}
                      {provider.score != null && (
                        <div className="text-xs font-semibold text-teal-700">{getTierLabel(provider)} {provider.score}</div>
                      )}
                      {provider.averageRating && (
                        <div className="text-xs font-medium text-amber-600">
                          ⭐ {provider.averageRating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-charcoal/60 mt-0.5">
                    {getProviderTypeLabel(provider.providerType)}
                  </p>
                  {providerBanner && (
                    <div
                      className={`mt-2 rounded-md px-2 py-1 text-[11px] font-medium ${
                        providerBanner.type === 'locked'
                          ? 'border border-red-200 bg-red-50 text-red-700'
                          : 'border border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {providerBanner.text}
                    </div>
                  )}
                  {provider.matchChancePct != null && (
                    <p className="text-[11px] text-teal-700 mt-1">{provider.matchChancePct}% chance you will connect well</p>
                  )}
                  <p className="text-[11px] text-charcoal/70 mt-1">~{estimatedChance}% chance of good connection</p>
                  {provider.specializations && provider.specializations.length > 0 && (
                    <p className="text-xs text-charcoal/50 mt-1 line-clamp-1">
                      {provider.specializations.slice(0, 2).join(', ')}
                    </p>
                  )}
                  {provider.breakdown && (
                    <div className="mt-2 space-y-1">
                      <div>
                        <div className="flex justify-between text-[10px] text-charcoal/60"><span>Expertise</span><span>{provider.breakdown.expertise}/40</span></div>
                        <div className="h-1.5 rounded bg-calm-sage/15"><div className="h-1.5 rounded bg-violet-500" style={{ width: barWidth(provider.breakdown.expertise, 40) }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-charcoal/60"><span>Communication</span><span>{provider.breakdown.communication}/35</span></div>
                        <div className="h-1.5 rounded bg-calm-sage/15"><div className="h-1.5 rounded bg-sky-500" style={{ width: barWidth(provider.breakdown.communication, 35) }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-charcoal/60"><span>Quality</span><span>{provider.breakdown.quality}/25</span></div>
                        <div className="h-1.5 rounded bg-calm-sage/15"><div className="h-1.5 rounded bg-amber-500" style={{ width: barWidth(provider.breakdown.quality, 25) }} /></div>
                      </div>
                    </div>
                  )}
                  {(nriFixedFeeMinor || provider.consultationFee) && (
                    <p className="text-sm font-semibold text-teal-600 mt-2">
                      {formatPrice(nriFixedFeeMinor || Number(provider.consultationFee || 0))}
                      {nriFixedFeeMinor ? ' • NRI fixed session rate' : ''}
                    </p>
                  )}
                </div>
              </div>
            </button>
            );
          })}
        </div>
      )}

      {/* No Providers State */}
      {!loading && providers.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Users className="h-12 w-12 text-charcoal/20" />
          <p className="text-sm text-charcoal/60">
            No {providerTypeLabel.toLowerCase()} available for your preferred times
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={onBack}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 py-2"
            >
              ← Change your availability
            </button>
            {onBrowseDirectory && (
              <button
                onClick={onBrowseDirectory}
                className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-teal-600 active:scale-95"
              >
                📅 Browse Directory
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection Counter */}
      {!loading && selectedIds.length > 0 && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/50 p-4 animate-in slide-in-from-bottom-4 duration-300">
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50 mb-2">
            Selected Providers
          </p>
          <div className="space-y-1">
            {selectedIds.map((id) => {
              const provider = providers.find((p) => p.id === id);
              return (
                <p key={id} className="text-sm text-charcoal font-medium">
                  • {provider?.name}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-calm-sage/20 px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-calm-sage/5 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-lg border border-calm-sage/20 px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-calm-sage/5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
            isValid && !submitting
              ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm'
              : 'bg-calm-sage/10 text-charcoal/40 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Continuing...
            </>
          ) : (
            <>
              Continue to Payment <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
