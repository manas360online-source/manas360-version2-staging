import { useState } from 'react';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

type CheckboxCardProps = {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  className?: string;
};

function CheckboxCard({ label, checked, onToggle, className = '' }: CheckboxCardProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          onToggle(!checked);
        }
      }}
      className={`group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7de6]/60 ${
        checked
          ? 'border-[#2f7de6] bg-[#2f7de6] text-white shadow-[0_10px_20px_rgba(47,125,230,0.28)]'
          : 'border-[#e7eef8] bg-white/70 text-[#5d6675] shadow-[0_6px_14px_rgba(47,125,230,0.08)] hover:border-[#c8daf3] hover:bg-white'
      } ${className}`}
    >
      <span className="text-base font-semibold">{label}</span>
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 items-center justify-center rounded border transition-all duration-200 ${
          checked ? 'border-white/90 bg-white text-[#2f7de6]' : 'border-[#b9cae3] bg-white text-transparent'
        }`}
      >
        <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}>
          <path d="M5 10.5 8.2 13.5 15 6.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

export default function PsychiatristPrescriptionsPage() {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(0);
  const [showPhaseOneResult, setShowPhaseOneResult] = useState(false);
  const [showPhaseTwoResult, setShowPhaseTwoResult] = useState(false);
  const [showPhaseThreeResult, setShowPhaseThreeResult] = useState(false);
  const [showPhaseFourResult, setShowPhaseFourResult] = useState(false);
  const [showPhaseFiveResult, setShowPhaseFiveResult] = useState(false);
  const [showPhaseSixResult, setShowPhaseSixResult] = useState(false);
  const [foundationChecks, setFoundationChecks] = useState({
    soundTherapy: true,
    ayurvedicBase: true,
    digitalDetox: true,
  });
  const [diagnosis, setDiagnosis] = useState<'mdd' | 'gad' | null>('mdd');
  const [severity, setSeverity] = useState<'moderate' | 'severe' | null>('moderate');
  const [agentSelection, setAgentSelection] = useState<'sertraline' | 'escitalopram' | null>('sertraline');
  const [doseSchedule, setDoseSchedule] = useState<'25to50' | '50to100' | null>('25to50');
  const [moodChecks, setMoodChecks] = useState({
    phq9: true,
    gad7: true,
    improving: true,
    stable: false,
    worsening: false,
  });
  const [sideEffectsChecks, setSideEffectsChecks] = useState({
    nausea: false,
    headache: false,
    insomnia: false,
    sexualDysfunction: false,
    weightChange: true,
  });
  const [vitalChecks, setVitalChecks] = useState({
    bloodPressure: true,
    heartRate: true,
    weightTracking: true,
  });
  const [cgiSeverity, setCgiSeverity] = useState<'mild' | 'moderate' | 'severe' | null>('moderate');
  const [medicationHistoryChecks, setMedicationHistoryChecks] = useState({
    dec1: true,
    dec15: true,
    jan5: true,
  });
  const [taperScheduleChecks, setTaperScheduleChecks] = useState({
    week1: false,
    week2: false,
    week3: false,
    week4: false,
  });
  const [adjustmentNotesChecks, setAdjustmentNotesChecks] = useState({
    slowTaper: true,
    coordinateWithPsychologist: true,
    continueTherapy: true,
  });
  const [followUpScheduleChecks, setFollowUpScheduleChecks] = useState({
    twoWeeks: true,
    fourWeeks: false,
    maintenance: false,
  });

  const suiteItems = [
    { id: '01', label: 'Coordinated Care Review' },
    { id: '02', label: 'Psychiatric Evaluation' },
    { id: '03', label: 'Medication Management' },
    { id: '04', label: 'Parameter Tracking' },
    { id: '05', label: 'Dosage Adjustment Log' },
    { id: '06', label: 'Follow-up Schedule' },
  ];

  const toggleCardClass = (checked: boolean) =>
    checked
      ? 'rounded-2xl border border-[#2f7de6] bg-[#2f7de6] text-white shadow-[0_10px_20px_rgba(47,125,230,0.28)]'
      : 'rounded-2xl border border-[#e7eef8] bg-white/70 text-[#5d6675] shadow-[0_6px_14px_rgba(47,125,230,0.08)]';

  return (
    <TherapistPageShell
      title="Prescription Guidance"
      subtitle="Psychiatrist medication management workflow"
    >
      <section className="min-h-[650px] rounded-3xl bg-gradient-to-b from-[#dbe9f7] via-[#d8ebfa] to-[#cfe6fb] p-4 md:p-8 lg:p-12">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.48em] text-[#6c7f9b]">Psychiatrist Portal</p>

          <div className="mt-10 flex items-center justify-between gap-4">
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.32em] text-[#7f8fa6] transition hover:text-[#4f6180]"
              onClick={() => {
                setPhase(0);
                setShowPhaseOneResult(false);
                setShowPhaseTwoResult(false);
                setShowPhaseThreeResult(false);
                setShowPhaseFourResult(false);
                setShowPhaseFiveResult(false);
                setShowPhaseSixResult(false);
              }}
            >
              {phase > 0 ? '< Dashboard' : '< Switch Access (Psychiatrist)'}
            </button>

            {phase > 0 ? (
              phase <= 6 ? (
                <span className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#5f7ea8]">
                  Phase {phase} / 6
                </span>
              ) : (
                <span className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#5f7ea8]">
                  Session Complete
                </span>
              )
            ) : null}
          </div>

          {phase === 0 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-10 shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-12">
              <h2 className="text-center font-serif text-4xl text-[#4c5463] md:text-[50px]">Medical Evaluation Suite</h2>
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.48em] text-[#94a3b8]">
                Clinical Standard Protocols
              </p>

              <div className="mt-10 grid gap-x-12 gap-y-0 md:grid-cols-2">
                {suiteItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-5 border-b border-[#edf2f8] py-6">
                    <span className="min-w-[22px] text-sm font-semibold text-[#d5e0ec]">{item.id}</span>
                    <span className="text-base font-semibold uppercase tracking-[0.15em] text-[#7d8898] md:text-lg">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPhase(1)}
                className="mt-10 w-full rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
              >
                Initialize Clinical Session
              </button>
            </div>
          ) : null}

          {phase === 1 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-10 shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-12">
              <h2 className="text-center font-serif text-4xl uppercase tracking-[0.08em] text-[#4f89cf] md:text-[46px]">
                Coordinated Care Review
              </h2>
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.45em] text-[#99a8bc]">
                Review of Psychologist Foundation Layers.
              </p>

              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Wellness Foundation</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(foundationChecks.soundTherapy)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Sound Therapy active</span>
                  <input
                    type="checkbox"
                    checked={foundationChecks.soundTherapy}
                    onChange={(e) => setFoundationChecks((prev) => ({ ...prev, soundTherapy: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
                <label className={`${toggleCardClass(foundationChecks.ayurvedicBase)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Ayurvedic base active</span>
                  <input
                    type="checkbox"
                    checked={foundationChecks.ayurvedicBase}
                    onChange={(e) => setFoundationChecks((prev) => ({ ...prev, ayurvedicBase: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
                <label className={`${toggleCardClass(foundationChecks.digitalDetox)} flex cursor-pointer items-center justify-between px-5 py-4 md:col-span-1`}>
                  <span className="text-base font-semibold">Digital detox active</span>
                  <input
                    type="checkbox"
                    checked={foundationChecks.digitalDetox}
                    onChange={(e) => setFoundationChecks((prev) => ({ ...prev, digitalDetox: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowPhaseOneResult(true)}
                className="mt-10 w-full rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
              >
                Process Clinical Synthesis
              </button>

              {showPhaseOneResult ? (
                <div className="mt-8 rounded-[30px] border border-white/60 bg-white/60 px-5 py-6 md:px-8 md:py-8">
                  <div className="flex items-center justify-between gap-3 border-b border-[#dce8f7] pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5d8ec8]">Synthesis Result</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b0c7e5]">Clinical-v.1.0-ready</p>
                  </div>

                  <p className="mt-6 font-serif text-3xl italic leading-relaxed text-[#4d5665] md:text-4xl">
                    "Psychiatrist acknowledges existing wellness foundation. Clinical layers being added to established
                    psychologist protocol."
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce8f7] pt-6">
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7da3cf] transition hover:text-[#4f7fb8]"
                      onClick={() => setShowPhaseOneResult(false)}
                    >
                      Edit Input
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase(2);
                        setShowPhaseTwoResult(false);
                      }}
                      className="rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
                    >
                      Confirm & Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 2 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-10 shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-12">
              <h2 className="text-center font-serif text-4xl uppercase tracking-[0.08em] text-[#4f89cf] md:text-[46px]">
                Psychiatric Evaluation
              </h2>

              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Diagnosis (Standard)</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  label="Major Depressive Disorder"
                  checked={diagnosis === 'mdd'}
                  onToggle={(next) => setDiagnosis(next ? 'mdd' : null)}
                />
                <CheckboxCard
                  label="Generalized Anxiety Disorder"
                  checked={diagnosis === 'gad'}
                  onToggle={(next) => setDiagnosis(next ? 'gad' : null)}
                />
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Clinical Severity</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  label="Moderate"
                  checked={severity === 'moderate'}
                  onToggle={(next) => setSeverity(next ? 'moderate' : null)}
                />
                <CheckboxCard
                  label="Severe"
                  checked={severity === 'severe'}
                  onToggle={(next) => setSeverity(next ? 'severe' : null)}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPhaseTwoResult(true)}
                className="mt-10 w-full rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
              >
                Process Clinical Synthesis
              </button>

              {showPhaseTwoResult ? (
                <div className="mt-8 rounded-[30px] border border-white/60 bg-white/60 px-5 py-6 md:px-8 md:py-8">
                  <div className="flex items-center justify-between gap-3 border-b border-[#dce8f7] pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5d8ec8]">Synthesis Result</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b0c7e5]">Clinical-v.1.0-ready</p>
                  </div>

                  <p className="mt-6 font-serif text-3xl italic leading-relaxed text-[#4d5665] md:text-4xl">
                    "Diagnosis: {diagnosis === 'mdd' ? 'MDD' : diagnosis === 'gad' ? 'GAD' : 'Not selected'}. Severity: {severity === 'moderate' ? 'Moderate' : severity === 'severe' ? 'Severe' : 'Not selected'}."
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce8f7] pt-6">
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7da3cf] transition hover:text-[#4f7fb8]"
                      onClick={() => setShowPhaseTwoResult(false)}
                    >
                      Edit Input
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase(3);
                        setShowPhaseThreeResult(false);
                      }}
                      className="rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
                    >
                      Confirm & Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 3 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-10 shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-12">
              <h2 className="text-center font-serif text-4xl uppercase tracking-[0.08em] text-[#4f89cf] md:text-[46px]">
                Medication Management
              </h2>

              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Agent Selection</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  label="Sertraline (SSRI)"
                  checked={agentSelection === 'sertraline'}
                  onToggle={(next) => setAgentSelection(next ? 'sertraline' : null)}
                />
                <CheckboxCard
                  label="Escitalopram (SSRI)"
                  checked={agentSelection === 'escitalopram'}
                  onToggle={(next) => setAgentSelection(next ? 'escitalopram' : null)}
                />
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Dose Schedule</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  label="25mg -> 50mg"
                  checked={doseSchedule === '25to50'}
                  onToggle={(next) => setDoseSchedule(next ? '25to50' : null)}
                />
                <CheckboxCard
                  label="50mg -> 100mg"
                  checked={doseSchedule === '50to100'}
                  onToggle={(next) => setDoseSchedule(next ? '50to100' : null)}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPhaseThreeResult(true)}
                className="mt-10 w-full rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
              >
                Process Clinical Synthesis
              </button>

              {showPhaseThreeResult ? (
                <div className="mt-8 rounded-[30px] border border-white/60 bg-white/60 px-5 py-6 md:px-8 md:py-8">
                  <div className="flex items-center justify-between gap-3 border-b border-[#dce8f7] pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5d8ec8]">Synthesis Result</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b0c7e5]">Clinical-v.1.0-ready</p>
                  </div>

                  <p className="mt-6 font-serif text-3xl italic leading-relaxed text-[#4d5665] md:text-4xl">
                    "Medication Plan: {agentSelection === 'sertraline' ? 'Sertraline' : agentSelection === 'escitalopram' ? 'Escitalopram' : 'Not selected'} ({doseSchedule === '25to50' ? '25-50' : doseSchedule === '50to100' ? '50-100' : 'Not selected'})."
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce8f7] pt-6">
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7da3cf] transition hover:text-[#4f7fb8]"
                      onClick={() => setShowPhaseThreeResult(false)}
                    >
                      Edit Input
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase(4);
                        setShowPhaseFourResult(false);
                      }}
                      className="rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
                    >
                      Confirm & Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 4 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-10 shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-12">
              <h2 className="text-center font-serif text-4xl uppercase tracking-[0.08em] text-[#4f89cf] md:text-[46px]">
                <span className="mr-2" role="img" aria-label="chart icon">📊</span>
                Parameter Tracking
              </h2>
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.45em] text-[#99a8bc]">
                Vital Parameters &amp; Side Effect Monitoring (Section 4)
              </p>

              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Mood Metrics (Weekly)</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(moodChecks.phq9)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">PHQ-9 Score Tracking</span>
                  <input
                    type="checkbox"
                    checked={moodChecks.phq9}
                    onChange={(e) => setMoodChecks((prev) => ({ ...prev, phq9: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
                <label className={`${toggleCardClass(moodChecks.gad7)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">GAD-7 Score Tracking</span>
                  <input
                    type="checkbox"
                    checked={moodChecks.gad7}
                    onChange={(e) => setMoodChecks((prev) => ({ ...prev, gad7: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(moodChecks.improving)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Trend: Improving</span>
                  <input
                    type="checkbox"
                    checked={moodChecks.improving}
                    onChange={(e) => setMoodChecks((prev) => ({ ...prev, improving: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
                <label className={`${toggleCardClass(moodChecks.stable)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Trend: Stable</span>
                  <input
                    type="checkbox"
                    checked={moodChecks.stable}
                    onChange={(e) => setMoodChecks((prev) => ({ ...prev, stable: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(moodChecks.worsening)} flex cursor-pointer items-center justify-between px-5 py-4 md:col-span-1`}>
                  <span className="text-base font-semibold">Trend: Worsening</span>
                  <input
                    type="checkbox"
                    checked={moodChecks.worsening}
                    onChange={(e) => setMoodChecks((prev) => ({ ...prev, worsening: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Side Effects (Patient Reported)</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(sideEffectsChecks.nausea)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Nausea (0-10 scale)</span>
                  <input
                    type="checkbox"
                    checked={sideEffectsChecks.nausea}
                    onChange={(e) => setSideEffectsChecks((prev) => ({ ...prev, nausea: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
                <label className={`${toggleCardClass(sideEffectsChecks.headache)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Headache (0-10 scale)</span>
                  <input
                    type="checkbox"
                    checked={sideEffectsChecks.headache}
                    onChange={(e) => setSideEffectsChecks((prev) => ({ ...prev, headache: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(sideEffectsChecks.insomnia)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Insomnia (0-10 scale)</span>
                  <input
                    type="checkbox"
                    checked={sideEffectsChecks.insomnia}
                    onChange={(e) => setSideEffectsChecks((prev) => ({ ...prev, insomnia: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
                <label className={`${toggleCardClass(sideEffectsChecks.sexualDysfunction)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Sexual dysfunction (0-10 scale)</span>
                  <input
                    type="checkbox"
                    checked={sideEffectsChecks.sexualDysfunction}
                    onChange={(e) => setSideEffectsChecks((prev) => ({ ...prev, sexualDysfunction: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(sideEffectsChecks.weightChange)} flex cursor-pointer items-center justify-between px-5 py-4 md:col-span-1`}>
                  <span className="text-base font-semibold">Weight change: ___ kg</span>
                  <input
                    type="checkbox"
                    checked={sideEffectsChecks.weightChange}
                    onChange={(e) => setSideEffectsChecks((prev) => ({ ...prev, weightChange: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Vital Parameters</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(vitalChecks.bloodPressure)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Blood Pressure Monitoring</span>
                  <input
                    type="checkbox"
                    checked={vitalChecks.bloodPressure}
                    onChange={(e) => setVitalChecks((prev) => ({ ...prev, bloodPressure: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
                <label className={`${toggleCardClass(vitalChecks.heartRate)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Heart Rate Monitoring</span>
                  <input
                    type="checkbox"
                    checked={vitalChecks.heartRate}
                    onChange={(e) => setVitalChecks((prev) => ({ ...prev, heartRate: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(vitalChecks.weightTracking)} flex cursor-pointer items-center justify-between px-5 py-4 md:col-span-1`}>
                  <span className="text-base font-semibold">Weight Tracking</span>
                  <input
                    type="checkbox"
                    checked={vitalChecks.weightTracking}
                    onChange={(e) => setVitalChecks((prev) => ({ ...prev, weightTracking: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Clinical Global Impression</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  label="CGI Severity: 1-2 (Mild)"
                  checked={cgiSeverity === 'mild'}
                  onToggle={(next) => setCgiSeverity(next ? 'mild' : null)}
                />
                <CheckboxCard
                  label="CGI Severity: 4 (Moderate)"
                  checked={cgiSeverity === 'moderate'}
                  onToggle={(next) => setCgiSeverity(next ? 'moderate' : null)}
                />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  label="CGI Severity: 6-7 (Severe)"
                  checked={cgiSeverity === 'severe'}
                  onToggle={(next) => setCgiSeverity(next ? 'severe' : null)}
                  className="md:col-span-1"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPhaseFourResult(true)}
                className="mt-10 w-full rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
              >
                Process Clinical Synthesis
              </button>

              {showPhaseFourResult ? (
                <div className="mt-8 rounded-[30px] border border-white/60 bg-white/60 px-5 py-6 md:px-8 md:py-8">
                  <div className="flex items-center justify-between gap-3 border-b border-[#dce8f7] pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5d8ec8]">Synthesis Result</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b0c7e5]">Clinical-v.1.0-ready</p>
                  </div>

                  <p className="mt-6 font-serif text-3xl italic leading-relaxed text-[#4d5665] md:text-4xl">
                    "Weekly monitoring for PHQ-9, GAD-7, {moodChecks.improving ? 'Improving' : 'Ongoing'}. Side effects:
                    Weight Monitor. Vitals: BP, HR, Weight. CGI Status: {cgiSeverity === 'moderate' ? 'Moderate' : cgiSeverity === 'mild' ? 'Mild' : 'Severe'}."
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce8f7] pt-6">
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7da3cf] transition hover:text-[#4f7fb8]"
                      onClick={() => setShowPhaseFourResult(false)}
                    >
                      Edit Input
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase(5);
                        setShowPhaseFiveResult(false);
                      }}
                      className="rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
                    >
                      Confirm & Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 5 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-10 shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-12">
              <h2 className="text-center font-serif text-4xl uppercase tracking-[0.08em] text-[#4f89cf] md:text-[46px]">
                <span className="mr-2" role="img" aria-label="memo icon">📝</span>
                Dosage Adjustment Log
              </h2>
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.45em] text-[#99a8bc]">
                Medication Adjustment History &amp; Taper Schedule (Section 5)
              </p>

              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Medication History Log</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(medicationHistoryChecks.dec1)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Dec 1: Sertraline 0mg -&gt; 50mg (Initial)</span>
                  <input
                    type="checkbox"
                    checked={medicationHistoryChecks.dec1}
                    onChange={(e) => setMedicationHistoryChecks((prev) => ({ ...prev, dec1: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
                <label className={`${toggleCardClass(medicationHistoryChecks.dec15)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Dec 15: Sertraline 50mg -&gt; 100mg (Tolerated)</span>
                  <input
                    type="checkbox"
                    checked={medicationHistoryChecks.dec15}
                    onChange={(e) => setMedicationHistoryChecks((prev) => ({ ...prev, dec15: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(medicationHistoryChecks.jan5)} flex cursor-pointer items-center justify-between px-5 py-4 md:col-span-1`}>
                  <span className="text-base font-semibold">Jan 5: Continue 100mg (Reassess)</span>
                  <input
                    type="checkbox"
                    checked={medicationHistoryChecks.jan5}
                    onChange={(e) => setMedicationHistoryChecks((prev) => ({ ...prev, jan5: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Taper Schedule (If Discontinuing)</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(taperScheduleChecks.week1)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Week 1: 50% Reduction</span>
                  <input
                    type="checkbox"
                    checked={taperScheduleChecks.week1}
                    onChange={(e) => setTaperScheduleChecks((prev) => ({ ...prev, week1: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
                <label className={`${toggleCardClass(taperScheduleChecks.week2)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Week 2: 75% Reduction</span>
                  <input
                    type="checkbox"
                    checked={taperScheduleChecks.week2}
                    onChange={(e) => setTaperScheduleChecks((prev) => ({ ...prev, week2: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(taperScheduleChecks.week3)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Week 3: Final Taper</span>
                  <input
                    type="checkbox"
                    checked={taperScheduleChecks.week3}
                    onChange={(e) => setTaperScheduleChecks((prev) => ({ ...prev, week3: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
                <label className={`${toggleCardClass(taperScheduleChecks.week4)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Week 4: Discontinue</span>
                  <input
                    type="checkbox"
                    checked={taperScheduleChecks.week4}
                    onChange={(e) => setTaperScheduleChecks((prev) => ({ ...prev, week4: e.target.checked }))}
                    className="h-5 w-5 rounded border-[#b9cae3] accent-[#2f7de6]"
                  />
                </label>
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#b0c5e4]">Adjustment Notes</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(adjustmentNotesChecks.slowTaper)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Slow taper to avoid discontinuation syndrome</span>
                  <input
                    type="checkbox"
                    checked={adjustmentNotesChecks.slowTaper}
                    onChange={(e) => setAdjustmentNotesChecks((prev) => ({ ...prev, slowTaper: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
                <label className={`${toggleCardClass(adjustmentNotesChecks.coordinateWithPsychologist)} flex cursor-pointer items-center justify-between px-5 py-4`}>
                  <span className="text-base font-semibold">Coordinate with psychologist during taper</span>
                  <input
                    type="checkbox"
                    checked={adjustmentNotesChecks.coordinateWithPsychologist}
                    onChange={(e) => setAdjustmentNotesChecks((prev) => ({ ...prev, coordinateWithPsychologist: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={`${toggleCardClass(adjustmentNotesChecks.continueTherapy)} flex cursor-pointer items-center justify-between px-5 py-4 md:col-span-1`}>
                  <span className="text-base font-semibold">Continue therapy during titration</span>
                  <input
                    type="checkbox"
                    checked={adjustmentNotesChecks.continueTherapy}
                    onChange={(e) => setAdjustmentNotesChecks((prev) => ({ ...prev, continueTherapy: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/70 accent-[#dbe9f7]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowPhaseFiveResult(true)}
                className="mt-10 w-full rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
              >
                Process Clinical Synthesis
              </button>

              {showPhaseFiveResult ? (
                <div className="mt-8 rounded-[30px] border border-white/60 bg-white/60 px-5 py-6 md:px-8 md:py-8">
                  <div className="flex items-center justify-between gap-3 border-b border-[#dce8f7] pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5d8ec8]">Synthesis Result</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b0c7e5]">Clinical-v.1.0-ready</p>
                  </div>

                  <p className="mt-6 font-serif text-3xl italic leading-relaxed text-[#4d5665] md:text-4xl">
                    "Adjustment Log Update: Initial Start; Dose Increase; Maintenance. Notes: Safety Note, Coordination Note,
                    Therapy Note."
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce8f7] pt-6">
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7da3cf] transition hover:text-[#4f7fb8]"
                      onClick={() => setShowPhaseFiveResult(false)}
                    >
                      Edit Input
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase(6);
                        setShowPhaseSixResult(false);
                      }}
                      className="rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
                    >
                      Confirm & Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 6 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-10 shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-12">
              <h2 className="text-center font-serif text-4xl uppercase tracking-[0.08em] text-[#4f89cf] md:text-[46px]">
                <span className="mr-2" role="img" aria-label="calendar icon">🗓️</span>
                Follow-up Schedule
              </h2>
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.45em] text-[#99a8bc]">
                Next Session
              </p>

              <div className="mt-8 grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  label="2 Weeks (Reassess Titration)"
                  checked={followUpScheduleChecks.twoWeeks}
                  onToggle={(next) => setFollowUpScheduleChecks((prev) => ({ ...prev, twoWeeks: next }))}
                />
                <CheckboxCard
                  label="4 Weeks (Standard)"
                  checked={followUpScheduleChecks.fourWeeks}
                  onToggle={(next) => setFollowUpScheduleChecks((prev) => ({ ...prev, fourWeeks: next }))}
                />
                <CheckboxCard
                  label="Maintenance (3 Months)"
                  checked={followUpScheduleChecks.maintenance}
                  onToggle={(next) => setFollowUpScheduleChecks((prev) => ({ ...prev, maintenance: next }))}
                  className="md:col-span-1"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPhaseSixResult(true)}
                className="mt-10 w-full rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
              >
                Process Clinical Synthesis
              </button>

              {showPhaseSixResult ? (
                <div className="mt-8 rounded-[30px] border border-white/60 bg-white/60 px-5 py-6 md:px-8 md:py-8">
                  <div className="flex items-center justify-between gap-3 border-b border-[#dce8f7] pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5d8ec8]">Synthesis Result</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b0c7e5]">Clinical-v.1.0-ready</p>
                  </div>

                  <p className="mt-6 font-serif text-3xl italic leading-relaxed text-[#4d5665] md:text-4xl">
                    "Follow-up scheduled for {followUpScheduleChecks.twoWeeks ? '2W' : followUpScheduleChecks.fourWeeks ? '4W' : followUpScheduleChecks.maintenance ? '3 Months' : 'TBD'}."
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce8f7] pt-6">
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7da3cf] transition hover:text-[#4f7fb8]"
                      onClick={() => setShowPhaseSixResult(false)}
                    >
                      Edit Input
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase(7)}
                      className="rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
                    >
                      Confirm & Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 7 ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-[40px] border border-white/45 bg-white/50 px-5 py-12 text-center shadow-[0_24px_60px_rgba(64,96,140,0.12)] backdrop-blur-sm md:px-10 md:py-14">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[#99a8bc]">Clinical Workflow</p>
              <h2 className="mt-3 font-serif text-4xl text-[#4f89cf] md:text-[46px]">Session Finalized</h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#5d6675]">
                Follow-up schedule and medication planning have been confirmed. You can return to dashboard or start a fresh session.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPhase(0)}
                  className="rounded-full border border-[#bcd0ea] bg-white/70 px-8 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#4f7fb8] transition hover:bg-white"
                >
                  Back To Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase(1);
                    setShowPhaseOneResult(false);
                    setShowPhaseTwoResult(false);
                    setShowPhaseThreeResult(false);
                    setShowPhaseFourResult(false);
                    setShowPhaseFiveResult(false);
                    setShowPhaseSixResult(false);
                  }}
                  className="rounded-full bg-gradient-to-r from-[#2f7de6] to-[#2068cd] px-8 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-[0_12px_24px_rgba(32,104,205,0.35)] transition hover:from-[#286fcf] hover:to-[#185cb8]"
                >
                  Start New Session
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </TherapistPageShell>
  );
}
