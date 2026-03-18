import { useState } from 'react';
import { X } from 'lucide-react';
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
}

export default function SmartMatchFlow({
  isOpen,
  onClose,
  onSuccess,
  initialProviderType = 'ALL',
  lockProviderType = false,
}: SmartMatchFlowProps) {
  const [step, setStep] = useState<FlowStep>('calendar');
  const [calendarSelection, setCalendarSelection] = useState<CalendarSelection | null>(null);
  const [selectedProviderType, setSelectedProviderType] = useState<
    'ALL' | 'THERAPIST' | 'PSYCHOLOGIST' | 'PSYCHIATRIST' | 'COACH'
  >(initialProviderType);
  const [selectedProviders, setSelectedProviders] = useState<SelectedProvider[]>([]);
  const [appointmentRequestId, setAppointmentRequestId] = useState<string | null>(null);

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
            {step === 'calendar' && (
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

            {step === 'domain-selection' && (
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

            {step === 'provider-selection' && calendarSelection && (
              <ProviderSelectionStep
                availabilityPrefs={getAvailabilityPrefs()!}
                providerType={selectedProviderType}
                 onSuccess={(providers: any) => {
                   // Convert ProviderMatch to SelectedProvider format
                   const selectedProviders = providers.map((p: any) => ({
                     id: p.id,
                     name: p.name || p.displayName || 'Provider',
                     type: p.providerType || 'Therapist',
                     fee: p.consultationFee || 69900,
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

            {step === 'pre-payment' && calendarSelection && selectedProviders.length > 0 && (
              <PreBookingPaymentStep
                selectedProviders={selectedProviders}
                selectedDateTime={calendarSelection}
                onPaymentSuccess={async () => {
                  try {
                    const availabilityPrefs = getAvailabilityPrefs();
                    if (!availabilityPrefs) {
                      throw new Error('Please select date and time before payment confirmation.');
                    }

                    // Send booking request to providers only after payment is successful.
                    const result = await patientApi.createAppointmentRequest({
                      availabilityPrefs,
                      providerIds: selectedProviders.map((p) => p.id),
                      preferredSpecialization:
                        selectedProviderType === 'ALL' ? undefined : selectedProviderType,
                    });

                    setAppointmentRequestId(result.appointmentRequestId);
                    setStep('pending');
                  } catch (err) {
                    console.error('Failed to send booking request:', err);
                  }
                }}
                onBack={() => setStep('provider-selection')}
                onCancel={handleClose}
              />
            )}

            {step === 'pending' && appointmentRequestId && (
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
