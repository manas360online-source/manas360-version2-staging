import { useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { patientApi } from '../../../api/patient';

interface PreBookingPaymentStepProps {
  selectedProviders: Array<{
    id: string;
    name: string;
    type: string;
    fee: number;
    score?: number;
    tier?: 'HOT' | 'WARM' | 'COLD';
    breakdown?: {
      expertise: number;
      communication: number;
      quality: number;
    };
  }>;
  selectedDateTime: {
    date: Date;
    time: string;
  };
  presetEntryType?: string;
  sourceFunnel?: string;
  timezoneRegion?: string;
  matchPreferences?: {
    concerns: string[];
    language: string;
    mode: string;
    context: 'Standard' | 'Corporate' | 'Night' | 'Buddy' | 'Crisis';
  };
  onBack: () => void;
  onCancel: () => void;
}

const getNriFixedFeeMinor = (entryType?: string): number | null => {
  if (entryType === 'nri_psychologist') return 2999 * 100;
  if (entryType === 'nri_psychiatrist') return 3499 * 100;
  if (entryType === 'nri_therapist') return 3599 * 100;
  return null;
};

export default function PreBookingPaymentStep({
  selectedProviders,
  selectedDateTime,
  presetEntryType,
  sourceFunnel,
  timezoneRegion,
  matchPreferences,
  onBack,
  onCancel,
}: PreBookingPaymentStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nriFixedFeeMinor = getNriFixedFeeMinor(presetEntryType);
  // Calculate fee (NRI fixed fee when preset flow, otherwise highest provider fee)
  const fee = nriFixedFeeMinor || Math.max(...selectedProviders.map((p) => p.fee), 69900);
  const feeInRupees = fee / 100;

  const handlePhonePePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedProviders.length) {
        setError('No provider selected for payment.');
        return;
      }

      const [hourRaw, minuteRaw] = selectedDateTime.time.split(':');
      const startHour = Number(hourRaw);
      const startMinute = Number(minuteRaw || 0);
      const startMinuteOfDay = startHour * 60 + startMinute;

      const availabilityPrefs = {
        daysOfWeek: [selectedDateTime.date.getDay()],
        timeSlots: [{ startMinute: startMinuteOfDay, endMinute: startMinuteOfDay + 30 }],
      };

      const appointmentPayload = {
        availabilityPrefs,
        providerIds: selectedProviders.map((provider) => provider.id),
        preferredSpecialization: selectedProviders[0]?.type,
        durationMinutes: presetEntryType === 'nri_psychiatrist' ? 30 : 50,
        sourceFunnel,
        presetEntryType,
        timezoneRegion,
        smartMatchSummary: {
          selectedDate: selectedDateTime.date.toISOString(),
          selectedTime: selectedDateTime.time,
          preferences: matchPreferences || {
            concerns: [],
            language: '',
            mode: '',
            context: 'Standard',
          },
        },
        rankedProviders: selectedProviders.map((provider) => ({
          providerId: provider.id,
          score: provider.score,
          tier: provider.tier,
          breakdown: provider.breakdown,
        })),
      };

      const response: any = await patientApi.createAppointmentRequest(appointmentPayload as any);
      const payload = response?.data ?? response;

      const paymentRequired = Boolean(payload?.paymentRequired);
      const merchantTransactionId = String(payload?.payment?.merchantTransactionId || '').trim();
      const redirectUrl = String(payload?.payment?.redirectUrl || '').trim();

      if (!paymentRequired || !merchantTransactionId || !redirectUrl) {
        setError('Unable to start payment for this booking request. Please try again.');
        return;
      }

      // Store pending smart-match context so PaymentStatus can finalize request post-payment.
      localStorage.setItem(
        `manas360.smartmatch.pending.${merchantTransactionId}`,
        JSON.stringify({
          ...appointmentPayload,
          payment: { merchantTransactionId },
        }),
      );

      // Redirect to PhonePe checkout page.
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err?.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Step Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            4
          </div>
          <h3 className="text-lg font-semibold text-charcoal">Confirm & Pay</h3>
        </div>
        <p className="text-sm text-charcoal/60 ml-10">Complete payment to finalize your booking</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Session Details Card */}
      <div className="rounded-lg border border-calm-sage/20 bg-white/50 p-4 space-y-3">
          <div>
            <p className="text-xs text-charcoal/60 uppercase tracking-wider font-semibold">
              Date & Time
            </p>
            <p className="text-sm font-semibold text-charcoal mt-1">
              {selectedDateTime.date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {' '}at {selectedDateTime.time}
            </p>
          </div>

          <div>
            <p className="text-xs text-charcoal/60 uppercase tracking-wider font-semibold">
              Providers
            </p>
            <p className="text-sm font-semibold text-charcoal mt-1">
              {selectedProviders.length} provider{selectedProviders.length !== 1 ? 's' : ''} selected
            </p>
            <div className="space-y-1 mt-2">
              {selectedProviders.map((provider) => (
                <p key={provider.id} className="text-xs text-charcoal/70">
                  • {provider.name} ({provider.type})
                </p>
              ))}
            </div>
          </div>

          <div className="border-t border-calm-sage/15 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-charcoal">Session Fee</p>
              <p className="text-lg font-bold text-teal-600">₹{feeInRupees.toFixed(0)}</p>
            </div>
            <p className="text-xs text-charcoal/60 mt-2">
              Booking will be sent to your selected providers after payment confirmation. The first provider to accept will deliver your session.
            </p>
            {nriFixedFeeMinor ? (
              <p className="text-xs text-blue-700 mt-2">
                Indian provider terms: fixed per-session price is applied for this consultation flow.
              </p>
            ) : null}
          </div>
      </div>

      {/* Payment Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 flex gap-3">
          <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold">Secure Payment</p>
            <p className="text-xs mt-1">Your payment is processed securely by PhonePe.</p>
          </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
          <button
            onClick={handlePhonePePayment}
            disabled={loading}
            className="w-full rounded-lg bg-teal-500 px-4 py-3 font-semibold text-white transition-all hover:bg-teal-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Processing...' : `Pay ₹${feeInRupees.toFixed(0)}`}
          </button>
          <button
            onClick={onBack}
            disabled={loading}
            className="w-full rounded-lg px-4 py-2 border border-calm-sage/20 text-charcoal font-medium hover:bg-calm-sage/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back to Providers
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-lg px-4 py-2 border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
      </div>
    </div>
  );
}
