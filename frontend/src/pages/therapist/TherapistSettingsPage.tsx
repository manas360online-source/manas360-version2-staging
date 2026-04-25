import { useEffect, useMemo, useState } from 'react';
import { Bell, Eye, Gauge, Shield, SlidersHorizontal, User, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { http } from '../../lib/http';
import { useAuth } from '../../context/AuthContext';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

type SectionId =
  | 'profile'
  | 'notifications'
  | 'privacy'
  | 'practice'
  | 'payout'
  | 'security';

type TherapistSettingsState = {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    professionalTitle: string;
    yearsOfExperience: string;
    specializations: string;
    bio: string;
    showNameToProviders: boolean;
  };
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    patientMessages: boolean;
    sessionReminders: boolean;
    assessmentAlerts: boolean;
    payoutUpdates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'patients_only';
    showEarningsInDashboard: boolean;
    allowAiSuggestions: boolean;
  };
  practice: {
    maxPatientsPerWeek: string;
    defaultSessionDuration: '30' | '45' | '60';
    consultationMode: 'Video' | 'Chat' | 'Audio';
    enableAutoFollowUp: boolean;
  };
  payout: {
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
    upiId: string;
    payoutCycle: 'weekly' | 'biweekly' | 'monthly';
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
  };
};

const STORAGE_KEY = 'manas360-therapist-settings-v1';

const defaultState: TherapistSettingsState = {
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    professionalTitle: 'Clinical Psychologist',
    yearsOfExperience: '',
    specializations: '',
    bio: '',
    showNameToProviders: true,
  },
  notifications: {
    push: true,
    email: true,
    sms: false,
    patientMessages: true,
    sessionReminders: true,
    assessmentAlerts: true,
    payoutUpdates: true,
  },
  privacy: {
    profileVisibility: 'patients_only',
    showEarningsInDashboard: true,
    allowAiSuggestions: true,
  },
  practice: {
    maxPatientsPerWeek: '35',
    defaultSessionDuration: '45',
    consultationMode: 'Video',
    enableAutoFollowUp: true,
  },
  payout: {
    accountHolderName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    payoutCycle: 'weekly',
  },
  security: {
    twoFactorEnabled: false,
    lastPasswordChange: '-',
  },
};

const sectionMeta: Array<{ id: SectionId; label: string; icon: any }> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Eye },
  { id: 'practice', label: 'Practice Preferences', icon: SlidersHorizontal },
  { id: 'payout', label: 'Payout Settings', icon: Wallet },
  { id: 'security', label: 'Security', icon: Shield },
];

const parseStored = (): Partial<TherapistSettingsState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const tabToSection = (tab: string | null): SectionId => {
  switch ((tab || '').toLowerCase()) {
    case 'profile':
      return 'profile';
    case 'notifications':
      return 'notifications';
    case 'privacy':
      return 'privacy';
    case 'practice':
    case 'ratings':
      return 'practice';
    case 'payout':
    case 'payouts':
      return 'payout';
    case 'security':
      return 'security';
    default:
      return 'profile';
  }
};

