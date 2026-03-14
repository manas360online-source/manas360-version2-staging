import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  fetchProviderSettings,
  updateProviderSettings,
  type ProviderAvailabilitySlot,
  type ProviderSettingsResponse,
} from '../../api/provider';

const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
});

export default function Settings() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['providerSettings'],
    queryFn: fetchProviderSettings,
  });

  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<ProviderAvailabilitySlot[]>(createFallbackState().availabilitySlots);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setBio(settingsQuery.data.bio || '');
    setProfileImageUrl(settingsQuery.data.profileImageUrl || '');
    setSpecialtiesInput((settingsQuery.data.specializations || []).join(', '));
    setAvailabilitySlots(settingsQuery.data.availabilitySlots || createFallbackState().availabilitySlots);
  }, [settingsQuery.data]);

  const settings = settingsQuery.data ?? createFallbackState();
  const specialties = useMemo(
    () => specialtiesInput.split(',').map((value) => value.trim()).filter(Boolean),
    [specialtiesInput],
  );
  const enabledDayCount = availabilitySlots.filter((slot) => slot.isAvailable).length;

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
    });
  };

  const previewImage = profileImageUrl.trim();

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#D9E1D5] bg-[radial-gradient(circle_at_top_left,_rgba(21,89,74,0.16),_transparent_35%),linear-gradient(135deg,#F6FBF8_0%,#FFFFFF_62%)] p-8 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5C7A72]">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#23313A]">Clinical Identity & Availability</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Manage the profile details patients see when booking and define the working hours that produce bookable session slots.
        </p>
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
      )}
    </div>
  );
}
