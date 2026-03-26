import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_PROVIDER_ADDONS,
  PROVIDER_LEAD_PLANS,
  formatInr,
  getLeadPlanAmountMinor,
  getPlatformAccessMinor,
  saveProviderCart,
  type ProviderBillingCycle,
  type ProviderLeadPlanId,
} from '../../lib/providerSubscriptionFlow';

export default function ProviderSubscriptionPage() {
  const navigate = useNavigate();
  const [platformCycle, setPlatformCycle] = useState<ProviderBillingCycle>('monthly');

  const startFlow = (leadPlanId: ProviderLeadPlanId) => {
    saveProviderCart({
      leadPlanId,
      platformCycle,
      addons: { ...DEFAULT_PROVIDER_ADDONS },
      updatedAt: new Date().toISOString(),
    });
    if (leadPlanId === 'free') {
      navigate('/provider/checkout');
      return;
    }
    navigate('/provider/plans/addons');
  };

  return (
    <div className="min-h-screen bg-[#fffdf8] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={() => navigate('/provider/dashboard', { replace: true })}
              className="inline-flex items-center rounded-lg border border-[#1f6f5f] bg-[#1f6f5f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#145347]"
            >
              Home
            </button>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Provider Subscription</h1>
          <p className="mt-2 text-sm text-slate-600">
            Platform access is required for providers. Choose billing cycle, then choose your lead plan and optional marketplace leads.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Section A - Required</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Platform Access</h2>
          <p className="mt-1 text-sm text-slate-600">Mandatory for all providers before lead delivery.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPlatformCycle('monthly')}
              className={`rounded-xl border px-4 py-3 text-left ${platformCycle === 'monthly' ? 'border-[#1f6f5f] bg-[#eaf6f3]' : 'border-slate-200 bg-white'}`}
            >
              <p className="text-sm font-bold text-slate-900">Monthly</p>
              <p className="text-xs text-slate-600">{formatInr(getPlatformAccessMinor('monthly'))}</p>
            </button>
            <button
              type="button"
              onClick={() => setPlatformCycle('quarterly')}
              className={`rounded-xl border px-4 py-3 text-left ${platformCycle === 'quarterly' ? 'border-[#1f6f5f] bg-[#eaf6f3]' : 'border-slate-200 bg-white'}`}
            >
              <p className="text-sm font-bold text-slate-900">Quarterly</p>
              <p className="text-xs text-slate-600">{formatInr(getPlatformAccessMinor('quarterly'))}</p>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Section B - Lead Plan</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PROVIDER_LEAD_PLANS.map((plan) => {
              const leadAmountMinor = getLeadPlanAmountMinor(plan.id, platformCycle);
              return (
                <article key={plan.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {plan.badge && (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-black text-slate-900">{formatInr(leadAmountMinor)}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-700">{plan.subtitle}</p>
                  {plan.trialDays > 0 && (
                    <p className="mt-1 text-xs font-bold text-emerald-700">{plan.trialDays}-Day Trial</p>
                  )}
                  <ul className="mt-3 flex-1 space-y-2 text-xs text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => startFlow(plan.id)}
                    className="mt-4 rounded-xl bg-[#1f6f5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#145347]"
                  >
                    {plan.id === 'free' ? 'Create Profile' : 'Choose & Continue'}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            Platform Access ({platformCycle}) + selected lead plan will be charged together at checkout. Extra marketplace leads are HOT / WARM / COLD and charged per quantity.
          </p>
        </section>
      </div>
    </div>
  );
}