export default function TherapistSettingsPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [state, setState] = useState<TherapistSettingsState>(defaultState);
  const [savedState, setSavedState] = useState<TherapistSettingsState>(defaultState);
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [mobileOpen, setMobileOpen] = useState<SectionId | null>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = tabToSection(params.get('tab'));
    setActiveSection(section);
    setMobileOpen(section);
  }, [location.search]);

  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);
      setError(null);
      try {
        const fromStorage = parseStored();
        let merged: TherapistSettingsState = {
          ...defaultState,
          ...fromStorage,
          profile: {
            ...defaultState.profile,
            ...(fromStorage.profile || {}),
          },
          notifications: {
            ...defaultState.notifications,
            ...(fromStorage.notifications || {}),
          },
          privacy: {
            ...defaultState.privacy,
            ...(fromStorage.privacy || {}),
          },
          practice: {
            ...defaultState.practice,
            ...(fromStorage.practice || {}),
          },
          payout: {
            ...defaultState.payout,
            ...(fromStorage.payout || {}),
          },
          security: {
            ...defaultState.security,
            ...(fromStorage.security || {}),
          },
        };

        const meRes = await http.get('/v1/users/me');
        const me = meRes.data?.data ?? meRes.data;

        const resolvedName = String(me?.name || `${me?.firstName || ''} ${me?.lastName || ''}` || '').trim();
        const parts = resolvedName ? resolvedName.split(/\s+/) : [];

        merged = {
          ...merged,
          profile: {
            ...merged.profile,
            firstName: parts[0] || me?.firstName || user?.firstName || '',
            lastName: parts.slice(1).join(' ') || me?.lastName || user?.lastName || '',
            email: String(me?.email || user?.email || ''),
            phone: String(me?.phone || ''),
            showNameToProviders:
              typeof me?.showNameToProviders === 'boolean' ? me.showNameToProviders : true,
          },
        };

        setState(merged);
        setSavedState(merged);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load therapist settings.');
      } finally {
        setLoading(false);
      }
    };

    void hydrate();
  }, [user?.email, user?.firstName, user?.lastName]);

  const sectionDirty = (section: SectionId) =>
    JSON.stringify(state[section]) !== JSON.stringify(savedState[section]);

  const anyDirty = useMemo(() => sectionMeta.some((section) => sectionDirty(section.id)), [state, savedState]);

  const persistLocal = (next: TherapistSettingsState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveSection = async (section: SectionId) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (section === 'profile') {
        const fullName = [state.profile.firstName.trim(), state.profile.lastName.trim()].filter(Boolean).join(' ');
        const phone = state.profile.phone.trim();

        const res = await http.patch('/v1/users/me', {
          name: fullName,
          phone,
          showNameToProviders: state.profile.showNameToProviders,
        });

        const updated = res.data?.data ?? res.data;
        const resolvedName = String(updated?.name || fullName || '').trim();
        const parts = resolvedName.split(/\s+/).filter(Boolean);

        const next: TherapistSettingsState = {
          ...state,
          profile: {
            ...state.profile,
            firstName: parts[0] || state.profile.firstName,
            lastName: parts.slice(1).join(' ') || state.profile.lastName,
            email: String(updated?.email || state.profile.email),
            phone: String(updated?.phone || state.profile.phone),
            showNameToProviders:
              typeof updated?.showNameToProviders === 'boolean'
                ? updated.showNameToProviders
                : state.profile.showNameToProviders,
          },
        };

        setState(next);
        setSavedState(next);
        persistLocal(next);
        setSuccess('Profile settings saved successfully.');
      } else {
        const next = { ...state };
        setSavedState(next);
        persistLocal(next);
        setSuccess('Settings saved locally for therapist workspace.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const discardSection = (section: SectionId) => {
    setState((prev) => ({ ...prev, [section]: savedState[section] }));
    setSuccess(null);
    setError(null);
  };

  const toggleMobile = (section: SectionId) => {
    setMobileOpen((prev) => (prev === section ? null : section));
  };

  if (loading) {
    return (
      <TherapistPageShell title="Settings" subtitle="Manage therapist account, profile, and practice preferences.">
        <TherapistLoadingState title="Loading settings" description="Fetching therapist account settings." />
      </TherapistPageShell>
    );
  }

  if (error && !state.profile.email) {
    return (
      <TherapistPageShell title="Settings" subtitle="Manage therapist account, profile, and practice preferences.">
        <TherapistErrorState title="Could not load settings" description={error} onRetry={() => window.location.reload()} />
      </TherapistPageShell>
    );
  }

  const fullName = [state.profile.firstName, state.profile.lastName].filter(Boolean).join(' ').trim();

  return (
    <TherapistPageShell title="Settings" subtitle="Manage therapist account, profile, and practice preferences.">
      {error ? <TherapistErrorState title="Action failed" description={error} onRetry={() => setError(null)} /> : null}

      {success ? (
        <TherapistCard className="border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">{success}</p>
        </TherapistCard>
      ) : null}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_1fr]">
        <TherapistCard className="hidden p-3 xl:block">
          <nav className="space-y-1">
            {sectionMeta.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-sage-50 text-sage-500' : 'text-ink-600 hover:bg-surface-bg'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </span>
                  {sectionDirty(section.id) ? <TherapistBadge label="Unsaved" variant="warning" /> : null}
                </button>
              );
            })}
          </nav>
        </TherapistCard>

        <div className="space-y-4">
          <TherapistCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-ink-800">View Profile</h3>
                <p className="text-sm text-ink-500">Therapist identity visible in workspace and patient context.</p>
              </div>
              <TherapistBadge label="Therapist Account" variant="sage" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
                <p className="text-xs text-ink-500">Full Name</p>
                <p className="mt-1 font-semibold text-ink-800">{fullName || 'Not set'}</p>
              </div>
              <div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
                <p className="text-xs text-ink-500">Email</p>
                <p className="mt-1 font-semibold text-ink-800">{state.profile.email || 'Not set'}</p>
              </div>
              <div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
                <p className="text-xs text-ink-500">Professional Title</p>
                <p className="mt-1 font-semibold text-ink-800">{state.profile.professionalTitle || 'Not set'}</p>
              </div>
            </div>
          </TherapistCard>

          <div className="xl:hidden space-y-3">
            {sectionMeta.map((section) => {
              const Icon = section.icon;
              const open = mobileOpen === section.id;
              return (
                <TherapistCard key={section.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => toggleMobile(section.id)}
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </span>
                    {open ? <ChevronUp className="h-4 w-4 text-ink-500" /> : <ChevronDown className="h-4 w-4 text-ink-500" />}
                  </button>
                  {open ? <div className="border-t border-ink-100 p-4">{renderSection(section.id, state, setState)}</div> : null}
                  {open ? (
                    <div className="flex justify-end gap-2 border-t border-ink-100 bg-surface-bg px-4 py-3">
                      <TherapistButton
                        variant="secondary"
                        className="min-h-[36px] px-3 py-1 text-xs"
                        onClick={() => discardSection(section.id)}
                        disabled={!sectionDirty(section.id) || saving}
                      >
                        Discard
                      </TherapistButton>
                      <TherapistButton
                        className="min-h-[36px] px-3 py-1 text-xs"
                        onClick={() => void saveSection(section.id)}
                        disabled={!sectionDirty(section.id) || saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </TherapistButton>
                    </div>
                  ) : null}
                </TherapistCard>
              );
            })}
          </div>

          <div className="hidden xl:block space-y-4">
            <TherapistCard className="p-5">{renderSection(activeSection, state, setState)}</TherapistCard>
            <div className="flex justify-end gap-2">
              <TherapistButton
                variant="secondary"
                onClick={() => discardSection(activeSection)}
                disabled={!sectionDirty(activeSection) || saving}
              >
                Discard Changes
              </TherapistButton>
              <TherapistButton onClick={() => void saveSection(activeSection)} disabled={!sectionDirty(activeSection) || saving}>
                {saving ? 'Saving...' : 'Save Section'}
              </TherapistButton>
            </div>
          </div>
        </div>
      </section>

      {anyDirty ? (
        <TherapistCard className="border border-clay-200 bg-clay-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-clay-600">You have unsaved therapist settings changes.</p>
            <TherapistButton onClick={() => void saveSection(activeSection)} disabled={saving}>
              Save Current Section
            </TherapistButton>
          </div>
        </TherapistCard>
      ) : null}

      <TherapistCard className="border border-sky-200 bg-sky-50 p-4">
        <div className="flex items-start gap-2">
          <Gauge className="mt-0.5 h-4 w-4 text-sky-700" />
          <p className="text-sm text-sky-700">
            Product logic: Professional Mode handles patient-care workflows, while Self Mode uses practice/account settings and analytics.
            These settings are structured to keep both areas separate and predictable.
          </p>
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}

