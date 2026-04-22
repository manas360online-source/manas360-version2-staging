import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { patientApi } from '../../api/patient';
import { FRONTEND_URL } from '../../lib/runtimeEnv';

interface CalendarSelectionProps {
  onDateTimeSelect: (date: Date, time: string) => void;
  onCancel: () => void;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  availableCount: number | null;
}

type SelectionStep = 'calendar' | 'time-slots';

const SLOT_TEMPLATES: Array<{ startTime: string; endTime: string }> = [
  { startTime: '09:00', endTime: '09:30' },
  { startTime: '10:00', endTime: '10:30' },
  { startTime: '14:00', endTime: '14:30' },
  { startTime: '15:00', endTime: '15:30' },
  { startTime: '18:00', endTime: '18:30' },
];

const toMinuteOfDay = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h * 60) + (m || 0);
};

export default function CalendarSelection({ onDateTimeSelect, onCancel }: CalendarSelectionProps) {
  const [step, setStep] = useState<SelectionStep>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    SLOT_TEMPLATES.map((slot) => ({ ...slot, availableCount: null })),
  );
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [timeSlotsError, setTimeSlotsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate || step !== 'time-slots') return;

    const loadAvailability = async () => {
      setTimeSlotsLoading(true);
      setTimeSlotsError(null);
      try {
        const day = selectedDate.getDay();
        let subscriptionError = false;
        let subscriptionErrorMsg = '';
        const results = await Promise.all(
          SLOT_TEMPLATES.map(async (slot) => {
            const startMinute = toMinuteOfDay(slot.startTime);
            const endMinute = toMinuteOfDay(slot.endTime);
            const response = await patientApi.getAvailableProvidersForSmartMatch(
              {
                daysOfWeek: [day],
                timeSlots: [{ startMinute, endMinute }],
              },
              undefined,
              { context: 'Standard', selectedDate: selectedDate.toISOString() },
            );
            if (response?.error && response.status === 403) {
              subscriptionError = true;
              subscriptionErrorMsg = response.message || 'Active subscription required to check availability.';
              return { ...slot, availableCount: null };
            }
            if (response?.error) {
              throw new Error(response.message || 'Unknown error');
            }
            const count = Number(response?.count ?? (response as any)?.providers?.length ?? 0);
            return {
              ...slot,
              availableCount: Number.isFinite(count) ? count : 0,
            };
          }),
        );
        if (subscriptionError) {
          setTimeSlotsError('SUBSCRIPTION_REQUIRED:' + subscriptionErrorMsg);
          setTimeSlots(SLOT_TEMPLATES.map((slot) => ({ ...slot, availableCount: null })));
        } else {
          setTimeSlots(results);
        }
      } catch (err) {
        setTimeSlotsError('Could not check live availability right now. Please try another time or retry.');
        setTimeSlots(SLOT_TEMPLATES.map((slot) => ({ ...slot, availableCount: null })));
      } finally {
        setTimeSlotsLoading(false);
      }
    };

    void loadAvailability();
  }, [selectedDate, step]);

  // Get calendar days for current month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const isDateAvailable = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const isDateSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const handleDateSelect = (day: number) => {
    if (isDateAvailable(day)) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      setSelectedDate(date);
      setStep('time-slots');
      setSelectedTime(null);
      setTimeSlotsError(null);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Calendar Step */}
      {step === 'calendar' && (
        <div className="space-y-4">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-2 hover:bg-calm-sage/10 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-charcoal" />
            </button>
            <h3 className="text-lg font-semibold text-charcoal">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-2 hover:bg-calm-sage/10 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-charcoal" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-charcoal/60 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const available = isDateAvailable(day);
              const selected = isDateSelected(day);

              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  disabled={!available}
                  className={`relative rounded-lg py-2 text-sm font-medium transition-all ${
                    selected
                      ? 'bg-teal-500 text-white shadow-md'
                      : available
                      ? 'bg-calm-sage/10 text-charcoal hover:bg-teal-50 hover:border-teal-300'
                      : 'text-charcoal/30 cursor-not-allowed'
                  } border border-transparent hover:border-teal-300`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Slots Step */}
      {step === 'time-slots' && selectedDate && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-charcoal/60 mb-4">
              Available times for{' '}
              <span className="font-semibold text-charcoal">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </p>
            <div className="space-y-2">
              {timeSlotsLoading && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-calm-sage/20 bg-calm-sage/5 px-4 py-3 text-sm text-charcoal/70">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  Checking live provider availability...
                </div>
              )}

              {timeSlotsError && timeSlotsError.startsWith('SUBSCRIPTION_REQUIRED:') ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-col items-center">
                  <div className="mb-2 font-semibold">Subscribe to platform fee to check provider availability.</div>
                  <div className="mb-2">{timeSlotsError.replace('SUBSCRIPTION_REQUIRED:', '')}</div>
                  <button
                    className="rounded-lg bg-teal-600 px-4 py-2 text-white font-semibold mt-2 hover:bg-teal-700 transition-colors"
                    onClick={() => {
                      const returnTo = window.location.pathname + window.location.search + window.location.hash;
                      window.location.href = `${FRONTEND_URL}/payment/status?id=SUB_653d1e79_1774602028060&status=SUCCESS#/plans?returnTo=${encodeURIComponent(returnTo)}`;
                    }}
                  >
                    Subscribe to Platform Fee
                  </button>
                </div>
              ) : timeSlotsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {timeSlotsError}
                </div>
              ) : null}

              {timeSlots.map((slot) => (
                <button
                  key={slot.startTime}
                  onClick={() => {
                    if (slot.availableCount === 0 || timeSlotsLoading) return;
                    setSelectedTime(slot.startTime);
                    onDateTimeSelect(selectedDate, slot.startTime);
                  }}
                  disabled={slot.availableCount === 0 || timeSlotsLoading}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                    selectedTime === slot.startTime
                      ? 'border-teal-500 bg-teal-50'
                      : slot.availableCount === 0
                        ? 'border-calm-sage/15 bg-calm-sage/5 opacity-60 cursor-not-allowed'
                        : 'border-calm-sage/20 hover:border-teal-300 hover:bg-teal-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-teal-600" />
                      <span className="font-semibold text-charcoal">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <span className="text-xs text-charcoal/60">
                      {slot.availableCount == null
                        ? 'Checking availability...'
                        : slot.availableCount === 0
                          ? 'No providers available'
                          : `${slot.availableCount} provider${slot.availableCount !== 1 ? 's' : ''} available`}
                    </span>
                  </div>
                </button>
              ))}

              {!timeSlotsLoading && !timeSlotsError && timeSlots.every((slot) => (slot.availableCount ?? 0) === 0) && (
                <p className="rounded-lg border border-calm-sage/20 bg-calm-sage/5 px-4 py-3 text-sm text-charcoal/70">
                  No providers are available on this date for the shown time slots. Please choose another date.
                </p>
              )}
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={() => setStep('calendar')}
            className="w-full rounded-lg px-4 py-2 border border-calm-sage/20 text-charcoal font-medium hover:bg-calm-sage/5 transition-colors"
          >
            ← Back to Calendar
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {step === 'calendar' && (
        <button
          onClick={onCancel}
          className="w-full rounded-lg px-4 py-2 border border-calm-sage/20 text-charcoal font-medium hover:bg-calm-sage/5 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
