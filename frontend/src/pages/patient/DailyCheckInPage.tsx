import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patient';
import { useTherapyData } from '../../hooks/useTherapyData';

type HubTab = 'daily-mood' | 'cbt-practice';
type EnergyLevel = 'low' | 'medium' | 'high';
type WorryType = 'real' | 'hypothetical' | '';

type CbtTemplateId =
  | 'thought-record'
  | 'activity-scheduler'
  | 'worry-postponement'
  | 'socratic-perspective'
  | 'exposure-ladder';

type TemplateMeta = {
  id: CbtTemplateId;
  title: string;
  subtitle: string;
  summary: string;
};

type ThoughtRecordState = {
  situation: string;
  emotion: number;
  distortion: string;
  evidenceFor: string;
  evidenceAgainst: string;
  reframe: string;
};

type ActivitySchedulerState = {
  task: string;
  predictedPleasure: number;
  resultLog: string;
};

type WorryPostponementState = {
  worry: string;
  worryType: WorryType;
  releaseStatement: string;
};

type SocraticPerspectiveState = {
  belief: string;
  friendView: string;
  result: string;
};

type ExposureLadderState = {
  fears: string[];
  suds: number[];
};

type TemplateState = {
  'thought-record': ThoughtRecordState;
  'activity-scheduler': ActivitySchedulerState;
  'worry-postponement': WorryPostponementState;
  'socratic-perspective': SocraticPerspectiveState;
  'exposure-ladder': ExposureLadderState;
};

