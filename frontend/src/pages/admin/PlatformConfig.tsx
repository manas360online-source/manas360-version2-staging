import { useEffect, useMemo, useState } from 'react';
import { listPlatformConfigs, upsertPlatformConfig, type PlatformConfigRecord } from '../../api/admin.api';
import { toast } from 'sonner';
import { usePermission } from '../../hooks/usePermission';

const DEFAULT_KEYS = ['pricing', 'commission', 'featureFlags', 'limits', 'compliance'];

type CommissionOverride = {
  providerId: string;
  platformPercent: number;
  providerPercent: number;
};

type CommissionConfig = {
  default: {
    platformPercent: number;
    providerPercent: number;
  };
  providers: Record<string, { platformPercent: number; providerPercent: number }>;
};

const DEFAULT_COMMISSION: CommissionConfig = {
  default: { platformPercent: 40, providerPercent: 60 },
  providers: {},
};

const normalizeCommissionConfig = (value: unknown): CommissionConfig => {
  if (!value || typeof value !== 'object') return DEFAULT_COMMISSION;
  const raw = value as Record<string, unknown>;
  const defaultRaw = (raw.default || raw.base || {}) as Record<string, unknown>;
  const providersRaw = (raw.providers || raw.overrides || {}) as Record<string, Record<string, unknown>>;

  const platformPercent = Number(defaultRaw.platformPercent ?? defaultRaw.platform ?? 40);
  const providerPercent = Number(defaultRaw.providerPercent ?? defaultRaw.provider ?? 60);

  const providers: CommissionConfig['providers'] = {};
  Object.entries(providersRaw || {}).forEach(([providerId, override]) => {
    const platform = Number(override?.platformPercent ?? override?.platform ?? 0);
    const provider = Number(override?.providerPercent ?? override?.provider ?? 0);
    if (!providerId.trim()) return;
    providers[providerId] = {
      platformPercent: Number.isFinite(platform) ? platform : 0,
      providerPercent: Number.isFinite(provider) ? provider : 0,
    };
  });

  return {
    default: {
      platformPercent: Number.isFinite(platformPercent) ? platformPercent : 40,
      providerPercent: Number.isFinite(providerPercent) ? providerPercent : 60,
    },
    providers,
  };
};

