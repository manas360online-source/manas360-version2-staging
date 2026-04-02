import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { checkoutProviderSubscription } from '../../api/provider';
import { useWallet } from '../../hooks/useWallet';
import {
  clearProviderCart,
  formatInr,
  getProviderCheckoutSummaryMinor,
  loadProviderCart,
} from '../../lib/providerSubscriptionFlow';

export default function ProviderSubscriptionCheckoutPage() {
  const navigate = useNavigate();
  const { balance } = useWallet();
  const wallet = Number((balance as any)?.total_balance || 0);
  const [cart, setCart] = useState(loadProviderCart());
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [canAcceptTerms, setCanAcceptTerms] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loaded = loadProviderCart();
    if (!loaded) {
      navigate('/provider/plans', { replace: true });
      return;
    }
    setCart(loaded);
  }, [navigate]);

  const summary = useMemo(() => {
    if (!cart) return null;
    return getProviderCheckoutSummaryMinor(cart);
  }, [cart]);

  if (!cart || !summary) return null;

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
      const idempotencyKey = `provider_checkout:${cart.leadPlanId}:${Date.now()}`;
      const result = await checkoutProviderSubscription({
        leadPlanKey: cart.leadPlanId,
        platformCycle: cart.platformCycle,
        addons: cart.addons,
        subtotalMinor: summary.subtotalMinor,
        gstMinor: summary.gstMinor,
        totalMinor: summary.totalMinor,
        acceptedTerms: true,
        promoCode: promoCode || undefined,
        idempotencyKey,
      });

      const redirectUrl = String((result as any)?.redirectUrl || '').trim();
      if (!redirectUrl) {
        clearProviderCart();
        navigate('/provider/confirmation?mode=activated', { replace: true });
        return;
      }

      window.location.href = redirectUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to start checkout.');
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
    <div className="min-h-screen bg-[#fffdf8] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Go Back</button>
          <button type="button" onClick={() => navigate('/provider/dashboard', { replace: true })} className="rounded-lg border border-[#1f6f5f] bg-[#1f6f5f] px-3 py-1.5 text-xs font-semibold text-white">Home</button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">Provider Checkout</h1>
          <p className="mt-1 text-sm text-slate-600">Platform access + lead plan + marketplace add-ons. GST 18% is charged extra.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Platform Access ({cart.platformCycle})</span><strong>{formatInr(summary.platformMinor)}</strong></div>
            <div className="flex items-center justify-between"><span>Lead Plan ({cart.leadPlanId})</span><strong>{formatInr(summary.leadPlanMinor)}</strong></div>
            <div className="flex items-center justify-between"><span>Marketplace Add-ons</span><strong>{formatInr(summary.addonsMinor)}</strong></div>
            <div className="flex items-center justify-between"><span>Subtotal (before GST)</span><strong>{formatInr(summary.subtotalMinor)}</strong></div>
            <div className="flex items-center justify-between"><span>GST (18%)</span><span>{formatInr(summary.gstMinor)}</span></div>
            
            {applicableWalletMinor > 0 && (
              <div className="flex items-center justify-between font-medium text-teal-600">
                <span>Wallet Credits Applied</span>
                <span>- {formatInr(applicableWalletMinor)}</span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base">
              <span className="font-bold">Total</span>
              <strong className="text-lg">{formatInr(finalTotalMinor)}</strong>
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
            <button type="button" onClick={() => navigate('/provider/plans/addons')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Back to Add-ons</button>
            <button type="button" onClick={confirmAndPay} disabled={submitting} className="rounded-xl bg-[#1f6f5f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? 'Processing...' : `Confirm & Pay ${formatInr(finalTotalMinor)} with PhonePe`}
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
              <p className="mb-3">1. Provider access and platform usage are subject to legal and professional policy compliance.</p>
              <p className="mb-3">2. Patient privacy, data security, and confidentiality obligations apply to every session and workflow.</p>
              <p className="mb-3">3. Billing, lead plans, add-ons, cancellations, and refunds follow current commercial policy terms.</p>
              <p className="mb-3">4. Compliance and quality controls may audit provider activity to maintain patient safety standards.</p>
              <p>5. By agreeing, you confirm full understanding of terms before submitting payment.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowTermsModal(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={acceptTermsFromModal}
                disabled={!canAcceptTerms}
                className="rounded-lg bg-[#1f6f5f] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
