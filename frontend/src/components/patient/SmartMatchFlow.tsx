import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProviderSelectionStep from './steps/ProviderSelectionStep';
import PendingRequestStep from './steps/PendingRequestStep';
import PreBookingPaymentStep from './steps/PreBookingPaymentStep';
import CalendarSelection from './CalendarSelection';
import { patientApi } from '../../api/patient';

interface SmartMatchFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProviderType?: 'ALL' | 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH';
  lockProviderType?: boolean;
  presetEntryType?: string;
  sourceFunnel?: string;
  timezoneRegion?: string;
}

type FlowStep = 'calendar' | 'domain-selection' | 'provider-selection' | 'pre-payment' | 'pending';

interface CalendarSelection {
  date: Date;
  time: string;
}

interface SelectedProvider {
  id: string;
  name: string;
  type: string;
  fee: number;
  score?: number;
  tier?: 'HOT' | 'WARM' | 'COLD';
  matchBand?: 'PLATINUM' | 'HOT' | 'WARM' | 'COLD';
  breakdown?: {
    expertise: number;
    communication: number;
    quality: number;
  };
}

const getNriFixedFeeMinor = (entryType?: string): number | null => {
  if (entryType === 'nri_psychologist') return 2999 * 100;
  if (entryType === 'nri_psychiatrist') return 3499 * 100;
  if (entryType === 'nri_therapist') return 3599 * 100;
  return null;
};

