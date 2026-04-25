import { useEffect, useState } from 'react';
import {
  getClinicSettings,
  updateClinicSettings,
  type ClinicSettings,
  type MdcClinicSettingsApiError,
} from '../../api/mdcClinicSettings.api';

const PURGE_HOURS_OPTIONS: Array<24 | 48 | 72> = [24, 48, 72];

const DEFAULT_SETTINGS: ClinicSettings = {
  autoPurgeEnabled: false,
  purgeHours: 24,
};

const getErrorMessage = (error: unknown): string => {
  const apiError = error as MdcClinicSettingsApiError;
  return apiError?.message || 'Unable to process clinic settings request.';
};

export default function DpdpaSettingsExample() {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const current = await getClinicSettings();
      setSettings({
        autoPurgeEnabled: Boolean(current.autoPurgeEnabled),
        purgeHours: current.purgeHours === 48 || current.purgeHours === 72 ? current.purgeHours : 24,
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const onSave = async () => {
    setIsSaving(true);
    setError(null);
    setStatusMessage(null);

    try {
      const updated = await updateClinicSettings({
        autoPurgeEnabled: settings.autoPurgeEnabled,
        purgeHours: settings.purgeHours,
      });

      setSettings({
        autoPurgeEnabled: Boolean(updated.autoPurgeEnabled),
        purgeHours: updated.purgeHours === 48 || updated.purgeHours === 72 ? updated.purgeHours : 24,
      });
      setStatusMessage('DPDPA settings saved successfully.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">DPDPA Settings (Auto Purge)</h2>
        <p className="mt-1 text-sm text-slate-500">Configure automatic data purging policy for clinic records.</p>
      </header>

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {statusMessage && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</p>}

      <div className="space-y-4">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
          <span className="text-sm font-medium text-slate-800">Enable Auto Purge</span>
          <input
            type="checkbox"
            checked={settings.autoPurgeEnabled}
            disabled={isLoading || isSaving}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                autoPurgeEnabled: event.target.checked,
              }))
            }
            className="h-4 w-4 cursor-pointer"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Purge Hours
          <select
            value={settings.purgeHours}
            disabled={isLoading || isSaving || !settings.autoPurgeEnabled}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                purgeHours: Number(event.target.value) as 24 | 48 | 72,
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {PURGE_HOURS_OPTIONS.map((hours) => (
              <option key={hours} value={hours}>
                {hours} hours
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={isLoading || isSaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          type="button"
          onClick={() => void loadSettings()}
          disabled={isLoading || isSaving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Loading...' : 'Reload'}
        </button>
      </div>
    </section>
  );
}
