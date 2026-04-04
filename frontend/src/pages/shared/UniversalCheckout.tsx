import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { http } from '../../lib/http';
import { useWallet } from '../../hooks/useWallet';
import { getCheckoutSummaryMinor, loadCart, type PatientSubscriptionCart } from '../../lib/patientSubscriptionFlow';
import { formatInr, getProviderCheckoutSummaryMinor, loadProviderCart, type ProviderSubscriptionCart } from '../../lib/providerSubscriptionFlow';

interface SharedPlan {
  id: string;
  name: string;
  description: string;
  baseAmount: number;
  gstPercentage: number;
  features: string[];
  validityDays?: number | null;
}

type CheckoutMode = 'patient' | 'provider';

const buildProviderFreePlan = () => ({
  id: 'lead-free',
  name: 'Platform Access',
  description: 'Activate provider platform access before choosing a growth plan.',
  baseAmount: 0,
  gstPercentage: 18,
  features: ['Platform access', 'Profile verification', 'Required for lead plans'],
  validityDays: null,
});

const PATIENT_PLAN_MAP: Record<string, string> = {
  free: 'patient-free',
  monthly: 'patient-1month',
  quarterly: 'patient-3month',
  premium_monthly: 'patient-1year',
};

const PROVIDER_PLAN_MAP: Record<string, string> = {
  free: 'lead-free',
  basic: 'lead-basic',
  standard: 'lead-standard',
  premium: 'lead-premium',
};

const getPlanNameFromCart = (mode: CheckoutMode, cart: PatientSubscriptionCart | ProviderSubscriptionCart | null): string => {
  if (!cart) return '';
  if (mode === 'patient') {
    return (cart as PatientSubscriptionCart).planId;
  }
  return (cart as ProviderSubscriptionCart).leadPlanId;
};

