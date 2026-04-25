import { useEffect, useState } from 'react';
import { AlertCircle, Clock, X, Loader2 } from 'lucide-react';
import { patientApi } from '../../../api/patient';

interface PendingRequestStepProps {
  appointmentRequestId: string;
  onAccepted: () => void;
  onCancel: () => void;
}

export default function PendingRequestStep({
  appointmentRequestId,
  onAccepted,
  onCancel,
}: PendingRequestStepProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [providerCount, setProviderCount] = useState(0);

  // Fetch initial request data
  useEffect(() => {
    const initial = async () => {
      try {
        const result = await patientApi.getPendingAppointmentRequests();
        const request = result.requests?.find((r: any) => r.id === appointmentRequestId);
        if (request && request.expiresAt) {
          setExpiresAt(new Date(request.expiresAt));
          // Count pending providers
          const providers = request.providers || [];
          const pendingCount = providers.filter((p: any) => p.status === 'PENDING').length;
          setProviderCount(pendingCount || 3);
        }
      } catch (err: any) {
        setError('Failed to load request details');
      }
    };
    initial();
  }, [appointmentRequestId]);

  // Poll for acceptance every 3 seconds
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await patientApi.getPaymentPendingRequest();
        if (result.hasPaymentPending) {
          // Provider accepted!
          setIsPolling(false);
          onAccepted();
        }
      } catch (err: any) {
        // Silently fail - keep polling
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isPolling, onAccepted]);

  // Timer countdown
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        setIsPolling(false);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(
          `${hours}h ${minutes}m ${seconds}s`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Step Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
            3
          </div>
          <h3 className="text-lg font-semibold text-charcoal">Waiting for confirmation</h3>
        </div>
        <p className="text-sm text-charcoal/60 ml-10">We're finding the perfect provider for you</p>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 flex-shrink-0 mt-0.5">
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-charcoal">Request sent to providers</h4>
            <p className="text-sm text-charcoal/70 mt-1">
              Your appointment request has been sent to {providerCount} provider{providerCount !== 1 ? 's' : ''}. We'll notify you as soon as one accepts.
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-amber-700">
            Expires in: {timeRemaining}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-calm-sage/15 bg-white/50 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">What happens next?</p>
        <ul className="space-y-2 text-sm text-charcoal/70">
          <li className="flex gap-2">
            <span className="text-teal-600 font-bold flex-shrink-0">1.</span>
            <span>Providers will review your request</span>
          </li>
          <li className="flex gap-2">
            <span className="text-teal-600 font-bold flex-shrink-0">2.</span>
            <span>The first one to accept gets your session</span>
          </li>
          <li className="flex gap-2">
            <span className="text-teal-600 font-bold flex-shrink-0">3.</span>
            <span>You'll get a payment action within 6 hours</span>
          </li>
          <li className="flex gap-2">
            <span className="text-teal-600 font-bold flex-shrink-0">4.</span>
            <span>Session is confirmed once you pay</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-calm-sage/20 px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-calm-sage/5"
        >
          <X className="h-4 w-4" />
          Cancel Request
        </button>
      </div>

      {/* Polling Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-charcoal/40">
        <div className="flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse delay-100" />
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse delay-200" />
        </div>
        <span>Checking for updates...</span>
      </div>
    </div>
  );
}
