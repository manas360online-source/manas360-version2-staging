import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patient';
import {
  clearCart,
  getCheckoutSummaryMinor,
  getPlanById,
  loadCart,
} from '../../lib/patientSubscriptionFlow';

export default function SubscriptionCheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(loadCart());
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loaded = loadCart();
    if (!loaded) {
      navigate('/plans', { replace: true });
      return;
    }
    setCart(loaded);
  }, [navigate]);

  const summary = useMemo(() => {
    if (!cart) return null;
    return getCheckoutSummaryMinor(cart);
  }, [cart]);

  if (!cart || !summary) return null;

  const plan = getPlanById(cart.planId);

  const confirmAndPay = async () => {
    if (!acceptedTerms) {
      toast.error('Please accept terms and privacy.');
      return;
    }

    setSubmitting(true);
    try {
      if (cart.planId === 'free') {
        await patientApi.upgradeSubscription({ planKey: 'free' });
        clearCart();
        navigate('/confirmation?mode=free', { replace: true });
        return;
      }

      const idempotencyKey = `patient_checkout:${plan.gatewayPlanKey}:${Date.now()}`;
      const payload = await patientApi.checkoutSubscription({
        planKey: plan.gatewayPlanKey,
        addons: { ...cart.addons } as Record<string, unknown>,
        subtotalMinor: summary.subtotalMinor,
        gstMinor: summary.gstMinor,
        totalMinor: summary.totalMinor,
        acceptedTerms: true,
        promoCode: promoCode || undefined,
        idempotencyKey,
      });

      const data = (payload as any)?.data ?? payload;
      const redirectUrl = String(data?.redirectUrl || '').trim();
      if (!redirectUrl) {
        throw new Error('Payment link not received.');
      }

      window.location.href = redirectUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to initiate payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffdf7] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Go Back</button>
          <button type="button" onClick={() => navigate('/patient/dashboard', { replace: true })} className="rounded-lg border border-[#4a6741] bg-[#4a6741] px-3 py-1.5 text-xs font-semibold text-white">Home</button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">Checkout</h1>
          <p className="mt-1 text-sm text-slate-600">GST 18% is charged extra on top of plan and add-on prices.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Platform Plan ({plan.name})</span><strong>INR {(summary.planMinor / 100).toFixed(2)}</strong></div>
            <div className="flex items-center justify-between"><span>Add-ons</span><strong>INR {(summary.addonsMinor / 100).toFixed(2)}</strong></div>
            <div className="flex items-center justify-between"><span>Subtotal (before GST)</span><strong>INR {(summary.subtotalMinor / 100).toFixed(2)}</strong></div>
            <div className="flex items-center justify-between"><span>GST (18%)</span><span>INR {(summary.gstMinor / 100).toFixed(2)}</span></div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base"><span className="font-bold">Grand Total (incl. GST)</span><strong className="text-lg">INR {(summary.totalMinor / 100).toFixed(2)}</strong></div>
          </div>

          <label className="mt-4 block text-sm text-slate-700">
            Promo Code (optional)
            <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>

          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            <span>I agree to terms and privacy.</span>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/plans/addons')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Back to Add-ons</button>
            <button type="button" onClick={confirmAndPay} disabled={submitting} className="rounded-xl bg-[#4a6741] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? 'Processing...' : `Confirm & Pay INR ${(summary.totalMinor / 100).toFixed(2)} with PhonePe`}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
