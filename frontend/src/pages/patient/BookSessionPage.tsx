import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientApi } from '../../api/patient';

const formatSlotLabel = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isSubscriptionActive = (subscription: any): boolean => {
  if (!subscription) return false;
  const status = String(subscription?.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing') return true;
  if (subscription?.isActive === true || subscription?.active === true) return true;
  return false;
};

// TODO(payment-gateway): Set VITE_PAYMENT_GATEWAY_DECIDED=true after final gateway integration.
// Until then, keep test payment bypass enabled so booking flow development can continue.
const PAYMENT_GATEWAY_DECIDED = import.meta.env.VITE_PAYMENT_GATEWAY_DECIDED === 'true';

const loadRazorpayScript = async (): Promise<boolean> => {
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BookSessionPage() {
  const { providerId = '' } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<any>(null);
  const [slot, setSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferredTime, setPreferredTime] = useState(false);
  const [preferredWindow, setPreferredWindow] = useState('Evenings (6-9 PM)');
  const [hasPlatformAccess, setHasPlatformAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const availableSlots = useMemo(() => (
    Array.isArray(provider?.available_slots)
      ? provider.available_slots.map((value: unknown) => String(value)).filter(Boolean)
      : []
  ), [provider]);

  const inferProviderType = (): string => {
    const providerRole = String(provider?.role || '').toLowerCase();
    const providerType = String(provider?.providerType || '').toLowerCase();
    if (providerType === 'psychiatrist' || providerRole.includes('psychiat')) return 'psychiatrist';
    if (providerType === 'clinical-psychologist' || providerRole.includes('psycholog')) return 'clinical-psychologist';

    const specialization = String(provider?.specialization || '').toLowerCase();
    if (specialization.includes('psychiat')) return 'psychiatrist';
    if (specialization.includes('clinical')) return 'clinical-psychologist';
    return 'specialized-therapist';
  };

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      try {
        const [providerRes, subscriptionRes] = await Promise.all([
          patientApi.getProvider(providerId),
          patientApi.getSubscription().catch(() => null),
        ]);
        const p = providerRes.data ?? providerRes;
        setProvider(p);
        const nextSlot = Array.isArray(p.available_slots) ? String(p.available_slots[0] || '') : '';
        setSlot(nextSlot);

        const subscription = subscriptionRes ? ((subscriptionRes as any).data ?? subscriptionRes) : null;
        setHasPlatformAccess(isSubscriptionActive(subscription));
      } finally {
        setCheckingAccess(false);
      }
    })();
  }, [providerId]);

  useEffect(() => {
    if (!availableSlots.length) {
      if (slot) setSlot('');
      return;
    }

    if (!availableSlots.includes(slot)) {
      setSlot(availableSlots[0]);
    }
  }, [availableSlots, slot]);

  const baseAmountMinor = useMemo(() => Number(provider?.session_rate || 150000), [provider]);
  const amountMinor = useMemo(
    () => (preferredTime ? Math.round(baseAmountMinor * 1.2) : baseAmountMinor),
    [baseAmountMinor, preferredTime],
  );
  const testPaymentMode = !PAYMENT_GATEWAY_DECIDED;
  const canUseDevPaidFlow = import.meta.env.DEV || testPaymentMode;

  const onDevMarkAsPaid = async () => {
    if (!providerId || !slot) return;
    if (!availableSlots.includes(slot)) {
      setError('Select an available provider slot before continuing.');
      return;
    }
    if (!hasPlatformAccess) {
      navigate('/patient/pricing');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const initRes = await patientApi.bookSession({
        providerId,
        scheduledAt: slot,
        amountMinor,
        providerType: inferProviderType(),
        preferredTime,
        preferredWindow,
      });
      const payload = initRes.data ?? initRes;

      await patientApi.verifyPayment({
        razorpay_order_id: String(payload.order_id),
        razorpay_payment_id: `devpay_${Date.now()}`,
        razorpay_signature: 'dev_signature_bypass',
      });

      navigate('/patient/sessions');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Dev payment simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const onBook = async () => {
    if (!providerId || !slot) return;
    if (!availableSlots.includes(slot)) {
      setError('Select an available provider slot before continuing.');
      return;
    }
    if (!hasPlatformAccess) {
      setError('Platform Access is required before booking a paid session.');
      navigate('/patient/pricing');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        setError('Unable to load Razorpay checkout. Please try again.');
        return;
      }

      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        setError('Razorpay key is not configured in frontend environment.');
        return;
      }

      const initRes = await patientApi.bookSession({
        providerId,
        scheduledAt: slot,
        amountMinor,
        providerType: inferProviderType(),
        preferredTime,
        preferredWindow,
      });
      const payload = initRes.data ?? initRes;

      const options = {
        key,
        amount: Number(payload.amount),
        currency: String(payload.currency || 'INR'),
        name: 'MANAS360',
        description: 'Therapy Session Booking',
        order_id: String(payload.order_id),
        prefill: {
          name: provider?.name || 'Patient',
        },
        theme: {
          color: '#111827',
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await patientApi.verifyPayment(response);
            navigate('/patient/sessions');
          } catch (verifyError: any) {
            setError(verifyError?.response?.data?.message || 'Payment captured but verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      if (!window.Razorpay) {
        setError('Razorpay SDK unavailable.');
        return;
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (!provider) return <div className="responsive-page"><div className="responsive-container">Loading booking...</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Book Session</h1>
      {checkingAccess ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Checking platform access...</div>
      ) : !hasPlatformAccess ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
          <p className="font-semibold">Platform Access required before provider booking.</p>
          <p className="mt-1 text-xs text-indigo-800">Complete platform activation first. Provider session fee is paid separately during booking.</p>
          <button
            type="button"
            onClick={() => navigate('/patient/pricing')}
            className="mt-2 inline-flex min-h-[34px] items-center rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Activate Platform Access
          </button>
        </div>
      ) : null}
      {canUseDevPaidFlow && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {testPaymentMode
            ? 'Test payment mode: gateway checkout is bypassed. Use test completion to continue booking flow.'
            : 'Development mode: real Razorpay payment is optional. Use Paid (Dev) to simulate a successful payment.'}
        </div>
      )}
      <p>Provider: {provider.name}</p>
      <label className="block">
        <span className="mb-1 block text-sm">Select Slot</span>
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          disabled={!availableSlots.length}
          className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {availableSlots.length === 0 ? (
            <option value="">No active booking hours available</option>
          ) : (
            availableSlots.map((s: string) => <option key={s} value={s}>{formatSlotLabel(s)}</option>)
          )}
        </select>
      </label>
      {availableSlots.length === 0 && (
        <p className="text-sm text-amber-700">
          This provider has not opened any bookable hours in the next 7 days yet.
        </p>
      )}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
        <p className="text-sm font-medium text-indigo-900">Premium Scheduling</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-700">Standard Time</span>
          <button
            type="button"
            role="switch"
            aria-checked={preferredTime}
            onClick={() => setPreferredTime((prev) => !prev)}
            className={`relative h-6 w-11 rounded-full transition ${preferredTime ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${preferredTime ? 'left-5' : 'left-0.5'}`} />
          </button>
          <span className="text-sm font-medium text-indigo-800">Preferred Time (+20%)</span>
        </div>
        {preferredTime ? (
          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-slate-600">Preferred Window</span>
            <select value={preferredWindow} onChange={(e) => setPreferredWindow(e.target.value)} className="w-full rounded border border-slate-300 p-2 text-sm">
              <option value="Evenings (6-9 PM)">Evenings (6-9 PM)</option>
              <option value="Weekends">Weekends</option>
              <option value="Early mornings">Early mornings</option>
            </select>
          </label>
        ) : null}
      </div>
      <p className="text-sm">Base Fee: ₹{(baseAmountMinor / 100).toFixed(0)}</p>
      <p className="text-sm font-semibold text-indigo-800">Final Session Fee: ₹{(amountMinor / 100).toFixed(0)}{preferredTime ? ` (${preferredWindow})` : ''}</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button disabled={loading || !slot || !hasPlatformAccess || checkingAccess || !availableSlots.length} onClick={onBook} className="responsive-action-btn rounded-xl bg-slate-900 text-white disabled:opacity-60">{loading ? 'Processing...' : 'Proceed to Pay'}</button>
        {canUseDevPaidFlow && (
          <button
            disabled={loading || !slot || !hasPlatformAccess || checkingAccess || !availableSlots.length}
            onClick={onDevMarkAsPaid}
            className="responsive-action-btn rounded-xl bg-emerald-700 text-white disabled:opacity-60"
          >
            {loading ? 'Processing...' : testPaymentMode ? 'Skip Payment (Test)' : 'Paid (Dev)'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
