import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clearCart } from '../../lib/patientSubscriptionFlow';

export default function SubscriptionConfirmationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const transactionId = params.get('transactionId') || params.get('id') || '';
  const mode = params.get('mode') || 'paid';

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="min-h-screen bg-[#fffdf7] px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Go Back</button>
          <button type="button" onClick={() => navigate('/patient/dashboard', { replace: true })} className="rounded-lg border border-[#4a6741] bg-[#4a6741] px-3 py-1.5 text-xs font-semibold text-white">Home</button>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-2xl font-extrabold text-slate-900">Payment Successful</h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'free' ? 'Your free plan is now active.' : 'Your subscription is now active and trial has started.'}
          </p>
          {transactionId && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Order ID: {transactionId}</p>
          )}

          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/patient/dashboard', { replace: true })} className="rounded-xl bg-[#4a6741] px-4 py-2 text-sm font-semibold text-white">Go to Dashboard</button>
            <button type="button" onClick={() => navigate('/plans', { replace: true })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">View Plans</button>
          </div>
        </section>
      </div>
    </div>
  );
}
