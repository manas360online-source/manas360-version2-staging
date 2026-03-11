import { useEffect, useMemo, useState } from 'react';
import { Bot, Brain, CalendarClock, Clock3, HeartPulse, MoonStar, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { patientApi } from '../../api/patient';

const platformFeatures = [
  'Therapist search and browsing',
  'Session booking system',
  'Basic Mitra AI chatbot (3 messages/day)',
  'Mood tracking',
  'Session scheduling',
  'Payment processing',
  'Video therapy platform',
];

const therapyPricing = [
  {
    provider: 'Clinical Psychologist',
    mins45: 999,
    mins60: 1499,
  },
  {
    provider: 'Psychiatrist (MD)',
    mins45: 1499,
    mins60: 2499,
  },
  {
    provider: 'Specialized Therapist',
    mins45: 1299,
    mins60: 1999,
  },
];

const bundles = [
  { label: '1 Hour Bundle', minutes: 60, price: 499, savings: null, popular: false },
  { label: '2 Hour Bundle', minutes: 120, price: 899, savings: 99, popular: true },
  { label: '3 Hour Bundle', minutes: 180, price: 1450, savings: null, popular: false },
];

const premiumFeatures = [
  { icon: Sparkles, label: 'Digital Pet' },
  { icon: Bot, label: 'Unlimited Mitra AI chatbot' },
  { icon: Waves, label: 'IoT device integration' },
  { icon: Brain, label: 'Advanced analytics' },
  { icon: MoonStar, label: 'Sleep tracking' },
  { icon: HeartPulse, label: 'CBT modules' },
];

const preferredTimeWindows = ['Evenings (6–9 PM)', 'Weekends', 'Early mornings'];

type SessionTier = {
  provider: string;
  mins45: number;
  mins60: number;
};

type BundleTier = { label: string; minutes: number; price: number; savings: number | null; popular: boolean };

const providerLabelMap: Record<string, string> = {
  'clinical-psychologist': 'Clinical Psychologist',
  psychiatrist: 'Psychiatrist (MD)',
  'specialized-therapist': 'Specialized Therapist',
};

const defaultPlatformFee = 199;

const isSubscriptionActive = (subscription: any): boolean => {
  if (!subscription) return false;

  const status = String(subscription?.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing') return true;
  if (subscription?.isActive === true || subscription?.active === true) return true;

  return false;
};

export default function PricingPage() {
  const navigate = useNavigate();
  const [platformFee, setPlatformFee] = useState<number>(defaultPlatformFee);
  const [sessionPricingConfig, setSessionPricingConfig] = useState<SessionTier[]>(therapyPricing);
  const [bundleConfig, setBundleConfig] = useState<BundleTier[]>(bundles);
  const [surchargePercent, setSurchargePercent] = useState(20);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState(therapyPricing[0].provider);
  const [duration, setDuration] = useState<45 | 60>(45);
  const [preferredTime, setPreferredTime] = useState(false);
  const [preferredWindow, setPreferredWindow] = useState(preferredTimeWindows[0]);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pricingResponse, subscriptionResponse] = await Promise.all([
          patientApi.getPricing(),
          patientApi.getSubscription().catch(() => null),
        ]);
        const payload = (pricingResponse as any)?.data ?? pricingResponse ?? {};
        const subscriptionPayload = subscriptionResponse ? ((subscriptionResponse as any)?.data ?? subscriptionResponse) : null;
        setHasActiveSubscription(isSubscriptionActive(subscriptionPayload));

        const nextPlatformFee = Number(payload?.platformFee?.monthlyFee || defaultPlatformFee);
        setPlatformFee(Number.isFinite(nextPlatformFee) ? nextPlatformFee : defaultPlatformFee);

        const grouped = new Map<string, SessionTier>();
        const sessionRows = Array.isArray(payload?.sessionPricing) ? payload.sessionPricing : [];
        for (const row of sessionRows) {
          const providerType = String(row?.providerType || '').toLowerCase();
          const label = providerLabelMap[providerType] || providerType || 'Provider';
          const duration = Number(row?.durationMinutes || 0);
          const price = Number(row?.price || 0);
          if (!duration || !Number.isFinite(price)) continue;
          const base = grouped.get(label) || { provider: label, mins45: 0, mins60: 0 };
          if (duration === 45) base.mins45 = price;
          if (duration === 60) base.mins60 = price;
          grouped.set(label, base);
        }

        const sessionValues = Array.from(grouped.values()).filter((item) => item.mins45 > 0 || item.mins60 > 0);
        if (sessionValues.length > 0) {
          setSessionPricingConfig(sessionValues);
          setSelectedProvider((prev) =>
            sessionValues.some((item) => item.provider === prev) ? prev : sessionValues[0].provider,
          );
        }

        const bundleRows = Array.isArray(payload?.premiumBundles) ? payload.premiumBundles : [];
        const dynamicBundles = bundleRows
          .map((item: any) => ({
            label: String(item?.bundleName || `${item?.minutes || 0} Minute Bundle`),
            minutes: Number(item?.minutes || 0),
            price: Number(item?.price || 0),
            savings: null as number | null,
            popular: Number(item?.minutes || 0) === 120,
          }))
          .filter((item: BundleTier) => item.minutes > 0 && item.price > 0)
          .sort((a: BundleTier, b: BundleTier) => a.minutes - b.minutes);

        if (dynamicBundles.length > 0) {
          const oneHourPrice = dynamicBundles.find((item: BundleTier) => item.minutes === 60)?.price || 0;
          setBundleConfig(
            dynamicBundles.map((item: BundleTier) => {
              if (item.minutes === 120 && oneHourPrice > 0) {
                const savings = Math.max(0, oneHourPrice * 2 - item.price);
                return { ...item, savings: savings > 0 ? savings : null, popular: true };
              }
              return item;
            }),
          );
        }

        const surcharge = Number(payload?.surchargePercent || 20);
        setSurchargePercent(Number.isFinite(surcharge) ? surcharge : 20);
        setPricingError(null);
      } catch (error: any) {
        setPricingError(error?.response?.data?.message || 'Showing default pricing while live pricing is unavailable.');
      }
    })();
  }, []);

  const selectedProviderPricing = useMemo(
    () => sessionPricingConfig.find((item) => item.provider === selectedProvider) || sessionPricingConfig[0],
    [selectedProvider, sessionPricingConfig],
  );

  const basePrice = duration === 45 ? selectedProviderPricing.mins45 : selectedProviderPricing.mins60;
  const finalPrice = preferredTime ? Math.round(basePrice * (1 + surchargePercent / 100)) : basePrice;

  const onStartSubscription = async () => {
    setSubscriptionMessage(null);
    setSubscribing(true);
    try {
      await patientApi.upgradeSubscription();
      setSubscriptionMessage('Subscription activated successfully.');
      setHasActiveSubscription(true);
      setTimeout(() => {
        navigate('/patient/assessments');
      }, 700);
    } catch (error: any) {
      setSubscriptionMessage(error?.response?.data?.message || 'Could not activate subscription right now.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="space-y-8 bg-slate-50 pb-24">
      <section className="overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-900 p-6 text-white shadow-xl md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
          <ShieldCheck className="h-3.5 w-3.5" />
          MANAS360 Pricing
        </p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Professional Subscription Plans for Patients</h1>
        <p className="mt-2 max-w-2xl text-sm text-indigo-100">
          Transparent, flexible pricing designed for sustained mental wellness care and premium therapy experiences.
        </p>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Section 1 - Platform Access</p>
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
          Step 1: Platform fee unlocks assessments, AI insights, and matching tools. Step 2: provider fee is paid later only when booking a therapy session.
        </div>
        <div className="mt-4 grid gap-5 md:grid-cols-[1.2fr_2fr]">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
            <p className="text-sm font-semibold text-indigo-700">Standard Access</p>
            <p className="mt-1 text-3xl font-bold text-indigo-900">₹{platformFee}<span className="text-sm font-medium text-indigo-700">/month</span></p>
            <button
              type="button"
              onClick={() => void onStartSubscription()}
              disabled={subscribing || hasActiveSubscription}
              className="mt-4 inline-flex min-h-[40px] items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-70"
            >
              {hasActiveSubscription ? 'Platform Access Active' : subscribing ? 'Activating...' : 'Start Subscription'}
            </button>
            {subscriptionMessage ? <p className="mt-2 text-xs text-indigo-800">{subscriptionMessage}</p> : null}
            <p className="mt-2 text-xs text-indigo-700">This payment does not include therapy session fees.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {platformFeatures.map((feature) => (
              <div key={feature} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {feature}
              </div>
            ))}
          </div>
        </div>
        {pricingError ? <p className="mt-3 text-xs text-amber-700">{pricingError}</p> : null}
      </section>

      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Section 2 - Therapy Session Pricing</p>
        <p className="mt-2 text-xs text-slate-600">Paid at booking time. Platform access is billed separately in Section 1.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {sessionPricingConfig.map((tier) => {
            const providerShare45 = Math.round(tier.mins45 * 0.6);
            const platformShare45 = tier.mins45 - providerShare45;
            const providerShare60 = Math.round(tier.mins60 * 0.6);
            const platformShare60 = tier.mins60 - providerShare60;

            return (
              <article key={tier.provider} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">{tier.provider}</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>45 min: <span className="font-semibold text-slate-900">₹{tier.mins45}</span></p>
                  <p>60 min: <span className="font-semibold text-slate-900">₹{tier.mins60}</span></p>
                </div>
                <div className="mt-3 rounded-xl bg-teal-50 p-3 text-xs text-teal-800">
                  <p>Provider share (60%): ₹{providerShare45} / ₹{providerShare60}</p>
                  <p>Platform share (40%): ₹{platformShare45} / ₹{platformShare60}</p>
                </div>
                <Link
                  to="/patient/care-team?tab=browse"
                  className="mt-4 inline-flex min-h-[38px] items-center rounded-xl border border-violet-300 bg-violet-50 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                >
                  Book Session
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Section 3 - Premium Feature Bundles</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {bundleConfig.map((bundle) => (
            <article
              key={bundle.label}
              className={`relative rounded-2xl border p-4 shadow-sm ${bundle.popular ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}
            >
              {bundle.popular ? (
                <span className="absolute -top-2.5 right-3 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                  Most Popular
                </span>
              ) : null}
              <p className="text-sm font-semibold text-slate-900">{bundle.label}</p>
              <p className="mt-1 text-xs text-slate-600">{bundle.minutes} minutes</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">₹{bundle.price}</p>
              {bundle.savings ? <p className="mt-1 text-xs font-medium text-emerald-700">Save ₹{bundle.savings}</p> : null}
              <button className="mt-4 inline-flex min-h-[38px] items-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500">
                Buy Bundle
              </button>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {premiumFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <Icon className="h-4 w-4 text-teal-600" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Section 4 - Premium Scheduling</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Provider Type</label>
            <select
              value={selectedProvider}
              onChange={(event) => setSelectedProvider(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {sessionPricingConfig.map((item) => (
                <option key={item.provider} value={item.provider}>{item.provider}</option>
              ))}
            </select>

            <label className="mt-3 block text-sm font-medium text-slate-700">Duration</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDuration(45)}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${duration === 45 ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
              >
                45 min
              </button>
              <button
                type="button"
                onClick={() => setDuration(60)}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${duration === 60 ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
              >
                60 min
              </button>
            </div>

            <label className="mt-3 block text-sm font-medium text-slate-700">Preferred Time Window</label>
            <select
              value={preferredWindow}
              onChange={(event) => setPreferredWindow(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {preferredTimeWindows.map((window) => (
                <option key={window} value={window}>{window}</option>
              ))}
            </select>

            <div className="mt-2 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
              <CalendarClock className="h-4 w-4 text-indigo-600" />
              <span className="text-sm text-indigo-800">Standard Time</span>
              <button
                type="button"
                role="switch"
                aria-checked={preferredTime}
                onClick={() => setPreferredTime((prev) => !prev)}
                className={`relative ml-auto h-6 w-11 rounded-full transition ${preferredTime ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${preferredTime ? 'left-5' : 'left-0.5'}`}
                />
              </button>
              <span className="text-sm font-medium text-indigo-800">Preferred Time (+20%)</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Live Price Preview</p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">{selectedProvider}</h3>
            <p className="mt-1 text-sm text-slate-700">{duration} min session</p>
            <p className="mt-3 text-sm text-slate-600">Base: ₹{basePrice}</p>
            <p className="mt-1 text-sm text-slate-600">Schedule: {preferredTime ? preferredWindow : 'Standard Time'}</p>
            <p className="mt-3 text-3xl font-bold text-indigo-700">₹{finalPrice}</p>
            <p className="mt-1 text-xs text-slate-500">Dynamic update: +{surchargePercent}% applied only for preferred scheduling.</p>
            <Link to="/patient/care-team?tab=browse" className="mt-4 inline-flex min-h-[40px] items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">
              Continue to Booking
            </Link>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-teal-600" /> Preferred windows: Evenings (6-9 PM), Weekends, Early mornings.</div>
        </div>
      </section>
    </div>
  );
}