export default function SmartMatchFlow({
  isOpen,
  onClose,
  onSuccess,
  initialProviderType = 'ALL',
  lockProviderType = false,
  presetEntryType,
  sourceFunnel,
  timezoneRegion,
}: SmartMatchFlowProps) {
  const nriFixedFeeMinor = getNriFixedFeeMinor(presetEntryType);
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>('calendar');
  const [calendarSelection, setCalendarSelection] = useState<CalendarSelection | null>(null);
  const [selectedProviderType, setSelectedProviderType] = useState<
    'ALL' | 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH'
  >(initialProviderType);
  const [selectedProviders, setSelectedProviders] = useState<SelectedProvider[]>([]);
  const [appointmentRequestId, setAppointmentRequestId] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [isFreeBlocked, setIsFreeBlocked] = useState(false);
  const [inGrace, setInGrace] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');
  const [graceEndDate, setGraceEndDate] = useState<string | null>(null);

  const flowSteps: FlowStep[] = lockProviderType
    ? ['calendar', 'provider-selection', 'pre-payment', 'pending']
    : ['calendar', 'domain-selection', 'provider-selection', 'pre-payment', 'pending'];

  const getAvailabilityPrefs = () => {
    if (!calendarSelection) {
      return null;
    }

    const [hourRaw, minuteRaw] = calendarSelection.time.split(':');
    const startHour = Number(hourRaw);
    const startMinute = Number(minuteRaw || 0);
    const startMinuteOfDay = startHour * 60 + startMinute;
    const endMinuteOfDay = startMinuteOfDay + 30;

    return {
      daysOfWeek: [calendarSelection.date.getDay()],
      timeSlots: [{ startMinute: startMinuteOfDay, endMinute: endMinuteOfDay }],
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const checkSubscription = async () => {
      try {
        setIsCheckingSubscription(true);
        const response = await patientApi.getSubscription();
        const subscription = (response as any)?.data ?? response;
        const status = String(subscription?.status || '').toLowerCase();
        const freeLike = Number(subscription?.price || 0) <= 0 || String(subscription?.planName || '').toLowerCase().includes('free');
        const activeLike = ['active', 'trial', 'trialing', 'grace'].includes(status);
        const graceEnd = subscription?.metadata?.graceEndDate || null;

        setSubscriptionStatus(status);
        setGraceEndDate(graceEnd ? new Date(graceEnd).toISOString() : null);
        setInGrace(status === 'grace');
        setIsFreeBlocked(status === 'locked' || !activeLike || freeLike);
      } catch {
        setSubscriptionStatus('locked');
        setGraceEndDate(null);
        setIsFreeBlocked(true);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    void checkSubscription();
  }, [isOpen]);

  // Reset state when drawer closes
  const handleClose = () => {
    setStep('calendar');
    setCalendarSelection(null);
    setSelectedProviderType(initialProviderType);
    setSelectedProviders([]);
    setAppointmentRequestId(null);
    onClose();
  };

  // Handle successful flow completion
  const handleSuccess = () => {
    handleClose();
    onSuccess();
  };

  if (!isOpen) return null;

  const getStepTitle = (): string => {
    const titles: Record<FlowStep, string> = {
      'calendar': 'Book a Session',
      'domain-selection': 'Choose Specialist Type',
      'provider-selection': 'Choose Providers',
      'pre-payment': 'Confirm & Pay',
      'pending': 'Request Pending',
    };
    return titles[step];
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-charcoal/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed top-8 left-0 right-0 z-50 flex justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-calm-sage/15 bg-white px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-charcoal">{getStepTitle()}</h2>
              <div className="flex gap-1 mt-2">
                {flowSteps.map(
                  (s, i) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        step === s
                          ? 'bg-teal-500'
                          : flowSteps.indexOf(step) > i
                            ? 'bg-teal-200'
                            : 'bg-calm-sage/15'
                      }`}
                    />
                  )
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-charcoal/40 transition-colors hover:bg-calm-sage/10 hover:text-charcoal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isCheckingSubscription && (
              <div className="rounded-xl border border-calm-sage/20 bg-calm-sage/5 p-4 text-sm text-charcoal/70">
                Checking subscription eligibility...
              </div>
            )}

            {!isCheckingSubscription && inGrace && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Grace period active until {graceEndDate ? new Date(graceEndDate).toLocaleString() : 'soon'}. Renew now to avoid lock.
                </p>
              </div>
            )}

            {!isCheckingSubscription && isFreeBlocked && (
              <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="text-base font-semibold text-red-900">Smart Match is currently blocked</h3>
                <p className="text-sm text-red-800">
                  {subscriptionStatus === 'locked'
                    ? 'Your subscription is locked. Renew now to continue V3 smart matching.'
                    : 'Free or inactive plans cannot use V3 smart matching. Upgrade to continue.'}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    disabled
                    className="rounded-lg bg-red-200 px-4 py-2 text-sm font-semibold text-red-800 cursor-not-allowed"
                  >
                    Upgrade or Renew to continue
                  </button>
                  <button
                    onClick={() => navigate('/plans')}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Upgrade or Renew
                  </button>
                  <button
                    onClick={handleClose}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {!isCheckingSubscription && !isFreeBlocked && step === 'calendar' && (
              <CalendarSelection
                onDateTimeSelect={(date, time) => {
                  setCalendarSelection({ date, time });
                  if (lockProviderType) {
                    setSelectedProviderType(initialProviderType);
                    setStep('provider-selection');
                    return;
                  }
                  setStep('domain-selection');
                }}
                onCancel={handleClose}
              />
            )}

            {!isCheckingSubscription && !isFreeBlocked && step === 'domain-selection' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                      2
                    </div>
                    <h3 className="text-lg font-semibold text-charcoal">Choose specialist type</h3>
                  </div>
                  <p className="text-sm text-charcoal/60 ml-10">Pick which domain you want to book from</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: 'THERAPIST', label: 'Therapist' },
                    { key: 'PSYCHOLOGIST', label: 'Psychologist' },
                    { key: 'PSYCHIATRIST', label: 'Psychiatrist' },
                    { key: 'COACH', label: 'Coach' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSelectedProviderType(option.key as any);
                        setStep('provider-selection');
                      }}
                      className="rounded-xl border border-calm-sage/20 bg-white px-4 py-4 text-left transition-colors hover:border-teal-300 hover:bg-teal-50/40"
                    >
                      <p className="font-semibold text-charcoal">{option.label}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep('calendar')}
                    className="flex-1 rounded-lg border border-calm-sage/20 px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-calm-sage/5"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-calm-sage/20 px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-calm-sage/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isCheckingSubscription && !isFreeBlocked && step === 'provider-selection' && calendarSelection && (
              <ProviderSelectionStep
                availabilityPrefs={getAvailabilityPrefs()!}
                providerType={selectedProviderType}
                presetEntryType={presetEntryType}
                sourceFunnel={sourceFunnel}
                timezoneRegion={timezoneRegion}
                 onSuccess={(providers: any) => {
                   // Convert ProviderMatch to SelectedProvider format
                   const selectedProviders = providers.map((p: any) => ({
                     id: p.id,
                     name: p.name || p.displayName || 'Provider',
                     type: p.providerType || 'Therapist',
                     fee: nriFixedFeeMinor || p.consultationFee || 69900,
                     score: p.score,
                     tier: p.tier,
                     matchBand: p.matchBand,
                     breakdown: p.breakdown,
                   }));
                   setSelectedProviders(selectedProviders);
                  setStep('pre-payment');
                }}
                onBack={() => {
                  if (lockProviderType) {
                    setStep('calendar');
                    return;
                  }
                  setStep('domain-selection');
                }}
                onCancel={handleClose}
              />
            )}

            {!isCheckingSubscription && !isFreeBlocked && step === 'pre-payment' && calendarSelection && selectedProviders.length > 0 && (
              <PreBookingPaymentStep
                selectedProviders={selectedProviders}
                selectedDateTime={calendarSelection}
                presetEntryType={presetEntryType}
                sourceFunnel={sourceFunnel}
                timezoneRegion={timezoneRegion}
                onBack={() => setStep('provider-selection')}
                onCancel={handleClose}
              />
            )}

            {!isCheckingSubscription && !isFreeBlocked && step === 'pending' && appointmentRequestId && (
              <PendingRequestStep
                appointmentRequestId={appointmentRequestId}
                onAccepted={handleSuccess}
                onCancel={handleClose}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
