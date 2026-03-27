import { useState } from 'react';
import { patientApi } from '../../api/patient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  PATIENT_PLANS,
  DEFAULT_ADDONS,
  saveCart,
  type PatientPlanId,
} from '../../lib/patientSubscriptionFlow';

export default function PricingPage() {
  const navigate = useNavigate();
  const [subscribing, setSubscribing] = useState(false);

  const onStartSubscription = async (planId: PatientPlanId) => {
    const selectedPlan = PATIENT_PLANS.find((plan) => plan.id === planId);
    if (!selectedPlan) {
      toast.error('Selected plan is not available.');
      return;
    }

    if (selectedPlan.id !== 'free') {
      saveCart({
        planId: selectedPlan.id,
        addons: DEFAULT_ADDONS,
        updatedAt: new Date().toISOString(),
      });
      navigate('/plans/addons');
      return;
    }

    setSubscribing(true);
    try {
      const response = await patientApi.upgradeSubscription({ planKey: selectedPlan.gatewayPlanKey });
      const payload = (response as any)?.data ?? response;

      toast.success('Subscription activated successfully.');
      if (payload?.redirectUrl) {
        window.location.href = String(payload.redirectUrl);
        return;
      }
      navigate('/patient/dashboard', { replace: true });
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      if (status === 409) {
        toast.error(error?.response?.data?.message || 'A subscription update is already in progress. Please retry shortly.');
      } else {
        toast.error(error?.response?.data?.message || 'Could not initiate subscription.');
      }
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <section className="bg-gradient-to-br from-[#2d4128] via-[#4a6741] to-[#5a7d4f] px-6 py-12 text-center text-white">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">MANAS360 Pricing Plans</h1>
        <p className="mt-2 text-sm text-white/80">15-day free trial for everyone · Payment via PhonePe</p>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
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
            onClick={() => navigate('/patient/dashboard', { replace: true })}
            className="inline-flex items-center rounded-lg border border-[#4a6741] bg-[#4a6741] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2d4128]"
          >
            Home
          </button>
        </div>

        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#4a6741]">Patient Plans</p>
        <h2 className="text-2xl font-extrabold text-[#1a1a1a]">Choose your plan</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Platform subscription gives access to assessments, therapist matching, streaming, and AI tools.
          Therapy sessions are separate and paid later via PhonePe.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PATIENT_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`relative rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                plan.id === 'quarterly' ? 'border-[#2563eb] ring-1 ring-[#2563eb]/25' : 'border-slate-200'
              }`}
            >
              {plan.badge && (
                <span className="mb-2 inline-block rounded-full bg-[#dbeafe] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1e40af]">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-extrabold text-[#1a1a1a]">{plan.name}</h3>
              <p className="mt-1 text-sm font-semibold text-[#2d4128]">{plan.displayPrice}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-[#16a34a]">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void onStartSubscription(plan.id)}
                disabled={subscribing}
                className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  plan.id === 'quarterly' || plan.id === 'premium_monthly'
                    ? 'bg-[#4a6741] text-white hover:bg-[#2d4128]'
                    : 'border border-[#4a6741] text-[#4a6741] hover:bg-[#e8f0e5]'
                } disabled:opacity-50`}
              >
                {subscribing ? 'Processing...' : plan.cta}
              </button>
            </article>
          ))}
        </div>

        <p className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Therapy sessions are separate and paid later via PhonePe.
        </p>
      </div>
    </div>
  );
}