import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patient';
import { useWallet } from '../../hooks/useWallet';
import {
  clearCart,
  getCheckoutSummaryMinor,
  getPlanById,
  loadCart,
} from '../../lib/patientSubscriptionFlow';

export default function SubscriptionCheckoutPage() {
  const navigate = useNavigate();
  const { balance } = useWallet();
  const wallet = Number((balance as any)?.total_balance || 0);
  const [cart, setCart] = useState(loadCart());
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [canAcceptTerms, setCanAcceptTerms] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement | null>(null);

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

  const balanceMinor = wallet * 100;
  const applicableWalletMinor = Math.min(balanceMinor, summary.totalMinor);
  const finalTotalMinor = summary.totalMinor - applicableWalletMinor;

  const confirmAndPay = async () => {
    if (!acceptedTerms) {
      toast.error('Please confirm to continue.');
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

  const openTermsModal = () => {
    setShowTermsModal(true);
    setCanAcceptTerms(false);
  };

  const handleTermsScroll = () => {
    const node = termsScrollRef.current;
    if (!node) return;
    const reachedBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 8;
    if (reachedBottom) setCanAcceptTerms(true);
  };

  const acceptTermsFromModal = () => {
    if (!canAcceptTerms) return;
    setAcceptedTerms(true);
    setShowTermsModal(false);
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
            
            {applicableWalletMinor > 0 && (
              <div className="flex items-center justify-between font-medium text-teal-600">
                <span>Wallet Credits Applied</span>
                <span>- INR {(applicableWalletMinor / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base">
              <span className="font-bold">Grand Total (incl. GST)</span>
              <strong className="text-lg">INR {(finalTotalMinor / 100).toFixed(2)}</strong>
            </div>
          </div>

          <label className="mt-4 block text-sm text-slate-700">
            Promo Code (optional)
            <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>

          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              readOnly
              onClick={(event) => {
                event.preventDefault();
                openTermsModal();
              }}
            />
            <button
              type="button"
              onClick={openTermsModal}
              className="text-left underline text-emerald-700"
            >
              I agree to the Terms of Service, Privacy Policy, and Refund &amp; Cancellation Policy.
            </button>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/plans/addons')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Back to Add-ons</button>
            <button type="button" onClick={confirmAndPay} disabled={submitting} className="rounded-xl bg-[#4a6741] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? 'Processing...' : `Confirm & Pay INR ${(finalTotalMinor / 100).toFixed(2)}`}
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
              ref={termsScrollRef}
              onScroll={handleTermsScroll}
              className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700"
            >
              <p className="mb-3">1. You agree to use MANAS360 services responsibly and only for lawful wellness and care purposes.</p>
              <p className="mb-3">2. Your data will be processed according to platform privacy and security standards and applicable law.</p>
              <p className="mb-3">3. Billing, refunds, and cancellations are governed by the published policy and session timelines.</p>
              <p className="mb-3">4. You consent to platform communication, transaction records, and compliance-related auditing.</p>
              <p>5. By agreeing, you confirm you have read and understood the legal terms before payment.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowTermsModal(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={acceptTermsFromModal}
                disabled={!canAcceptTerms}
                className="rounded-lg bg-[#4a6741] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
