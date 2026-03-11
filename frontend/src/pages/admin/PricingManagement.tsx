import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getAdminPricingConfig,
  updateAdminPricingConfig,
  type AdminPricingBundleItem,
  type AdminPricingConfig,
  type AdminPricingSessionItem,
} from '../../api/admin.api';
import { isPlatformAdminUser, useAuth } from '../../context/AuthContext';

type SessionEdit = {
  providerType: string;
  durationMinutes: number;
  price: number;
};

type BundleEdit = {
  bundleName: string;
  minutes: number;
  price: number;
};

const labelForProviderType = (value: string): string => {
  const key = String(value || '').toLowerCase();
  if (key === 'clinical-psychologist') return 'Clinical Psychologist';
  if (key === 'psychiatrist') return 'Psychiatrist (MD)';
  if (key === 'specialized-therapist') return 'Specialized Therapist';
  return value;
};

export default function AdminPricingManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const canAccessPricing = isPlatformAdminUser(user);
  const [config, setConfig] = useState<AdminPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [platformFee, setPlatformFee] = useState('199');
  const [surcharge, setSurcharge] = useState('20');
  const [sessionRows, setSessionRows] = useState<SessionEdit[]>([]);
  const [bundleRows, setBundleRows] = useState<BundleEdit[]>([]);
  const [showChangedOnly, setShowChangedOnly] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminPricingConfig();
      const data = response?.data;
      setConfig(data);
      setPlatformFee(String(data?.platformFee?.monthlyFee ?? 199));
      setSurcharge(String(data?.surchargePercent ?? 20));
      setSessionRows(
        (data?.sessionPricing || []).map((row: AdminPricingSessionItem) => ({
          providerType: row.providerType,
          durationMinutes: row.durationMinutes,
          price: row.price,
        })),
      );
      setBundleRows(
        (data?.premiumBundles || []).map((row: AdminPricingBundleItem) => ({
          bundleName: row.bundleName,
          minutes: row.minutes,
          price: row.price,
        })),
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load pricing configuration.');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccessPricing) {
      setLoading(false);
      return;
    }
    void load();
  }, [canAccessPricing]);

  if (authLoading) {
    return <div className="rounded-lg border border-ink-100 bg-white px-4 py-3 text-sm text-ink-600">Checking permissions...</div>;
  }

  if (!canAccessPricing) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const groupedPreview = useMemo(() => {
    const map = new Map<string, SessionEdit[]>();
    for (const row of sessionRows) {
      const key = row.providerType;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(row);
    }
    return Array.from(map.entries());
  }, [sessionRows]);

  const impact = config?.impactSummary;
  const currentPlatformFee = Number(config?.platformFee?.monthlyFee ?? 0);
  const nextPlatformFee = Number(platformFee || 0);
  const platformFeeDelta = Number.isFinite(nextPlatformFee) ? nextPlatformFee - currentPlatformFee : 0;
  const isFeeChangePending = Number.isFinite(nextPlatformFee) && nextPlatformFee !== currentPlatformFee;
  const lockedRatio = useMemo(() => {
    if (!impact || impact.activeSubscriptions <= 0) return 0;
    return Math.round((impact.lockedToPreviousPrice / impact.activeSubscriptions) * 100);
  }, [impact]);
  const alignedRatio = useMemo(() => {
    if (!impact || impact.activeSubscriptions <= 0) return 0;
    return Math.round((impact.alignedWithCurrentPrice / impact.activeSubscriptions) * 100);
  }, [impact]);

  const projectedLockedImmediate = useMemo(() => {
    if (!impact) return 0;
    if (!isFeeChangePending) return impact.lockedToPreviousPrice;
    return impact.activeSubscriptions;
  }, [impact, isFeeChangePending]);

  const projectedAlignedImmediate = useMemo(() => {
    if (!impact) return 0;
    if (!isFeeChangePending) return impact.alignedWithCurrentPrice;
    return 0;
  }, [impact, isFeeChangePending]);

  const projected30dRevenueDelta = useMemo(() => {
    if (!impact || !Number.isFinite(platformFeeDelta)) return 0;
    return platformFeeDelta * impact.renewalsNext30Days;
  }, [impact, platformFeeDelta]);

  const sessionDeltaRows = useMemo(() => {
    const baseline = new Map<string, number>();
    for (const row of config?.sessionPricing || []) {
      baseline.set(`${row.providerType}::${row.durationMinutes}`, Number(row.price) || 0);
    }

    return sessionRows
      .map((row) => {
        const key = `${row.providerType}::${row.durationMinutes}`;
        const oldPrice = baseline.get(key) ?? 0;
        const newPrice = Number(row.price) || 0;
        return {
          providerType: row.providerType,
          durationMinutes: row.durationMinutes,
          oldPrice,
          newPrice,
          delta: newPrice - oldPrice,
        };
      })
      .sort((a, b) => {
        if (a.providerType === b.providerType) return a.durationMinutes - b.durationMinutes;
        return a.providerType.localeCompare(b.providerType);
      });
  }, [config?.sessionPricing, sessionRows]);

  const changedSessionRows = useMemo(() => {
    return sessionDeltaRows.filter((row) => row.delta !== 0);
  }, [sessionDeltaRows]);

  const totalSessionDelta = useMemo(() => {
    return changedSessionRows.reduce((sum, row) => sum + row.delta, 0);
  }, [changedSessionRows]);

  const visibleSessionDeltaRows = useMemo(() => {
    return showChangedOnly ? changedSessionRows : sessionDeltaRows;
  }, [showChangedOnly, changedSessionRows, sessionDeltaRows]);

  const updateSessionPrice = (index: number, price: string) => {
    const next = [...sessionRows];
    const parsed = Number(price);
    next[index] = { ...next[index], price: Number.isFinite(parsed) ? parsed : 0 };
    setSessionRows(next);
  };

  const updateBundlePrice = (index: number, price: string) => {
    const next = [...bundleRows];
    const parsed = Number(price);
    next[index] = { ...next[index], price: Number.isFinite(parsed) ? parsed : 0 };
    setBundleRows(next);
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);

    const nextPlatformFee = Number(platformFee);
    const nextSurcharge = Number(surcharge);

    if (!Number.isFinite(nextPlatformFee) || nextPlatformFee < 0) {
      setError('Platform fee must be a valid non-negative number.');
      return;
    }
    if (!Number.isFinite(nextSurcharge) || nextSurcharge < 0 || nextSurcharge > 100) {
      setError('Preferred time surcharge must be between 0 and 100.');
      return;
    }

    const invalidSession = sessionRows.some((row) => !Number.isFinite(row.price) || row.price < 0);
    const invalidBundle = bundleRows.some((row) => !Number.isFinite(row.price) || row.price < 0);
    if (invalidSession || invalidBundle) {
      setError('All session and bundle prices must be valid non-negative numbers.');
      return;
    }

    setSaving(true);
    try {
      await updateAdminPricingConfig({
        platform_fee: nextPlatformFee,
        preferred_time_surcharge: nextSurcharge,
        session_pricing: sessionRows.map((row) => ({
          providerType: row.providerType,
          durationMinutes: row.durationMinutes,
          price: row.price,
          providerShare: Math.round(row.price * 0.6),
          platformShare: row.price - Math.round(row.price * 0.6),
          active: true,
        })),
        premium_bundles: bundleRows.map((row) => ({
          bundleName: row.bundleName,
          minutes: row.minutes,
          price: row.price,
          active: true,
        })),
      });

      await load();
      setSuccess('Pricing configuration updated successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save pricing updates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Pricing Management</h2>
        <p className="mt-1 text-sm text-ink-600">Update platform fee, session pricing, bundles, and preferred-time surcharge without redeploy.</p>
      </div>

      {loading ? <div className="rounded-lg border border-ink-100 bg-white px-4 py-3 text-sm text-ink-600">Loading pricing configuration...</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      {impact ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <ImpactCard label="Total Subs" value={String(impact.totalSubscriptions)} />
          <ImpactCard label="Active Subs" value={String(impact.activeSubscriptions)} />
          <ImpactCard
            label="Locked Prev Price"
            value={String(impact.lockedToPreviousPrice)}
            note={`${lockedRatio}% of active`}
            tone={lockedRatio >= 60 ? 'warning' : lockedRatio >= 30 ? 'neutral' : 'good'}
          />
          <ImpactCard
            label="Aligned Current"
            value={String(impact.alignedWithCurrentPrice)}
            note={`${alignedRatio}% of active`}
            tone={alignedRatio >= 70 ? 'good' : alignedRatio >= 40 ? 'neutral' : 'warning'}
          />
          <ImpactCard
            label="Renewals 7d"
            value={String(impact.renewalsNext7Days)}
            note="Immediate price-change window"
            tone={impact.renewalsNext7Days >= 20 ? 'warning' : 'neutral'}
          />
          <ImpactCard
            label="Renewals 30d"
            value={String(impact.renewalsNext30Days)}
            note="Near-term billing impact"
            tone={impact.renewalsNext30Days >= 50 ? 'warning' : 'neutral'}
          />
        </div>
      ) : null}

      {impact ? (
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-ink-800">Pre-Save Impact Simulation</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isFeeChangePending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isFeeChangePending ? 'Fee change pending' : 'No fee change pending'}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-600">Heuristic preview based on current active subscriptions and next 30-day renewals.</p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-ink-100 bg-ink-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Platform Fee Delta</p>
              <p className="mt-1 text-sm font-semibold text-ink-800">
                ₹{currentPlatformFee}{' -> '}₹{Number.isFinite(nextPlatformFee) ? nextPlatformFee : currentPlatformFee}
              </p>
              <p className={`mt-1 text-xs ${platformFeeDelta > 0 ? 'text-amber-700' : platformFeeDelta < 0 ? 'text-emerald-700' : 'text-ink-600'}`}>
                {platformFeeDelta > 0 ? '+' : ''}₹{platformFeeDelta}
              </p>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Projected Immediate Mix</p>
              <p className="mt-1 text-sm text-ink-700">Locked: <span className="font-semibold text-ink-800">{projectedLockedImmediate}</span></p>
              <p className="text-sm text-ink-700">Aligned: <span className="font-semibold text-ink-800">{projectedAlignedImmediate}</span></p>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Estimated 30d Renewal Delta</p>
              <p className={`mt-1 text-sm font-semibold ${projected30dRevenueDelta >= 0 ? 'text-ink-800' : 'text-emerald-700'}`}>
                {projected30dRevenueDelta >= 0 ? '+' : ''}₹{projected30dRevenueDelta}
              </p>
              <p className="mt-1 text-xs text-ink-600">Assumes {impact.renewalsNext30Days} renewals use proposed fee.</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Session Pricing Delta Preview</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    checked={showChangedOnly}
                    onChange={(event) => setShowChangedOnly(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border border-ink-200"
                  />
                  Show changed only
                </label>
                <p className="text-xs text-ink-600">
                  Changed rows: <span className="font-semibold text-ink-800">{changedSessionRows.length}</span>
                  {' | '}Total delta: <span className={`font-semibold ${totalSessionDelta > 0 ? 'text-amber-700' : totalSessionDelta < 0 ? 'text-emerald-700' : 'text-ink-800'}`}>{totalSessionDelta > 0 ? '+' : ''}₹{totalSessionDelta}</span>
                </p>
              </div>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-100">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Provider</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Duration</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Old</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">New</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {visibleSessionDeltaRows.map((row) => (
                    <tr key={`${row.providerType}-${row.durationMinutes}`}>
                      <td className="px-2 py-1.5 text-xs text-ink-700">{labelForProviderType(row.providerType)}</td>
                      <td className="px-2 py-1.5 text-xs text-ink-700">{row.durationMinutes} min</td>
                      <td className="px-2 py-1.5 text-xs text-ink-700">₹{row.oldPrice}</td>
                      <td className="px-2 py-1.5 text-xs text-ink-700">₹{row.newPrice}</td>
                      <td className={`px-2 py-1.5 text-xs font-semibold ${row.delta > 0 ? 'text-amber-700' : row.delta < 0 ? 'text-emerald-700' : 'text-ink-500'}`}>
                        {row.delta > 0 ? '+' : ''}₹{row.delta}
                      </td>
                    </tr>
                  ))}
                  {visibleSessionDeltaRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-3 text-center text-xs text-ink-500">
                        No changed session rows.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Platform Fee</h3>
          <label className="mt-3 block text-sm text-ink-700">
            Monthly Fee (INR)
            <input
              type="number"
              min={0}
              value={platformFee}
              onChange={(event) => setPlatformFee(event.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none ring-sage-500 focus:ring-2"
            />
          </label>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-display text-base font-bold text-ink-800">Preferred Time Surcharge</h3>
          <label className="mt-3 block text-sm text-ink-700">
            Surcharge (%)
            <input
              type="number"
              min={0}
              max={100}
              value={surcharge}
              onChange={(event) => setSurcharge(event.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none ring-sage-500 focus:ring-2"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <h3 className="font-display text-base font-bold text-ink-800">Session Pricing</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Provider</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Duration</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {sessionRows.map((row, index) => (
                <tr key={`${row.providerType}-${row.durationMinutes}`}>
                  <td className="px-3 py-2 text-sm text-ink-700">{labelForProviderType(row.providerType)}</td>
                  <td className="px-3 py-2 text-sm text-ink-700">{row.durationMinutes} min</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.price}
                      onChange={(event) => updateSessionPrice(index, event.target.value)}
                      className="w-32 rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none ring-sage-500 focus:ring-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <h3 className="font-display text-base font-bold text-ink-800">Premium Bundles</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Bundle</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Minutes</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {bundleRows.map((row, index) => (
                <tr key={`${row.bundleName}-${row.minutes}`}>
                  <td className="px-3 py-2 text-sm text-ink-700">{row.bundleName}</td>
                  <td className="px-3 py-2 text-sm text-ink-700">{row.minutes}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.price}
                      onChange={(event) => updateBundlePrice(index, event.target.value)}
                      className="w-32 rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none ring-sage-500 focus:ring-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <h3 className="font-display text-base font-bold text-ink-800">Preview</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {groupedPreview.map(([providerType, rows]) => {
            const row45 = rows.find((row) => row.durationMinutes === 45);
            const row60 = rows.find((row) => row.durationMinutes === 60);
            return (
              <div key={providerType} className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2">
                <p className="text-sm font-semibold text-ink-800">{labelForProviderType(providerType)}</p>
                <p className="text-xs text-ink-600">45 min: ₹{row45?.price ?? '-'}</p>
                <p className="text-xs text-ink-600">60 min: ₹{row60?.price ?? '-'}</p>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || loading || !config}
        className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Pricing Configuration'}
      </button>
    </div>
  );
}

function ImpactCard({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'good' | 'neutral' | 'warning';
}) {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : 'border-ink-100 bg-white';

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-ink-800">{value}</p>
      {note ? <p className="mt-1 text-[11px] text-ink-600">{note}</p> : null}
    </div>
  );
}
