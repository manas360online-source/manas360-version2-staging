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

        if (mode === 'provider') {
          const cart = loadProviderCart();
          if (cart) {
            setProviderCart(cart);
            if (!selectedPlanId) {
              selectedPlanId = PROVIDER_PLAN_MAP[cart.leadPlanId] || '';
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

        if (selectedPlanId) {
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
            <button type="button" onClick={() => { setShowTermsModal(true); setTermsScrolled(false); }} className="text-left underline text-emerald-700">
              I agree to the Terms of Service, Privacy Policy, and Refund &amp; Cancellation Policy.
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
              <h2 className="text-lg font-semibold text-slate-900">Terms & Conditions</h2>
              <button type="button" onClick={() => setShowTermsModal(false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
            </div>
            <p className="mb-2 text-xs text-slate-500">Read fully and scroll to the bottom to enable agreement.</p>
            <div
              onScroll={handleTermsScroll}
              className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700"
            >
              <p className="mb-3">1. Billing, refunds, and cancellations follow the published policy for the selected service type.</p>
              <p className="mb-3">2. Provider access, patient access, and marketplace usage are subject to role and compliance checks.</p>
              <p className="mb-3">3. Your transaction record may be used for reconciliation, audit, and subscription activation.</p>
              <p className="mb-3">4. You confirm the payment amount and plan selection before submitting the order.</p>
              <p>5. By agreeing, you acknowledge the service-specific terms shown on this checkout.</p>
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
