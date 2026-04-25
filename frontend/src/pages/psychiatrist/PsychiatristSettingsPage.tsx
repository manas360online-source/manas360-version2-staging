import { useEffect, useMemo, useState } from 'react';
import { Bell, Eye, Shield, SlidersHorizontal, User, ChevronDown, ChevronUp } from 'lucide-react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { http } from '../../lib/http';
import { useAuth } from '../../context/AuthContext';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

type SectionId = 'profile' | 'notifications' | 'privacy' | 'practice' | 'security';

type PsychiatristSettingsState = {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialization: string;
    licenseNumber: string;
    consultationFee: string;
    availabilitySchedule: string;
    showNameToProviders: boolean;
  };
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    consultationReminders: boolean;
    medicationReviewAlerts: boolean;
    interactionAlerts: boolean;
    careTeamMessages: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'patients_only';
    allowAiSuggestions: boolean;
    showEarningsInDashboard: boolean;
  };
  practice: {
    preferredConsultationType: 'Video' | 'Audio' | 'Chat';
    defaultFollowUpType: 'Medication Check (15 min)' | 'Med + Therapy (30 min)' | 'Full Evaluation (60 min)';
    autoFollowUpEnabled: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
  };
};

const defaultState: PsychiatristSettingsState = {
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: 'Psychiatry',
    licenseNumber: '',
    consultationFee: '1500',
    availabilitySchedule: 'Mon-Fri, 10:00 AM - 6:00 PM',
    showNameToProviders: true,
  },
  notifications: {
    push: true,
    email: true,
    sms: false,
    consultationReminders: true,
    medicationReviewAlerts: true,
    interactionAlerts: true,
    careTeamMessages: true,
  },
  privacy: {
    profileVisibility: 'patients_only',
    allowAiSuggestions: true,
    showEarningsInDashboard: true,
  },
  practice: {
    preferredConsultationType: 'Video',
    defaultFollowUpType: 'Medication Check (15 min)',
    autoFollowUpEnabled: true,
  },
  security: {
    twoFactorEnabled: false,
  },
};

const sectionMeta: Array<{ id: SectionId; label: string; icon: any }> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Eye },
  { id: 'practice', label: 'Practice', icon: SlidersHorizontal },
  { id: 'security', label: 'Security', icon: Shield },
];

const mergeSettings = (base: PsychiatristSettingsState, fromApi?: Partial<PsychiatristSettingsState>): PsychiatristSettingsState => ({
  ...base,
  ...(fromApi || {}),
  profile: { ...base.profile, ...(fromApi?.profile || {}) },
  notifications: { ...base.notifications, ...(fromApi?.notifications || {}) },
  privacy: { ...base.privacy, ...(fromApi?.privacy || {}) },
  practice: { ...base.practice, ...(fromApi?.practice || {}) },
  security: { ...base.security, ...(fromApi?.security || {}) },
});

