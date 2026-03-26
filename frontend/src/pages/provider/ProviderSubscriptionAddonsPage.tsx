import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProviderCheckoutSummaryMinor,
  loadProviderCart,
  saveProviderCart,
  type ProviderAddonSelection,
} from '../../lib/providerSubscriptionFlow';

export default function ProviderSubscriptionAddonsPage() {
  const navigate = useNavigate();
  const [leadPlanId, setLeadPlanId] = useState<'free' | 'basic' | 'standard' | 'premium'>('basic');
  const [platformCycle, setPlatformCycle] = useState<'monthly' | 'quarterly'>('monthly');
  const [addons, setAddons] = useState<ProviderAddonSelection>({ hot: 0, warm: 0, cold: 0 });

  useEffect(() => {
    const cart = loadProviderCart();
    if (!cart) {
      navigate('/provider/plans', { replace: true });
      return;
    }
    setLeadPlanId(cart.leadPlanId);
    setPlatformCycle(cart.platformCycle);
    setAddons(cart.addons);

    if (cart.leadPlanId === 'free') {
      navigate('/provider/checkout', { replace: true });
    }
  }, [navigate]);

  const summary = useMemo(() => {
    return getProviderCheckoutSummaryMinor({
      leadPlanId,
      platformCycle,
      addons,
      updatedAt: new Date().toISOString(),
    });
  }, [leadPlanId, platformCycle, addons]);

  const proceed = () => {
    saveProviderCart({
      leadPlanId,
      platformCycle,
      addons,
      updatedAt: new Date().toISOString(),
    });
    navigate('/provider/checkout');
  };

  return (
    <div className="min-h-screen bg-[#fffdf8] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Go Back</button>
          <button type="button" onClick={() => navigate('/provider/dashboard', { replace: true })} className="rounded-lg border border-[#1f6f5f] bg-[#1f6f5f] px-3 py-1.5 text-xs font-semibold text-white">Home</button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">Marketplace Add-ons</h1>
          <p className="mt-1 text-sm text-slate-600">Buy additional leads beyond weekly allocation. GST 18% will be added extra at checkout.</p>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              Hot leads (INR 299 each)
              <input type="number" min={0} value={addons.hot} onChange={(e) => setAddons((prev) => ({ ...prev, hot: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              Warm leads (INR 199 each)
              <input type="number" min={0} value={addons.warm} onChange={(e) => setAddons((prev) => ({ ...prev, warm: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              Cold leads (INR 99 each)
              <input type="number" min={0} value={addons.cold} onChange={(e) => setAddons((prev) => ({ ...prev, cold: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Current total: <strong>INR {(summary.totalMinor / 100).toFixed(2)}</strong> <span className="text-slate-500">(includes 18% GST extra)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={proceed} className="rounded-xl border border-[#1f6f5f] px-4 py-2 text-sm font-semibold text-[#1f6f5f]">Skip Marketplace -&gt; Proceed</button>
            <button type="button" onClick={proceed} className="rounded-xl bg-[#1f6f5f] px-4 py-2 text-sm font-semibold text-white">Add Leads & Proceed</button>
          </div>
        </section>
      </div>
    </div>
  );
}
