import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loader } from '../../components/ui/Loader';
import toast from 'react-hot-toast';
import {
  approvePricingContract,
  createPricingDraft,
  getAdminPricingConfig,
  getAdminProviderMetrics,
  getPricingContracts,
  updateAdminPricingConfig,
  type AdminPricingPlanItem,
  type PricingContract,
} from '../../api/admin.api';

const billingCycleOptions = ['none', 'monthly', 'quarterly', 'yearly'] as const;

type PlanEdit = {
  planKey: string;
  planName: string;
  price: number;
  billingCycle: string;
  active: boolean;
  description?: string | null;
};

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

export default function PricingSubscriptions() {
  const [contracts, setContracts] = useState<PricingContract[]>([]);
  const [providerMetrics, setProviderMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedContract, setSelectedContract] = useState<PricingContract | null>(null);

  const [platformFee, setPlatformFee] = useState('99');
  const [surcharge, setSurcharge] = useState('20');
  const [planRows, setPlanRows] = useState<PlanEdit[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionEdit[]>([]);
  const [bundleRows, setBundleRows] = useState<BundleEdit[]>([]);

  const load = async () => {
    setLoading(true);
    setMetricsLoading(true);

    const providerMetricsPromise = getAdminProviderMetrics()
      .then((result) => {
        setProviderMetrics(result?.data || null);
      })
      .catch(() => {
        setProviderMetrics(null);
      })
      .finally(() => {
        setMetricsLoading(false);
      });

    try {
      const [pricingRes, contractsRes] = await Promise.allSettled([
        getAdminPricingConfig(),
        getPricingContracts(),
      ]);

      if (pricingRes.status === 'fulfilled') {
        const data = pricingRes.value.data;
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
          (data?.sessionPricing || []).map((row) => ({
            providerType: row.providerType,
            durationMinutes: row.durationMinutes,
            price: row.price,
          })),
        );
        setBundleRows(
          (data?.premiumBundles || []).map((row) => ({
            bundleName: row.bundleName,
            minutes: row.minutes,
            price: row.price,
          })),
        );
      }

      if (contractsRes.status === 'fulfilled') {
        setContracts(contractsRes.value.data || []);
      }
    } catch (error) {
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }

    await providerMetricsPromise;
  };

  useEffect(() => {
    void load();
  }, []);

  const updatePlanRow = (index: number, patch: Partial<PlanEdit>) => {
    const next = [...planRows];
    next[index] = { ...next[index], ...patch };
    setPlanRows(next);
  };

  const updateSessionRow = (index: number, patch: Partial<SessionEdit>) => {
    const next = [...sessionRows];
    next[index] = { ...next[index], ...patch };
    setSessionRows(next);
  };

  const updateBundleRow = (index: number, patch: Partial<BundleEdit>) => {
    const next = [...bundleRows];
    next[index] = { ...next[index], ...patch };
    setBundleRows(next);
  };

  const savePricing = async () => {
    const nextPlatformFee = Number(platformFee);
    const nextSurcharge = Number(surcharge);

    if (!Number.isFinite(nextPlatformFee) || nextPlatformFee < 0) {
      toast.error('Platform fee must be a valid non-negative number.');
      return;
    }

    if (!Number.isFinite(nextSurcharge) || nextSurcharge < 0 || nextSurcharge > 100) {
      toast.error('Preferred time surcharge must be between 0 and 100.');
      return;
    }

    if (planRows.some((row) => !row.planKey.trim() || !row.planName.trim() || !row.billingCycle.trim() || !Number.isFinite(row.price) || row.price < 0)) {
      toast.error('All subscription plan rows must be valid.');
      return;
    }

    if (sessionRows.some((row) => !row.providerType.trim() || !Number.isFinite(row.durationMinutes) || row.durationMinutes <= 0 || !Number.isFinite(row.price) || row.price < 0)) {
      toast.error('All session pricing rows must be valid.');
      return;
    }

    if (bundleRows.some((row) => !row.bundleName.trim() || !Number.isFinite(row.minutes) || row.minutes <= 0 || !Number.isFinite(row.price) || row.price < 0)) {
      toast.error('All premium bundle rows must be valid.');
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

      toast.success('Pricing updated successfully');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const createDraftFromLive = async (category: string) => {
    const liveContract = contracts.find((contract) => contract.category === category && contract.status === 'live');
    const snapshot =
      liveContract?.pricingData || {
        platform_fee: Number(platformFee),
        preferred_time_surcharge: Number(surcharge),
        plans: planRows,
        sessionPricing: sessionRows,
        premiumBundles: bundleRows,
      };

    try {
      await createPricingDraft({
        category,
        description: liveContract
          ? `Draft created from v${liveContract.version}`
          : 'Initial draft created from current admin pricing snapshot',
        pricingData: snapshot,
      });
      toast.success(`Draft created for ${category}`);
      await load();
    } catch (error) {
      toast.error('Failed to create draft');
    }
  };

  const approveContract = async (contract: PricingContract) => {
    try {
      await approvePricingContract(contract.id);
      toast.success(`${contract.category} v${contract.version} is now live`);
      await load();
    } catch (error) {
      toast.error('Failed to publish draft');
    }
  };

  const providerPlanRows = providerMetrics?.planDistribution || [];
  const nextMonthLabel = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, []);

  const activeProviders = Number(providerMetrics?.activeSubscriptions || 0);
  const premiumProviders = providerPlanRows.reduce((sum: number, row: { value: number; name: string }) => {
    const name = String(row.name || '').toLowerCase();
    return name.includes('premium') ? sum + Number(row.value || 0) : sum;
  }, 0);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/70 bg-white p-6 shadow-soft-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-calm-sage">Finance</p>
            <h1 className="mt-2 text-3xl font-bold text-ink-900">Pricing & Subscriptions</h1>
            <p className="mt-2 max-w-3xl text-sm text-ink-600">
              Edit live subscription prices, session pricing, and premium bundles from one screen. Changes are saved as the active configuration and can be promoted through version history.
            </p>
          </div>
          <div className="rounded-2xl border border-calm-sage/20 bg-calm-sage/5 px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">Changes effective next month</p>
            <p className="mt-1 text-xs text-ink-500">Publication window: {nextMonthLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Provider Subscriptions</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{metricsLoading ? '...' : activeProviders}</p>
          <p className="mt-1 text-xs text-ink-500">Active paid subscriptions</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Premium Providers</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{metricsLoading ? '...' : premiumProviders}</p>
          <p className="mt-1 text-xs text-ink-500">Providers on premium plans</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Platform Fee</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">₹{platformFee}</p>
          <p className="mt-1 text-xs text-ink-500">Monthly platform subscription fee</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Surcharge</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{surcharge}%</p>
          <p className="mt-1 text-xs text-ink-500">Preferred time surcharge</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Patient & Provider Plans</h2>
              <p className="text-sm text-ink-500">Control plan names, billing cycle, active state, and price.</p>
            </div>
            <Button variant="soft" size="sm" onClick={() => void createDraftFromLive('patient')}>
              Create Draft
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Key</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Plan</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Cycle</th>
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
                        value={row.planName}
                        onChange={(event) => updatePlanRow(index, { planName: event.target.value })}
                        className="w-full rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-calm-sage/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.billingCycle}
                        onChange={(event) => updatePlanRow(index, { billingCycle: event.target.value })}
                        className="w-full rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-calm-sage/30"
                      >
                        {billingCycleOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.price}
                        onChange={(event) => updatePlanRow(index, { price: Number(event.target.value) })}
                        className="w-28 rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-calm-sage/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(event) => updatePlanRow(index, { active: event.target.checked })}
                          className="h-4 w-4 rounded border-ink-200"
                        />
                        Enabled
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Provider Subscriptions</h2>
              <p className="text-sm text-ink-500">Current distribution by provider plan.</p>
            </div>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {providerPlanRows.length > 0 ? providerPlanRows.map((row: { name: string; value: number }) => (
              <div key={row.name} className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink-800">{row.name}</p>
                  <p className="text-sm font-semibold text-ink-900">{row.value}</p>
                </div>
              </div>
            )) : (
              <p className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-sm text-ink-500">
                No provider subscription breakdown is available yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Session Pricing</h2>
              <p className="text-sm text-ink-500">Edit session rate cards used in booking and provider earnings calculations.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void createDraftFromLive('sessions')}>
              Draft Session Update
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
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
                        onChange={(event) => updateSessionRow(index, { price: Number(event.target.value) })}
                        className="w-28 rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-calm-sage/30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Premium Plans / Bundles</h2>
              <p className="text-sm text-ink-500">Control add-on pricing and bundle minute counts.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void createDraftFromLive('addons')}>
              Draft Bundle Update
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
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
                        onChange={(event) => updateBundleRow(index, { price: Number(event.target.value) })}
                        className="w-28 rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-calm-sage/30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white p-5 shadow-soft-sm">
        <div>
          <p className="text-sm font-semibold text-ink-900">Effective from next billing cycle</p>
          <p className="text-xs text-ink-500">Pricing updates are saved centrally and then promoted through version history.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
          <Button onClick={() => void savePricing()} loading={saving}>
            Save Pricing
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Version History</h2>
            <p className="text-sm text-ink-500">Draft, live, and archived versions across all pricing categories.</p>
          </div>
          <Badge variant="secondary">{contracts.length} versions</Badge>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Version</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Category</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Created</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Effective</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {contracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="px-3 py-2 text-sm font-semibold text-ink-900">v{contract.version}</td>
                  <td className="px-3 py-2 text-sm capitalize text-ink-700">{contract.category}</td>
                  <td className="px-3 py-2">
                    <Badge variant={contract.status === 'live' ? 'success' : contract.status === 'draft' ? 'soft' : 'secondary'}>
                      {contract.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-sm text-ink-600">{new Date(contract.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-3 py-2 text-sm text-ink-600">
                    {contract.effectiveFrom ? new Date(contract.effectiveFrom).toLocaleDateString('en-IN') : '---'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedContract(contract)}
                        className="text-sm font-medium text-calm-sage hover:underline"
                      >
                        Details
                      </button>
                      {contract.status === 'draft' ? (
                        <button
                          type="button"
                          onClick={() => void approveContract(contract)}
                          className="text-sm font-medium text-emerald-600 hover:underline"
                        >
                          Push Live
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedContract ? (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Selected Version</h2>
              <p className="text-sm text-ink-500">{selectedContract.category} v{selectedContract.version}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedContract(null)}>
              Close
            </Button>
          </div>
          <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-ink-950 p-4 text-xs leading-5 text-ink-100">
{JSON.stringify(selectedContract.pricingData, null, 2)}
          </pre>
        </Card>
      ) : null}

      <p className="text-center text-xs text-ink-400">
        Changes take effect next month • All prices are dynamic and controlled from admin
      </p>
    </div>
  );
}
