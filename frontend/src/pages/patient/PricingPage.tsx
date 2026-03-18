import { useState, useEffect } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { patientApi } from '../../api/patient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const isSubscriptionActive = (subscription: any): boolean => {
  if (!subscription) return false;
  const status = String(subscription?.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing') return true;
  if (subscription?.isActive === true || subscription?.active === true) return true;
  return false;
};

export default function PricingPage() {
  const navigate = useNavigate();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    patientApi.getSubscription()
      .then((res) => setHasActiveSubscription(isSubscriptionActive((res as any)?.data ?? res)))
      .catch(() => {});
  }, []);

  const onStartSubscription = async (planKey: string) => {
    setSubscribing(true);
    try {
      const response = await patientApi.upgradeSubscription({ planKey });
      const payload = (response as any)?.data ?? response;
      if (payload.redirectUrl) {
        window.location.href = payload.redirectUrl;
        return;
      }
      toast.success('Subscription activated successfully.');
      setHasActiveSubscription(true);
      setTimeout(() => navigate('/patient/dashboard', { replace: true }), 1000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not initiate subscription.');
    } finally {
      setSubscribing(false);
    }
  };

  const platformPlans = [
    { key: 'free', name: 'Free Tier', price: '₹0', billing: '—', includes: '3 tracks/day, AI chatbot, basic self-help', bestFor: 'First-time users', rawPrice: 0 },
    { key: 'monthly', name: 'Monthly', price: '₹99/M', billing: 'Monthly', includes: 'Full platform access, assessments, matching', bestFor: 'Trial users', rawPrice: 99 },
    { key: 'quarterly', name: 'Quarterly (MVP)', price: '₹299/Q', billing: 'Quarterly', includes: 'Full access + priority matching + assessments', bestFor: 'Primary B2C plan', rawPrice: 299 },
    { key: 'premium_monthly', name: 'Premium Monthly', price: '₹299/M', billing: 'Monthly', includes: 'Unlimited streaming, downloads, AI insights', bestFor: 'Power users', rawPrice: 299 },
    { key: 'premium_annual', name: 'Premium Annual', price: '₹2,999/Y', billing: 'Annual', includes: 'All premium (₹250/M effective, 16% off)', bestFor: 'Committed users', rawPrice: 2999 },
  ];

  const sessionFees = [
    { provider: 'Therapist / Counselor', tier1: '₹500', tier2: '₹1,000', tier3: '₹2,000', notes: 'CBT, stress, coping' },
    { provider: 'Clinical Psychologist', tier1: '₹699', tier2: '₹1,500', tier3: '₹2,500', notes: 'Assessment, testing' },
    { provider: 'Psychiatrist (MD)', tier1: '₹999', tier2: '₹2,000', tier3: '₹5,000', notes: '' },
    { provider: 'NLP Coach', tier1: '₹500', tier2: '₹1,000', tier3: '₹1,500', notes: 'NLP + NAC' },
    { provider: 'Executive Coach', tier1: '₹1,500', tier2: '₹2,500', tier3: '₹5,000', notes: 'Leadership' },
  ];

  const specialtyServices = [
    { service: 'Couple Therapy', price: '₹1,499/S', format: 'Video (60 min)', availability: 'By appointment', provider: 'Licensed therapist' },
    { service: 'Sleep Therapy', price: '₹1,499/S', format: 'Video (45 min)', availability: 'Evening slots', provider: 'Sleep specialist' },
    { service: 'NRI — Psychologist', price: '₹2,999/S', format: 'Video (50 min)', availability: 'IST eve / NRI AM', provider: 'Licensed psychologist' },
    { service: 'NRI — Psychiatrist', price: '₹3,499/S', format: 'Video (30 min)', availability: 'IST eve / NRI AM', provider: 'MD Psychiatrist' },
    { service: 'NRI — Therapist', price: '₹3,599/S', format: 'Video (50 min)', availability: 'IST eve / NRI AM', provider: 'Senior therapist' },
    { service: 'Executive (Weekend)', price: '₹1,999/S', format: 'Video (60 min)', availability: 'Sat & Sun', provider: 'Executive coach' },
  ];

  const addons = [
    { feature: 'Anytime Buddy', price: '₹99', duration: '15 min', description: 'On-demand emotional support chat' },
    { feature: 'Digital Pet Hub', price: '₹99', duration: '15 min', description: 'Hormone companion interaction' },
    { feature: 'IVR Therapy', price: '₹499', duration: 'Per call', description: 'Voice-based therapy + PHQ screening' },
    { feature: 'Vent Buddy', price: '₹99', duration: '15 min', description: 'Anonymous venting with trained listener' },
    { feature: 'Sound Therapy Track', price: '₹30', duration: 'Per track', description: 'Own forever, unlimited play + download' },
    { feature: 'Sound Bundle (10)', price: '₹250', duration: '10 tracks', description: '17% discount (₹25/track)' },
  ];

  return (
    <div className="space-y-8 bg-slate-50 pb-24 min-h-screen">
      <section className="overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-900 px-6 py-12 text-white shadow-xl">
        <div className="mx-auto max-w-7xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
            <ShieldCheck className="h-4 w-4" />
            Pricing & Services
          </p>
          <h1 className="mt-4 text-3xl font-bold md:text-5xl">Transparent Wellness Pricing</h1>
          <p className="mt-4 text-base text-indigo-100 max-w-2xl">
            Choose a platform subscription to access core self-help modules, mood tracking, and AI, then book clinical sessions a-la-carte as needed.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 space-y-12">
        {/* PLATFORM SUBSCRIPTION */}
        <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-indigo-50 pb-4">
            <h2 className="text-xl font-bold text-slate-800">Platform Subscription (Access Fee)</h2>
            <p className="text-sm text-slate-500 mt-1">Unlock AI tools, assessments, matching, and audio libraries.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold rounded-tl-xl">Plan</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Billing</th>
                  <th className="px-5 py-3 font-semibold">Includes</th>
                  <th className="px-5 py-3 font-semibold">Best For</th>
                  <th className="px-5 py-3 font-semibold rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {platformPlans.map((plan) => (
                  <tr key={plan.key} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-indigo-700">{plan.name}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{plan.price}</td>
                    <td className="px-5 py-4">{plan.billing}</td>
                    <td className="px-5 py-4 whitespace-normal min-w-[200px]">{plan.includes}</td>
                    <td className="px-5 py-4 text-slate-600">{plan.bestFor}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void onStartSubscription(plan.key)}
                        disabled={subscribing || (hasActiveSubscription && plan.rawPrice === 0)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : plan.rawPrice === 0 ? 'Current Plan' : 'Subscribe'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SESSION FEES */}
        <section className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-teal-50 pb-4">
            <h2 className="text-xl font-bold text-slate-800">Session Fees</h2>
            <p className="text-sm text-slate-500 mt-1">Per Session — Paid to Provider at the time of booking.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold rounded-tl-xl">Provider Type</th>
                  <th className="px-5 py-3 font-semibold">Tier 1 (Budget)</th>
                  <th className="px-5 py-3 font-semibold">Tier 2 (Standard)</th>
                  <th className="px-5 py-3 font-semibold">Tier 3 (Premium)</th>
                  <th className="px-5 py-3 font-semibold rounded-tr-xl">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {sessionFees.map((fee) => (
                  <tr key={fee.provider} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-teal-700">{fee.provider}</td>
                    <td className="px-5 py-4 font-semibold">{fee.tier1}</td>
                    <td className="px-5 py-4 font-semibold">{fee.tier2}</td>
                    <td className="px-5 py-4 font-semibold">{fee.tier3}</td>
                    <td className="px-5 py-4 text-slate-500">{fee.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2 rounded-xl bg-teal-50 p-3 text-xs text-teal-800">
            <Info className="h-4 w-4 flex-shrink-0" />
            <p><strong>Note:</strong> S = Session | M = Monthly | Q = Quarterly | Y = Yearly · ASHA referral patients: First 3 sessions free/subsidized</p>
          </div>
        </section>

        {/* SPECIALTY SERVICES */}
        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-violet-50 pb-4">
            <h2 className="text-xl font-bold text-slate-800">Specialty Services</h2>
            <p className="text-sm text-slate-500 mt-1">Targeted and specialized interventions by experts.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold rounded-tl-xl">Service</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Format</th>
                  <th className="px-5 py-3 font-semibold">Availability</th>
                  <th className="px-5 py-3 font-semibold rounded-tr-xl">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {specialtyServices.map((specialty) => (
                  <tr key={specialty.service} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-violet-700">{specialty.service}</td>
                    <td className="px-5 py-4 font-bold">{specialty.price}</td>
                    <td className="px-5 py-4">{specialty.format}</td>
                    <td className="px-5 py-4">{specialty.availability}</td>
                    <td className="px-5 py-4 text-slate-600">{specialty.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ADD-ON FEATURES */}
        <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-amber-50 pb-4">
            <h2 className="text-xl font-bold text-slate-800">Add-On Features (À La Carte)</h2>
            <p className="text-sm text-slate-500 mt-1">Purchase specific functionality alongside your plan.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold rounded-tl-xl">Feature</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold rounded-tr-xl">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {addons.map((addon) => (
                  <tr key={addon.feature} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-amber-700">{addon.feature}</td>
                    <td className="px-5 py-4 font-bold">{addon.price}</td>
                    <td className="px-5 py-4">{addon.duration}</td>
                    <td className="px-5 py-4 whitespace-normal min-w-[200px] text-slate-600">{addon.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