export default function PlatformConfigPage() {
  const { isReady, canPolicy } = usePermission();
  const canViewConfig = canPolicy('config.view');
  const canManageConfig = canPolicy('config.manage');
  const [configs, setConfigs] = useState<PlatformConfigRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [editorValue, setEditorValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commissionDefaultPlatform, setCommissionDefaultPlatform] = useState('40');
  const [commissionDefaultProvider, setCommissionDefaultProvider] = useState('60');
  const [commissionOverrides, setCommissionOverrides] = useState<CommissionOverride[]>([]);
  const [commissionProviderId, setCommissionProviderId] = useState('');
  const [commissionProviderPlatform, setCommissionProviderPlatform] = useState('');
  const [commissionProviderProvider, setCommissionProviderProvider] = useState('');

  const selectedConfig = useMemo(() => {
    return configs.find((config) => config.key === selectedKey) || null;
  }, [configs, selectedKey]);

  const commissionConfig = useMemo(() => {
    const record = configs.find((config) => config.key === 'commission');
    return record ? normalizeCommissionConfig(record.value) : DEFAULT_COMMISSION;
  }, [configs]);

  const loadConfigs = async () => {
    if (!isReady || !canViewConfig) {
      setConfigs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await listPlatformConfigs();
      setConfigs(response.data || []);
      if (!selectedKey && response.data?.length) {
        setSelectedKey(response.data[0].key);
        setEditorValue(JSON.stringify(response.data[0].value ?? {}, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load platform configs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    void loadConfigs();
  }, [isReady, canViewConfig]);

  useEffect(() => {
    if (!selectedConfig) return;
    setEditorValue(JSON.stringify(selectedConfig.value ?? {}, null, 2));
  }, [selectedConfig?.key]);

  useEffect(() => {
    const normalized = commissionConfig;
    setCommissionDefaultPlatform(String(normalized.default.platformPercent));
    setCommissionDefaultProvider(String(normalized.default.providerPercent));
    setCommissionOverrides(
      Object.entries(normalized.providers).map(([providerId, override]) => ({
        providerId,
        platformPercent: override.platformPercent,
        providerPercent: override.providerPercent,
      })),
    );
  }, [commissionConfig]);

  const handleSelect = (key: string) => {
    setSelectedKey(key);
  };

  const handleSave = async () => {
    if (!canManageConfig) {
      toast.error('You do not have permission to manage platform config.');
      return;
    }

    if (!selectedKey.trim()) {
      toast.error('Config key is required.');
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(editorValue || '{}');
    } catch (err) {
      toast.error('Invalid JSON. Please fix the config payload.');
      return;
    }

    setSaving(true);
    try {
      const expectedVersion = selectedConfig?.version ?? 0;
      const response = await upsertPlatformConfig(selectedKey.trim(), {
        value: parsedValue,
        expectedVersion,
      });

      const updated = response.data;
      setConfigs((prev) => {
        const without = prev.filter((item) => item.key !== updated.key);
        return [...without, updated];
      });
      setSelectedKey(updated.key);
      setEditorValue(JSON.stringify(updated.value ?? {}, null, 2));
      toast.success('Platform config saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCommission = async () => {
    if (!canManageConfig) {
      toast.error('You do not have permission to manage commission config.');
      return;
    }

    const defaultPlatform = Number(commissionDefaultPlatform);
    const defaultProvider = Number(commissionDefaultProvider);
    if (!Number.isFinite(defaultPlatform) || !Number.isFinite(defaultProvider)) {
      toast.error('Default commission split must be numeric.');
      return;
    }
    if (Math.round(defaultPlatform + defaultProvider) !== 100) {
      toast.error('Default commission split must total 100%.');
      return;
    }

    const providers: CommissionConfig['providers'] = {};
    for (const override of commissionOverrides) {
      if (!override.providerId.trim()) continue;
      const platform = Number(override.platformPercent);
      const provider = Number(override.providerPercent);
      if (!Number.isFinite(platform) || !Number.isFinite(provider)) {
        toast.error(`Override for ${override.providerId} must be numeric.`);
        return;
      }
      if (Math.round(platform + provider) !== 100) {
        toast.error(`Override for ${override.providerId} must total 100%.`);
        return;
      }
      providers[override.providerId.trim()] = {
        platformPercent: platform,
        providerPercent: provider,
      };
    }

    setSaving(true);
    try {
      const record = configs.find((config) => config.key === 'commission');
      const response = await upsertPlatformConfig('commission', {
        value: {
          default: { platformPercent: defaultPlatform, providerPercent: defaultProvider },
          providers,
        },
        expectedVersion: record?.version ?? 0,
      });

      const updated = response.data;
      setConfigs((prev) => {
        const without = prev.filter((item) => item.key !== updated.key);
        return [...without, updated];
      });
      if (selectedKey === 'commission') {
        setEditorValue(JSON.stringify(updated.value ?? {}, null, 2));
      }
      toast.success('Commission config saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save commission config.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOverride = () => {
    if (!canManageConfig) {
      toast.error('You do not have permission to manage commission overrides.');
      return;
    }

    const providerId = commissionProviderId.trim();
    if (!providerId) {
      toast.error('Provider ID is required.');
      return;
    }
    const platform = Number(commissionProviderPlatform);
    const provider = Number(commissionProviderProvider);
    if (!Number.isFinite(platform) || !Number.isFinite(provider)) {
      toast.error('Override split must be numeric.');
      return;
    }
    if (Math.round(platform + provider) !== 100) {
      toast.error('Override split must total 100%.');
      return;
    }

    setCommissionOverrides((prev) => {
      const filtered = prev.filter((item) => item.providerId !== providerId);
      return [...filtered, { providerId, platformPercent: platform, providerPercent: provider }].sort((a, b) => a.providerId.localeCompare(b.providerId));
    });
    setCommissionProviderId('');
    setCommissionProviderPlatform('');
    setCommissionProviderProvider('');
  };

  const handleRemoveOverride = (providerId: string) => {
    if (!canManageConfig) {
      toast.error('You do not have permission to manage commission overrides.');
      return;
    }
    setCommissionOverrides((prev) => prev.filter((item) => item.providerId !== providerId));
  };

  const knownKeys = useMemo(() => {
    const keys = new Set(DEFAULT_KEYS);
    configs.forEach((config) => keys.add(config.key));
    return Array.from(keys).sort();
  }, [configs]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Platform Config</h2>
        <p className="mt-1 text-sm text-ink-600">
          Manage global platform configuration (pricing, commission, flags, limits, compliance) without redeploys.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {!isReady ? null : !canViewConfig ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          You do not have permission to view platform configuration.
        </div>
      ) : null}

      <div className={`grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr] ${!canViewConfig ? 'pointer-events-none opacity-50' : ''}`}>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-700">Config Keys</h3>
            <button
              type="button"
              onClick={loadConfigs}
              className="text-xs font-semibold text-ink-600 hover:text-ink-800"
              disabled={loading || !canViewConfig}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {knownKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedKey === key
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-100 bg-ink-50 text-ink-700 hover:border-ink-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Custom key</label>
            <input
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="mt-2 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-ink-300"
              placeholder="e.g. pricing"
              disabled={!canManageConfig}
            />
          </div>

          {selectedConfig ? (
            <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs text-ink-600">
              <p>Version: {selectedConfig.version}</p>
              <p>Updated: {new Date(selectedConfig.updatedAt).toLocaleString('en-IN')}</p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              New config key (no existing record).
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-700">Commission Overrides</h3>
              <button
                type="button"
                onClick={handleSaveCommission}
                disabled={saving || !canManageConfig}
                className="rounded-lg bg-sage-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sage-800 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Commission'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Default Platform %</p>
                <input
                  value={commissionDefaultPlatform}
                  onChange={(event) => setCommissionDefaultPlatform(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-ink-300"
                  disabled={!canManageConfig}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Default Provider %</p>
                <input
                  value={commissionDefaultProvider}
                  onChange={(event) => setCommissionDefaultProvider(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-ink-300"
                  disabled={!canManageConfig}
                />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Provider Overrides</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_0.6fr_0.6fr_auto]">
                <input
                  value={commissionProviderId}
                  onChange={(event) => setCommissionProviderId(event.target.value)}
                  placeholder="Provider ID"
                  className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-ink-300"
                  disabled={!canManageConfig}
                />
                <input
                  value={commissionProviderPlatform}
                  onChange={(event) => setCommissionProviderPlatform(event.target.value)}
                  placeholder="Platform %"
                  className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-ink-300"
                  disabled={!canManageConfig}
                />
                <input
                  value={commissionProviderProvider}
                  onChange={(event) => setCommissionProviderProvider(event.target.value)}
                  placeholder="Provider %"
                  className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-ink-300"
                  disabled={!canManageConfig}
                />
                <button
                  type="button"
                  onClick={handleAddOverride}
                  disabled={!canManageConfig}
                  className="rounded-lg border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {commissionOverrides.length === 0 ? (
                  <p className="text-xs text-ink-500">No provider overrides set.</p>
                ) : (
                  commissionOverrides.map((override) => (
                    <div key={override.providerId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs">
                      <div>
                        <p className="font-semibold text-ink-700">{override.providerId}</p>
                        <p className="text-ink-500">Platform {override.platformPercent}% · Provider {override.providerPercent}%</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(override.providerId)}
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-700">Config JSON</h3>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !canManageConfig}
                className="rounded-lg bg-ink-900 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              className="mt-3 h-[420px] w-full rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 font-mono text-xs text-ink-800 outline-none focus:border-ink-300"
              spellCheck={false}
              disabled={!canManageConfig}
            />
            <p className="mt-2 text-xs text-ink-500">
              Use JSON only. Updates are versioned and cached automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
