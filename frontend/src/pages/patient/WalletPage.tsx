import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';
import PatientWalletWidget from '../../components/patient/PatientWalletWidget';

const isSubscriptionActive = (subscription: any): boolean => {
  if (!subscription) return false;

  const status = String(subscription?.status || '').toLowerCase();
  const freeLike = Number(subscription?.price || 0) <= 0 || String(subscription?.planName || '').toLowerCase().includes('free');
  const activeLike = ['active', 'trial', 'trialing', 'grace', 'renewal_pending'].includes(status);

  if (subscription?.isActive === true || subscription?.active === true) return !freeLike;
  if (status === 'active' || status === 'trialing') return !freeLike;

  return activeLike && !freeLike;
};

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [subscription, walletBalance] = await Promise.all([
          patientApi.getSubscription().catch(() => null),
          patientApi.getWalletBalance().catch(() => null),
        ]);

        const subPayload = (subscription as any)?.data ?? subscription;
        setSubscriptionActive(isSubscriptionActive(subPayload));
        setWallet((walletBalance as any)?.data ?? walletBalance ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!subscriptionActive) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Wallet Access</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Subscribe to Play</h1>
        <p className="mt-2 text-sm text-slate-700">Wallet credits are unlocked with an active paid plan.</p>
        <Link to="/plans" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">
          Upgrade Plan
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Patient Wallet</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Your Wallet Credits</h1>
        <p className="mt-2 text-sm text-slate-600">Use credits won from Hit a Sixer to offset session costs where applicable.</p>
      </section>

      <PatientWalletWidget balance={wallet} loading={loading} />
    </div>
  );
}
