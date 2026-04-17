import { useEffect, useState, useMemo, useCallback } from 'react';
import { AlertCircle, Loader2, Star, TrendingUp, Check } from 'lucide-react';
import { patientApi } from '../../api/patient';

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
}

interface ProviderMatchingV3Props {
  availabilityPrefs?: {
    daysOfWeek: number[];
    timeSlots: Array<{ startMinute: number; endMinute: number }>;
  };
  providerType?: string;
  presetEntryType?: string;
  sourceFunnel?: string;
  timezoneRegion?: string;
  onProviderSelected?: (provider: ProviderMatch) => void;
  onMultipleProvidersSelected?: (providers: ProviderMatch[]) => void;
  allowMultiSelect?: boolean;
  maxSelections?: number;
  showFilters?: boolean;
  title?: string;
  description?: string;
}

type MatchContext = 'Standard' | 'Corporate' | 'Night' | 'Buddy' | 'Crisis';

const CONCERN_OPTIONS = ['Anxiety', 'Depression', 'Trauma', 'Sleep', 'Stress', 'Relationships'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Malayalam', 'Marathi'];
const TIME_OPTIONS = ['Morning', 'Evening', 'Night'];
const MODE_OPTIONS = ['Video', 'Phone', 'Chat', 'In-person'];
const CONTEXT_OPTIONS: MatchContext[] = ['Standard', 'Corporate', 'Night', 'Buddy', 'Crisis'];

const getTierColor = (tier?: 'HOT' | 'WARM' | 'COLD'): string => {
  if (tier === 'HOT') return 'text-orange-600 bg-orange-50 border-orange-200';
  if (tier === 'WARM') return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
};

const getTierEmoji = (tier?: 'HOT' | 'WARM' | 'COLD' | 'PLATINUM'): string => {
  if (tier === 'PLATINUM') return '🔥🔥';
  if (tier === 'HOT') return '🔥';
  if (tier === 'WARM') return '🌟';
  return '❄️';
};

const getScoreBar = (value: number, max: number): string => {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return `${pct}%`;
};

const ProviderMatchingV3: React.FC<ProviderMatchingV3Props> = ({
  availabilityPrefs = {
    daysOfWeek: [0],
    timeSlots: [{ startMinute: 540, endMinute: 570 }],
  },
  providerType,
  presetEntryType,
  sourceFunnel,
  timezoneRegion,
  onProviderSelected,
  onMultipleProvidersSelected,
  allowMultiSelect = true,
  maxSelections = 3,
  showFilters = true,
  title = 'Find Your Perfect Match',
  description = 'We\'ll match you with providers based on your needs and preferences.',
}) => {
  const [providers, setProviders] = useState<ProviderMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filter state
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(['Anxiety', 'Depression']);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['Evening']);
  const [selectedModes, setSelectedModes] = useState<string[]>(['Video']);
  const [context, setContext] = useState<MatchContext>('Standard');

  // Fetch providers based on current filters
  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await patientApi.getAvailableProvidersForSmartMatch(
        availabilityPrefs,
        providerType,
        {
          concerns: selectedConcerns,
          languages: selectedLanguages,
          modes: selectedModes.map((m) => m.toLowerCase()),
          context,
          presetEntryType,
          sourceFunnel,
          timezoneRegion,
        },
      );

      const matched = Array.isArray(result?.providers) ? result.providers : [];
      setProviders(matched);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [
    availabilityPrefs,
    providerType,
    selectedConcerns,
    selectedLanguages,
    selectedModes,
    context,
    presetEntryType,
    sourceFunnel,
    timezoneRegion,
  ]);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleConcernToggle = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language]
    );
  };

  const handleTimeToggle = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleModeToggle = (mode: string) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const handleProviderToggle = (providerId: string) => {
    if (!allowMultiSelect) {
      setSelectedIds([providerId]);
      const provider = providers.find((p) => p.id === providerId);
      if (provider && onProviderSelected) {
        onProviderSelected(provider);
      }
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(providerId)) {
        return prev.filter((id) => id !== providerId);
      } else if (prev.length < maxSelections) {
        return [...prev, providerId];
      }
      return prev;
    });
  };

  const handleContinue = () => {
    if (selectedIds.length === 0) return;
    const selected = providers.filter((p) => selectedIds.includes(p.id));
    if (onMultipleProvidersSelected) {
      onMultipleProvidersSelected(selected);
    }
  };

  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => (Number(b.score || 0) - Number(a.score || 0))),
    [providers],
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal mb-2">{title}</h1>
        <p className="text-charcoal/60">{description}</p>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="mb-8 p-6 rounded-xl border border-calm-sage/20 bg-gradient-to-br from-calm-sage/5 to-ocean-light/5">
          <p className="text-sm font-semibold uppercase tracking-wider text-charcoal/50 mb-4">
            Personalize Your Match
          </p>

          <div className="space-y-4">
            {/* Concerns */}
            <div>
              <label className="text-xs font-semibold text-charcoal/70 mb-2 block">
                🎯 Top Concerns (Expertise)
              </label>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map((concern) => (
                  <button
                    key={concern}
                    type="button"
                    onClick={() => handleConcernToggle(concern)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedConcerns.includes(concern)
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-calm-sage/20 bg-white text-charcoal/60 hover:border-teal-300'
                    }`}
                  >
                    {concern}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="text-xs font-semibold text-charcoal/70 mb-2 block">
                🌐 Languages (Communication)
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageToggle(lang)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedLanguages.includes(lang)
                        ? 'border-ocean bg-ocean-light text-ocean-deep'
                        : 'border-calm-sage/20 bg-white text-charcoal/60 hover:border-ocean'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Preference */}
            <div>
              <label className="text-xs font-semibold text-charcoal/70 mb-2 block">
                🕐 Time Preference (Communication)
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeToggle(time)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedTimes.includes(time)
                        ? 'border-ember bg-ember-light text-ember'
                        : 'border-calm-sage/20 bg-white text-charcoal/60 hover:border-ember'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Mode */}
            <div>
              <label className="text-xs font-semibold text-charcoal/70 mb-2 block">
                📱 Session Mode (Communication)
              </label>
              <div className="flex flex-wrap gap-2">
                {MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeToggle(mode)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedModes.includes(mode)
                        ? 'border-purple bg-purple-light text-purple'
                        : 'border-calm-sage/20 bg-white text-charcoal/60 hover:border-purple'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Context */}
            <div>
              <label className="text-xs font-semibold text-charcoal/70 mb-2 block">
                📊 Matching Context
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTEXT_OPTIONS.map((ctx) => (
                  <button
                    key={ctx}
                    type="button"
                    onClick={() => setContext(ctx)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      context === ctx
                        ? 'border-gold bg-gold-light text-gold'
                        : 'border-calm-sage/20 bg-white text-charcoal/60 hover:border-gold'
                    }`}
                  >
                    {ctx}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-ocean animate-spin" />
          <p className="text-sm text-charcoal/60">Finding your perfect match...</p>
        </div>
      )}

      {/* Provider Results */}
      {!loading && sortedProviders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-charcoal/60">No providers match your current preferences. Try adjusting your filters.</p>
        </div>
      )}

      {!loading && sortedProviders.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-charcoal/70">
            {sortedProviders.length} providers found • {selectedIds.length} selected
          </p>

          <div className="grid gap-4">
            {sortedProviders.map((provider) => {
              const isSelected = selectedIds.includes(provider.id);
              const tier = provider.matchBand || provider.tier || 'COLD';

              return (
                <div
                  key={provider.id}
                  onClick={() => handleProviderToggle(provider.id)}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-ocean bg-ocean-light/30 shadow-md'
                      : 'border-calm-sage/20 bg-white hover:border-ocean/40 hover:shadow-sm'
                  }`}
                >
                  {/* Checkbox */}
                  {allowMultiSelect && (
                    <div className="absolute top-4 right-4">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-ocean bg-ocean'
                          : 'border-calm-sage/30 bg-white'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  )}

                  <div className="pr-8">
                    {/* Provider Name & Info */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-charcoal">{provider.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getTierColor(tier)}`}>
                          {getTierEmoji(tier)} {tier}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal/60">
                        {provider.providerType} • {provider.specializations?.slice(0, 2).join(', ') || 'General'}
                      </p>
                      {provider.averageRating && (
                        <p className="text-xs text-charcoal/60 flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 text-gold fill-gold" /> {provider.averageRating.toFixed(1)} rating
                        </p>
                      )}
                    </div>

                    {/* V3 Score Breakdown */}
                    {provider.breakdown && (
                      <div className="space-y-2">
                        {/* Total Score */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-charcoal">Match Score</span>
                          <span className="text-2xl font-bold text-ocean">{provider.score}</span>
                        </div>

                        {/* Expertise Bar */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-semibold text-charcoal/70">🎯 Expertise</span>
                            <span className="text-xs font-semibold text-charcoal/70">
                              {provider.breakdown.expertise}/40
                            </span>
                          </div>
                          <div className="w-full h-2 bg-calm-sage/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple rounded-full transition-all"
                              style={{ width: getScoreBar(provider.breakdown.expertise, 40) }}
                            />
                          </div>
                        </div>

                        {/* Communication Bar */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-semibold text-charcoal/70">💬 Communication</span>
                            <span className="text-xs font-semibold text-charcoal/70">
                              {provider.breakdown.communication}/35
                            </span>
                          </div>
                          <div className="w-full h-2 bg-calm-sage/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ocean rounded-full transition-all"
                              style={{ width: getScoreBar(provider.breakdown.communication, 35) }}
                            />
                          </div>
                        </div>

                        {/* Quality Bar */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-semibold text-charcoal/70">⭐ Quality</span>
                            <span className="text-xs font-semibold text-charcoal/70">
                              {provider.breakdown.quality}/25
                            </span>
                          </div>
                          <div className="w-full h-2 bg-calm-sage/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gold rounded-full transition-all"
                              style={{ width: getScoreBar(provider.breakdown.quality, 25) }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Match Chance */}
                    {provider.matchChancePct && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-charcoal/60">
                        <TrendingUp className="h-3 w-3" />
                        {provider.matchChancePct}% match chance
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          {allowMultiSelect && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleContinue}
                disabled={selectedIds.length === 0}
                className="flex-1 py-3 px-4 bg-ocean text-white rounded-lg font-semibold hover:bg-ocean-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue with {selectedIds.length} {selectedIds.length === 1 ? 'Provider' : 'Providers'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProviderMatchingV3;
