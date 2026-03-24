import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Home, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

type PaymentState = 'loading' | 'pending' | 'success' | 'failed';

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [state, setState] = useState<PaymentState>('loading');
  const [retryCount, setRetryCount] = useState(0);

  const statusFromUrl = (searchParams.get('status') || searchParams.get('code') || '').toUpperCase();
  const transactionId = searchParams.get('transactionId') || searchParams.get('id') || '';
  const isProviderTransaction = transactionId.startsWith('PROV_');

  useEffect(() => {
    // Initial state determination
    if (statusFromUrl === 'SUCCESS' || statusFromUrl === 'PAYMENT_SUCCESS') {
      setState('success');
    } else if (statusFromUrl === 'PENDING' || statusFromUrl === 'INTERNAL_SERVER_ERROR' || !statusFromUrl) {
      // If PhonePe returned PENDING or we don't have a status yet, start polling
      setState('pending');
    } else {
      setState('failed');
    }
  }, [statusFromUrl]);

  useEffect(() => {
    if (state !== 'pending' || !transactionId) return;

    const pollStatus = async () => {
      try {
        const response = await axios.get(`/api/v1/payments/phonepe/status/${transactionId}`, { withCredentials: true });
        const data = response.data?.data;
        const stateFromApi = String(data?.data?.state || data?.code || '').toUpperCase();

        if (stateFromApi === 'COMPLETED' || stateFromApi === 'PAYMENT_SUCCESS') {
          setState('success');
        } else if (stateFromApi === 'FAILED' || stateFromApi === 'DECLINED' || stateFromApi === 'PAYMENT_ERROR') {
          setState('failed');
        } else {
          // Still pending, increment retry count to trigger effect again
          if (retryCount < 10) {
            setTimeout(() => setRetryCount(prev => prev + 1), 5000);
          } else {
            // Max retries reached
            setState('failed');
          }
        }
      } catch (err) {
        console.error('Status poll failed', err);
        // On error, we don't stop immediately, just wait for next poll
        if (retryCount < 10) {
          setTimeout(() => setRetryCount(prev => prev + 1), 5000);
        } else {
          setState('failed');
        }
      }
    };

    pollStatus();
  }, [state, transactionId, retryCount]);

  useEffect(() => {
    if (state !== 'success') return;

    const timer = window.setTimeout(() => {
      void checkAuth({ force: true }).finally(() => {
        navigate(isProviderTransaction ? '/provider/dashboard' : '/patient/dashboard', { replace: true });
      });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [state, checkAuth, navigate, isProviderTransaction]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm font-medium text-slate-600">Verifying your payment...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        {state === 'success' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Payment Successful!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your subscription has been activated. You now have full access to your plan features.
            </p>
            {transactionId && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500">
                Transaction: {transactionId}
              </p>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate(isProviderTransaction ? '/provider/dashboard' : '/patient/dashboard', { replace: true })}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                <Home className="h-4 w-4" /> Go to Dashboard
              </button>
            </div>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Payment Processing</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your payment is being verified by PhonePe. This usually takes a few seconds. Do not refresh or go back.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              <p className="text-xs text-slate-400">Waiting for confirmation (Attempt {retryCount}/10)...</p>
            </div>
            {transactionId && (
              <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500">
                Transaction: {transactionId}
              </p>
            )}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => navigate(isProviderTransaction ? '/provider/dashboard' : '/patient/dashboard', { replace: true })}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Go to Dashboard (Check back later)
              </button>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Payment Failed</h1>
            <p className="mt-2 text-sm text-slate-500">
              Something went wrong with your payment. No charges have been applied. Please try again.
            </p>
            {transactionId && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500">
                Transaction: {transactionId}
              </p>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate(isProviderTransaction ? '/provider/subscription' : '/patient/pricing', { replace: true })}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <ArrowLeft className="h-4 w-4" /> Retry Payment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
