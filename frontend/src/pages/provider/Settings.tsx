import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  fetchProviderSettings,
  updateProviderSettings,
  fetchProviderSubscription,
  type ProviderAvailabilitySlot,
  type ProviderSettingsResponse,
} from '../../api/provider';

const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi',
];

const createFallbackState = (): ProviderSettingsResponse => ({
  providerId: '',
  displayName: '',
  email: '',
  bio: '',
  specializations: [],
  profileImageUrl: '',
  availabilitySlots: weekdayLabels.map((_, dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: false,
  })),
  languages: [],
  consultationFee: 0,
  tagline: '',
});

export default function Settings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const settingsQuery = useQuery({
    queryKey: ['providerSettings'],
    queryFn: fetchProviderSettings,
  });

  const subQuery = useQuery({
    queryKey: ['providerSubscription'],
    queryFn: () => fetchProviderSubscription().catch(() => null),
  });

  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<ProviderAvailabilitySlot[]>(createFallbackState().availabilitySlots);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [consultationFee, setConsultationFee] = useState<number>(0);
  const [tagline, setTagline] = useState('');

  useEffect(() => {
    if (!settingsQuery.data) return;
    setBio(settingsQuery.data.bio || '');
    setProfileImageUrl(settingsQuery.data.profileImageUrl || '');
    setSpecialtiesInput((settingsQuery.data.specializations || []).join(', '));
    setAvailabilitySlots(settingsQuery.data.availabilitySlots || createFallbackState().availabilitySlots);
    setSelectedLanguages(settingsQuery.data.languages || []);
    setConsultationFee(settingsQuery.data.consultationFee ?? 0);
    setTagline(settingsQuery.data.tagline || '');
  }, [settingsQuery.data]);

  const settings = settingsQuery.data ?? createFallbackState();
  const specialties = useMemo(
    () => specialtiesInput.split(',').map((value) => value.trim()).filter(Boolean),
    [specialtiesInput],
  );
  const enabledDayCount = availabilitySlots.filter((slot) => slot.isAvailable).length;

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? (prev.length > 1 ? prev.filter((l) => l !== lang) : prev) : [...prev, lang],
    );
  };

  const updateMutation = useMutation({
    mutationFn: updateProviderSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['providerSettings'], updated);
      toast.success('Provider settings saved');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to save provider settings');
    },
  });

  const updateSlot = (dayOfWeek: number, patch: Partial<ProviderAvailabilitySlot>) => {
    setAvailabilitySlots((current) => current.map((slot) => (
      slot.dayOfWeek === dayOfWeek ? { ...slot, ...patch } : slot
    )));
  };

  const onSave = () => {
    updateMutation.mutate({
      bio,
      profileImageUrl,
      specializations: specialties,
      availabilitySlots,
      languages: selectedLanguages,
      consultationFee,
      tagline,
    });
  };

  const previewImage = profileImageUrl.trim();

  // Subscription data
  const sub = subQuery.data as any;
  const planName = sub?.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : 'Free';
  const planStatus = sub?.status || 'inactive';
  const expiryDate = sub?.expiryDate ? new Date(sub.expiryDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  // Real Progress Calculation
  const progressPercent = useMemo(() => {
    let score = 0;
    if (profileImageUrl.trim()) score += 15;
    if (specialties.length > 0) score += 15;
    if (bio.trim().length > 50) score += 20;
    if (enabledDayCount > 0) score += 20;
    if (selectedLanguages.length > 0) score += 10;
    if (consultationFee > 0) score += 10;
    if (tagline.trim()) score += 10;
    return score;
  }, [profileImageUrl, specialties, bio, enabledDayCount, selectedLanguages, consultationFee, tagline]);

  return (
    <div className="space-y-6 text-[#23313A]">
      <section className="rounded-[28px] border border-[#D9E1D5] bg-[radial-gradient(circle_at_top_left,_rgba(21,89,74,0.16),_transparent_35%),linear-gradient(135deg,#F6FBF8_0%,#FFFFFF_62%)] p-8 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5C7A72]">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#23313A]">Clinical Identity & Availability</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Manage the profile details patients see when booking and define the working hours that produce bookable session slots.
        </p>
      </section>

      {/* Onboarding Progress Section */}
      <section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Profile Completion</p>
            <h2 className="text-xl font-semibold text-[#23313A]">Onboarding Progress</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              {progressPercent === 100 
                ? 'Your profile is 100% complete and visible to patients.' 
                : 'Complete your clinical identity to unlock the marketplace.'}
            </p>
          </div>
          
          <div className="flex-1 max-w-md w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[#23313A]">
                {progressPercent}%
              </span>
              <span className="text-xs font-medium text-slate-400">Target: 100%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {progressPercent < 100 && (
            <button
              onClick={() => navigate('/onboarding/provider-setup')}
              className="px-6 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-black hover:bg-amber-700 transition shadow-lg shadow-amber-600/20"
            >
              Finish Setup →
            </button>
          )}
        </div>

        {progressPercent < 100 && (
           <div className="mt-6 flex items-center gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800 text-xs font-medium">
              <svg className="h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Your profile is currently <span className="font-bold underline">HIDDEN</span> from the patient marketplace. Please complete all required fields in the onboarding flow to go live.</span>
           </div>
        )}
      </section>

      {/* Billing & Plan Section */}
      <section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Billing & Plan</p>
            <h2 className="mt-2 text-xl font-semibold text-[#23313A]">Your Current Subscription</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/provider/subscription')}
            className="rounded-full bg-[#285947] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4436]"
          >
            Upgrade Plan
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E6ECE2] bg-[#FBFCFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B68]">Active Plan</p>
            <p className="mt-1 text-lg font-bold text-[#23313A]">{planName}</p>
          </div>
          <div className="rounded-2xl border border-[#E6ECE2] bg-[#FBFCFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B68]">Status</p>
            <p className={`mt-1 text-lg font-bold ${planStatus === 'active' ? 'text-emerald-700' : 'text-amber-700'}`}>
              {planStatus === 'active' ? '● Active' : '○ Inactive'}
            </p>
          </div>
          <div className="rounded-2xl border border-[#E6ECE2] bg-[#FBFCFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B68]">Renewal Date</p>
            <p className="mt-1 text-lg font-bold text-[#23313A]">{expiryDate}</p>
          </div>
        </div>
      </section>

      {settingsQuery.isLoading ? (
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[420px] animate-pulse rounded-[24px] bg-[#EEF2EA]" />
          <div className="h-[420px] animate-pulse rounded-[24px] bg-[#EEF2EA]" />
        </section>
      ) : settingsQuery.isError ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6">
          <h2 className="text-lg font-semibold text-rose-900">Unable to load settings</h2>
          <p className="mt-2 text-sm text-rose-700">
            {settingsQuery.error instanceof Error ? settingsQuery.error.message : 'Provider settings are unavailable.'}
          </p>
        </section>
      ) : (
        <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Profile</p>
                <h2 className="mt-2 text-xl font-semibold text-[#23313A]">Patient-facing identity</h2>
              </div>
              <button
                type="button"
                onClick={onSave}
                disabled={updateMutation.isPending}
                className="rounded-full bg-[#23313A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172027] disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save settings'}
              </button>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#23313A]">Profile image URL</span>
                <input
                  value={profileImageUrl}
                  onChange={(event) => setProfileImageUrl(event.target.value)}
                  placeholder="https://example.com/provider-photo.jpg"
                  className="rounded-2xl border border-[#DCE5D9] px-4 py-3 text-sm text-[#23313A] outline-none transition focus:border-[#6B7B68]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#23313A]">Specialties</span>
                <input
                  value={specialtiesInput}
                  onChange={(event) => setSpecialtiesInput(event.target.value)}
                  placeholder="Trauma, Anxiety, CBT"
                  className="rounded-2xl border border-[#DCE5D9] px-4 py-3 text-sm text-[#23313A] outline-none transition focus:border-[#6B7B68]"
                />
                <p className="text-xs text-slate-500">Separate specialties with commas.</p>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#23313A]">Bio</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={8}
                  placeholder="Describe your clinical approach, populations you work with, and what patients can expect."
                  className="rounded-[20px] border border-[#DCE5D9] px-4 py-3 text-sm text-[#23313A] outline-none transition focus:border-[#6B7B68]"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{specialties.length} specialties</span>
                  <span>{bio.length}/2000</span>
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Preview</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-[#E7F1EC] text-lg font-semibold text-[#285947]">
                  {previewImage ? (
                    <img src={previewImage} alt={settings.displayName || 'Provider profile'} className="h-full w-full object-cover" />
                  ) : (
                    (settings.displayName || 'P').slice(0, 1).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#23313A]">{settings.displayName || 'Provider'}</h3>
                  <p className="text-sm text-slate-500">{settings.email || 'No email available'}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {specialties.length === 0 ? (
                  <span className="rounded-full bg-[#F4F6F4] px-3 py-1 text-xs font-medium text-slate-500">No specialties yet</span>
                ) : (
                  specialties.map((specialty) => (
                    <span key={specialty} className="rounded-full bg-[#EAF3EE] px-3 py-1 text-xs font-semibold text-[#285947]">
                      {specialty}
                    </span>
                  ))
                )}
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">{bio || 'Your provider biography will appear here after you add it.'}</p>
            </div>

            <div className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Availability</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#23313A]">Working hours</h2>
                </div>
                <span className="rounded-full bg-[#F4F7F5] px-3 py-1 text-xs font-semibold text-[#5C7A72]">
                  {enabledDayCount} active days
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {availabilitySlots.map((slot) => (
                  <div key={slot.dayOfWeek} className="grid gap-3 rounded-2xl border border-[#E6ECE2] bg-[#FBFCFA] p-4 md:grid-cols-[1.1fr_auto_auto] md:items-center">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#23313A]">{weekdayLabels[slot.dayOfWeek] || `Day ${slot.dayOfWeek}`}</p>
                        <p className="text-xs text-slate-500">Patient booking respects these hours.</p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-[#23313A]">
                        <input
                          type="checkbox"
                          checked={slot.isAvailable}
                          onChange={(event) => updateSlot(slot.dayOfWeek, { isAvailable: event.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#285947] focus:ring-[#285947]"
                        />
                        Active
                      </label>
                    </div>
                    <input
                      type="time"
                      value={slot.startTime}
                      disabled={!slot.isAvailable}
                      onChange={(event) => updateSlot(slot.dayOfWeek, { startTime: event.target.value })}
                      className="rounded-xl border border-[#DCE5D9] px-3 py-2 text-sm text-[#23313A] disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <input
                      type="time"
                      value={slot.endTime}
                      disabled={!slot.isAvailable}
                      onChange={(event) => updateSlot(slot.dayOfWeek, { endTime: event.target.value })}
                      className="rounded-xl border border-[#DCE5D9] px-3 py-2 text-sm text-[#23313A] disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Languages section */}
        <section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Languages</p>
          <h2 className="mt-2 text-xl font-semibold text-[#23313A]">Session languages</h2>
          <p className="mt-1 text-sm text-slate-500">Select all languages you can conduct sessions in.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  selectedLanguages.includes(lang)
                    ? 'border-[#285947] bg-[#285947] text-white'
                    : 'border-[#DCE5D9] text-slate-600 hover:border-[#285947]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Selected: {selectedLanguages.length > 0 ? selectedLanguages.join(', ') : 'None'}
          </p>
        </section>

        {/* Pricing & Tagline section */}
        <section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Pricing</p>
          <h2 className="mt-2 text-xl font-semibold text-[#23313A]">Session rate & tagline</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#23313A]">Session Rate (INR)</span>
              <div className="flex items-center rounded-2xl border border-[#DCE5D9] px-4 py-3 focus-within:border-[#6B7B68]">
                <span className="mr-1 text-sm text-slate-500">₹</span>
                <input
                  type="number"
                  min={0}
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value))}
                  placeholder="1500"
                  className="flex-1 bg-transparent text-sm text-[#23313A] outline-none"
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#23313A]">Professional Tagline</span>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Compassionate trauma-informed therapist"
                maxLength={120}
                className="rounded-2xl border border-[#DCE5D9] px-4 py-3 text-sm text-[#23313A] outline-none transition focus:border-[#6B7B68]"
              />
              <p className="text-xs text-slate-500">{tagline.length}/120</p>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={updateMutation.isPending}
              className="rounded-full bg-[#23313A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172027] disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save all settings'}
            </button>
          </div>
        </section>

        {/* Read-only Verified Credentials section */}
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800">
              🔒
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Verified Credentials</p>
              <h2 className="mt-1 text-xl font-semibold text-[#23313A]">Registration & Qualifications</h2>
              <p className="mt-1 text-sm text-amber-800">
                These details were verified during onboarding and are read-only. To change verified credentials, please contact support.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              { label: 'Registration Type', value: settings.registrationType },
              { label: 'Registration Number', value: settings.registrationNum },
              { label: 'Highest Qualification', value: settings.highestQual },
              { label: 'RCI License', value: settings.licenseRci },
              { label: 'NMC License', value: settings.licenseNmc },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">{label}</p>
                <p className="mt-1 text-sm font-medium text-[#23313A]">{value || <span className="italic text-slate-400">Not on file</span>}</p>
              </div>
            ))}
          </div>
        </section>
        </div>
      )}
    </div>
  );
}
