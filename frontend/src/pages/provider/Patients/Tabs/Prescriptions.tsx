import { ArrowLeft, History, Lock } from 'lucide-react';
import { useRef, useState } from 'react';

type PrescriptionItem = {
  id: string;
  number: string;
  title: string;
  icon: string;
};

const defaultPrescriptions: PrescriptionItem[] = [
  { id: '1', number: '01', title: 'Sound Therapy', icon: '🎵' },
  { id: '2', number: '02', title: 'Ayurvedic Supplements', icon: '🍃' },
  { id: '3', number: '03', title: 'Behavioral Prescriptions', icon: '🧠' },
  { id: '4', number: '04', title: 'Digital Detox Protocol', icon: '📱' },
  { id: '5', number: '05', title: 'CBT / DBT Homework', icon: '📝' },
  { id: '6', number: '06', title: 'Daily Mood Tracking', icon: '😊' },
];

const recentRecords = [
  { id: '1', date: '02/06/2025', category: 'DAILY', title: 'Daily Mood Tracking', description: '"Consistent data collection is vital. Please track Mood and Sleep and Adherence daily via the MANAS360."' },
  { id: '2', date: '02/06/2025', category: 'CBT', title: 'CBT / DBT Homework', description: '"To support your work in session, focus specifically on Cognitive restructuring and Behavioral activation."' },
  { id: '3', date: '02/06/2025', category: 'DIGITAL', title: 'Digital Detox Protocol', description: '"Reclaim your mental space by Phone off by 8 PM and No screens before bed as well as prioritizing."' },
];

