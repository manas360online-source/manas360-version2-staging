import { useEffect, useState, useMemo } from 'react';
import { Users, Search, Filter, Star, MapPin, MessageCircle, Eye, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { patientApi } from '../../api/patient';

type Tab = 'browse' | 'my-providers';

interface Provider {
  id: string;
  name: string;
  role?: string;
  providerType?: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviewsCount: number;
  sessionPrice: number;
  language: string[];
  availability: string;
  location?: string;
  photo?: string;
  bio?: string;
}

interface AssignedProvider {
  id: string;
  name: string;
  role: string;
  nextSession?: {
    date: string;
    time: string;
  };
  specialization: string[];
  canMessage: boolean;
}

export default function CareTeamPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'browse' ? 'browse' : 'my-providers';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [myProviders, setMyProviders] = useState<AssignedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('');
  const [selectedRoleBucket, setSelectedRoleBucket] = useState<string>('all');

  // Filter states
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState<string>('Evening (6 PM - 9 PM)');
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const careType = String(searchParams.get('careType') || '').trim().toLowerCase();
  const urgency = String(searchParams.get('urgency') || '').trim().toLowerCase() || 'routine';

  const roleForCareType = useMemo(() => {
    if (urgency === 'urgent' || careType === 'urgent') return 'PSYCHIATRIST';
    if (careType === 'recommended') return 'PSYCHOLOGIST';
    return undefined;
  }, [careType, urgency]);

  useEffect(() => {
    fetchCareTeamData();
  }, [roleForCareType]);

  useEffect(() => {
    const nextTab: Tab = searchParams.get('tab') === 'browse' ? 'browse' : 'my-providers';
    setActiveTab(nextTab);

    const specializationFromQuery = String(searchParams.get('specialization') || '').trim();
    if (specializationFromQuery) {
      setSelectedSpecialization(specializationFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (careType === 'urgent' || urgency === 'urgent') {
      setSelectedRoleBucket('psychiatrist');
      return;
    }
    if (careType === 'recommended') {
      setSelectedRoleBucket('psychologist');
    }
  }, [careType, urgency]);

  const fetchCareTeamData = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch assigned providers
      const myProvidersRes = await patientApi.getMyProviders().catch(() => null);
      if (myProvidersRes) {
        setMyProviders(Array.isArray(myProvidersRes.data) ? myProvidersRes.data : myProvidersRes);
      }

      // Fetch available providers for browse
      const providersRes = await patientApi.getAvailableProviders({
        role: roleForCareType,
      } as any).catch(() => null);
      if (providersRes) {
        setProviders(Array.isArray(providersRes.data) ? providersRes.data : providersRes);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load care team data');
    } finally {
      setLoading(false);
    }
  };

  // Filter providers based on search and filters
  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const role = String(provider.role || '').toLowerCase();
      const matchesRoleBucket =
        selectedRoleBucket === 'all'
          ? true
          : selectedRoleBucket === 'psychiatrist'
            ? role.includes('psychiatrist')
            : selectedRoleBucket === 'psychologist'
              ? role.includes('psychologist')
              : !role.includes('psychiatrist') && !role.includes('psychologist');
      const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpec = !selectedSpecialization || provider.specialization.includes(selectedSpecialization);
      const matchesPrice = provider.sessionPrice <= maxPrice;
      const matchesLanguage = !selectedLanguage || provider.language.includes(selectedLanguage);
      return matchesRoleBucket && matchesSearch && matchesSpec && matchesPrice && matchesLanguage;
    });
  }, [providers, selectedRoleBucket, searchQuery, selectedSpecialization, maxPrice, selectedLanguage]);

  const specializations = useMemo(() => {
    const specs = new Set<string>();
    providers.forEach((p) => p.specialization.forEach((s) => specs.add(s)));
    return Array.from(specs).sort();
  }, [providers]);

  const languages = useMemo(() => {
    const langs = new Set<string>();
    providers.forEach((p) => p.language.forEach((l) => langs.add(l)));
    return Array.from(langs).sort();
  }, [providers]);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Header */}
      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <h1 className="font-serif text-3xl font-light md:text-4xl">Care Team</h1>
        <p className="mt-2 text-sm text-charcoal/70">Manage your providers and discover new specialists.</p>
        {careType ? (
          <div className={`mt-3 rounded-xl border p-3 text-sm ${urgency === 'urgent' ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-teal-200 bg-teal-50 text-teal-900'}`}>
            <p className="font-semibold">Care path selected: {careType === 'recommended' ? 'Recommended Care' : careType === 'urgent' ? 'Urgent Care' : 'Direct Selection'}</p>
            <p className="mt-1 text-xs">Choose up to 3 providers and send your appointment request. Providers can respond with alternate slots for your confirmation.</p>
          </div>
        ) : null}
      </section>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-calm-sage/15">
        <button
          onClick={() => setActiveTab('my-providers')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'my-providers'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <Users className="h-4 w-4" />
          My Providers
        </button>

        <button
          onClick={() => setActiveTab('browse')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'browse'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <Search className="h-4 w-4" />
          Browse Providers
        </button>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-charcoal/60">Loading...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* My Providers Tab */}
      {!loading && !error && activeTab === 'my-providers' && (
        <MyProvidersTab providers={myProviders} />
      )}

      {/* Browse Providers Tab */}
      {!loading && !error && activeTab === 'browse' && (
        <BrowseProvidersTab
          providers={filteredProviders}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          specializations={specializations}
          selectedSpecialization={selectedSpecialization}
          onSpecializationChange={setSelectedSpecialization}
          languages={languages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          selectedProviderIds={selectedProviderIds}
          onToggleProvider={(providerId) => {
            setSelectedProviderIds((prev) => {
              if (prev.includes(providerId)) return prev.filter((id) => id !== providerId);
              if (prev.length >= 3) return prev;
              return [...prev, providerId];
            });
          }}
          preferredTime={preferredTime}
          onPreferredTimeChange={setPreferredTime}
          selectedRoleBucket={selectedRoleBucket}
          onRoleBucketChange={setSelectedRoleBucket}
          requesting={requesting}
          requestMessage={requestMessage}
          onRequestAppointment={async () => {
            const selected = selectedProviderIds.length
              ? selectedProviderIds
              : filteredProviders.slice(0, 3).map((provider) => provider.id);

            if (!selected.length) {
              setRequestMessage('No providers available to request right now. Try changing filters.');
              return;
            }

            try {
              setRequesting(true);
              setRequestMessage(null);
              await patientApi.requestAppointmentToPreferredProviders({
                providerIds: selected,
                preferredLanguage: selectedLanguage || undefined,
                preferredTime,
                preferredSpecialization: selectedSpecialization || undefined,
                carePath: careType || 'direct-selection',
                urgency,
              });
              setRequestMessage(`Appointment request sent to ${selected.length} preferred provider${selected.length > 1 ? 's' : ''}.`);
            } catch (err: any) {
              setRequestMessage(err?.response?.data?.message || err?.message || 'Failed to submit appointment request.');
            } finally {
              setRequesting(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ===== MY PROVIDERS TAB =====
function MyProvidersTab({ providers }: { providers: AssignedProvider[] }) {
  // Categorize providers by role
  const primaryTherapist = providers.find((p) => p.role === 'Therapist');
  const psychiatrist = providers.find((p) => p.role === 'Psychiatrist');
  const psychologist = providers.find((p) => p.role === 'Psychologist');
  const coach = providers.find((p) => p.role === 'Coach');

  return (
    <div className="space-y-5">
      {/* Primary Therapist */}
      <ProviderCard
        provider={primaryTherapist}
        role="Primary Therapist"
        color="teal"
        empty="No primary therapist assigned yet."
      />

      {/* Psychiatrist */}
      <ProviderCard
        provider={psychiatrist}
        role="Psychiatrist"
        color="amber"
        empty="No psychiatrist assigned yet."
      />

      {/* Psychologist */}
      <ProviderCard
        provider={psychologist}
        role="Psychologist"
        color="blue"
        empty="No psychologist assigned yet."
      />

      {/* Coach */}
      <ProviderCard
        provider={coach}
        role="Wellness Coach"
        color="emerald"
        empty="No coach assigned yet."
      />

      {/* Next Session Summary */}
      {(primaryTherapist?.nextSession || psychiatrist?.nextSession || psychologist?.nextSession) && (
        <div className="rounded-lg border border-calm-sage/15 bg-white/90 p-4 mt-6">
          <h4 className="font-semibold text-charcoal mb-3">Next Appointments</h4>
          <div className="space-y-2">
            {primaryTherapist?.nextSession && (
              <div className="text-sm flex justify-between items-center">
                <span className="text-charcoal/70">{primaryTherapist.name}</span>
                <span className="font-medium text-teal-600">
                  {primaryTherapist.nextSession.date} at {primaryTherapist.nextSession.time}
                </span>
              </div>
            )}
            {psychiatrist?.nextSession && (
              <div className="text-sm flex justify-between items-center">
                <span className="text-charcoal/70">{psychiatrist.name}</span>
                <span className="font-medium text-amber-600">
                  {psychiatrist.nextSession.date} at {psychiatrist.nextSession.time}
                </span>
              </div>
            )}
            {psychologist?.nextSession && (
              <div className="text-sm flex justify-between items-center">
                <span className="text-charcoal/70">{psychologist.name}</span>
                <span className="font-medium text-blue-600">
                  {psychologist.nextSession.date} at {psychologist.nextSession.time}
                </span>
              </div>
            )}
          </div>
          <Link
            to="/patient/sessions"
            className="mt-4 inline-flex min-h-[34px] items-center rounded-full border border-teal-200 bg-teal-50 px-4 text-xs font-medium text-teal-600 hover:bg-teal-100 transition-colors"
          >
            View All Sessions
          </Link>
        </div>
      )}
    </div>
  );
}

// ===== BROWSE PROVIDERS TAB =====
function BrowseProvidersTab({
  providers,
  searchQuery,
  onSearchChange,
  specializations,
  selectedSpecialization,
  onSpecializationChange,
  languages,
  selectedLanguage,
  onLanguageChange,
  maxPrice,
  onMaxPriceChange,
  selectedProviderIds,
  onToggleProvider,
  preferredTime,
  onPreferredTimeChange,
  selectedRoleBucket,
  onRoleBucketChange,
  requesting,
  requestMessage,
  onRequestAppointment,
}: {
  providers: Provider[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  specializations: string[];
  selectedSpecialization: string;
  onSpecializationChange: (v: string) => void;
  languages: string[];
  selectedLanguage: string;
  onLanguageChange: (v: string) => void;
  maxPrice: number;
  onMaxPriceChange: (v: number) => void;
  selectedProviderIds: string[];
  onToggleProvider: (providerId: string) => void;
  preferredTime: string;
  onPreferredTimeChange: (value: string) => void;
  selectedRoleBucket: string;
  onRoleBucketChange: (value: string) => void;
  requesting: boolean;
  requestMessage: string | null;
  onRequestAppointment: () => Promise<void>;
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal/40" />
        <input
          type="text"
          placeholder="Search by name or specialization..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-calm-sage/25 bg-white/90 placeholder:text-charcoal/40 focus:outline-none focus:border-teal-400"
        />
      </div>

      {/* Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-calm-sage/25 text-sm font-medium text-charcoal/70 hover:text-charcoal hover:border-teal-200 transition-colors"
      >
        <Filter className="h-4 w-4" />
        Filters
      </button>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Providers' },
          { key: 'therapist', label: 'Therapist & Coach' },
          { key: 'psychologist', label: 'Psychologist' },
          { key: 'psychiatrist', label: 'Psychiatrist' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onRoleBucketChange(item.key)}
            className={`rounded-full border px-3 py-1 text-xs ${selectedRoleBucket === item.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-calm-sage/25 text-charcoal/70'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-lg border border-calm-sage/15 bg-white/90 p-4 space-y-4">
          {/* Specialization Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/60">
              Specialization
            </label>
            <select
              value={selectedSpecialization}
              onChange={(e) => onSpecializationChange(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-calm-sage/25 bg-white text-sm focus:outline-none focus:border-teal-400"
            >
              <option value="">All Specializations</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/60">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-calm-sage/25 bg-white text-sm focus:outline-none focus:border-teal-400"
            >
              <option value="">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Price Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/60">
              Max Price: ₹{maxPrice}
            </label>
            <input
              type="range"
              min="500"
              max="2000"
              step="100"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              onSearchChange('');
              onSpecializationChange('');
              onLanguageChange('');
              onMaxPriceChange(2000);
            }}
            className="w-full px-3 py-2 rounded-lg border border-calm-sage/25 text-sm font-medium text-charcoal/70 hover:bg-calm-sage/5 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Provider Grid */}
      <div className="rounded-lg border border-calm-sage/15 bg-white/85 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/60">Appointment Request</p>
        <p className="mt-1 text-sm text-charcoal/75">Select up to 3 providers. If none selected, request is sent to top 3 visible providers by default.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs text-charcoal/60">Preferred Time</label>
          <select
            value={preferredTime}
            onChange={(e) => onPreferredTimeChange(e.target.value)}
            className="rounded-lg border border-calm-sage/25 bg-white px-2 py-1 text-xs"
          >
            <option>Morning (8 AM - 12 PM)</option>
            <option>Afternoon (12 PM - 6 PM)</option>
            <option>Evening (6 PM - 9 PM)</option>
            <option>Flexible</option>
          </select>
          <button
            type="button"
            onClick={() => void onRequestAppointment()}
            disabled={requesting || providers.length === 0}
            className="ml-auto rounded-lg bg-charcoal px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60"
          >
            {requesting ? 'Sending Request...' : 'Request Appointment'}
          </button>
        </div>
        {requestMessage ? <p className="mt-2 text-xs text-charcoal/75">{requestMessage}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.length > 0 ? (
          providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border border-calm-sage/15 bg-white/90 p-4 hover:border-teal-200 hover:shadow-md transition-all">
              <div className="mb-3 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-charcoal/70">
                  <input
                    type="checkbox"
                    checked={selectedProviderIds.includes(provider.id)}
                    onChange={() => onToggleProvider(provider.id)}
                    disabled={!selectedProviderIds.includes(provider.id) && selectedProviderIds.length >= 3}
                  />
                  Preferred provider
                </label>
                <span className="text-[10px] text-charcoal/50">Select up to 3</span>
              </div>

              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-lg font-bold text-teal-600">
                  {provider.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-charcoal">{provider.name}</h4>
                  <p className="text-[11px] text-charcoal/60">{provider.role || 'Therapist'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-charcoal">{provider.rating.toFixed(1)}</span>
                    <span className="text-xs text-charcoal/60">({provider.reviewsCount})</span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4 text-xs text-charcoal/70">
                <p>
                  <span className="font-medium">Specialization:</span>{' '}
                  {provider.specialization.join(', ')}
                </p>
                <p>
                  <span className="font-medium">Experience:</span> {provider.experience} years
                </p>
                <p>
                  <span className="font-medium">Languages:</span> {provider.language.join(', ')}
                </p>
                {provider.location && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {provider.location}
                  </p>
                )}
              </div>

              {/* Price & Availability */}
              <div className="flex items-center justify-between py-3 border-t border-calm-sage/10 mb-3">
                <div>
                  <p className="text-xs text-charcoal/60">Session Price</p>
                  <p className="text-lg font-bold text-teal-600">₹{provider.sessionPrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-charcoal/60">Availability</p>
                  <p className="text-xs font-medium text-emerald-600">{provider.availability}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 text-xs font-medium hover:bg-teal-100 transition-colors flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" />
                  View Profile
                </button>
                <Link
                  to={`/patient/book/${provider.id}`}
                  className="flex-1 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronRight className="h-3 w-3" />
                  Book
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-charcoal/60">No providers found matching your filters.</p>
            <p className="text-xs text-charcoal/50 mt-1">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== PROVIDER CARD COMPONENT =====
function ProviderCard({
  provider,
  role,
  color,
  empty,
}: {
  provider?: AssignedProvider;
  role: string;
  color: string;
  empty: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', badge: 'bg-teal-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', badge: 'bg-emerald-100' },
  };

  const colors = colorMap[color] || colorMap.teal;

  if (!provider) {
    return (
      <div className={`rounded-lg border ${colors.border} ${colors.bg} p-6 text-center`}>
        <div className="text-charcoal/60 text-sm font-medium mb-2">{role}</div>
        <p className="text-xs text-charcoal/50">{empty}</p>
        <Link
          to="/patient/care-team?tab=browse"
          className={`inline-flex min-h-[34px] items-center rounded-full px-4 mt-3 text-xs font-medium ${colors.text} border border-current hover:opacity-80 transition-opacity`}
        >
          Find {role}
        </Link>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-charcoal">{provider.name}</h4>
          <p className={`text-xs font-medium ${colors.text} mt-1`}>{role}</p>
        </div>
      </div>

      {/* Specialization */}
      {provider.specialization.length > 0 && (
        <p className="text-xs text-charcoal/70 mb-3">
          <span className="font-medium">Specialty:</span> {provider.specialization.join(', ')}
        </p>
      )}

      {/* Next Session */}
      {provider.nextSession && (
        <div className="mb-3 p-2 rounded bg-white/50 border border-current/10">
          <p className="text-xs font-medium text-charcoal">Next Session</p>
          <p className="text-xs text-charcoal/70 mt-1">
            {provider.nextSession.date} at {provider.nextSession.time}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-current/10">
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium text-charcoal/70 hover:text-charcoal hover:bg-white/50 transition-colors">
          <Eye className="h-3 w-3" />
          View Profile
        </button>
        {provider.canMessage && (
          <Link
            to="/patient/messages"
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium text-charcoal/70 hover:text-charcoal hover:bg-white/50 transition-colors"
          >
            <MessageCircle className="h-3 w-3" />
            Message
          </Link>
        )}
      </div>
    </div>
  );
}
