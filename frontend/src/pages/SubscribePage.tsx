import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientApi } from '../api/patient';

type PricingConfig = {
  platformFee: {
    planName: string;
    monthlyFee: number;
    description?: string | null;
  } | null;
  sessionPricing: Array<{
    providerType: string;
    durationMinutes: number;
    price: number;
    active?: boolean;
  }>;
  premiumBundles: Array<{
    bundleName: string;
    minutes: number;
    price: number;
    active?: boolean;
  }>;
  surchargePercent?: number;
};

const providerOptions = [
  'Auto-assign best available provider',
  'Licensed therapist',
  'Sleep specialist',
  'Licensed psychologist',
  'MD Psychiatrist',
  'Senior therapist',
  'Executive coach',
];

const formatInr = (value: string) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const providerLabel = (value: string): string => {
  const key = String(value || '').toLowerCase();
  if (key === 'clinical-psychologist') return 'Clinical Psychologist';
  if (key === 'psychiatrist') return 'Psychiatrist (MD)';
  if (key === 'specialized-therapist') return 'Specialized Therapist';
  return value;
};

export default function SubscribePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const selectedProvider = providerOptions[0];
  const beneficiaryCount = 1;

  const checkoutBasePath = useMemo(() => '/patient/settings?section=billing', []);

  useEffect(() => {
    const loadPricing = async () => {
      setLoadingPricing(true);
      setPricingError(null);
      try {
        const response = await patientApi.getPricing({ mode: user?.nriTermsAccepted ? 'nri' : 'domestic' });
        const data = response?.data ?? response;
        setPricing(data as PricingConfig);
      } catch (error: any) {
        setPricing(null);
        setPricingError(error?.response?.data?.message || error?.message || 'Unable to load latest pricing.');
      } finally {
        setLoadingPricing(false);
      }
    };

    void loadPricing();
  }, [user?.nriTermsAccepted]);

  const sessionPricing = useMemo(() => {
    return [...(pricing?.sessionPricing || [])]
      .filter((item) => item && (item.active ?? true))
      .sort((a, b) => {
        if (a.providerType === b.providerType) return a.durationMinutes - b.durationMinutes;
        return providerLabel(a.providerType).localeCompare(providerLabel(b.providerType));
      });
  }, [pricing?.sessionPricing]);

  const premiumBundles = useMemo(() => {
    return [...(pricing?.premiumBundles || [])]
      .filter((item) => item && (item.active ?? true))
      .sort((a, b) => a.minutes - b.minutes);
  }, [pricing?.premiumBundles]);

  const mapPlanNameToKey = (name: string) => {
    const normalized = String(name || '').toLowerCase();
    if (normalized.includes('free')) return 'free';
    if (normalized.includes('premium') && normalized.includes('annual')) return 'premium_annual';
    if (normalized.includes('premium') && normalized.includes('monthly')) return 'premium_monthly';
    if (normalized.includes('quarter')) return 'quarterly';
    if (normalized.includes('monthly')) return 'monthly';
    return normalized.replace(/[^a-z0-9_]+/g, '_');
  };

  const goToPayment = async (category: string, itemName: string) => {
    // Platform subscription: attempt to initiate subscription directly
    if (category === 'platform-subscription') {
      const planKeyFromPricing = (pricing as any)?.platformFee?.planKey || (pricing as any)?.platformFee?.plan_name || (pricing as any)?.platformFee?.planName;
      const planKey = String(planKeyFromPricing || itemName || '').trim() || mapPlanNameToKey(String(itemName || 'monthly'));

      if (!isAuthenticated) {
        const next = `/patient/settings?section=billing&source=subscribe&category=${encodeURIComponent(category)}&item=${encodeURIComponent(itemName)}&planKey=${encodeURIComponent(planKey)}`;
        navigate(`/auth/login?next=${encodeURIComponent(next)}`);
        return;
      }

      try {
        const resp = await (patientApi as any).upgradeSubscription({ planKey });
        const payload = (resp as any)?.data ?? resp;
        if (payload?.redirectUrl) {
          window.location.href = payload.redirectUrl;
          return;
        }
        // Fallback: navigate to billing section where user can continue
        navigate(`/patient/settings?section=billing`);
        return;
      } catch (err: any) {
        // On failure, fall back to billing page so user can try again
        console.error('Failed to initiate subscription:', err);
        navigate(`/patient/settings?section=billing`);
        return;
      }
    }

    // Default: preserve previous behavior (navigate to billing section)
    const nextPath = `${checkoutBasePath}&source=subscribe&category=${encodeURIComponent(category)}&item=${encodeURIComponent(itemName)}&beneficiaries=${beneficiaryCount}&provider=${encodeURIComponent(selectedProvider)}`;

    if (isAuthenticated) {
      navigate(nextPath);
      return;
    }

    navigate(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  };

  const renderSectionHeader = (title: string, subtitle: string) => (
    <div className="mb-4">
      <h2 className="font-serif text-2xl font-semibold text-charcoal">{title}</h2>
      <p className="mt-1 text-sm text-charcoal/65">{subtitle}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-charcoal">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal/80 hover:text-charcoal">
            <img src="/Untitled.png" alt="MANAS360 logo" className="h-7 w-7 rounded-md object-cover" />
            MANAS360
          </Link>
          <Link to="/" className="rounded-lg border border-calm-sage/25 bg-white px-3 py-2 text-xs font-semibold text-charcoal/80">
            Back to Home
          </Link>
        </div>

        <section className="rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          <h1 className="font-serif text-3xl font-semibold text-charcoal sm:text-4xl">Subscribe</h1>
        </section>

        <section className="mt-6 rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          {renderSectionHeader('Specialty Services', 'Live session pricing configured by admin')}
          {loadingPricing ? <p className="text-sm text-charcoal/65">Loading latest pricing...</p> : null}
          {pricingError ? <p className="text-sm text-red-700">{pricingError}</p> : null}
          {!loadingPricing && !pricingError ? (
            <div className="space-y-3">
              {sessionPricing.length === 0 ? <p className="text-sm text-charcoal/65">No active session pricing available.</p> : null}
              {sessionPricing.map((item) => {
                const name = `${providerLabel(item.providerType)} (${item.durationMinutes} min)`;
                return (
                  <div key={`${item.providerType}-${item.durationMinutes}`} className="rounded-xl border border-calm-sage/15 bg-[#FAFAF8] p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-charcoal">{providerLabel(item.providerType)}</p>
                        <p className="mt-1 text-xs text-charcoal/70">Video ({item.durationMinutes} min) | By appointment</p>
                      </div>
                      <p className="text-sm font-semibold text-charcoal">{formatInr(String(item.price))}/S</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goToPayment('specialty-service', name)}
                      className="mt-3 rounded-lg bg-calm-sage px-3 py-2 text-xs font-semibold text-white"
                    >
                      Select and Proceed to Payment
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          {renderSectionHeader('Premium Bundles', 'Live bundle pricing configured by admin')}
          {loadingPricing ? <p className="text-sm text-charcoal/65">Loading latest bundles...</p> : null}
          {!loadingPricing && !pricingError ? (
            <div className="space-y-3">
              {premiumBundles.length === 0 ? <p className="text-sm text-charcoal/65">No active premium bundles available.</p> : null}
              {premiumBundles.map((item) => (
                <div key={`${item.bundleName}-${item.minutes}`} className="rounded-xl border border-calm-sage/15 bg-[#FAFAF8] p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{item.bundleName}</p>
                      <p className="mt-1 text-xs text-charcoal/70">{item.minutes} minutes bundle</p>
                    </div>
                    <p className="text-sm font-semibold text-charcoal">{formatInr(String(item.price))}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPayment('add-on', item.bundleName)}
                    className="mt-3 rounded-lg bg-calm-sage px-3 py-2 text-xs font-semibold text-white"
                  >
                    Select and Proceed to Payment
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-calm-sage/20 bg-white p-4 shadow-soft-sm sm:p-6">
          {renderSectionHeader('Platform Subscription (Access Fee)', 'Current access fee from admin pricing')}
          {loadingPricing ? <p className="text-sm text-charcoal/65">Loading current platform fee...</p> : null}
          {!loadingPricing && !pricingError ? (
            <div className="space-y-3">
              {pricing?.platformFee ? (
                <div className="rounded-xl border border-calm-sage/15 bg-[#FAFAF8] p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{pricing.platformFee.planName}</p>
                      <p className="mt-1 text-xs text-charcoal/70">Monthly | {pricing.platformFee.description || 'Full platform access and care journey support'}</p>
                      <p className="mt-1 text-xs text-charcoal/55">Best for: Active care subscribers</p>
                    </div>
                    <p className="text-sm font-semibold text-charcoal">{formatInr(String(pricing.platformFee.monthlyFee))}/M</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPayment('platform-subscription', pricing.platformFee?.planName || 'Platform Access')}
                    className="mt-3 rounded-lg bg-calm-sage px-3 py-2 text-xs font-semibold text-white"
                  >
                    Select and Proceed to Payment
                  </button>
                </div>
              ) : (
                <p className="text-sm text-charcoal/65">No active platform subscription fee configured.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
