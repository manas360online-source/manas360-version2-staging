import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getAdminPricingConfig,
  updateAdminPricingConfig,
  toggleGlobalFreeSignups,
  waiveUserSubscription,
  type AdminPricingPlanItem,
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

type PlanEdit = {
  planKey: string;
  planName: string;
  price: number;
  billingCycle: string;
  active: boolean;
  description?: string | null;
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

  const [platformFee, setPlatformFee] = useState('99');
  const [surcharge, setSurcharge] = useState('20');
  const [planRows, setPlanRows] = useState<PlanEdit[]>([]);
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
      setPlatformFee(String(data?.platformFee?.monthlyFee ?? 99));
      setSurcharge(String(data?.surchargePercent ?? 20));
      setPlanRows(
        (data?.platformPlans || []).map((row: AdminPricingPlanItem) => ({
          planKey: row.planKey,
          planName: row.planName,
          price: row.price,
          billingCycle: row.billingCycle,
          active: row.active,
          description: row.description ?? null,
        })),
      );
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

  const updatePlanRow = (index: number, patch: Partial<PlanEdit>) => {
    const next = [...planRows];
    next[index] = { ...next[index], ...patch };
    setPlanRows(next);
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
    const invalidPlan = planRows.some((row) => !row.planKey.trim() || !row.planName.trim() || !row.billingCycle.trim() || !Number.isFinite(row.price) || row.price < 0);
    if (invalidSession || invalidBundle || invalidPlan) {
      setError('All plan, session, and bundle prices must be valid non-negative numbers.');
      return;
    }

    setSaving(true);
    try {
      await updateAdminPricingConfig({
        platform_fee: nextPlatformFee,
        preferred_time_surcharge: nextSurcharge,
        plans: planRows.map((row) => ({
          planKey: row.planKey,
          planName: row.planName,
          price: row.price,
          billingCycle: row.billingCycle,
          description: row.description ?? null,
          active: row.active,
        })),
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

  const [freeDays, setFreeDays] = useState('30');
  const [waiveForm, setWaiveForm] = useState({ userId: '', planKey: 'basic', durationDays: '30', reason: '' });

  const onToggleFree = async () => {
    setSaving(true);
    try {
      await toggleGlobalFreeSignups(Number(freeDays));
      setSuccess(`Global offer activated: New sign-ups are now free for ${freeDays} days.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update global offer.');
    } finally {
      setSaving(false);
    }
  };

  const onWaive = async () => {
    if (!waiveForm.userId) return;
    setSaving(true);
    try {
      const resp = await waiveUserSubscription({
        userId: waiveForm.userId,
        planKey: waiveForm.planKey,
        durationDays: Number(waiveForm.durationDays),
        reason: waiveForm.reason
      });
      setSuccess(resp.message || 'Waiver granted successfully.');
      setWaiveForm({ userId: '', planKey: 'basic', durationDays: '30', reason: '' });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to grant waiver.');
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-ink-800">Subscription Plans</h3>
          <p className="text-xs text-ink-500">Edit plan name, billing cycle, price, and active state.</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Key</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Plan Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Billing Cycle</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Price</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {planRows.map((row, index) => (
                <tr key={row.planKey}>
                  <td className="px-3 py-2 text-sm text-ink-500">{row.planKey}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.planName}
                      onChange={(event) => updatePlanRow(index, { planName: event.target.value })}
                      className="w-full rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none ring-sage-500 focus:ring-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.billingCycle}
                      onChange={(event) => updatePlanRow(index, { billingCycle: event.target.value })}
                      className="w-full rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none ring-sage-500 focus:ring-2"
                    >
                      <option value="none">None</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.price}
                      onChange={(event) => updatePlanRow(index, { price: Number(event.target.value) })}
                      className="w-32 rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none ring-sage-500 focus:ring-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => updatePlanRow(index, { active: event.target.checked })}
                        className="h-4 w-4 rounded border border-ink-200"
                      />
                      Enabled
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* PHASE 2: GLOBAL OFFERS & WAIVERS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-12 pt-8 border-t border-ink-200">
        <div className="rounded-2xl border-2 border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-100/20">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <span className="text-white font-black text-xs uppercase tracking-tighter">OFFER</span>
            </div>
            <h3 className="font-black text-xl text-ink-900 tracking-tight">Make New Sign-ups Free</h3>
          </div>
          <p className="text-sm text-ink-600 mb-6 font-medium">Activate a limited-time offer where all new users get the platform free for the specified number of days.</p>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
               <input
                type="number"
                value={freeDays}
                onChange={(e) => setFreeDays(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-ink-50 border-2 border-ink-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-ink-900"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-ink-400 uppercase tracking-widest">Days</span>
            </div>
            <button
              onClick={onToggleFree}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 text-white font-black text-sm rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              ACTIVATE OFFER
            </button>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-100/20">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <span className="text-white font-black text-xs uppercase tracking-tighter">WAIVER</span>
            </div>
            <h3 className="font-black text-xl text-ink-900 tracking-tight">Manual Access Waiver</h3>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="User ID (UUID)"
              value={waiveForm.userId}
              onChange={(e) => setWaiveForm({ ...waiveForm, userId: e.target.value })}
              className="w-full px-4 py-3 bg-ink-50 border-2 border-ink-100 rounded-xl focus:border-emerald-500 outline-none font-bold text-ink-900"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={waiveForm.planKey}
                onChange={(e) => setWaiveForm({ ...waiveForm, planKey: e.target.value })}
                className="px-4 py-3 bg-ink-50 border-2 border-ink-100 rounded-xl focus:border-emerald-500 outline-none font-bold text-ink-900 appearance-none"
              >
                <option value="basic">Basic Plan</option>
                <option value="premium">Premium Plan</option>
                <option value="pro">Pro Plan</option>
              </select>
              <div className="relative">
                <input
                  type="number"
                  value={waiveForm.durationDays}
                  onChange={(e) => setWaiveForm({ ...waiveForm, durationDays: e.target.value })}
                  className="w-full pl-4 pr-12 py-3 bg-ink-50 border-2 border-ink-100 rounded-xl focus:border-emerald-500 outline-none font-bold text-ink-900"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-ink-400 uppercase tracking-widest">Days</span>
              </div>
            </div>
            <input
              type="text"
              placeholder="Reason (e.g. Beta Tester, Partner)"
              value={waiveForm.reason}
              onChange={(e) => setWaiveForm({ ...waiveForm, reason: e.target.value })}
              className="w-full px-4 py-3 bg-ink-50 border-2 border-ink-100 rounded-xl focus:border-emerald-500 outline-none font-bold text-ink-900"
            />
            <button
              onClick={onWaive}
              disabled={saving || !waiveForm.userId}
              className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              GRANT FREE ACCESS
            </button>
          </div>
        </div>
      </div>
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
