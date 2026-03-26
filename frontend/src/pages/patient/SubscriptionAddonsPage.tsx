import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_ADDONS,
  getCheckoutSummaryMinor,
  getPlanById,
  loadCart,
  saveCart,
  type PatientAddonSelection,
} from '../../lib/patientSubscriptionFlow';

export default function SubscriptionAddonsPage() {
  const navigate = useNavigate();
  const [addons, setAddons] = useState<PatientAddonSelection>(DEFAULT_ADDONS);
  const [planId, setPlanId] = useState<'free' | 'monthly' | 'quarterly' | 'premium_monthly'>('monthly');

  useEffect(() => {
    const cart = loadCart();
    if (!cart) {
      navigate('/plans', { replace: true });
      return;
    }
    setPlanId(cart.planId);
    setAddons(cart.addons || DEFAULT_ADDONS);

    if (cart.planId === 'free') {
      navigate('/checkout', { replace: true });
    }
  }, [navigate]);

  const summary = useMemo(() => {
    return getCheckoutSummaryMinor({
      planId,
      addons,
      updatedAt: new Date().toISOString(),
    });
  }, [planId, addons]);

  const persistAndProceed = () => {
    saveCart({
      planId,
      addons,
      updatedAt: new Date().toISOString(),
    });
    navigate('/checkout');
  };

  const plan = getPlanById(planId);

  return (
    <div className="min-h-screen bg-[#fffdf7] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Go Back</button>
          <button type="button" onClick={() => navigate('/patient/dashboard', { replace: true })} className="rounded-lg border border-[#4a6741] bg-[#4a6741] px-3 py-1.5 text-xs font-semibold text-white">Home</button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4a6741]">Selected Plan</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Enhance your {plan.name} plan</h1>
          <p className="text-sm text-slate-600">Add-ons are optional. GST 18% will be added extra at checkout.</p>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">AnytimeBuddy</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { key: 'none', label: 'None' },
              { key: '1h', label: '1 Hour INR 399' },
              { key: '3h', label: '3 Hours INR 999' },
              { key: '5h', label: '5 Hours INR 1699' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAddons((prev) => ({ ...prev, anytimeBuddyPack: opt.key as PatientAddonSelection['anytimeBuddyPack'] }))}
                className={`rounded-lg border px-3 py-2 text-sm ${addons.anytimeBuddyPack === opt.key ? 'border-[#4a6741] bg-[#e8f0e5]' : 'border-slate-200 bg-white'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>VentBuddy Unlimited (INR 99)</span>
              <input type="checkbox" checked={addons.ventBuddyUnlimited} onChange={(e) => setAddons((prev) => ({ ...prev, ventBuddyUnlimited: e.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>Digital Pet Hub Unlock {planId === 'premium_monthly' ? '(Included)' : '(INR 99)'}</span>
              <input type="checkbox" checked={addons.digitalPetHubUnlock} onChange={(e) => setAddons((prev) => ({ ...prev, digitalPetHubUnlock: e.target.checked }))} disabled={planId === 'premium_monthly'} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Sound tracks count (INR 30 each)
              <input type="number" min={0} value={addons.soundTrackCount} onChange={(e) => setAddons((prev) => ({ ...prev, soundTrackCount: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              Sound bundles count (INR 250 each)
              <input type="number" min={0} value={addons.soundBundleCount} onChange={(e) => setAddons((prev) => ({ ...prev, soundBundleCount: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Current total: <strong>INR {(summary.totalMinor / 100).toFixed(2)}</strong> <span className="text-slate-500">(includes 18% GST extra)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={persistAndProceed} className="rounded-xl border border-[#4a6741] px-4 py-2 text-sm font-semibold text-[#4a6741]">Skip Add-ons -&gt; Proceed</button>
            <button type="button" onClick={persistAndProceed} className="rounded-xl bg-[#4a6741] px-4 py-2 text-sm font-semibold text-white">Add Selected & Proceed</button>
          </div>
        </section>
      </div>
    </div>
  );
}