function renderSection(
  section: SectionId,
  state: TherapistSettingsState,
  setState: React.Dispatch<React.SetStateAction<TherapistSettingsState>>,
) {
  if (section === 'profile') {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-800">Profile</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink-500">
            First Name
            <input
              value={state.profile.firstName}
              onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, firstName: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            />
          </label>
          <label className="text-sm text-ink-500">
            Last Name
            <input
              value={state.profile.lastName}
              onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, lastName: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            />
          </label>
          <label className="text-sm text-ink-500 sm:col-span-2">
            Phone
            <input
              value={state.profile.phone}
              onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, phone: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
              placeholder="+91..."
            />
          </label>
          <label className="text-sm text-ink-500 sm:col-span-2">
            Professional Title
            <input
              value={state.profile.professionalTitle}
              onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, professionalTitle: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
              placeholder="Clinical Psychologist"
            />
          </label>
          <label className="text-sm text-ink-500 sm:col-span-2">
            Specializations
            <input
              value={state.profile.specializations}
              onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, specializations: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
              placeholder="Anxiety, CBT, Trauma"
            />
          </label>
        </div>
        <label className="block text-sm text-ink-500">
          Professional Bio
          <textarea
            value={state.profile.bio}
            onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, bio: event.target.value } }))}
            className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            rows={4}
          />
        </label>
        <div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink-800">Show my name to care-team providers</p>
              <p className="text-xs text-ink-500">When disabled, your name appears masked in cross-provider timeline contexts.</p>
            </div>
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, profile: { ...prev.profile, showNameToProviders: !prev.profile.showNameToProviders } }))}
              className={`relative h-7 w-12 rounded-full transition ${state.profile.showNameToProviders ? 'bg-sage-500' : 'bg-ink-300'}`}
              aria-pressed={state.profile.showNameToProviders}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${state.profile.showNameToProviders ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'notifications') {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-800">Notifications</h3>
        {[
          ['push', 'Push Notifications'],
          ['email', 'Email Notifications'],
          ['sms', 'SMS Alerts'],
          ['patientMessages', 'Patient Messages'],
          ['sessionReminders', 'Session Reminders'],
          ['assessmentAlerts', 'Assessment Alerts'],
          ['payoutUpdates', 'Payout Updates'],
        ].map(([key, label]) => {
          const typedKey = key as keyof TherapistSettingsState['notifications'];
          return (
            <div key={key} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
              <p className="text-sm text-ink-700">{label}</p>
              <button
                type="button"
                onClick={() => setState((prev) => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    [typedKey]: !prev.notifications[typedKey],
                  },
                }))}
                className={`relative h-7 w-12 rounded-full transition ${state.notifications[typedKey] ? 'bg-sage-500' : 'bg-ink-300'}`}
                aria-pressed={state.notifications[typedKey]}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${state.notifications[typedKey] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (section === 'privacy') {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-800">Privacy</h3>
        <label className="block text-sm text-ink-500">
          Profile Visibility
          <select
            value={state.privacy.profileVisibility}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                privacy: { ...prev.privacy, profileVisibility: event.target.value as TherapistSettingsState['privacy']['profileVisibility'] },
              }))
            }
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
          >
            <option value="public">Public</option>
            <option value="patients_only">Patients Only</option>
            <option value="private">Private</option>
          </select>
        </label>

        {[
          ['showEarningsInDashboard', 'Show earnings in dashboard'],
          ['allowAiSuggestions', 'Allow AI suggestions in workspace'],
        ].map(([key, label]) => {
          const typedKey = key as keyof TherapistSettingsState['privacy'];
          const value = state.privacy[typedKey] as boolean;
          return (
            <div key={key} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
              <p className="text-sm text-ink-700">{label}</p>
              <button
                type="button"
                onClick={() => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, [typedKey]: !value } }))}
                className={`relative h-7 w-12 rounded-full transition ${value ? 'bg-sage-500' : 'bg-ink-300'}`}
                aria-pressed={value}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${value ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (section === 'practice') {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-800">Practice Preferences</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink-500">
            Max Patients / Week
            <input
              value={state.practice.maxPatientsPerWeek}
              onChange={(event) => setState((prev) => ({ ...prev, practice: { ...prev.practice, maxPatientsPerWeek: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            />
          </label>
          <label className="text-sm text-ink-500">
            Default Session Duration
            <select
              value={state.practice.defaultSessionDuration}
              onChange={(event) =>
                setState((prev) => ({ ...prev, practice: { ...prev.practice, defaultSessionDuration: event.target.value as '30' | '45' | '60' } }))
              }
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            >
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </label>
          <label className="text-sm text-ink-500 sm:col-span-2">
            Default Consultation Mode
            <select
              value={state.practice.consultationMode}
              onChange={(event) =>
                setState((prev) => ({ ...prev, practice: { ...prev.practice, consultationMode: event.target.value as 'Video' | 'Chat' | 'Audio' } }))
              }
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            >
              <option value="Video">Video</option>
              <option value="Chat">Chat</option>
              <option value="Audio">Audio</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
          <p className="text-sm text-ink-700">Enable automatic post-session follow-up reminders</p>
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, practice: { ...prev.practice, enableAutoFollowUp: !prev.practice.enableAutoFollowUp } }))}
            className={`relative h-7 w-12 rounded-full transition ${state.practice.enableAutoFollowUp ? 'bg-sage-500' : 'bg-ink-300'}`}
            aria-pressed={state.practice.enableAutoFollowUp}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${state.practice.enableAutoFollowUp ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>
    );
  }

  if (section === 'payout') {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-800">Payout Settings</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink-500 sm:col-span-2">
            Account Holder Name
            <input
              value={state.payout.accountHolderName}
              onChange={(event) => setState((prev) => ({ ...prev, payout: { ...prev.payout, accountHolderName: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            />
          </label>
          <label className="text-sm text-ink-500 sm:col-span-2">
            Account Number
            <input
              value={state.payout.accountNumber}
              onChange={(event) => setState((prev) => ({ ...prev, payout: { ...prev.payout, accountNumber: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            />
          </label>
          <label className="text-sm text-ink-500">
            IFSC
            <input
              value={state.payout.ifsc}
              onChange={(event) => setState((prev) => ({ ...prev, payout: { ...prev.payout, ifsc: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            />
          </label>
          <label className="text-sm text-ink-500">
            UPI ID
            <input
              value={state.payout.upiId}
              onChange={(event) => setState((prev) => ({ ...prev, payout: { ...prev.payout, upiId: event.target.value } }))}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            />
          </label>
          <label className="text-sm text-ink-500 sm:col-span-2">
            Payout Cycle
            <select
              value={state.payout.payoutCycle}
              onChange={(event) =>
                setState((prev) => ({ ...prev, payout: { ...prev.payout, payoutCycle: event.target.value as 'weekly' | 'biweekly' | 'monthly' } }))
              }
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-base font-bold text-ink-800">Security</h3>
      <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
        <div>
          <p className="text-sm text-ink-700">Two-factor authentication</p>
          <p className="text-xs text-ink-500">Add an extra verification layer for therapist account access.</p>
        </div>
        <button
          type="button"
          onClick={() => setState((prev) => ({ ...prev, security: { ...prev.security, twoFactorEnabled: !prev.security.twoFactorEnabled } }))}
          className={`relative h-7 w-12 rounded-full transition ${state.security.twoFactorEnabled ? 'bg-sage-500' : 'bg-ink-300'}`}
          aria-pressed={state.security.twoFactorEnabled}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${state.security.twoFactorEnabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      <div className="rounded-lg border border-ink-100 bg-surface-bg px-3 py-2">
        <p className="text-xs text-ink-500">Last password change</p>
        <p className="text-sm font-medium text-ink-800">{state.security.lastPasswordChange}</p>
      </div>
    </div>
  );
}
