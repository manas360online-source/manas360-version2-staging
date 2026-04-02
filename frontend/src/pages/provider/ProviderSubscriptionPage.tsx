import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, ShieldCheck, Zap, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DEFAULT_PROVIDER_ADDONS,
  PROVIDER_LEAD_PLANS,
  formatInr,
  getLeadPlanAmountMinor,
  saveProviderCart,
  type ProviderBillingCycle,
  type ProviderLeadPlanId,
} from '../../lib/providerSubscriptionFlow';

export default function ProviderSubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlatformCycle, setSelectedPlatformCycle] = useState<ProviderBillingCycle>('quarterly');
  const [loading, setLoading] = useState(false);

  const isPlatformActive = user?.platformAccessActive;
  const isOnboardingComplete = String(user?.onboardingStatus || '').toUpperCase() === 'COMPLETED';
  const canChoosePlan = isPlatformActive && isOnboardingComplete;

  const handlePlatformPayment = async () => {
    setLoading(true);
    saveProviderCart({
      leadPlanId: 'free',
      platformCycle: selectedPlatformCycle,
      addons: { ...DEFAULT_PROVIDER_ADDONS },
      updatedAt: new Date().toISOString(),
    });
    navigate('/provider/checkout?type=provider&planId=lead-free');
    setLoading(false);
  };

  const startFlow = (leadPlanId: ProviderLeadPlanId) => {
    if (!canChoosePlan) return;
    saveProviderCart({
      leadPlanId,
      platformCycle: selectedPlatformCycle, // Use the selected one or the one they bought? 
      // Actually, if they are already active, they have a cycle. 
      // For lead plans, cycle doesn't really matter as much for the current backend implementation 
      // but we send it for checkout.
      addons: { ...DEFAULT_PROVIDER_ADDONS },
      updatedAt: new Date().toISOString(),
    });
    if (leadPlanId === 'free') {
        navigate('/provider/checkout?type=provider&planId=lead-free');
      return;
    }
    navigate('/provider/plans/addons');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto max-w-7xl px-6 pt-12 space-y-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => navigate('/provider/dashboard')}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-200 bg-white px-3 py-1.5 rounded-lg"
            >
              ← Back to Dashboard
            </button>
            <span className="text-[10px] font-black tracking-widest text-[#1f6f5f] uppercase bg-[#1f6f5f]/10 px-2 py-0.5 rounded">
              Provider Hub
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Expand Your Practice</h1>
          <p className="text-slate-500 max-w-2xl leading-relaxed text-lg">
            A simple 2-step process to go live: Activate platform access, verify your profile, and choose your lead growth plan.
          </p>
        </header>

        {/* Step 1: Platform Access */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f6f5f] text-white text-sm font-black">1</span>
              Platform Access
            </h2>
            {isPlatformActive && (
               <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-tight shadow-sm shadow-emerald-200/50">
                <CheckCircle2 className="h-4 w-4" /> Activated & Active
               </span>
            )}
          </div>

          {!isPlatformActive ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Monthly Card */}
              <button
                type="button"
                onClick={() => setSelectedPlatformCycle('monthly')}
                className={`relative flex flex-col p-8 rounded-3xl border-2 transition-all text-left ${
                  selectedPlatformCycle === 'monthly' ? 'border-[#1f6f5f] bg-[#1f6f5f]/5 shadow-xl shadow-[#1f6f5f]/10' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  {selectedPlatformCycle === 'monthly' && <CheckCircle2 className="h-6 w-6 text-[#1f6f5f]" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">Monthly Access</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">₹99</span>
                  <span className="text-sm font-bold text-slate-400">/ month</span>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500">Billed monthly. Standard access fee.</p>
              </button>

              {/* Quarterly Card */}
              <button
                type="button"
                onClick={() => setSelectedPlatformCycle('quarterly')}
                className={`relative flex flex-col p-8 rounded-3xl border-2 transition-all text-left ${
                  selectedPlatformCycle === 'quarterly' ? 'border-[#1f6f5f] bg-[#1f6f5f]/5 shadow-xl shadow-[#1f6f5f]/10' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="absolute top-4 right-6">
                   <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Save ₹18</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  {selectedPlatformCycle === 'quarterly' && <CheckCircle2 className="h-6 w-6 text-[#1f6f5f]" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">Quarterly Pass</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">₹279</span>
                  <span className="text-sm font-bold text-slate-400">/ 3 months</span>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500">Billed quarterly (effectively ₹93/mo). Maximum value.</p>
              </button>

              <div className="md:col-span-2 mt-4">
                <button
                  type="button"
                  onClick={handlePlatformPayment}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-[#1f6f5f] hover:bg-[#145347] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#1f6f5f]/20 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Proceed to Payment & Onboarding →</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center gap-4 text-emerald-800">
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="font-bold">Platform Status: Active</p>
                <p className="text-sm opacity-90">You have active platform access. Please ensure your clinical profile is verified to unlock lead plans.</p>
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Lead Growth Plans */}
        <section className={`space-y-8 ${!canChoosePlan ? 'opacity-50' : ''}`}>
          <div className="relative">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-sm font-black">2</span>
              Growth Plans
            </h2>
            {!canChoosePlan && (
              <div className="mt-6 p-6 rounded-2xl bg-white border border-slate-200 border-dashed flex items-center gap-5">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Lead Plans Unlocked After Verification</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {!isPlatformActive 
                      ? "Pay the platform access fee (Step 1) to continue." 
                      : "Your clinical documents are being verified. We'll notify you once unlocked."}
                  </p>
                  {!isOnboardingComplete && isPlatformActive && (
                    <button 
                      type="button"
                      onClick={() => navigate('/onboarding/provider-setup')}
                      className="mt-3 text-xs font-black text-[#1f6f5f] hover:underline"
                    >
                      Check Verification Progress →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-4 ${!canChoosePlan ? 'pointer-events-none' : ''}`}>
            {PROVIDER_LEAD_PLANS.map((plan) => {
              const leadAmountMinor = getLeadPlanAmountMinor(plan.id, 'quarterly');
              return (
                <article key={plan.id} className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm border-b-4 border-b-slate-100">
                  {plan.badge && (
                    <span className="absolute -top-3 left-6 inline-flex rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-amber-950 uppercase tracking-tighter">
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-3xl font-black text-slate-900 mt-1">{formatInr(leadAmountMinor)}<span className="text-xs text-slate-400 font-bold">/plan</span></p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1f6f5f] mt-1 opacity-80">Manual One-time Purchase</p>
                  </div>
                  
                  <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed flex-grow">{plan.subtitle}</p>
                  
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[11px] text-slate-600 font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={!canChoosePlan}
                    onClick={() => startFlow(plan.id)}
                    className={`w-full rounded-2xl py-3.5 text-sm font-black transition-all ${
                      canChoosePlan 
                        ? 'bg-[#1f6f5f] text-white hover:bg-[#145347] shadow-lg shadow-[#1f6f5f]/20' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {!canChoosePlan ? 'Pending Verification' : plan.id === 'free' ? 'Select Free Tier' : 'Upgrade Now'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="pt-10 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Secured & Verified Provider Enrollment. Payment processed by PhonePe.
            </p>
        </footer>
      </div>
    </div>
  );
}