export default function PsychiatristSettingsPage() {
  const { user } = useAuth();
  const [state, setState] = useState<PsychiatristSettingsState>(defaultState);
  const [savedState, setSavedState] = useState<PsychiatristSettingsState>(defaultState);
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [mobileOpen, setMobileOpen] = useState<SectionId | null>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);
      setError(null);
      try {
        const settingsRes = await psychiatristApi.getSettings();
        let merged: PsychiatristSettingsState = mergeSettings(defaultState, (settingsRes.payload || {}) as Partial<PsychiatristSettingsState>);

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
            showNameToProviders: typeof me?.showNameToProviders === 'boolean' ? me.showNameToProviders : true,
          },
        };

        setState(merged);
        setSavedState(merged);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load psychiatrist settings.');
      } finally {
        setLoading(false);
      }
    };

    void hydrate();
  }, [user?.email, user?.firstName, user?.lastName]);

  const sectionDirty = (section: SectionId) => JSON.stringify(state[section]) !== JSON.stringify(savedState[section]);
  const anyDirty = useMemo(() => sectionMeta.some((section) => sectionDirty(section.id)), [state, savedState]);

  const saveSection = async (section: SectionId) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let targetState: PsychiatristSettingsState = state;

      if (section === 'profile') {
        const fullName = [state.profile.firstName.trim(), state.profile.lastName.trim()].filter(Boolean).join(' ');
        const res = await http.patch('/v1/users/me', {
          name: fullName,
          phone: state.profile.phone.trim(),
          showNameToProviders: state.profile.showNameToProviders,
        });

        const updated = res.data?.data ?? res.data;
        const resolvedName = String(updated?.name || fullName || '').trim();
        const parts = resolvedName.split(/\s+/).filter(Boolean);

        const next: PsychiatristSettingsState = {
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
        targetState = next;
        setState(next);
      }

      await psychiatristApi.saveSettings(targetState as unknown as Record<string, unknown>);
      setSavedState(targetState);
      setSuccess(section === 'profile' ? 'Profile settings saved successfully.' : 'Settings saved successfully.');
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
      <TherapistPageShell title="Settings" subtitle="Manage psychiatrist account, profile, notifications, and security.">
        <TherapistLoadingState title="Loading settings" description="Fetching psychiatrist account settings." />
      </TherapistPageShell>
    );
  }

  if (error && !state.profile.email) {
    return (
      <TherapistPageShell title="Settings" subtitle="Manage psychiatrist account, profile, notifications, and security.">
        <TherapistErrorState title="Could not load settings" description={error} onRetry={() => window.location.reload()} />
      </TherapistPageShell>
    );
  }

  const fullName = [state.profile.firstName, state.profile.lastName].filter(Boolean).join(' ').trim();

  return (
    <TherapistPageShell title="Settings" subtitle="Manage psychiatrist account, profile, notifications, and security.">
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
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    isActive ? 'bg-sage-50 font-semibold text-sage-600' : 'text-ink-600 hover:bg-surface-bg'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </TherapistCard>

        <div className="space-y-4">
          {sectionMeta.map((section) => {
            const Icon = section.icon;
            const open = mobileOpen === section.id;
            const visibleOnDesktop = activeSection === section.id;

            return (
              <TherapistCard key={section.id} className={`${visibleOnDesktop ? '' : 'xl:hidden'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(section.id);
                    toggleMobile(section.id);
                  }}
                  className="flex w-full items-center justify-between border-b border-ink-100 px-4 py-3 text-left xl:cursor-default"
                >
                  <span className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink-800">
                    <Icon className="h-4 w-4 text-sage-600" />
                    {section.label}
                  </span>
                  <span className="xl:hidden">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                </button>

                <div className={`${open ? 'block' : 'hidden'} px-4 py-4 xl:block`}>
                  {section.id === 'profile' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="First Name" value={state.profile.firstName} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, firstName: value } }))} />
                      <Input label="Last Name" value={state.profile.lastName} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, lastName: value } }))} />
                      <Input label="Email" value={state.profile.email} disabled onChange={() => {}} />
                      <Input label="Phone" value={state.profile.phone} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, phone: value } }))} />
                      <Input label="Specialization" value={state.profile.specialization} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, specialization: value } }))} />
                      <Input label="License Number" value={state.profile.licenseNumber} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, licenseNumber: value } }))} />
                      <Input label="Consultation Fees (INR)" value={state.profile.consultationFee} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, consultationFee: value } }))} />
                      <Input label="Availability Schedule" value={state.profile.availabilitySchedule} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, availabilitySchedule: value } }))} />
                      <Toggle label="Show Name to Providers" checked={state.profile.showNameToProviders} onChange={(value) => setState((prev) => ({ ...prev, profile: { ...prev.profile, showNameToProviders: value } }))} />
                    </div>
                  ) : null}

                  {section.id === 'notifications' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Toggle label="Push Notifications" checked={state.notifications.push} onChange={(value) => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, push: value } }))} />
                      <Toggle label="Email Notifications" checked={state.notifications.email} onChange={(value) => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, email: value } }))} />
                      <Toggle label="SMS Notifications" checked={state.notifications.sms} onChange={(value) => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, sms: value } }))} />
                      <Toggle label="Consultation Reminders" checked={state.notifications.consultationReminders} onChange={(value) => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, consultationReminders: value } }))} />
                      <Toggle label="Medication Review Alerts" checked={state.notifications.medicationReviewAlerts} onChange={(value) => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, medicationReviewAlerts: value } }))} />
                      <Toggle label="Drug Interaction Alerts" checked={state.notifications.interactionAlerts} onChange={(value) => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, interactionAlerts: value } }))} />
                      <Toggle label="Care Team Messages" checked={state.notifications.careTeamMessages} onChange={(value) => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, careTeamMessages: value } }))} />
                    </div>
                  ) : null}

                  {section.id === 'privacy' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Select
                        label="Profile Visibility"
                        value={state.privacy.profileVisibility}
                        options={[
                          { label: 'Public', value: 'public' },
                          { label: 'Private', value: 'private' },
                          { label: 'Patients Only', value: 'patients_only' },
                        ]}
                        onChange={(value) => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, profileVisibility: value as any } }))}
                      />
                      <Toggle label="Allow AI Suggestions" checked={state.privacy.allowAiSuggestions} onChange={(value) => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, allowAiSuggestions: value } }))} />
                      <Toggle label="Show Earnings in Dashboard" checked={state.privacy.showEarningsInDashboard} onChange={(value) => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, showEarningsInDashboard: value } }))} />
                    </div>
                  ) : null}

                  {section.id === 'practice' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Select
                        label="Preferred Consultation Type"
                        value={state.practice.preferredConsultationType}
                        options={[
                          { label: 'Video', value: 'Video' },
                          { label: 'Audio', value: 'Audio' },
                          { label: 'Chat', value: 'Chat' },
                        ]}
                        onChange={(value) => setState((prev) => ({ ...prev, practice: { ...prev.practice, preferredConsultationType: value as any } }))}
                      />
                      <Select
                        label="Default Follow-up Type"
                        value={state.practice.defaultFollowUpType}
                        options={[
                          { label: 'Medication Check (15 min)', value: 'Medication Check (15 min)' },
                          { label: 'Med + Therapy (30 min)', value: 'Med + Therapy (30 min)' },
                          { label: 'Full Evaluation (60 min)', value: 'Full Evaluation (60 min)' },
                        ]}
                        onChange={(value) => setState((prev) => ({ ...prev, practice: { ...prev.practice, defaultFollowUpType: value as any } }))}
                      />
                      <Toggle label="Enable Auto Follow-up Suggestions" checked={state.practice.autoFollowUpEnabled} onChange={(value) => setState((prev) => ({ ...prev, practice: { ...prev.practice, autoFollowUpEnabled: value } }))} />
                    </div>
                  ) : null}

                  {section.id === 'security' ? (
                    <div className="space-y-3">
                      <Toggle label="Enable Two Factor Authentication" checked={state.security.twoFactorEnabled} onChange={(value) => setState((prev) => ({ ...prev, security: { ...prev.security, twoFactorEnabled: value } }))} />
                      <p className="text-xs text-ink-500">Use authenticator app based 2FA for psychiatrist account access.</p>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-3">
                    <TherapistButton variant="secondary" disabled={!sectionDirty(section.id) || saving} onClick={() => discardSection(section.id)}>
                      Discard
                    </TherapistButton>
                    <TherapistButton disabled={!sectionDirty(section.id) || saving} onClick={() => void saveSection(section.id)}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </TherapistButton>
                  </div>
                </div>
              </TherapistCard>
            );
          })}

          {anyDirty ? <p className="text-xs text-ink-500">Unsaved changes detected. Save each section to persist updates.</p> : null}
          {fullName ? <p className="text-xs text-ink-400">Signed in as {fullName}</p> : null}
        </div>
      </section>
    </TherapistPageShell>
  );
}

function Input({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-600">
      {label}
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none disabled:cursor-not-allowed disabled:bg-ink-50"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-sage-500' : 'bg-ink-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  );
}