export default function UniversalCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { balance } = useWallet();

  const inferredMode: CheckoutMode = searchParams.get('type') === 'provider' || location.pathname.startsWith('/provider')
    ? 'provider'
    : 'patient';

  const [mode] = useState<CheckoutMode>(inferredMode);
  const [sharedPlan, setSharedPlan] = useState<SharedPlan | null>(null);
  const [patientCart, setPatientCart] = useState<PatientSubscriptionCart | null>(null);
  const [providerCart, setProviderCart] = useState<ProviderSubscriptionCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');

  const typePlanId = searchParams.get('planId');
  const queryPlanId = typePlanId || '';
  const checkoutCart = mode === 'provider' ? providerCart : patientCart;

  useEffect(() => {
    const init = async () => {
      try {
        setError('');
        setLoading(true);
        let selectedPlanId = queryPlanId;
        let useLocalProviderFallback = false;

        if (mode === 'provider') {
          const cart = loadProviderCart();
          if (cart) {
            setProviderCart(cart);
            if (!selectedPlanId) {
              selectedPlanId = PROVIDER_PLAN_MAP[cart.leadPlanId] || '';
            }
            if (cart.leadPlanId === 'free') {
              useLocalProviderFallback = true;
            }
          } else {
            setProviderCart(null);
          }
        } else {
          const cart = loadCart();
          if (cart) {
            setPatientCart(cart);
            if (!selectedPlanId) {
              selectedPlanId = PATIENT_PLAN_MAP[cart.planId] || '';
            }
          } else {
            setPatientCart(null);
          }
        }

        if (mode === 'provider' && useLocalProviderFallback && selectedPlanId === 'lead-free') {
          setSharedPlan(buildProviderFreePlan());
        } else if (selectedPlanId) {
          const response = await http.get(`/v1/shared/plans/${mode}/${selectedPlanId}`);
          const data = response.data;
          setSharedPlan(data?.data?.plan || data?.plan || null);
        } else {
          setSharedPlan(null);
          throw new Error('Plan not specified');
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load checkout');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mode, queryPlanId]);

  const patientSummary = useMemo(() => (mode === 'patient' && patientCart ? getCheckoutSummaryMinor(patientCart) : null), [mode, patientCart]);
  const providerSummary = useMemo(() => (mode === 'provider' && providerCart ? getProviderCheckoutSummaryMinor(providerCart) : null), [mode, providerCart]);
  const summary = patientSummary || providerSummary;

  const walletMinor = Math.max(0, Math.round(Number((balance as any)?.total_balance || 0) * 100));
  const totalMinor = summary?.totalMinor || Math.round((sharedPlan?.baseAmount || 0) * 100);
  const applicableWalletMinor = Math.min(walletMinor, totalMinor);
  const finalAmountMinor = Math.max(0, totalMinor - applicableWalletMinor);

  const resolvedPlanId = mode === 'provider'
    ? (providerCart ? PROVIDER_PLAN_MAP[providerCart.leadPlanId] : typePlanId || '')
    : (patientCart ? PATIENT_PLAN_MAP[patientCart.planId] : typePlanId || '');

  const title = mode === 'provider' ? 'Provider Checkout' : 'Checkout';
  const subtitle = mode === 'provider'
    ? 'Platform access, lead plan, and marketplace add-ons.'
    : 'GST 18% is charged extra on top of the selected plan and add-ons.';

  const handleTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const reachedBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 8;
    setTermsScrolled(reachedBottom);
  };

  const acceptTermsFromModal = () => {
    if (!termsScrolled) return;
    setAcceptedTerms(true);
    setShowTermsModal(false);
  };

  const confirmAndPay = async () => {
    if (!acceptedTerms) {
      toast.error('Please confirm to continue.');
      return;
    }

    if (!resolvedPlanId) {
      toast.error('Plan not specified.');
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `${mode}_${resolvedPlanId}_${Date.now()}`;
      const payload = mode === 'provider' && providerCart
        ? {
            type: 'provider',
            planId: resolvedPlanId,
            baseAmountMinor: summary?.subtotalMinor || totalMinor,
            gstMinor: summary?.gstMinor || 0,
            totalAmountMinor: summary?.totalMinor || totalMinor,
            walletUsedMinor: applicableWalletMinor,
            finalAmountMinor,
            acceptedTerms: true,
            promoCode: promoCode || undefined,
            idempotencyKey,
            platformCycle: providerCart.platformCycle,
            addons: providerCart.addons,
          }
        : {
            type: 'patient',
            planId: resolvedPlanId,
            baseAmountMinor: summary?.subtotalMinor || totalMinor,
            gstMinor: summary?.gstMinor || 0,
            totalAmountMinor: summary?.totalMinor || totalMinor,
            walletUsedMinor: applicableWalletMinor,
            finalAmountMinor,
            acceptedTerms: true,
            promoCode: promoCode || undefined,
            idempotencyKey,
            addons: patientCart?.addons,
          };

      const response = await http.post('/v1/payments/universal/initiate', payload);
      const data = response.data?.data || response.data;
      const redirectUrl = String(data?.redirectUrl || '').trim();
      if (!redirectUrl) {
        throw new Error('Payment link not received.');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="inline-block animate-spin text-emerald-600 mb-4" size={40} />
          <p className="text-slate-600 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-red-200">
          <CardContent className="pt-6">
            <div className="flex gap-3 mb-4">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h2 className="font-bold text-slate-900">Checkout Error</h2>
                <p className="text-slate-600 text-sm">{error}</p>
              </div>
            </div>
            <Button onClick={() => navigate(-1)} variant="ghost" className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffdf7] via-[#f7fbf8] to-[#eef6f1] py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate(mode === 'provider' ? '/provider/dashboard' : '/patient/dashboard', { replace: true })}
            className="rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Home
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Universal</Badge>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>{mode === 'provider' ? 'Lead Plan' : 'Plan'} {checkoutCart ? `(${getPlanNameFromCart(mode, checkoutCart)})` : sharedPlan?.name || resolvedPlanId}</span>
              <strong>{formatInr((providerSummary?.leadPlanMinor ?? patientSummary?.planMinor) || Math.round((sharedPlan?.baseAmount || 0) * 100))}</strong>
            </div>
            {mode === 'provider' && providerCart && (
              <>
                <div className="flex items-center justify-between"><span>Platform Access ({providerCart.platformCycle})</span><strong>{formatInr(providerSummary?.platformMinor || 0)}</strong></div>
                <div className="flex items-center justify-between"><span>Marketplace Add-ons</span><strong>{formatInr(providerSummary?.addonsMinor || 0)}</strong></div>
              </>
            )}
            {mode === 'patient' && patientCart && (
              <div className="flex items-center justify-between"><span>Add-ons</span><strong>{formatInr(patientSummary?.addonsMinor || 0)}</strong></div>
            )}
            <div className="flex items-center justify-between"><span>Subtotal (before GST)</span><strong>{formatInr(summary?.subtotalMinor || totalMinor)}</strong></div>
            <div className="flex items-center justify-between"><span>GST (18%)</span><span>{formatInr(summary?.gstMinor || 0)}</span></div>
            {applicableWalletMinor > 0 && (
              <div className="flex items-center justify-between font-medium text-teal-600">
                <span>Wallet Credits Applied</span>
                <span>- {formatInr(applicableWalletMinor)}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base">
              <span className="font-bold">Grand Total</span>
              <strong className="text-lg">{formatInr(finalAmountMinor)}</strong>
            </div>
          </div>

          <label className="mt-4 block text-sm text-slate-700">
            Promo Code (optional)
            <input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>

          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              readOnly
              onClick={(event) => {
                event.preventDefault();
                setShowTermsModal(true);
                setTermsScrolled(false);
              }}
            />
            <button
              type="button"
              onClick={() => {
                setShowTermsModal(true);
                setTermsScrolled(false);
              }}
              className="text-left underline text-emerald-700"
            >
              I agree to the Refund &amp; Cancellation Policy.
            </button>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate(mode === 'provider' ? '/provider/plans/addons' : '/plans/addons')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Back
            </button>
            <button type="button" onClick={confirmAndPay} disabled={submitting} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? 'Processing...' : `Confirm & Pay ${formatInr(finalAmountMinor)} with PhonePe`}
            </button>
          </div>
        </section>
      </div>

      {showTermsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Refund &amp; Cancellation Policy</h2>
              <button type="button" onClick={() => setShowTermsModal(false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
            </div>
            <p className="mb-2 text-xs text-slate-500">Read fully and scroll to the bottom to enable agreement.</p>
            <div
              onScroll={handleTermsScroll}
              className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700"
            >
              <h3 className="mb-2 text-base font-semibold text-slate-900">1. PURPOSE AND SCOPE</h3>
              <p className="mb-3">
                1.1 This Refund and Cancellation Policy governs all payments made by Users while accessing or using
                the MANAS360 Platform, including therapy sessions, subscriptions, assessments, digital programs, and
                other paid services.
              </p>
              <p className="mb-4">
                1.2 By booking a session, purchasing a subscription, or making any payment on the Platform, the User
                agrees to this Policy.
              </p>

              <h3 className="mb-2 text-base font-semibold text-slate-900">2. SESSION CANCELLATIONS</h3>
              <p className="mb-2">2.1 <strong>By Patient - More than 24 hours before session:</strong> Full refund to original payment method within 5-7 business days.</p>
              <p className="mb-2">2.2 <strong>By Patient - 12 to 24 hours before session:</strong> 50% refund. Remaining 50% credited as MANAS360 wallet balance.</p>
              <p className="mb-2">2.3 <strong>By Patient - Less than 12 hours before session:</strong> No refund. Full amount credited as MANAS360 wallet balance valid for 90 days.</p>
              <p className="mb-2">2.4 <strong>By Patient - No-show (no cancellation):</strong> No refund. Provider receives full session fee.</p>
              <p className="mb-2">2.5 <strong>By Provider:</strong> Full refund to patient's original payment method. Provider's reliability score may be affected.</p>
              <p className="mb-4">2.6 <strong>Technical failure (MANAS360 side):</strong> Full refund or complimentary rescheduled session at patient's choice.</p>

              <h3 className="mb-2 text-base font-semibold text-slate-900">3. SUBSCRIPTION CANCELLATIONS</h3>
              <p className="mb-2">3.1 Subscriptions may be cancelled at any time from Settings &gt; Subscription &gt; Cancel.</p>
              <p className="mb-2">3.2 Upon cancellation, the subscription remains active until the end of the current billing period. No prorated refund for unused days.</p>
              <p className="mb-4">3.3 Annual subscribers who cancel within the first 14 days receive a full refund minus the cost of any sessions attended.</p>

              <h3 className="mb-2 text-base font-semibold text-slate-900">4. REFUND PROCESSING</h3>
              <p className="mb-2">4.1 Refunds are processed via the original payment method (UPI, card, net banking).</p>
              <p className="mb-2">4.2 Standard processing time: 5-7 business days for bank refunds, instant for wallet credits.</p>
              <p className="mb-4">4.3 PhonePe transaction fees are non-refundable.</p>

              <h3 className="mb-2 text-base font-semibold text-slate-900">5. WALLET CREDITS</h3>
              <p className="mb-2">5.1 Wallet credits may be used for any MANAS360 service (sessions, subscriptions, premium content).</p>
              <p className="mb-2">5.2 Wallet credits are non-transferable and expire 90 days from issuance.</p>
              <p className="mb-4">5.3 Wallet credits cannot be redeemed for cash.</p>

              <h3 className="mb-2 text-base font-semibold text-slate-900">6. FRAUD PREVENTION</h3>
              <p className="mb-2">6.1 MANAS360 reserves the right to withhold refunds where:</p>
              <p className="mb-1">(a) Fraudulent activity is suspected;</p>
              <p className="mb-4">(b) Repeated refund abuse is detected.</p>

              <h3 className="mb-2 text-base font-semibold text-slate-900">7. DISPUTES</h3>
              <p className="mb-2">7.1 Refund disputes may be raised within 30 days of the transaction by contacting support@manas360.com.</p>
              <p className="mb-4">7.2 MANAS360's decision on refund disputes shall be final, subject to the dispute resolution mechanisms in applicable platform policies.</p>

              <h3 className="mb-2 text-base font-semibold text-slate-900">8. CHANGES TO THIS POLICY</h3>
              <p>
                8.1 We may update this Policy periodically to reflect legal, technical, or operational changes.
                Material changes will be notified via email and in-app notification. Continued accessing or using the
                Platform after notification constitutes acceptance of the revised Policy.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowTermsModal(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={acceptTermsFromModal}
                disabled={!termsScrolled}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                I have read and agree
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