export default function Prescriptions() {
  const prescriptions = defaultPrescriptions;
  const [showHistory, setShowHistory] = useState(false);
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false);
  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(false);
  const [hasGeneratedPrescription, setHasGeneratedPrescription] = useState(false);
  const [isDownloadingPrescription, setIsDownloadingPrescription] = useState(false);
  const [planPatientName, setPlanPatientName] = useState('John Doe');
  const [planPsychologistName, setPlanPsychologistName] = useState('Dr. Smith');
  const prescriptionSheetRef = useRef<HTMLDivElement | null>(null);
  const [sequenceStep, setSequenceStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(0);
  const [frequency, setFrequency] = useState('432');
  const [duration, setDuration] = useState('20');
  const [customDuration, setCustomDuration] = useState('');
  const [timing, setTiming] = useState('Morning');
  const [includeSoundTherapy, setIncludeSoundTherapy] = useState(true);
  const [includeAyurvedicSupplement, setIncludeAyurvedicSupplement] = useState(true);
  const [ayurvedicDosage, setAyurvedicDosage] = useState('300');
  const [ayurvedicTiming, setAyurvedicTiming] = useState('Before bed');
  const [includeBehavioralCore, setIncludeBehavioralCore] = useState(true);
  const [behavioralFrequency, setBehavioralFrequency] = useState('2');
  const [eveningPhoneOff, setEveningPhoneOff] = useState(true);
  const [eveningNoScreens, setEveningNoScreens] = useState(true);
  const [morningSilence, setMorningSilence] = useState(true);
  const [morningNoSocial, setMorningNoSocial] = useState(true);
  const [cbtRestructuring, setCbtRestructuring] = useState(true);
  const [cbtBehavioralActivation, setCbtBehavioralActivation] = useState(true);
  const [includeTrackingMethod, setIncludeTrackingMethod] = useState(true);
  const [trackMood, setTrackMood] = useState(true);
  const [trackSleep, setTrackSleep] = useState(true);
  const [trackAdherence, setTrackAdherence] = useState(true);
  const [selectedFinalItem, setSelectedFinalItem] = useState('CBT / DBT HOMEWORK');

  const getCardClasses = (isSelected: boolean) =>
    `flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
      isSelected
        ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg'
        : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'
    }`;

  const handleStartSequence = () => {
    setSequenceStep(1);
  };

  const handleSaveAndContinue = () => {
    setSequenceStep(2);
  };

  const handleSoundTherapyToggle = (checked: boolean) => {
    setIncludeSoundTherapy(checked);
    if (!checked) {
      setFrequency('');
      setDuration('');
      setTiming('');
      setCustomDuration('');
      return;
    }

    if (!frequency) {
      setFrequency('432');
    }
    if (!duration) {
      setDuration('20');
    }
    if (!timing) {
      setTiming('Morning');
    }
  };

  const handleSaveAndContinueAyurvedic = () => {
    setSequenceStep(3);
  };

  const handleSaveAndContinueBehavioral = () => {
    setSequenceStep(4);
  };

  const handleSaveAndContinueDigital = () => {
    setSequenceStep(5);
  };

  const handleSaveAndContinueHomework = () => {
    setSequenceStep(6);
  };

  const handleSaveAndContinueFinal = () => {
    setSequenceStep(7);
  };

  const handleOpenPlanDetails = () => {
    setShowPlanDetailsModal(true);
  };

  const handleClosePlanDetails = () => {
    setShowPlanDetailsModal(false);
  };

  const handleFinalizePrescription = () => {
    setHasGeneratedPrescription(true);
    setShowPrescriptionSheet(true);
    setShowPlanDetailsModal(false);
  };

  const handleDashboardRecordHistoryClick = () => {
    if (hasGeneratedPrescription) {
      setShowPrescriptionSheet(false);
      setSequenceStep(7);
      return;
    }

    setShowHistory((prev) => !prev);
  };

  if (sequenceStep === 1) {
    const selectedDuration = duration === 'custom' ? `${customDuration || '20'} minutes/day` : duration ? `${duration} minutes/day` : 'recommended duration';
    const timingText =
      timing === 'Morning'
        ? 'each morning'
        : timing === 'Afternoon'
          ? 'each afternoon'
          : timing === 'Evening'
            ? 'each evening'
            : timing === 'As needed'
              ? 'as needed for stress'
              : 'as clinically appropriate';
    const frequencyText = frequency ? `${frequency} Hz` : 'recommended frequency';

    return (
      <div className="min-h-[720px] rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between text-sm text-[#314d7a]">
            <button
              type="button"
              onClick={() => setSequenceStep(0)}
              className="inline-flex items-center gap-2 font-semibold hover:text-[#1f3564]"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Sequence
            </button>
            <span className="rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em]">Step 1 of 6</span>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-[#c7daee] bg-[#edf7ff] shadow-[0_10px_30px_rgba(39,72,116,0.12)]">
            <div className="px-5 pb-6 pt-6 md:px-8 md:pb-8">
              <h2 className="text-center font-serif text-4xl tracking-[0.22em] text-[#3c4f89]">SOUND THERAPY</h2>

              <div className="mt-7 space-y-8">
                <div>
                  <label className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${includeSoundTherapy ? 'bg-[#e2f4ea] text-[#2b7a49]' : 'bg-[#f2f5f8] text-[#5a6f8c]'}`}>
                    <input
                      type="checkbox"
                      checked={includeSoundTherapy}
                      onChange={(e) => handleSoundTherapyToggle(e.target.checked)}
                      className="h-4 w-4 accent-[#2b7a49]"
                    />
                    Sound Therapy Recommended (Default Checked)
                  </label>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Frequency Selection</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { value: '432', label: '432 Hz - Stress Relief', recommended: true },
                      { value: '528', label: '528 Hz - Healing & Repair' },
                      { value: '639', label: '639 Hz - Relationship Harmony' },
                      { value: '741', label: '741 Hz - Problem Solving' },
                      { value: '852', label: '852 Hz - Spiritual Awareness' },
                    ].map((item) => (
                      <label key={item.value} className={getCardClasses(frequency === item.value)}>
                        <span className="text-sm font-semibold">
                          {item.label} {item.recommended ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span> : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={frequency === item.value}
                          onChange={() => setFrequency((prev) => (prev === item.value ? '' : item.value))}
                          className="h-4 w-4 accent-[#2a45a1]"
                        />
                      </label>
                    ))}

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={frequency === ''}
                        onChange={(e) => {
                          setFrequency(e.target.checked ? '' : '432');
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Duration</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {['10', '20', '30'].map((item) => (
                      <label key={item} className={getCardClasses(duration === item)}>
                        <span className="text-sm font-semibold">
                          {item} minutes/day {item === '20' ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span> : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={duration === item}
                          onChange={() => setDuration((prev) => (prev === item ? '' : item))}
                          className="h-4 w-4 accent-[#2a45a1]"
                        />
                      </label>
                    ))}

                    <label className={getCardClasses(duration === 'custom')}>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        Custom:
                        <input
                          type="number"
                          min={1}
                          placeholder="minutes"
                          value={customDuration}
                          onChange={(e) => {
                            setDuration('custom');
                            setCustomDuration(e.target.value);
                          }}
                          className="w-24 rounded-md border border-white/40 bg-white/90 px-2 py-1 text-[#23364f]"
                        />
                      </span>
                      <input
                        type="checkbox"
                        checked={duration === 'custom'}
                        onChange={() => setDuration((prev) => (prev === 'custom' ? '' : 'custom'))}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={duration === ''}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDuration('');
                            setCustomDuration('');
                          } else {
                            setDuration('20');
                          }
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Timing</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { value: 'Morning', label: 'Morning (upon waking)', recommended: true },
                      { value: 'Afternoon', label: 'Afternoon (lunch break)' },
                      { value: 'Evening', label: 'Evening (before bed)' },
                      { value: 'As needed', label: 'As needed for stress' },
                    ].map((item) => (
                      <label key={item.value} className={getCardClasses(timing === item.value)}>
                        <span className="text-sm font-semibold">
                          {item.label} {item.recommended ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span> : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={timing === item.value}
                          onChange={() => setTiming((prev) => (prev === item.value ? '' : item.value))}
                          className="h-4 w-4 accent-[#2a45a1]"
                        />
                      </label>
                    ))}

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={timing === ''}
                        onChange={(e) => {
                          setTiming(e.target.checked ? '' : 'Morning');
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#dbe7f3] bg-[#f4f9ff] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4c6398]">Plan Output</p>
                  <p className="mt-5 text-3xl text-[#3b4d80]">"</p>
                  <p className="mt-2 text-lg italic leading-9 text-[#55667f] md:text-[19px] md:leading-10" style={{ fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif' }}>
                    {includeSoundTherapy
                      ? `Start ${timingText} with ${selectedDuration} of ${frequencyText} sound therapy.
                    Use headphones. Sit or lie comfortably. Close eyes.
                    Focus entirely on the sound. Let thoughts pass without judgment.
                    This calms your nervous system and prepares your mind for the day ahead.`
                      : 'Sound therapy is currently skipped for this patient.'}
                  </p>
                  <div className="mt-6 border-t border-[#d7e4f2] pt-5">
                    <div className="flex items-center justify-between">
                      <button type="button" className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c6398]">Edit Selections</button>
                      <button
                        type="button"
                        onClick={handleSaveAndContinue}
                        className="rounded-full bg-[#2a45a1] px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#223b8a]"
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (sequenceStep === 2) {
    return (
      <div className="min-h-[720px] rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between text-sm text-[#314d7a]">
            <button
              type="button"
              onClick={() => setSequenceStep(0)}
              className="inline-flex items-center gap-2 font-semibold hover:text-[#1f3564]"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Sequence
            </button>
            <span className="rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em]">Step 2 of 6</span>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-[#c7daee] bg-[#edf7ff] shadow-[0_10px_30px_rgba(39,72,116,0.12)]">
            <div className="px-5 pb-6 pt-6 md:px-8 md:pb-8">
              <h2 className="text-center font-serif text-4xl tracking-[0.22em] text-[#3c4f89]">AYURVEDIC SUPPLEMENTS</h2>

              <div className="mt-7 space-y-8">
                <div className="rounded-xl border border-[#f3c8a5] bg-[#fff6ef] px-4 py-3 text-xs text-[#b06735]">
                  <p className="font-semibold">
                    ⚠ Safety Notes: Pregnancy/breastfeeding, Thyroid medication interaction, Immunosuppressants interaction.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Supplement Selection</p>
                  <label className={getCardClasses(includeAyurvedicSupplement)}>
                    <span className="text-sm font-semibold">Ashwagandha <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                    <input
                      type="checkbox"
                      checked={includeAyurvedicSupplement}
                      onChange={(e) => setIncludeAyurvedicSupplement(e.target.checked)}
                      className="h-4 w-4 accent-[#2a45a1]"
                    />
                  </label>
                  <label className="mt-3 flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                    <span className="text-sm font-semibold">Skip</span>
                    <input
                      type="checkbox"
                      checked={!includeAyurvedicSupplement}
                      onChange={(e) => setIncludeAyurvedicSupplement(!e.target.checked)}
                      className="h-4 w-4 accent-[#2a45a1]"
                    />
                  </label>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Dosage</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { value: '150', label: '150mg/day' },
                      { value: '300', label: '300mg/day', recommended: true },
                      { value: '450', label: '450mg/day' },
                      { value: '600', label: '600mg/day' },
                    ].map((item) => (
                      <label key={item.value} className={getCardClasses(ayurvedicDosage === item.value)}>
                        <span className="text-sm font-semibold">
                          {item.label} {item.recommended ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span> : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={ayurvedicDosage === item.value}
                          onChange={() => {
                            setAyurvedicDosage((prev) => (prev === item.value ? '' : item.value));
                            setIncludeAyurvedicSupplement(true);
                          }}
                          className="h-4 w-4 accent-[#2a45a1]"
                        />
                      </label>
                    ))}

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={ayurvedicDosage === ''}
                        onChange={(e) => {
                          setAyurvedicDosage(e.target.checked ? '' : '300');
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Timing</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { value: 'Before bed', label: 'Before bed', recommended: true },
                      { value: 'Morning with breakfast', label: 'Morning with breakfast' },
                      { value: 'Twice daily', label: 'Twice daily (split dose)' },
                    ].map((item) => (
                      <label key={item.value} className={getCardClasses(ayurvedicTiming === item.value)}>
                        <span className="text-sm font-semibold">
                          {item.label} {item.recommended ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span> : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={ayurvedicTiming === item.value}
                          onChange={() => {
                            setAyurvedicTiming((prev) => (prev === item.value ? '' : item.value));
                            setIncludeAyurvedicSupplement(true);
                          }}
                          className="h-4 w-4 accent-[#2a45a1]"
                        />
                      </label>
                    ))}

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={ayurvedicTiming === ''}
                        onChange={(e) => {
                          setAyurvedicTiming(e.target.checked ? '' : 'Before bed');
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#dbe7f3] bg-[#f4f9ff] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4c6398]">Safety Notes</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#55667f]">
                    <li>Pregnancy/breastfeeding</li>
                    <li>Thyroid medication (may interact)</li>
                    <li>Immunosuppressants (may interact)</li>
                    <li>Autoimmune conditions (consult doctor)</li>
                  </ul>

                  <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#4c6398]">Plan Output</p>
                  <p className="mt-2 text-lg italic leading-9 text-[#55667f] md:text-[19px] md:leading-10" style={{ fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif' }}>
                    Take Ashwagandha {ayurvedicDosage || 'recommended dosage'}{ayurvedicDosage ? 'mg/day' : ''} {ayurvedicTiming ? (ayurvedicTiming === 'Twice daily' ? 'in two split doses' : ayurvedicTiming.toLowerCase()) : 'as clinically advised'} with warm milk or water.
                    This is an adaptogen and helps your body handle stress better.
                    Give it 4 weeks and track sleep quality and stress levels.
                    If there is no improvement, we will adjust the protocol.
                  </p>

                  <div className="mt-6 border-t border-[#d7e4f2] pt-5">
                    <div className="flex items-center justify-between">
                      <button type="button" className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c6398]">Edit Selections</button>
                      <button
                        type="button"
                        onClick={handleSaveAndContinueAyurvedic}
                        className="rounded-full bg-[#2a45a1] px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#223b8a]"
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (sequenceStep === 3) {
    return (
      <div className="min-h-[720px] rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between text-sm text-[#314d7a]">
            <button
              type="button"
              onClick={() => setSequenceStep(0)}
              className="inline-flex items-center gap-2 font-semibold hover:text-[#1f3564]"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Sequence
            </button>
            <span className="rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em]">Step 3 of 6</span>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-[#c7daee] bg-[#edf7ff] shadow-[0_10px_30px_rgba(39,72,116,0.12)]">
            <div className="px-5 pb-6 pt-6 md:px-8 md:pb-8">
              <h2 className="text-center font-serif text-4xl tracking-[0.22em] text-[#3c4f89]">BEHAVIORAL PRESCRIPTIONS</h2>

              <div className="mt-7 space-y-8">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Core Prescription</p>
                  <label className={getCardClasses(includeBehavioralCore)}>
                    <span className="text-sm font-semibold">Random Acts of Kindness <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                    <input
                      type="checkbox"
                      checked={includeBehavioralCore}
                      onChange={(e) => setIncludeBehavioralCore(e.target.checked)}
                      className="h-4 w-4 accent-[#2a45a1]"
                    />
                  </label>
                  <label className="mt-3 flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                    <span className="text-sm font-semibold">Skip</span>
                    <input
                      type="checkbox"
                      checked={!includeBehavioralCore}
                      onChange={(e) => setIncludeBehavioralCore(!e.target.checked)}
                      className="h-4 w-4 accent-[#2a45a1]"
                    />
                  </label>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Frequency</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { value: '1', label: '1 hour/month' },
                      { value: '2', label: '2 hours/month', recommended: true },
                    ].map((item) => (
                      <label key={item.value} className={getCardClasses(behavioralFrequency === item.value)}>
                        <span className="text-sm font-semibold">
                          {item.label} {item.recommended ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span> : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={behavioralFrequency === item.value}
                          onChange={() => setBehavioralFrequency((prev) => (prev === item.value ? '' : item.value))}
                          className="h-4 w-4 accent-[#2a45a1]"
                        />
                      </label>
                    ))}

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={behavioralFrequency === ''}
                        onChange={(e) => {
                          setBehavioralFrequency(e.target.checked ? '' : '2');
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#dbe7f3] bg-[#f4f9ff] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4c6398]">Plan Output</p>
                  <p className="mt-2 text-lg italic leading-9 text-[#55667f] md:text-[19px] md:leading-10" style={{ fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif' }}>
                    Clinical studies demonstrate that committing to random acts of kindness for at least {behavioralFrequency || 'recommended'} {behavioralFrequency === '1' ? 'hour' : 'hours'}/month can significantly reduce depressive symptoms.
                  </p>

                  <div className="mt-6 border-t border-[#d7e4f2] pt-5">
                    <div className="flex items-center justify-between">
                      <button type="button" className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c6398]">Edit Selections</button>
                      <button
                        type="button"
                        onClick={handleSaveAndContinueBehavioral}
                        className="rounded-full bg-[#2a45a1] px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#223b8a]"
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (sequenceStep === 4) {
    const selectedDigitalItems = [
      eveningPhoneOff ? 'Phone off by 9 PM' : null,
      eveningNoScreens ? 'No screens before bed' : null,
      morningSilence ? 'Silence + Breathing' : null,
      morningNoSocial ? 'No social media before 10 AM' : null,
    ].filter(Boolean);

    return (
      <div className="min-h-[720px] rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between text-sm text-[#314d7a]">
            <button
              type="button"
              onClick={() => setSequenceStep(0)}
              className="inline-flex items-center gap-2 font-semibold hover:text-[#1f3564]"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Sequence
            </button>
            <span className="rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em]">Step 4 of 6</span>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-[#c7daee] bg-[#edf7ff] shadow-[0_10px_30px_rgba(39,72,116,0.12)]">
            <div className="px-5 pb-6 pt-6 md:px-8 md:pb-8">
              <h2 className="text-center font-serif text-4xl tracking-[0.22em] text-[#3c4f89]">DIGITAL DETOX PROTOCOL</h2>

              <div className="mt-7 space-y-8">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Evening Boundaries</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${eveningPhoneOff ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">Phone off by 9 PM <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input
                        type="checkbox"
                        checked={eveningPhoneOff}
                        onChange={(e) => setEveningPhoneOff(e.target.checked)}
                        className="sr-only peer"
                      />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${eveningPhoneOff ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {eveningPhoneOff ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>
                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${eveningNoScreens ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">No screens before bed <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input
                        type="checkbox"
                        checked={eveningNoScreens}
                        onChange={(e) => setEveningNoScreens(e.target.checked)}
                        className="sr-only peer"
                      />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${eveningNoScreens ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {eveningNoScreens ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={!eveningPhoneOff && !eveningNoScreens}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEveningPhoneOff(false);
                            setEveningNoScreens(false);
                          } else {
                            setEveningPhoneOff(true);
                            setEveningNoScreens(true);
                          }
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Morning Boundaries</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${morningSilence ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">Silence + Breathing <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input
                        type="checkbox"
                        checked={morningSilence}
                        onChange={(e) => setMorningSilence(e.target.checked)}
                        className="sr-only peer"
                      />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${morningSilence ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {morningSilence ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>
                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${morningNoSocial ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">No social media before 10 AM <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input
                        type="checkbox"
                        checked={morningNoSocial}
                        onChange={(e) => setMorningNoSocial(e.target.checked)}
                        className="sr-only peer"
                      />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${morningNoSocial ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {morningNoSocial ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={!morningSilence && !morningNoSocial}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMorningSilence(false);
                            setMorningNoSocial(false);
                          } else {
                            setMorningSilence(true);
                            setMorningNoSocial(true);
                          }
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#dbe7f3] bg-[#f4f9ff] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4c6398]">Plan Output</p>
                  <p className="mt-2 text-lg italic leading-9 text-[#55667f] md:text-[19px] md:leading-10" style={{ fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif' }}>
                    Reclaim your mental space by {selectedDigitalItems.length > 0 ? selectedDigitalItems.join(' and ') : 'setting healthier evening and morning boundaries'} in your daily routine.
                  </p>

                  <div className="mt-6 border-t border-[#d7e4f2] pt-5">
                    <div className="flex items-center justify-between">
                      <button type="button" className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c6398]">Edit Selections</button>
                      <button
                        type="button"
                        onClick={handleSaveAndContinueDigital}
                        className="rounded-full bg-[#2a45a1] px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#223b8a]"
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (sequenceStep === 5) {
    const selectedAssignments = [
      cbtRestructuring ? 'Cognitive restructuring' : null,
      cbtBehavioralActivation ? 'Behavioral activation' : null,
    ].filter(Boolean);

    return (
      <div className="min-h-[720px] rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between text-sm text-[#314d7a]">
            <button
              type="button"
              onClick={() => setSequenceStep(0)}
              className="inline-flex items-center gap-2 font-semibold hover:text-[#1f3564]"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Sequence
            </button>
            <span className="rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em]">Step 5 of 6</span>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-[#c7daee] bg-[#edf7ff] shadow-[0_10px_30px_rgba(39,72,116,0.12)]">
            <div className="px-5 pb-6 pt-6 md:px-8 md:pb-8">
              <h2 className="text-center font-serif text-4xl tracking-[0.22em] text-[#3c4f89]">CBT / DBT HOMEWORK</h2>

              <div className="mt-7 space-y-8">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Assignments</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${cbtRestructuring ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">Cognitive restructuring <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input type="checkbox" checked={cbtRestructuring} onChange={(e) => setCbtRestructuring(e.target.checked)} className="sr-only" />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${cbtRestructuring ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {cbtRestructuring ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>

                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${cbtBehavioralActivation ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">Behavioral activation <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input type="checkbox" checked={cbtBehavioralActivation} onChange={(e) => setCbtBehavioralActivation(e.target.checked)} className="sr-only" />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${cbtBehavioralActivation ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {cbtBehavioralActivation ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f] md:col-span-2">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={!cbtRestructuring && !cbtBehavioralActivation}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCbtRestructuring(false);
                            setCbtBehavioralActivation(false);
                          } else {
                            setCbtRestructuring(true);
                            setCbtBehavioralActivation(true);
                          }
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#dbe7f3] bg-[#f4f9ff] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4c6398]">Plan Output</p>
                  <p className="mt-2 text-lg italic leading-9 text-[#55667f] md:text-[19px] md:leading-10" style={{ fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif' }}>
                    To support our work in session, focus specifically on {selectedAssignments.length > 0 ? selectedAssignments.join(' and ') : 'CBT/DBT homework activities'}. Please bring your notes to our next session.
                  </p>

                  <div className="mt-6 border-t border-[#d7e4f2] pt-5">
                    <div className="flex items-center justify-between">
                      <button type="button" className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c6398]">Edit Selections</button>
                      <button
                        type="button"
                        onClick={handleSaveAndContinueHomework}
                        className="rounded-full bg-[#2a45a1] px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#223b8a]"
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (sequenceStep === 6) {
    const selectedMetrics = [
      trackMood ? 'Mood' : null,
      trackSleep ? 'Sleep' : null,
      trackAdherence ? 'Adherence' : null,
    ].filter(Boolean);

    return (
      <div className="min-h-[720px] rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between text-sm text-[#314d7a]">
            <button
              type="button"
              onClick={() => setSequenceStep(0)}
              className="inline-flex items-center gap-2 font-semibold hover:text-[#1f3564]"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Sequence
            </button>
            <span className="rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em]">Step 6 of 6</span>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-[#c7daee] bg-[#edf7ff] shadow-[0_10px_30px_rgba(39,72,116,0.12)]">
            <div className="px-5 pb-6 pt-6 md:px-8 md:pb-8">
              <h2 className="text-center font-serif text-4xl tracking-[0.22em] text-[#3c4f89]">DAILY MOOD TRACKING</h2>

              <div className="mt-7 space-y-8">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Tracking Method</p>
                  <label className={getCardClasses(includeTrackingMethod)}>
                    <span className="text-sm font-semibold">MANS360 App <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                    <input
                      type="checkbox"
                      checked={includeTrackingMethod}
                      onChange={(e) => setIncludeTrackingMethod(e.target.checked)}
                      className="h-4 w-4 accent-[#2a45a1]"
                    />
                  </label>
                  <label className="mt-3 flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f]">
                    <span className="text-sm font-semibold">Skip</span>
                    <input
                      type="checkbox"
                      checked={!includeTrackingMethod}
                      onChange={(e) => setIncludeTrackingMethod(!e.target.checked)}
                      className="h-4 w-4 accent-[#2a45a1]"
                    />
                  </label>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6d7f9e]">Metrics</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${trackMood ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">Mood <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input type="checkbox" checked={trackMood} onChange={(e) => setTrackMood(e.target.checked)} className="sr-only" />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${trackMood ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {trackMood ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>

                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${trackSleep ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">Sleep <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input type="checkbox" checked={trackSleep} onChange={(e) => setTrackSleep(e.target.checked)} className="sr-only" />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${trackSleep ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {trackSleep ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>

                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${trackAdherence ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f]'}`}>
                      <span className="text-sm font-semibold">Adherence <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Recommended</span></span>
                      <input type="checkbox" checked={trackAdherence} onChange={(e) => setTrackAdherence(e.target.checked)} className="sr-only" />
                      <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 ${trackAdherence ? 'border-white bg-white' : 'border-[#9db2cf] bg-transparent'}`}>
                        {trackAdherence ? <span className="h-2 w-2 rounded-full bg-[#2a45a1]" /> : null}
                      </span>
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#d6e5f3] bg-[#f6fbff] px-4 py-3 text-[#30485f] md:col-span-2">
                      <span className="text-sm font-semibold">Skip</span>
                      <input
                        type="checkbox"
                        checked={!trackMood && !trackSleep && !trackAdherence}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTrackMood(false);
                            setTrackSleep(false);
                            setTrackAdherence(false);
                          } else {
                            setTrackMood(true);
                            setTrackSleep(true);
                            setTrackAdherence(true);
                          }
                        }}
                        className="h-4 w-4 accent-[#2a45a1]"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#dbe7f3] bg-[#f4f9ff] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4c6398]">Plan Output</p>
                  <p className="mt-2 text-lg italic leading-9 text-[#55667f] md:text-[19px] md:leading-10" style={{ fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif' }}>
                    Consistent data collection is vital. Please track {selectedMetrics.length > 0 ? selectedMetrics.join(' and ') : 'Mood, Sleep, and Adherence'} daily via the MANS360 app.
                  </p>

                  <div className="mt-6 border-t border-[#d7e4f2] pt-5">
                    <div className="flex items-center justify-between">
                      <button type="button" className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c6398]">Edit Selections</button>
                      <button
                        type="button"
                        onClick={handleSaveAndContinueFinal}
                        className="rounded-full bg-[#2a45a1] px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#223b8a]"
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (sequenceStep === 7) {
    const finalItems = [
      'DAILY MOOD TRACKING',
      'CBT / DBT HOMEWORK',
      'DIGITAL DETOX PROTOCOL',
      'BEHAVIORAL PRESCRIPTIONS',
      'AYURVEDIC SUPPLEMENTS',
      'SOUND THERAPY',
    ];

    const finalOutputMap: Record<string, string> = {
      'SOUND THERAPY': includeSoundTherapy
        ? `Start ${timing === 'Morning' ? 'each morning' : timing === 'Afternoon' ? 'each afternoon' : timing === 'Evening' ? 'each evening' : timing === 'As needed' ? 'as needed for stress' : 'as clinically appropriate'} with ${duration === 'custom' ? `${customDuration || '20'} minutes/day` : duration ? `${duration} minutes/day` : 'recommended duration'} of ${frequency ? `${frequency} Hz` : 'recommended frequency'} sound therapy. Focus entirely on the sound.`
        : 'Sound therapy is currently skipped for this patient.',
      'AYURVEDIC SUPPLEMENTS': `Take Ashwagandha ${ayurvedicDosage || 'recommended dosage'}${ayurvedicDosage ? 'mg/day' : ''} ${ayurvedicTiming ? (ayurvedicTiming === 'Twice daily' ? 'in split doses' : ayurvedicTiming.toLowerCase()) : 'as clinically advised'}. This helps stress regulation and sleep quality over 4 weeks.`,
      'BEHAVIORAL PRESCRIPTIONS': `Commit to random acts of kindness for at least ${behavioralFrequency || 'recommended'} ${behavioralFrequency === '1' ? 'hour' : 'hours'}/month to reduce depressive symptoms.`,
      'DIGITAL DETOX PROTOCOL': `Reclaim your mental space by ${[eveningPhoneOff ? 'Phone off by 9 PM' : null, eveningNoScreens ? 'No screens before bed' : null, morningSilence ? 'Silence + Breathing' : null, morningNoSocial ? 'No social media before 10 AM' : null].filter(Boolean).join(' and ')} in your daily routine.`,
      'CBT / DBT HOMEWORK': `To support our work in session, focus specifically on ${[cbtRestructuring ? 'Cognitive restructuring' : null, cbtBehavioralActivation ? 'Behavioral activation' : null].filter(Boolean).join(' and ')}. Please bring your notes to our next session.`,
      'DAILY MOOD TRACKING': `Consistent data collection is vital. Please track ${[trackMood ? 'Mood' : null, trackSleep ? 'Sleep' : null, trackAdherence ? 'Adherence' : null].filter(Boolean).join(' and ')} daily via the MANS360 app.`,
    };

    const prescriptionDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const patientDisplayName = planPatientName.trim() || 'Patient Name';
    const clinicianDisplayName = planPsychologistName.trim() || 'Clinician Name';

    const handleDownloadPrescriptionPdf = async () => {
      if (!prescriptionSheetRef.current || isDownloadingPrescription) {
        return;
      }

      setIsDownloadingPrescription(true);
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import('html2canvas'),
          import('jspdf'),
        ]);

        const canvas = await html2canvas(prescriptionSheetRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
        });

        const imageData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        let renderWidth = maxWidth;
        let renderHeight = (canvas.height * renderWidth) / canvas.width;

        if (renderHeight > maxHeight) {
          renderHeight = maxHeight;
          renderWidth = (canvas.width * renderHeight) / canvas.height;
        }

        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        pdf.addImage(imageData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

        const safeName = patientDisplayName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
        pdf.save(`prescription-${safeName || 'patient'}.pdf`);
      } catch (error) {
        console.error('Failed to export prescription PDF', error);
      } finally {
        setIsDownloadingPrescription(false);
      }
    };

    return (
      <>
      <div className="min-h-[760px] rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="mx-auto mb-4 flex w-full max-w-6xl items-center justify-between text-[#314d7a]">
          <button
            type="button"
            onClick={() => setSequenceStep(0)}
            className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[#1f3564]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <button
            type="button"
            onClick={handleOpenPlanDetails}
            className="inline-flex items-center gap-2 rounded-xl border border-[#c8d7ea] bg-[#f5fbff] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#4c6398] shadow-sm"
          >
            <Lock className="h-3.5 w-3.5" />
            Generate Prescription
          </button>
        </div>

        <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-[280px,1fr]">
          <aside>
            <p className="mb-4 text-xl font-serif text-[#3c4f89]">RECORD HISTORY</p>
            <div className="space-y-2">
              {finalItems.map((item) => {
                const active = selectedFinalItem === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedFinalItem(item)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${active ? 'border-[#2a45a1] bg-[#2a45a1] text-white shadow-lg' : 'border-[#d6e5f3] bg-[#f6fbff] text-[#30485f] hover:bg-[#eef7ff]'}`}
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.05em]">{item}</p>
                    <p className={`mt-1 text-[10px] ${active ? 'text-white/80' : 'text-[#8aa0c3]'}`}>12/26/2025 03:24 PM</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-[24px] border border-[#c7daee] bg-[#edf7ff] p-5 shadow-[0_10px_30px_rgba(39,72,116,0.12)] md:p-8">
            {showPrescriptionSheet ? (
              <div className="space-y-5">
                <div ref={prescriptionSheetRef} className="mx-auto max-w-[680px] rounded-md border border-[#d9dee9] bg-white p-8 shadow-[0_20px_38px_rgba(51,81,122,0.16)]">
                  <div className="flex items-start justify-between border-b border-[#355090] pb-4">
                    <div>
                      <h3 className="font-serif text-4xl leading-tight text-[#2e4582]">CLINIC OF<br />PSYCHOTHERAPY</h3>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f739f]">Holistic Wellness & Behavioral Medicine</p>
                    </div>
                    <div className="text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8392b3]">
                      <p>ID: 1849317631</p>
                      <p>GEN-REF: P45175</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ba6bf]">Patient Name</p>
                      <p className="mt-1 text-xl font-semibold text-[#374f7e]">{patientDisplayName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ba6bf]">Prescription Date</p>
                      <p className="mt-1 text-lg font-semibold text-[#374f7e]">{prescriptionDate}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ba6bf]">Prescribing Clinician</p>
                    <p className="mt-1 text-lg font-semibold text-[#374f7e]">{clinicianDisplayName}</p>
                  </div>

                  <div className="mt-6 inline-flex rounded bg-[#2a45a1] px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">Prescription RX</div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {finalItems.map((item, index) => (
                      <div key={item} className="rounded-md border border-[#e3e8f2] bg-[#fbfcff] p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#3d5493]">{`${index + 1}. ${item}`}</p>
                        <p className="mt-2 text-sm leading-6 text-[#445a83]">{finalOutputMap[item]}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex items-end justify-between border-t border-[#ecf0f7] pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98a4bf]">Note: This document is for therapeutic guidance only.</p>
                    <div className="text-right">
                      <p className="font-serif text-3xl text-[#3d5796]">{clinicianDisplayName}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7587ad]">Authorized Clinician Signature</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowPrescriptionSheet(false)}
                    className="text-xs font-bold uppercase tracking-[0.15em] text-[#90a1c0] hover:text-[#607bb3]"
                  >
                    Back to Records
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPrescriptionPdf}
                    disabled={isDownloadingPrescription}
                    className="rounded-full bg-[#2a45a1] px-8 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md hover:bg-[#223b8a] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isDownloadingPrescription ? 'Preparing PDF...' : 'Download PDF Prescription'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-[#f4f9ff] p-5 md:p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7f93b2]">Individual Saved Result</p>
                  <h3 className="mt-2 font-serif text-3xl text-[#3c4f89]">{selectedFinalItem}</h3>
                  <p className="mt-5 text-xl italic leading-10 text-[#55667f]" style={{ fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif' }}>
                    "{finalOutputMap[selectedFinalItem]}"
                  </p>
                </div>

                <div className="mt-10 text-center">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8aa0c3]">Combine all individual protocols into one file?</p>
                  <button
                    type="button"
                    className="rounded-xl bg-[#2a45a1] px-8 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-md hover:bg-[#223b8a]"
                  >
                    Generate Combined Template
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showPlanDetailsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#9dc9ef]/45 px-4 backdrop-blur-[4px]">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-[#d2d9e6] bg-[#f7f8fb] shadow-[0_16px_40px_rgba(31,53,89,0.24)]">
            <div className="h-1.5 w-full bg-[#2e54d0]" />
            <div className="p-6 md:p-7">
              <h3 className="text-center font-serif text-3xl tracking-[0.06em] text-[#2f447f]">PLAN DETAILS</h3>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="plan-patient-name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ea5b4]">
                    Patient Name
                  </label>
                  <input
                    id="plan-patient-name"
                    value={planPatientName}
                    onChange={(event) => setPlanPatientName(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#2f3137] bg-[#2f3137] px-4 py-2.5 text-sm font-semibold text-white placeholder:text-white/65 focus:border-[#3d5ad6] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="plan-psychologist-name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ea5b4]">
                    Psychologist Name
                  </label>
                  <input
                    id="plan-psychologist-name"
                    value={planPsychologistName}
                    onChange={(event) => setPlanPsychologistName(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#2f3137] bg-[#2f3137] px-4 py-2.5 text-sm font-semibold text-white placeholder:text-white/65 focus:border-[#3d5ad6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClosePlanDetails}
                  className="text-xs font-bold uppercase tracking-[0.12em] text-[#a0a7b6] hover:text-[#7f889c]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleFinalizePrescription}
                  className="rounded-xl bg-[#2744b2] px-7 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md hover:bg-[#1f3791]"
                >
                  Finalize
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </>
    );
  }

  return (
    <div className="min-h-[760px] space-y-8 rounded-2xl border border-[#d8e6f5] bg-gradient-to-br from-[#d7eeff] via-[#e9f5ff] to-[#d5ecff] p-4 md:p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header Section removed per user request */}

      {/* Coordinated Care Info */}
      <div className="mx-auto flex w-full max-w-5xl justify-end">
        <button
          type="button"
          onClick={handleDashboardRecordHistoryClick}
          className="rounded-full bg-[#2a45a1] px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-[#223b8a]"
        >
          {showHistory ? 'HIDE HISTORY' : 'RECORD HISTORY'}
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-3xl rounded-[30px] border border-[#c7daee] bg-[#edf7ff] p-8 shadow-[0_10px_30px_rgba(39,72,116,0.12)]">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <p className="text-center font-serif text-xl text-[#3c4f89] sm:text-2xl whitespace-nowrap">Psychologist (Wellness)</p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d7f9e]">Coordinated Care</p>
          </div>

          {/* Prescription Grid */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
            {prescriptions.map((item) => (
              <div
                key={item.id}
                className="border-b border-[#d6e5f3] py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tracking-[0.18em] text-[#8aa0c3]">{item.number}</span>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#384f6f]">{item.title}</p>
                  </div>
                  <span className="text-xl">{item.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Start Prescribing Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleStartSequence}
              className="rounded-2xl bg-[#2a45a1] px-12 py-3 text-sm font-bold tracking-[0.22em] text-white shadow-md transition-all duration-200 hover:bg-[#223b8a] hover:shadow-lg"
            >
              START PRESCRIBING SEQUENCE
            </button>
          </div>
        </div>
      </div>

      {/* Recent Clinical Records */}
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#4c6398]" />
            <h2 className="font-serif text-5xl text-[#3c4f89]">Recent Clinical Records</h2>
          </div>
          <button
            onClick={handleDashboardRecordHistoryClick}
            className="text-xs font-bold uppercase tracking-[0.16em] text-[#4c6398] hover:text-[#2a45a1]"
          >
            {showHistory ? 'HIDE' : 'VIEW ALL'} HISTORY →
          </button>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d7f9e]">Continuity of Care History</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentRecords.map((record) => (
            <div key={record.id} className="rounded-3xl border border-[#d6e5f3] bg-[#f6fbff] p-5 shadow-sm transition-all hover:shadow-md">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#e8efff] px-3 py-1 text-xs font-bold text-[#5d73a5]">
                    {record.category}
                  </span>
                  <span className="text-xs font-semibold text-[#8aa0c3]">{record.date}</span>
                </div>
                <p className="text-sm font-semibold text-[#324c67]">{record.title}</p>
                <p className="text-xs leading-5 text-[#6a7f98]">{record.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Record History Button */}
      {showHistory && (
        <div className="flex justify-center">
          <button className="fixed bottom-8 right-8 px-6 py-3 bg-[#3D5AD6] hover:bg-[#2D4AB6] text-white font-bold rounded-full shadow-lg transition-all">
            RECORD HISTORY
          </button>
        </div>
      )}
    </div>
  );
}