import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, Home, Copy, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { http } from '../../lib/http';

/**
 * UNIVERSAL PAYMENT SUCCESS & INVOICE PAGE
 * ========================================
 * Single success page for all payment types:
 * - Provider subscriptions
 * - Patient subscriptions
 * - Any future payment type
 *
 * Route: /payment-success?type=provider&planId=lead-basic
 * Route: /payment-success?type=patient&planId=patient-1month
 *
 * Features:
 * - Beautiful invoice display
 * - Download invoice as PDF (optional)
 * - Transaction details
 * - Return to appropriate dashboard
 * - Database confirmation of plan activation
 */

interface PaymentDetails {
  orderId: string;
  type: 'provider' | 'patient';
  planId: string;
  planName: string;
  amount: number; // with GST
  baseAmount: number;
  gstAmount: number;
  walletUsed: number;
  paidAmount: number;
  paymentMethod: string;
  transactionId: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  timestamp: string;
  features?: string[];
  validUntil?: string;
}

const resolveMoney = (major: unknown, minor: unknown): number => {
  const majorNum = Number(major);
  if (Number.isFinite(majorNum)) return majorNum;

  const minorNum = Number(minor);
  if (Number.isFinite(minorNum)) return minorNum / 100;

  return 0;
};

const normalizePaymentDetails = (raw: any, fallback: { type: string; planId: string | null; orderId: string | null }): PaymentDetails => {
  const base = resolveMoney(raw?.baseAmount, raw?.baseAmountMinor);
  const gst = resolveMoney(raw?.gstAmount, raw?.gstMinor);
  const total = resolveMoney(raw?.amount ?? raw?.totalAmount ?? raw?.finalAmount, raw?.totalAmountMinor ?? raw?.finalAmountMinor);
  const wallet = resolveMoney(raw?.walletUsed, raw?.walletUsedMinor);

  return {
    orderId: String(raw?.orderId || raw?.id || fallback.orderId || ''),
    type: (String(raw?.type || fallback.type || 'patient').toLowerCase() === 'provider' ? 'provider' : 'patient'),
    planId: String(raw?.planId || fallback.planId || ''),
    planName: String(raw?.planName || raw?.planId || fallback.planId || 'Selected Plan'),
    amount: total,
    baseAmount: base,
    gstAmount: gst,
    walletUsed: wallet,
    paidAmount: total,
    paymentMethod: String(raw?.paymentMethod || 'PhonePe'),
    transactionId: String(raw?.transactionId || raw?.phonepeTransactionId || raw?.id || fallback.orderId || ''),
    status: (String(raw?.status || 'COMPLETED').toUpperCase() as PaymentDetails['status']),
    timestamp: String(raw?.completedAt || raw?.updatedAt || raw?.createdAt || new Date().toISOString()),
    features: Array.isArray(raw?.features) ? raw.features : undefined,
    validUntil: raw?.validUntil ? String(raw.validUntil) : undefined,
  };
};

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const type = searchParams.get('type') || (location.pathname.startsWith('/provider') ? 'provider' : 'patient');
  const planId = searchParams.get('planId');
  const transactionId = searchParams.get('transactionId');

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Fetch and verify payment
  useEffect(() => {
    const verifyPayment = async () => {
      if (!transactionId) {
        setError('Transaction ID not found');
        setLoading(false);
        return;
      }

      try {
        const response = await http.get('/v1/payments/universal/verify', {
          params: { orderId: transactionId, type, planId },
        });

        if (!response?.data) {
          throw new Error('Failed to verify payment');
        }

        const data = response.data;
        const rawPayment = data?.data?.payment || data?.payment || data;
        setPayment(normalizePaymentDetails(rawPayment, { type, planId, orderId: transactionId }));
      } catch (err: any) {
        setError(err?.message || 'Failed to verify payment');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [transactionId, type, planId]);

  // Handle invoice download
  const handleDownloadInvoice = async () => {
    if (!payment || !transactionId) return;

    setDownloadingPDF(true);
    try {
      const response = await http.get(`/v1/payments/universal/invoice/${transactionId}`, {
        responseType: 'blob',
      });

      if (!response?.data) {
        throw new Error('Failed to generate invoice');
      }

      // Get PDF blob
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${transactionId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (err: any) {
      toast.error('Failed to download invoice');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Copy transaction ID
  const copyTransactionId = () => {
    if (transactionId) {
      navigator.clipboard.writeText(transactionId);
      toast.success('Transaction ID copied');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="inline-block animate-spin text-emerald-600 mb-4" size={40} />
          <p className="text-slate-600 font-medium">Verifying payment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-red-200">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-red-900 mb-2">Payment Verification Failed</h2>
              <p className="text-red-700">{error || 'Unable to verify your payment'}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => navigate(`/universal/checkout?type=${type}${planId ? `&planId=${planId}` : ''}`)} variant="secondary" className="w-full">
                Try Again
              </Button>
              <Button
                onClick={() => navigate(type === 'provider' ? '/provider/plans' : '/plans')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Back to Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboardRoute = type === 'provider' ? '/provider/dashboard' : '/patient/dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-6 p-4 bg-emerald-100 rounded-full animate-bounce">
            <CheckCircle2 className="text-emerald-600" size={48} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
          <p className="text-slate-600 text-lg">Your plan has been activated</p>
        </div>

        {/* Main Invoice Card */}
        <Card className="mb-8 shadow-lg border-emerald-200">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-emerald-900">{payment.planName}</CardTitle>
                <p className="text-emerald-700 text-sm mt-1">Activation Successful</p>
              </div>
              <Badge className="bg-emerald-600 text-white text-base px-4 py-2">
                {payment.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-8">
            {/* Receipt Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-200">
              {/* Left Column: Plan Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                  Plan Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Plan Type</p>
                    <p className="font-semibold text-slate-900 capitalize">
                      {type} {type === 'provider' ? 'Lead' : 'Subscription'} Plan
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Plan ID</p>
                      <p className="font-mono text-slate-900 text-sm">{payment.planId}</p>
                  </div>
                  {payment.validUntil && (
                    <div>
                      <p className="text-slate-600 text-sm mb-1">Valid Until</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(payment.validUntil).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Transaction Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                  Transaction Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Transaction ID</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-slate-900 text-sm font-semibold">
                        {(payment.transactionId || transactionId || '').slice(0, 12)}...
                      </p>
                      <button
                        onClick={copyTransactionId}
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        title="Copy full ID"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Payment Method</p>
                    <p className="font-semibold text-slate-900">{payment.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Date & Time</p>
                    <p className="font-semibold text-slate-900">
                      {new Date(payment.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-8 pb-8 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                Amount Breakdown
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Base Amount</span>
                  <span className="font-semibold text-slate-900">₹{payment.baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-orange-600">
                  <span>GST (18%)</span>
                  <span className="font-semibold">₹{payment.gstAmount.toFixed(2)}</span>
                </div>
                {payment.walletUsed > 0 && (
                  <div className="flex justify-between items-center text-blue-600">
                    <span>Wallet Used</span>
                    <span className="font-semibold">- ₹{payment.walletUsed.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Paid</span>
                  <span className="text-xl font-bold text-emerald-600">
                    ₹{payment.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            {payment.features && payment.features.length > 0 && (
              <div className="mb-8 pb-8 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-4">
                  Included Features
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {payment.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <h4 className="font-bold text-emerald-900 mb-2">What's Next?</h4>
              <p className="text-emerald-800 text-sm leading-relaxed">
                Your plan is now active. You can access all features immediately. An invoice has
                been sent to your registered email address.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleDownloadInvoice}
            disabled={downloadingPDF}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            {downloadingPDF ? (
              <>
                <Loader className="animate-spin" size={18} />
                Generating...
              </>
            ) : (
              <>
                <Download size={18} />
                Download Invoice
              </>
            )}
          </Button>

          <Button
            onClick={() => navigate(dashboardRoute)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Go to Dashboard
          </Button>

          <Button
            onClick={() => navigate('/')}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Back to Home
          </Button>
        </div>

        {/* Support Info */}
        <div className="mt-12 p-6 bg-white rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-900 mb-2">Need Help?</h4>
          <p className="text-slate-600 text-sm mb-4">
            If you have any questions about your plan or billing, please contact our support team.
          </p>
          <a
            href="mailto:support@manas360.com"
            className="text-emerald-600 font-medium hover:text-emerald-700"
          >
            support@manas360.com
          </a>
        </div>
      </div>
    </div>
  );
}
