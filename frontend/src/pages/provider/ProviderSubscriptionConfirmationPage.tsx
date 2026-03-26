import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clearProviderCart } from '../../lib/providerSubscriptionFlow';

export default function ProviderSubscriptionConfirmationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const transactionId = params.get('transactionId') || params.get('id') || '';
  const mode = params.get('mode') || 'paid';

  useEffect(() => {
    clearProviderCart();
  }, []);

  return (
    <div className="min-h-screen bg-[#fffdf8] px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Go Back</button>
          <button type="button" onClick={() => navigate('/provider/dashboard', { replace: true })} className="rounded-lg border border-[#1f6f5f] bg-[#1f6f5f] px-3 py-1.5 text-xs font-semibold text-white">Home</button>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-2xl font-extrabold text-slate-900">Payment Successful</h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'free'
              ? 'Your profile is active with free lead plan.'
              : 'Platform access and lead plan are now active.'}
          </p>
          {transactionId && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Order ID: {transactionId}</p>
          )}

          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/provider/dashboard', { replace: true })} className="rounded-xl bg-[#1f6f5f] px-4 py-2 text-sm font-semibold text-white">Go to Dashboard</button>
            <button type="button" onClick={() => navigate('/provider/plans', { replace: true })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">View Plans</button>
          </div>
        </section>
      </div>
    </div>
  );
}