type SpeechRecognitionResultLike = {
  0: { transcript: string };
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const tabs: Array<{ id: HubTab; label: string; caption: string }> = [
  { id: 'daily-mood', label: 'Daily Mood', caption: 'Living mood check-in' },
  { id: 'cbt-practice', label: 'CBT Practice', caption: 'Interactive clinical tools' },
];

const templateCards: TemplateMeta[] = [
  {
    id: 'thought-record',
    title: 'Thought Record',
    subtitle: 'Situation -> Emotion -> Distortion -> Reframe',
    summary: 'Uses a split evidence chart to rebuild cognitive balance.',
  },
  {
    id: 'activity-scheduler',
    title: 'Activity Scheduler',
    subtitle: 'Choose Task -> Predict Pleasure -> Log Result',
    summary: 'Tracks daily goal completion with a visible progress bar.',
  },
  {
    id: 'worry-postponement',
    title: 'Worry Postponement',
    subtitle: 'Record Worry -> Categorize (Real/Hypothetical)',
    summary: 'Includes a guided let-go fade animation for emotional release.',
  },
  {
    id: 'socratic-perspective',
    title: 'Socratic Perspective',
    subtitle: "State Belief -> Friend's View -> Result",
    summary: 'Mirror-style reflection helps create healthier self-dialogue.',
  },
  {
    id: 'exposure-ladder',
    title: 'Exposure Ladder',
    subtitle: 'List 5 fears -> Track SUDs score',
    summary: 'Visual ladder UI tracks intensity and graded exposure readiness.',
  },
];

const distortions = [
  'Catastrophizing',
  'All-or-nothing thinking',
  'Mind reading',
  'Emotional reasoning',
  'Overgeneralization',
  'Should statements',
];

const moodTags = ['Workload', 'Sleep', 'Relationships', 'Health', 'Focus', 'Finances'];

const initialTemplateState: TemplateState = {
  'thought-record': {
    situation: '',
    emotion: 5,
    distortion: '',
    evidenceFor: '',
    evidenceAgainst: '',
    reframe: '',
  },
  'activity-scheduler': {
    task: '',
    predictedPleasure: 5,
    resultLog: '',
  },
  'worry-postponement': {
    worry: '',
    worryType: '',
    releaseStatement: '',
  },
  'socratic-perspective': {
    belief: '',
    friendView: '',
    result: '',
  },
  'exposure-ladder': {
    fears: ['', '', '', '', ''],
    suds: [0, 0, 0, 0, 0],
  },
};

const moodFaces: Array<{ value: number; emoji: string; label: string }> = [
  { value: 2, emoji: '😞', label: 'Low' },
  { value: 4, emoji: '😕', label: 'Heavy' },
  { value: 6, emoji: '😐', label: 'Neutral' },
  { value: 8, emoji: '🙂', label: 'Steady' },
  { value: 10, emoji: '😄', label: 'High' },
];

function getMoodColor(value: number): string {
  const clamped = Math.max(1, Math.min(10, value));
  const hue = ((clamped - 1) / 9) * 120;
  return `hsl(${hue}, 72%, 45%)`;
}

function uiMoodToApiMood(value: number): number {
  // Backend expects mood in 1..5; UI pulse uses 1..10.
  const clamped = Math.max(1, Math.min(10, value));
  return Math.max(1, Math.min(5, Math.round(clamped / 2)));
}

function apiMoodToUiMood(value: number): number {
  const clamped = Math.max(1, Math.min(5, value));
  return Math.max(1, Math.min(10, clamped * 2));
}

function getSpeechCtor(): (new () => SpeechRecognitionLike) | null {
  const ctor = (window as unknown as Record<string, unknown>).SpeechRecognition
    || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  return (ctor as (new () => SpeechRecognitionLike)) || null;
}

function WaveBars() {
  const bars = [0, 1, 2, 3, 4, 5];
  return (
    <div className="ml-2 inline-flex h-4 items-end gap-1">
      {bars.map((bar) => (
        <span
          key={bar}
          className="w-1 rounded-full bg-calm-sage"
          style={{ height: `${[4, 16, 7, 14, 5][bar]}px` }}
        />
      ))}
    </div>
  );
}

type VoiceProps = {
  fieldId: string;
  value: string;
  listeningField: string | null;
  onVoice: (fieldKey: string, currentValue: string, onUpdate: (value: string) => void) => void;
  onStopVoice: () => void;
  onUpdate: (value: string) => void;
};

function VoiceButton({ fieldId, value, listeningField, onVoice, onStopVoice, onUpdate }: VoiceProps) {
  const active = listeningField === fieldId;
  return (
    <button type="button" onClick={() => { if (active) { onStopVoice(); return; } onVoice(fieldId, value, onUpdate); }} className="mt-2 inline-flex min-h-[38px] items-center rounded-full border border-charcoal/20 px-4 text-xs font-semibold text-charcoal">
      {active ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
      {active ? 'Listening...' : 'Use Voice Input'}
      {active ? <WaveBars /> : null}
    </button>
  );
}

type ThoughtRecordProps = {
  step: number;
  state: ThoughtRecordState;
  setState: (field: keyof ThoughtRecordState, value: ThoughtRecordState[keyof ThoughtRecordState]) => void;
  listeningField: string | null;
  onVoice: VoiceProps['onVoice'];
  onStopVoice: VoiceProps['onStopVoice'];
};

function ThoughtRecordWizard({ step, state, setState, listeningField, onVoice, onStopVoice }: ThoughtRecordProps) {
  if (step === 0) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Situation</h3>
        <textarea rows={5} value={state.situation} onChange={(event) => setState('situation', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" />
        <VoiceButton fieldId="thought-situation" value={state.situation} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('situation', value)} />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Emotion Intensity</h3>
        <p className="mt-1 text-sm text-charcoal/60">How strong is the emotion right now?</p>
        <input type="range" min={0} max={10} value={state.emotion} onChange={(event) => setState('emotion', Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-calm-sage/20 accent-calm-sage" />
        <p className="mt-2 text-sm font-semibold text-charcoal">{state.emotion}/10</p>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Distortion + Evidence</h3>
        <select value={state.distortion} onChange={(event) => setState('distortion', event.target.value)} className="mt-3 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage">
          <option value="">Select distortion</option>
          {distortions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-ink-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Evidence For</p>
            <textarea rows={4} value={state.evidenceFor} onChange={(event) => setState('evidenceFor', event.target.value)} className="mt-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage" />
            <VoiceButton fieldId="thought-evidence-for" value={state.evidenceFor} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('evidenceFor', value)} />
          </div>
          <div className="rounded-xl border border-ink-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Evidence Against</p>
            <textarea rows={4} value={state.evidenceAgainst} onChange={(event) => setState('evidenceAgainst', event.target.value)} className="mt-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage" />
            <VoiceButton fieldId="thought-evidence-against" value={state.evidenceAgainst} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('evidenceAgainst', value)} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xl font-semibold text-charcoal">Reframe</h3>
      <textarea rows={5} value={state.reframe} onChange={(event) => setState('reframe', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" />
      <VoiceButton fieldId="thought-reframe" value={state.reframe} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('reframe', value)} />
    </div>
  );
}

type ActivityProps = {
  step: number;
  state: ActivitySchedulerState;
  setState: (field: keyof ActivitySchedulerState, value: ActivitySchedulerState[keyof ActivitySchedulerState]) => void;
  listeningField: string | null;
  onVoice: VoiceProps['onVoice'];
  onStopVoice: VoiceProps['onStopVoice'];
};

function ActivitySchedulerWizard({ step, state, setState, listeningField, onVoice, onStopVoice }: ActivityProps) {
  const dailyGoalProgress = Math.round(((step + 1) / 3) * 100);
  if (step === 0) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Choose Task</h3>
        <textarea rows={4} value={state.task} onChange={(event) => setState('task', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" placeholder="What meaningful task will you complete today?" />
        <VoiceButton fieldId="activity-task" value={state.task} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('task', value)} />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Predict Pleasure</h3>
        <p className="mt-1 text-sm text-charcoal/60">How rewarding will this feel after completion?</p>
        <input type="range" min={0} max={10} value={state.predictedPleasure} onChange={(event) => setState('predictedPleasure', Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-calm-sage/20 accent-calm-sage" />
        <p className="mt-2 text-sm font-semibold text-charcoal">{state.predictedPleasure}/10</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xl font-semibold text-charcoal">Log Result</h3>
      <p className="mt-1 text-sm text-charcoal/60">What happened once you completed the task?</p>
      <textarea rows={5} value={state.resultLog} onChange={(event) => setState('resultLog', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" />
      <VoiceButton fieldId="activity-result" value={state.resultLog} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('resultLog', value)} />
      <div className="mt-4 rounded-xl border border-calm-sage/20 bg-calm-sage/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Daily goal progress</p>
        <div className="mt-2 h-2 rounded-full bg-white/80"><div className="h-2 rounded-full bg-calm-sage" style={{ width: `${dailyGoalProgress}%` }} /></div>
      </div>
    </div>
  );
}

type WorryProps = {
  step: number;
  state: WorryPostponementState;
  setState: (field: keyof WorryPostponementState, value: WorryPostponementState[keyof WorryPostponementState]) => void;
  listeningField: string | null;
  onVoice: VoiceProps['onVoice'];
  onStopVoice: VoiceProps['onStopVoice'];
};

function WorryPostponementWizard({ step, state, setState, listeningField, onVoice, onStopVoice }: WorryProps) {
  if (step === 0) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Record Worry</h3>
        <textarea rows={5} value={state.worry} onChange={(event) => setState('worry', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" />
        <VoiceButton fieldId="worry-record" value={state.worry} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('worry', value)} />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Categorize worry</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[{ value: 'real', label: 'Real / Actionable' }, { value: 'hypothetical', label: 'Hypothetical / Future' }].map((item) => (
            <button key={item.value} type="button" onClick={() => setState('worryType', item.value as WorryType)} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${state.worryType === item.value ? 'border-charcoal bg-charcoal text-white' : 'border-ink-200 bg-white text-charcoal/70'}`}>{item.label}</button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xl font-semibold text-charcoal">Let it go statement</h3>
      <textarea rows={4} value={state.releaseStatement} onChange={(event) => setState('releaseStatement', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" placeholder="Example: I will revisit this at 7 PM, not right now." />
      <VoiceButton fieldId="worry-release" value={state.releaseStatement} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('releaseStatement', value)} />
      <div className="mt-4 rounded-xl border border-calm-sage/20 bg-calm-sage/10 px-4 py-3 text-sm text-charcoal">
        Let it go. Park this worry until your scheduled window.
      </div>
    </div>
  );
}

type SocraticProps = {
  step: number;
  state: SocraticPerspectiveState;
  setState: (field: keyof SocraticPerspectiveState, value: SocraticPerspectiveState[keyof SocraticPerspectiveState]) => void;
  listeningField: string | null;
  onVoice: VoiceProps['onVoice'];
  onStopVoice: VoiceProps['onStopVoice'];
};

function SocraticPerspectiveWizard({ step, state, setState, listeningField, onVoice, onStopVoice }: SocraticProps) {
  if (step === 0) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">State Belief</h3>
        <textarea rows={4} value={state.belief} onChange={(event) => setState('belief', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" />
        <VoiceButton fieldId="socratic-belief" value={state.belief} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('belief', value)} />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">Friend's View</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-ink-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Your belief</p>
            <p className="mt-2 text-sm text-charcoal/75">{state.belief || 'Your belief appears here.'}</p>
          </div>
          <div className="rounded-xl border border-calm-sage/30 bg-calm-sage/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Mirror reflection</p>
            <textarea rows={4} value={state.friendView} onChange={(event) => setState('friendView', event.target.value)} className="mt-2 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage" placeholder="What would you tell a friend in this same situation?" />
            <VoiceButton fieldId="socratic-friend" value={state.friendView} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('friendView', value)} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xl font-semibold text-charcoal">Result</h3>
      <textarea rows={4} value={state.result} onChange={(event) => setState('result', event.target.value)} className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-calm-sage" placeholder="How has your belief shifted after this reflection?" />
      <VoiceButton fieldId="socratic-result" value={state.result} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => setState('result', value)} />
    </div>
  );
}

type LadderProps = {
  step: number;
  state: ExposureLadderState;
  setState: (field: keyof ExposureLadderState, value: ExposureLadderState[keyof ExposureLadderState]) => void;
  listeningField: string | null;
  onVoice: VoiceProps['onVoice'];
  onStopVoice: VoiceProps['onStopVoice'];
};

function ExposureLadderWizard({ step, state, setState, listeningField, onVoice, onStopVoice }: LadderProps) {
  if (step === 0) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-charcoal">List 5 fears (lowest to highest difficulty)</h3>
        <div className="mt-3 space-y-2">
          {state.fears.map((fear, index) => (
            <div key={`fear-${index}`} className="rounded-xl border border-ink-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Step {index + 1}</p>
              <input value={fear} onChange={(event) => { const next = [...state.fears]; next[index] = event.target.value; setState('fears', next); }} className="mt-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-charcoal outline-none focus:border-calm-sage" placeholder={`Fear ${index + 1}`} />
              <VoiceButton fieldId={`ladder-fear-${index}`} value={fear} listeningField={listeningField} onVoice={onVoice} onStopVoice={onStopVoice} onUpdate={(value) => { const next = [...state.fears]; next[index] = value; setState('fears', next); }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xl font-semibold text-charcoal">Track SUDs score</h3>
      <p className="mt-1 text-sm text-charcoal/60">Rate distress (0-10) for each ladder step.</p>
      <div className="mt-3 space-y-3">
        {state.fears.map((fear, index) => (
          <div key={`suds-${index}`} className="rounded-xl border border-ink-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-charcoal">{fear || `Step ${index + 1}`}</p>
              <span className="rounded-full bg-calm-sage/15 px-2 py-0.5 text-xs font-semibold text-charcoal">SUDs {state.suds[index]}</span>
            </div>
            <input type="range" min={0} max={10} value={state.suds[index]} onChange={(event) => { const next = [...state.suds]; next[index] = Number(event.target.value); setState('suds', next); }} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-calm-sage/20 accent-calm-sage" />
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-calm-sage/20 bg-calm-sage/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Ladder progress</p>
        <div className="mt-2 grid gap-1">
          {state.suds.map((score, index) => (
            <div key={`ladder-visual-${index}`} className="flex items-center gap-2">
              <span className="w-10 text-xs text-charcoal/55">{index + 1}</span>
              <div className="h-2 flex-1 rounded-full bg-white/80"><div className="h-2 rounded-full bg-calm-sage" style={{ width: `${Math.max(6, score * 10)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DailyCheckInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<HubTab>('daily-mood');

  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [sleepHours, setSleepHours] = useState('6-8');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savingMood, setSavingMood] = useState(false);
  const [todayMood, setTodayMood] = useState<number | null>(null);

  // Use shared therapy data hook for streak synchronization
  const { streak, refreshStreak } = useTherapyData();

  const [activeTemplateId, setActiveTemplateId] = useState<CbtTemplateId>('thought-record');
  const [templateStep, setTemplateStep] = useState(0);
  const [templateData, setTemplateData] = useState<TemplateState>(initialTemplateState);

  const [listeningField, setListeningField] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const rawTab = searchParams.get('tab');
    if (rawTab === 'daily-mood' || rawTab === 'cbt-practice') {
      setActiveTab(rawTab);
    }

    // Handle initialMood parameter from Dashboard
    const initialMoodParam = searchParams.get('initialMood');
    if (initialMoodParam) {
      const initialMoodValue = Number(initialMoodParam);
      if (!isNaN(initialMoodValue) && initialMoodValue >= 1 && initialMoodValue <= 10) {
        setMood(initialMoodValue);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      const todayRes = await patientApi.getMoodToday().catch(() => null);
      const todayPayload = (todayRes as Record<string, unknown>)?.data ?? todayRes;

      const latestMood = (todayPayload as Record<string, any>)?.latest?.mood;
      if (typeof latestMood === 'number') setTodayMood(apiMoodToUiMood(latestMood));
      
      // Refresh streak from shared hook
      await refreshStreak();
    })();
  }, [refreshStreak]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const currentTemplate = useMemo(
    () => templateCards.find((item) => item.id === activeTemplateId) || templateCards[0],
    [activeTemplateId],
  );

  const setTab = (tab: HubTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]));
  };

  const saveMoodCheckIn = async () => {
    setSavingMood(true);
    try {
      await patientApi.addMoodLog({
        mood: uiMoodToApiMood(mood),
        note,
        intensity: mood,
        tags: selectedTags,
        energy,
        sleepHours,
      });
      setTodayMood(mood);
      
      // Refresh streak from shared hook to stay in sync
      await refreshStreak();
      
      toast.success('Daily mood check-in saved.');
    } catch {
      toast.error('Could not save check-in right now.');
    } finally {
      setSavingMood(false);
    }
  };

  const templateStepCount = useMemo(() => {
    if (activeTemplateId === 'thought-record') return 4;
    if (activeTemplateId === 'activity-scheduler') return 3;
    if (activeTemplateId === 'worry-postponement') return 3;
    if (activeTemplateId === 'socratic-perspective') return 3;
    return 2;
  }, [activeTemplateId]);

  const templateProgress = Math.round(((templateStep + 1) / templateStepCount) * 100);

  const updateTemplateField = <K extends CbtTemplateId, P extends keyof TemplateState[K]>(
    templateId: K,
    field: P,
    value: TemplateState[K][P],
  ) => {
    setTemplateData((current) => ({
      ...current,
      [templateId]: {
        ...current[templateId],
        [field]: value,
      },
    }));
  };

  const startVoiceCapture = (fieldKey: string, currentValue: string, onUpdate: (value: string) => void) => {
    const SpeechCtor = getSpeechCtor();
    if (!SpeechCtor) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognizer = new SpeechCtor();
    recognitionRef.current = recognizer;
    recognizer.lang = 'en-US';
    recognizer.interimResults = true;
    recognizer.continuous = true;
    recognizer.maxAlternatives = 1;

    setListeningField(fieldKey);

    recognizer.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += `${event.results[i][0].transcript} `;
      }
      const next = `${currentValue} ${transcript}`.replace(/\s+/g, ' ').trim();
      onUpdate(next);
    };

    recognizer.onerror = () => {
      setListeningField(null);
      toast.error('Voice capture failed. Try again.');
    };

    recognizer.onend = () => {
      setListeningField(null);
    };

    recognizer.start();
  };

  const stopVoiceCapture = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListeningField(null);
  };

  const validateCurrentStep = () => {
    if (activeTemplateId === 'thought-record') {
      const data = templateData['thought-record'];
      if (templateStep === 0) return data.situation.trim().length > 0;
      if (templateStep === 1) return data.emotion >= 0;
      if (templateStep === 2) return data.distortion.trim().length > 0 && data.evidenceFor.trim().length > 0 && data.evidenceAgainst.trim().length > 0;
      if (templateStep === 3) return data.reframe.trim().length > 0;
    }

    if (activeTemplateId === 'activity-scheduler') {
      const data = templateData['activity-scheduler'];
      if (templateStep === 0) return data.task.trim().length > 0;
      if (templateStep === 1) return data.predictedPleasure >= 0;
      if (templateStep === 2) return data.resultLog.trim().length > 0;
    }

    if (activeTemplateId === 'worry-postponement') {
      const data = templateData['worry-postponement'];
      if (templateStep === 0) return data.worry.trim().length > 0;
      if (templateStep === 1) return data.worryType !== '';
      if (templateStep === 2) return data.releaseStatement.trim().length > 0;
    }

    if (activeTemplateId === 'socratic-perspective') {
      const data = templateData['socratic-perspective'];
      if (templateStep === 0) return data.belief.trim().length > 0;
      if (templateStep === 1) return data.friendView.trim().length > 0;
      if (templateStep === 2) return data.result.trim().length > 0;
    }

    if (activeTemplateId === 'exposure-ladder') {
      const data = templateData['exposure-ladder'];
      if (templateStep === 0) return data.fears.every((fear) => fear.trim().length > 0);
      if (templateStep === 1) return data.suds.every((score) => score >= 0);
    }

    return true;
  };

  const nextTemplateStep = () => {
    if (!validateCurrentStep()) {
      toast.error('Please complete this step before continuing.');
      return;
    }

    if (templateStep < templateStepCount - 1) {
      setTemplateStep((current) => current + 1);
      return;
    }

    toast.success(`${currentTemplate.title} completed.`);
  };

  const livingEmojiValue = useMemo(
    () => moodFaces.reduce((closest, item) => (Math.abs(item.value - mood) < Math.abs(closest.value - mood) ? item : closest), moodFaces[2]),
    [mood],
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-24">
      <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#d8efe8] via-[#edf8f4] to-[#f9f6ee] p-4 shadow-wellness-md sm:p-6 lg:p-8">
        <div className="absolute inset-y-0 right-0 w-[45%] bg-[radial-gradient(circle_at_center,_rgba(25,53,77,0.13),transparent_70%)]" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/55">Interactive Clinical Hub</p>
            <h1 className="mt-4 max-w-3xl font-serif text-2xl font-semibold tracking-tight text-charcoal sm:text-3xl lg:text-4xl">Daily mood and CBT practice in one premium patient workflow.</h1>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-charcoal/70 sm:text-sm lg:text-base">PHQ-9 and GAD-7 are intentionally kept in Care Team pathways to avoid clutter in this daily engagement surface.</p>
          </div>
          <div className="hidden lg:block rounded-[24px] border border-white/60 bg-white/75 p-5 shadow-wellness-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/45">Momentum Card</p>
            <p className="mt-3 text-2xl font-semibold text-charcoal">Current streak: {streak} days</p>
            <p className="mt-1 text-sm text-charcoal/65">{todayMood ? `Today's check-in is complete at mood score ${todayMood}/10.` : 'You have not checked in today yet.'}</p>
          </div>
        </div>
        {/* Mobile momentum indicator */}
        <div className="lg:hidden mt-4 inline-flex gap-2 rounded-full bg-white/50 px-3 py-1.5">
          <span className="text-sm font-semibold text-charcoal">🔥 {streak} day streak</span>
        </div>
      </section>

      <section className="wellness-panel rounded-[24px] p-3 sm:rounded-[26px] sm:p-4">
        {/* Segmented Control - Slim Tabs */}
        <div className="flex h-11 items-center rounded-full bg-gray-100 p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-charcoal shadow-sm'
                    : 'text-charcoal/60 hover:text-charcoal/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'daily-mood' && (
        <section className="grid gap-4 md:gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="wellness-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-charcoal">Daily Mood</h2>
            <p className="mt-1 text-xs sm:text-sm text-charcoal/65">Living emoji feedback plus intensity pulse tracking.</p>

            <div className="mt-5 flex gap-4 justify-center sm:justify-start">
              {moodFaces.map((face) => {
                const selected = livingEmojiValue.value === face.value;
                return (
                  <button
                    key={face.value}
                    type="button"
                    onClick={() => setMood(face.value)}
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-200 sm:h-16 sm:w-16 ${
                      selected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl">{face.emoji}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-calm-sage/20 bg-white p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold text-charcoal">Mood Pulse</p>
                  <span className="rounded-full px-2.5 py-0.5 text-xs sm:text-sm font-bold text-white" style={{ background: getMoodColor(mood) }}>{mood}/10</span>
                </div>
                <input type="range" min={1} max={10} value={mood} onChange={(event) => setMood(Number(event.target.value))} style={{ accentColor: getMoodColor(mood) }} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#22c55e]" />
              </div>

              <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/50">Energy</p>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((value) => (
                      <button key={value} type="button" onClick={() => setEnergy(value)} className={`flex-1 rounded-xl border px-2 py-2 text-xs sm:text-sm font-semibold ${energy === value ? 'border-charcoal bg-charcoal text-white' : 'border-ink-200 bg-white text-charcoal/70'}`}>{value}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/50">Sleep Hours</p>
                  <div className="flex gap-2">
                    {['<4', '5-6', '6-8', '8+'].map((value) => (
                      <button key={value} type="button" onClick={() => setSleepHours(value)} className={`flex-1 rounded-xl border px-2 py-2 text-xs sm:text-sm font-semibold ${sleepHours === value ? 'border-charcoal bg-charcoal text-white' : 'border-ink-200 bg-white text-charcoal/70'}`}>{value}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/50">Mood Context</p>
                <div className="flex flex-wrap gap-2">
                  {moodTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full border px-2.5 py-1 text-xs sm:text-sm ${active ? 'border-calm-sage bg-calm-sage text-white' : 'border-ink-200 bg-white text-charcoal/65'}`}>{tag}</button>
                    );
                  })}
                </div>
              </div>

              <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Capture one reflection from today." className="mt-5 w-full rounded-2xl border border-ink-200 bg-white px-3 py-3 text-xs sm:text-sm text-charcoal outline-none focus:border-calm-sage placeholder:text-charcoal/40" />

              <button type="button" disabled={savingMood} onClick={() => void saveMoodCheckIn()} className="mt-5 w-full inline-flex justify-center min-h-[44px] sm:min-h-[46px] items-center rounded-full bg-charcoal px-6 text-xs sm:text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50">
                {savingMood ? 'Saving...' : 'Save Daily Mood'}
              </button>
            </article>

            <article className="wellness-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/50">Next action</p>
              <h3 className="mt-2 text-lg sm:text-xl font-semibold text-charcoal">Move directly into CBT Practice</h3>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-charcoal/68">Keep the habit light: one mood pulse and one clinical CBT step cycle creates high-quality continuity between sessions.</p>
              <button type="button" onClick={() => setTab('cbt-practice')} className="mt-4 w-full inline-flex justify-center min-h-[42px] items-center rounded-full bg-charcoal px-5 text-xs sm:text-sm font-semibold text-white">Open CBT Practice</button>
            </article>
          </section>
        )}

        {activeTab === 'cbt-practice' && (
          <section className="relative">
            <article className="wellness-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-charcoal">CBT Practice</h2>
              <p className="mt-1 text-xs sm:text-sm text-charcoal/65">Choose a template to launch the step-by-step clinical wizard.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templateCards.map((card) => {
                  const selected = card.id === activeTemplateId;
                  return (
                    <button key={card.id} type="button" onClick={() => { setActiveTemplateId(card.id); setTemplateStep(0); }} className={`rounded-2xl border p-3 sm:p-4 text-left transition ${selected ? 'border-charcoal bg-charcoal text-white' : 'border-white/70 bg-white text-charcoal/75 hover:border-calm-sage/40'}`}>
                      <p className="text-sm sm:text-base font-semibold">{card.title}</p>
                      <p className={`mt-1 text-xs ${selected ? 'text-white/80' : 'text-charcoal/60'}`}>{card.subtitle}</p>
                      <p className={`mt-2 text-xs sm:text-sm ${selected ? 'text-white/85' : 'text-charcoal/62'}`}>{card.summary}</p>
                    </button>
                  );
                })}
              </div>
            </article>

            {/* RIGHT-SIDE DRAWER for CBT Wizard (450px) */}
            {activeTemplateId && (
              <div
                className="fixed inset-0 z-40 bg-black/20 lg:relative lg:bg-transparent lg:inset-auto lg:z-0"
              >
                  <div
                    className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[450px] overflow-y-auto bg-white shadow-lg lg:relative lg:max-w-full lg:w-auto lg:shadow-none"
                  >
                    <div className="flex h-full flex-col">
                      {/* Drawer Header */}
                      <div className="sticky top-0 border-b border-white/70 bg-white/95 p-3 sm:p-5 backdrop-blur">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/50">{currentTemplate.title}</p>
                            <p className="mt-1 text-xs sm:text-sm font-semibold text-charcoal">Step {templateStep + 1} of {templateStepCount}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTemplateId('thought-record')}
                            className="text-charcoal/50 hover:text-charcoal lg:hidden"
                          >
                            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-ink-100">
                          <div className="h-1.5 rounded-full bg-calm-sage transition-all" style={{ width: `${templateProgress}%` }} />
                        </div>
                      </div>

                      {/* Drawer Content */}
                      <div className="flex-1 space-y-4 sm:space-y-5 overflow-y-auto p-4 sm:p-5">
                        {activeTemplateId === 'thought-record' && (
                          <ThoughtRecordWizard step={templateStep} state={templateData['thought-record']} setState={(field, value) => updateTemplateField('thought-record', field, value)} listeningField={listeningField} onVoice={startVoiceCapture} onStopVoice={stopVoiceCapture} />
                        )}
                        {activeTemplateId === 'activity-scheduler' && (
                          <ActivitySchedulerWizard step={templateStep} state={templateData['activity-scheduler']} setState={(field, value) => updateTemplateField('activity-scheduler', field, value)} listeningField={listeningField} onVoice={startVoiceCapture} onStopVoice={stopVoiceCapture} />
                        )}
                        {activeTemplateId === 'worry-postponement' && (
                          <WorryPostponementWizard step={templateStep} state={templateData['worry-postponement']} setState={(field, value) => updateTemplateField('worry-postponement', field, value)} listeningField={listeningField} onVoice={startVoiceCapture} onStopVoice={stopVoiceCapture} />
                        )}
                        {activeTemplateId === 'socratic-perspective' && (
                          <SocraticPerspectiveWizard step={templateStep} state={templateData['socratic-perspective']} setState={(field, value) => updateTemplateField('socratic-perspective', field, value)} listeningField={listeningField} onVoice={startVoiceCapture} onStopVoice={stopVoiceCapture} />
                        )}
                        {activeTemplateId === 'exposure-ladder' && (
                          <ExposureLadderWizard step={templateStep} state={templateData['exposure-ladder']} setState={(field, value) => updateTemplateField('exposure-ladder', field, value)} listeningField={listeningField} onVoice={startVoiceCapture} onStopVoice={stopVoiceCapture} />
                        )}
                      </div>

                      {/* Drawer Footer */}
                      <div className="border-t border-white/70 bg-white/95 p-3 sm:p-5 backdrop-blur">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            type="button"
                            disabled={templateStep === 0}
                            onClick={() => setTemplateStep((current) => Math.max(0, current - 1))}
                            className="flex-1 rounded-full border border-ink-200 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-charcoal/75 disabled:opacity-40"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={nextTemplateStep}
                            className="flex-1 rounded-full bg-charcoal px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-black"
                          >
                            {templateStep < templateStepCount - 1 ? 'Next Step' : 'Complete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </section>
        )}
    </div>
  );
}
