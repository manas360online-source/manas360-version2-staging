import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar as CalendarIcon, Clock, CreditCard, CheckCircle2 } from 'lucide-react';
import { patientApi } from '../../api/patient';

interface Provider {
  id: string;
  name: string;
  role?: string;
  sessionPrice?: number;
}

interface SlideOverBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onBookingSuccess: () => void;
}

type ProviderTimeSlot = {
  value: string;
  label: string;
  isAvailable: boolean;
};

const SLOT_VALUES = ['09:00', '10:30', '14:00', '16:00', '17:30'];

const toMinuteOfDay = (value: string): number => {
  const [h, m] = value.split(':').map(Number);
  return (h * 60) + (m || 0);
};

const toDisplayTime = (value: string): string => {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const normalizedHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(normalizedHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

export default function SlideOverBookingDrawer({
  isOpen,
  onClose,
  provider,
  onBookingSuccess,
}: SlideOverBookingDrawerProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [providerTimeSlots, setProviderTimeSlots] = useState<ProviderTimeSlot[]>(
    SLOT_VALUES.map((value) => ({ value, label: toDisplayTime(value), isAvailable: true })),
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionWarning, setShowSubscriptionWarning] = useState(false);

  // Reset state only when drawer is opened.
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedDate(null);
      setSelectedTime(null);
      setProviderTimeSlots(SLOT_VALUES.map((value) => ({ value, label: toDisplayTime(value), isAvailable: true })));
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !provider || !selectedDate) return;

    const checkProviderAvailability = async () => {
      setAvailabilityLoading(true);
      try {
        const providerType = String(provider.role || '').toUpperCase();
        const supportedProviderType = ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'].includes(providerType)
          ? providerType
          : undefined;

        const checkedSlots = await Promise.all(
          SLOT_VALUES.map(async (value) => {
            const startMinute = toMinuteOfDay(value);
            const response = await patientApi.getAvailableProvidersForSmartMatch(
              {
                daysOfWeek: [selectedDate.getDay()],
                timeSlots: [{ startMinute, endMinute: startMinute + 30 }],
              },
              supportedProviderType,
              { context: 'Standard' },
            );

            const providers = Array.isArray(response?.providers) ? response.providers : [];
            const matched = providers.some((entry: any) => String(entry?.id) === String(provider.id));
            return {
              value,
              label: toDisplayTime(value),
              isAvailable: matched,
            };
          }),
        );

        setProviderTimeSlots(checkedSlots);
        setSelectedTime((prev) => {
          if (!prev) return prev;
          const stillAvailable = checkedSlots.some((slot) => slot.value === prev && slot.isAvailable);
          return stillAvailable ? prev : null;
        });
      } catch {
        setProviderTimeSlots(SLOT_VALUES.map((value) => ({ value, label: toDisplayTime(value), isAvailable: true })));
      } finally {
        setAvailabilityLoading(false);
      }
    };

    void checkProviderAvailability();
  }, [isOpen, provider, selectedDate]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !provider) return null;

  // Available booking dates (next 7 days starting tomorrow)
  const availableDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsLoading(true);
    setError(null);
    setShowSubscriptionWarning(false);
    try {
      // Create a JS Date composed of selectedDate + selectedTime (24-hour HH:mm)
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);
      // Call the existing patientApi endpoint to create the therapy booking
      await patientApi.bookSession({
        providerId: provider.id,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: 50,
      });
      // Initiate session payment so backend returns a gateway redirect URL
      try {
        const amountRupees = provider.sessionPrice || 1500;
        const amountMinor = Math.round(Number(amountRupees) * 100); // convert to paise
        try {
          const paymentPayload: any = await patientApi.createSessionPayment({ providerId: provider.id, amountMinor });
          const redirectUrl = paymentPayload?.redirectUrl || paymentPayload?.data?.redirectUrl;
          if (redirectUrl) {
            // Redirect user to payment gateway
            window.location.href = redirectUrl;
            return;
          }
        } catch (payErr: any) {
          // If server denies booking due to missing subscription, show warning and button
          const status = Number(payErr?.response?.status || 0);
          const msg = String(payErr?.response?.data?.message || payErr?.message || '').toLowerCase();
          if (status === 403 || msg.includes('subscription required') || msg.includes('subscription')) {
            setShowSubscriptionWarning(true);
            return;
          }
          console.warn('Session payment initiation failed', payErr);
        }
      } catch (payErr: any) {
        // If payment initiation fails, fall back to showing success + allow manual handling
        console.warn('Session payment initiation failed', payErr);
      }
      // If no redirect required, show success UI and close drawer
      setStep(3); // Show Success UI
      // Notify parent to refresh the Care Team / Next Up state
      setTimeout(() => {
        onBookingSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to confirm booking.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-calm-sage/15 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Book a Session</h2>
            <p className="text-sm text-charcoal/60">with {provider.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-charcoal/40 transition-colors hover:bg-calm-sage/10 hover:text-charcoal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {showSubscriptionWarning && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-col items-center">
              <div className="mb-2 font-semibold">Subscribe to platform fee to book a session.</div>
              <button
                className="rounded-lg bg-teal-600 px-4 py-2 text-white font-semibold mt-2 hover:bg-teal-700 transition-colors"
                onClick={() => {
                  const returnTo = window.location.pathname + window.location.search + window.location.hash;
                  // Use the provided subscription plan link or fallback to /plans
                  window.location.href = `http://localhost:5173/payment/status?id=SUB_653d1e79_1774602028060&status=SUCCESS#/plans?returnTo=${encodeURIComponent(returnTo)}`;
                }}
              >
                Subscribe to Platform Fee
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-charcoal/50">
                  <CalendarIcon className="mr-2 inline h-4 w-4" />
                  Select a Date
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {availableDates.map((date, i) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-colors ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-calm-sage/20 text-charcoal/70 hover:border-teal-300 hover:bg-teal-50/50'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className={`text-lg font-bold ${isSelected ? 'text-teal-700' : 'text-charcoal'}`}>
                          {date.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDate && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-charcoal/50">
                    <Clock className="mr-2 inline h-4 w-4" />
                    Select a Time
                  </h3>
                  {availabilityLoading ? (
                    <p className="mb-3 text-xs text-charcoal/60">Checking live availability for this provider...</p>
                  ) : null}
                  <div className="grid grid-cols-3 gap-2">
                    {providerTimeSlots.map((slot) => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          if (!slot.isAvailable || availabilityLoading) return;
                          setSelectedTime(slot.value);
                        }}
                        disabled={!slot.isAvailable || availabilityLoading}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedTime === slot.value
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : !slot.isAvailable
                              ? 'border-calm-sage/15 bg-calm-sage/5 text-charcoal/35 cursor-not-allowed'
                              : 'border-calm-sage/20 text-charcoal/70 hover:border-teal-300 hover:bg-teal-50/50'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                  {!availabilityLoading && providerTimeSlots.every((slot) => !slot.isAvailable) ? (
                    <p className="mt-3 rounded-lg border border-calm-sage/20 bg-calm-sage/5 px-3 py-2 text-xs text-charcoal/65">
                      This provider has no available slots for the selected date. Please choose another date.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="rounded-xl border border-calm-sage/15 bg-white/50 p-5">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-charcoal/50">
                  <CreditCard className="mr-2 inline h-4 w-4" />
                  Booking Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Provider</span>
                    <span className="font-medium text-charcoal">{provider.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Date</span>
                    <span className="font-medium text-charcoal">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Time</span>
                    <span className="font-medium text-charcoal">{selectedTime ? toDisplayTime(selectedTime) : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Duration</span>
                    <span className="font-medium text-charcoal">50 minutes</span>
                  </div>
                  
                  <div className="my-4 border-t border-dashed border-calm-sage/30" />
                  
                  <div className="flex justify-between font-semibold text-lg items-center">
                    <span className="text-charcoal">Total Due</span>
                    <span className="text-teal-600">₹{provider.sessionPrice || 1500}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">24-Hour Cancellation Policy</p>
                <p className="mt-1 text-xs opacity-90">Appointments cancelled with less than 24 hours notice may be subject to a cancellation fee.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center animate-in zoom-in-95 duration-500">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-charcoal">Session Confirmed!</h3>
                <p className="mt-2 text-sm text-charcoal/60 max-w-[250px] mx-auto">
                  Your appointment with {provider.name} has been successfully scheduled.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 3 && (
          <div className="border-t border-calm-sage/15 bg-white p-6">
            <div className="flex gap-3">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-calm-sage/25 px-4 py-3 text-sm font-semibold text-charcoal/70 transition-colors hover:bg-calm-sage/5 disabled:opacity-50"
                >
                  Back
                </button>
              )}
              
              {step === 1 ? (
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedDate || !selectedTime}
                  className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Continue to Wrap-Up
                </button>
              ) : (
                <button
                  onClick={() => void handleConfirmBooking()}
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 relative overflow-hidden group"
                >
                  {isLoading ? 'Confirming...' : 'Confirm Booking'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
