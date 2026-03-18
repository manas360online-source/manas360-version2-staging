import { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Crown, Star } from 'lucide-react';
import { upgradeProviderSubscription, fetchProviderSubscription } from '../../api/provider';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const planData = [
  {
    key: 'free', name: 'Free', price: '₹0', billing: '—',
    icon: <ShieldCheck className="h-6 w-6" />,
    color: 'slate',
    leads: '0 leads/week',
    features: ['Basic profile listing (text only)', 'Dashboard with basic stats', 'No marketplace access', 'Self-serve FAQ support'],
    bestFor: 'Profile only — explore the platform',
  },
  {
    key: 'basic', name: 'Basic', price: '₹199/M', billing: '₹549/Q (8% off)',
    icon: <Star className="h-6 w-6" />,
    color: 'blue',
    leads: '3 leads/week (~12/month)',
    features: ['Warm + Cold lead mix', 'Enhanced profile (photo + video intro)', 'Full analytics + conversion tracking', 'Marketplace access at full price', 'Verified Provider badge', 'Email support (48h response)'],
    bestFor: 'New providers testing the waters',
  },
  {
    key: 'standard', name: 'Standard', price: '₹299/M', billing: '₹829/Q (8% off)',
    icon: <Zap className="h-6 w-6" />,
    color: 'violet',
    leads: '6 leads/week (~24/month)',
    badge: 'Most Popular',
    features: ['Hot + Warm + Cold leads', 'Featured profile (search priority)', 'Advanced analytics + patient insights', 'Marketplace 10% discount', 'Verified + Preferred badge', 'Priority email support (24h)', 'Unlimited patient records'],
    bestFor: 'Active providers building their practice',
  },
  {
    key: 'premium', name: 'Premium', price: '₹399/M', billing: '₹1,099/Q (8% off)',
    icon: <Crown className="h-6 w-6" />,
    color: 'amber',
    leads: '7 leads/week (~28/month)',
    badge: 'Best Value',
    features: ['Priority Hot leads (first access)', 'Spotlight profile (top of results + badge)', 'AI-powered recommendations', 'Marketplace 20% discount', 'Custom clinic branding', 'Dedicated account manager + WhatsApp', '72h extended claim window'],
    bestFor: 'Full-time providers, maximum patient flow',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; btn: string }> = {
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-700',  btn: 'bg-slate-600 hover:bg-slate-500' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-500' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', btn: 'bg-violet-600 hover:bg-violet-500' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  btn: 'bg-amber-600 hover:bg-amber-500' },
};

export default function ProviderSubscriptionPage() {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchProviderSubscription()
      .then((data: any) => setCurrentPlan(data?.plan || 'free'))
      .catch(() => {});
  }, []);

  const onSubscribe = async (planKey: string) => {
    if (planKey === currentPlan) return;
    setSubscribing(true);
    try {
      const result = await upgradeProviderSubscription({ planKey });
      if (result?.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      toast.success('Plan activated!');
      setCurrentPlan(planKey);
      setTimeout(() => navigate('/provider/dashboard', { replace: true }), 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-800 via-violet-800 to-purple-900 px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4" /> Provider Plans
          </p>
          <h1 className="mt-4 text-3xl font-bold md:text-5xl">Grow Your Practice with Guaranteed Leads</h1>
          <p className="mt-3 max-w-2xl text-indigo-200">
            Subscribe for weekly leads auto-pushed to your dashboard. Higher tiers unlock hot leads, marketplace discounts, and premium visibility.
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <div className="mx-auto -mt-8 max-w-7xl px-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planData.map((plan) => {
            const c = colorMap[plan.color] || colorMap.slate;
            const isCurrent = plan.key === currentPlan;
            return (
              <div key={plan.key} className={`relative flex flex-col rounded-2xl border-2 ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-200' : c.border} bg-white p-6 shadow-sm transition-all hover:shadow-lg`}>
                {plan.badge && (
                  <span className="absolute -top-3 right-4 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
                    {plan.badge}
                  </span>
                )}
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-2xl font-extrabold text-indigo-700">{plan.price}</p>
                {plan.billing !== '—' && <p className="text-xs text-slate-500">{plan.billing}</p>}
                <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">{plan.leads}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="mt-0.5 text-emerald-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-slate-400 italic">{plan.bestFor}</p>
                <button
                  type="button"
                  onClick={() => void onSubscribe(plan.key)}
                  disabled={subscribing || isCurrent}
                  className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-white transition ${isCurrent ? 'bg-emerald-600 cursor-default' : c.btn} disabled:opacity-50`}
                >
                  {isCurrent ? '✓ Current Plan' : subscribing ? 'Processing...' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Rhythm Table */}
      <div className="mx-auto mt-12 max-w-7xl px-4">
        <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">Weekly Lead Delivery Rhythm</h2>
          <p className="mt-1 text-sm text-slate-500">Leads are auto-pushed on scheduled days. Use it or lose it — unclaimed leads expire.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-semibold">Day</th>
                  <th className="px-4 py-2 font-semibold">Basic (3/wk)</th>
                  <th className="px-4 py-2 font-semibold">Standard (6/wk)</th>
                  <th className="px-4 py-2 font-semibold">Premium (7/wk)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  ['Monday', '1 lead', '2 leads', '1 lead'],
                  ['Tuesday', '—', '—', '1 lead'],
                  ['Wednesday', '—', '2 leads', '1 lead'],
                  ['Thursday', '1 lead', '—', '1 lead'],
                  ['Friday', '—', '2 leads', '1 lead'],
                  ['Saturday', '1 lead', '—', '1 lead'],
                  ['Sunday', '—', '—', '1 lead'],
                ].map(([day, basic, std, prem]) => (
                  <tr key={day} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium">{day}</td>
                    <td className="px-4 py-2">{basic}</td>
                    <td className="px-4 py-2">{std}</td>
                    <td className="px-4 py-2">{prem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Marketplace Pricing */}
      <div className="mx-auto mt-8 max-w-7xl px-4">
        <section className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">Marketplace Add-On Pricing</h2>
          <p className="mt-1 text-sm text-slate-500">Buy extra leads beyond your weekly allocation. Higher tiers get bigger discounts.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-semibold">Lead Type</th>
                  <th className="px-4 py-2 font-semibold">Full Price</th>
                  <th className="px-4 py-2 font-semibold">Basic (-0%)</th>
                  <th className="px-4 py-2 font-semibold">Standard (-10%)</th>
                  <th className="px-4 py-2 font-semibold">Premium (-20%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-bold text-red-600">🔥 Hot Lead</td>
                  <td className="px-4 py-2 font-semibold">₹500</td>
                  <td className="px-4 py-2">₹500</td>
                  <td className="px-4 py-2">₹450</td>
                  <td className="px-4 py-2 font-bold text-emerald-600">₹400</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-bold text-amber-600">🌟 Warm Lead</td>
                  <td className="px-4 py-2 font-semibold">₹300</td>
                  <td className="px-4 py-2">₹300</td>
                  <td className="px-4 py-2">₹270</td>
                  <td className="px-4 py-2 font-bold text-emerald-600">₹240</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-bold text-blue-600">❄️ Cold Lead</td>
                  <td className="px-4 py-2 font-semibold">₹150</td>
                  <td className="px-4 py-2">₹150</td>
                  <td className="px-4 py-2">₹135</td>
                  <td className="px-4 py-2 font-bold text-emerald-600">₹120</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
