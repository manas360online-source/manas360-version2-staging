import { useEffect, useRef, useState } from 'react';

type SleepStep = {
  id: number;
  title: string;
  emoji: string;
  shortDescription: string;
  selfRationale: string;
  rxRationale: string;
  rxDetail?: string;
  when: string;
  detailedExplanation?: string;
};

type ZoneId = 'head' | 'neck' | 'shoulders' | 'chest' | 'belly' | 'hips' | 'legs' | 'feet';

const steps: SleepStep[] = [
  {
    id: 1,
    title: 'Shut Off All Gadgets',
    emoji: '📵',
    shortDescription: 'Power down screens 45 minutes before bed. Blue light blocks melatonin production.',
    selfRationale: 'Less screen light helps your body naturally switch to night mode.',
    rxRationale: 'Blue light reduces melatonin by up to 50%. Even 30 minutes of screen-free time measurably improves sleep onset latency.',
    detailedExplanation: 'Screen blue light suppresses melatonin by up to 50%. Even 30 minutes of screen-free time measurably improves sleep onset latency.\n\nSet all devices to Do Not Disturb. Place phone face-down in another room. Turn off laptop, tablet, and gaming console. If you use phone as alarm, switch to a simple alarm clock.',
    when: '8:15 PM · 45 min before sleep',
  },
  {
    id: 2,
    title: 'No Phone Charging Nearby',
    emoji: '🔌',
    shortDescription: 'Charge your phone in a different room. Not beside the bed. Not even in the bedroom.',
    selfRationale: 'Distance from your phone reduces mindless checking before sleep.',
    rxRationale: 'Phone proximity increases cognitive vigilance. Device separation is a core behavioral sleep intervention.',
    detailedExplanation: 'Phone proximity creates unconscious vigilance — your brain stays alert for notifications even in sleep. Distance eliminates the temptation to "just check one thing."\n\nPick a charging spot in the living room or kitchen. Make it a permanent spot. Your morning routine now includes walking to your phone — which helps you wake up too.',
    when: '8:15 PM · Place in another room',
  },
  {
    id: 3,
    title: 'Stimulus Control',
    emoji: '🛏️',
    shortDescription: 'Acknowledge bedroom use is only for sleep.',
    selfRationale: 'Keeping bed only for sleep makes falling asleep easier over time.',
    rxRationale: 'CBT-I stimulus control: bed = sleep. Avoid TV/work in bed to improve conditioned sleep response.',
    detailedExplanation: 'Stimulus control therapy — one of the most evidence-backed CBT-I techniques. When your brain only associates the bedroom with sleep, falling asleep becomes automatic.\n\nIf removing the TV isn\'t possible, cover it with a cloth at night. Never watch TV in bed. If you can\'t sleep after 20 min, get up and go to another room until sleepy.',
    when: '8:20 PM · Permanent change',
  },
  {
    id: 4,
    title: 'Melatonin Signal',
    emoji: '🌑',
    shortDescription: 'Lights off at 9:00 PM sharp.',
    selfRationale: 'Darkness tells your brain it is time to wind down.',
    rxRationale: 'Light suppression protocol at fixed time strengthens circadian rhythm and improves sleep depth consistency.',
    detailedExplanation: 'Your suprachiasmatic nucleus (brain\'s master clock) uses light to regulate the circadian cycle. Darkness triggers melatonin. Even dim light from LEDs on devices, street lights, or standby indicators can reduce melatonin by 20%.\n\nUse blackout curtains. Cover any LED standby lights with tape. If needed, use a dim red/amber night light only (red light has minimal melatonin impact).',
    when: '9:00 PM · Non-negotiable',
  },
  {
    id: 5,
    title: 'Soundscape',
    emoji: '🎵',
    shortDescription: 'Run a 5-minute Rain, Ocean, or Raag Darbari track.',
    selfRationale: 'Calming audio reduces mental noise before bed.',
    rxRationale: 'Auditory down-regulation supports parasympathetic activation and lowers physiological arousal pre-sleep.',
    detailedExplanation: 'Auditory stimuli at 432Hz or nature sounds activate the parasympathetic nervous system, lowering heart rate by 3-8 BPM within 5 minutes. This shifts the body from sympathetic (fight-or-flight) to parasympathetic (rest-and-digest).\n\nChoose a sound and press play.',
    when: '9:00 PM · 5 minutes',
  },
  {
    id: 6,
    title: 'Progressive Body Relaxation',
    emoji: '🧘',
    shortDescription: 'Systematically release tension from head to toe. 5 seconds per body zone, total ~2 minutes.',
    selfRationale: 'Relaxing each body area releases tension you may not notice during the day.',
    rxRationale: 'Progressive muscle relaxation decreases somatic tension and nighttime hyperarousal linked to insomnia.',
    detailedExplanation: 'Progressive Muscle Relaxation (PMR) was developed by Dr. Edmund Jacobson. Tensing then releasing each muscle group teaches the body what "relaxed" feels like. Reduces cortisol by up to 25% in one session.\n\nUse the body scanner to guide you through each zone.',
    when: '9:05 PM · 2 minutes',
  },
  {
    id: 7,
    title: 'Final Let-Go',
    emoji: '😴',
    shortDescription: 'Release jaw, shoulders, and settle into sleep posture.',
    selfRationale: 'A final release cue helps your mind stop active effort and drift naturally.',
    rxRationale: 'Terminal relaxation cue reduces residual muscle tone and cognitive effort at lights-out transition.',
    detailedExplanation: 'The military sleep technique (used by US Navy) teaches falling asleep in 2 minutes by: relaxing face muscles, dropping shoulders, releasing hands, clearing the mind with "don\'t think, don\'t think" for 10 seconds.\n\nFinal checklist: Jaw unclenched? Shoulders dropped from ears? Hands open, palms up? Tongue relaxed from roof of mouth? Forehead smooth? Let gravity hold every part of you. You are safe. Goodnight.',
    when: '9:07 PM · Drift off',
  },
];

const zoneOrder: ZoneId[] = ['head', 'neck', 'shoulders', 'chest', 'belly', 'hips', 'legs', 'feet'];

export default function SleepTherapyPage() {
  const [mode, setMode] = useState<'self' | 'rx'>('self');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const [selectedSound, setSelectedSound] = useState('rain');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const timerIntervalRef = useRef<number | null>(null);

  const [scanning, setScanning] = useState(false);
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);
  const [relaxedZones, setRelaxedZones] = useState<ZoneId[]>([]);
  const scanTimeoutsRef = useRef<number[]>([]);

  const progressPercent = Math.round((completedSteps.size / steps.length) * 100);

  const toggleStep = (stepId: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setTimerSeconds(300);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } else {
      setIsPlaying(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const updateTimerDisplay = () => {
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startScan = () => {
    if (scanning) return;
    setScanning(true);
    setActiveZone(null);
    setRelaxedZones([]);

    scanNextZone(0);
  };

  const scanNextZone = (index: number) => {
    if (index >= zoneOrder.length) {
      setScanning(false);
      setActiveZone(null);
      return;
    }

    const zone = zoneOrder[index];
    setActiveZone(zone);

    const startId = window.setTimeout(() => {
      setRelaxedZones(prev => (prev.includes(zone) ? prev : [...prev, zone]));
    }, 5000);
    scanTimeoutsRef.current.push(startId);

    const nextId = window.setTimeout(() => {
      scanNextZone(index + 1);
    }, 5000);
    scanTimeoutsRef.current.push(nextId);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      scanTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    };
  }, []);

  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full min-h-screen bg-white" style={{ fontFamily: "'Quicksand', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&family=Quicksand:wght@300;400;500;600;700&display=swap');
        
        :root {
          --night: #1a1a2e;
          --night2: #16213e;
          --night3: #0f3460;
          --moon: #F5F0E1;
          --star: #FFF8E1;
          --lavender: #B39DDB;
          --lavender-light: #EDE7F6;
          --indigo: #5C6BC0;
          --indigo-light: #E8EAF6;
          --teal: #4DB6AC;
          --teal-light: #E0F2F1;
          --slate: #1E293B;
          --slate3: #475569;
          --slate4: #64748B;
          --stone: #94A3B8;
          --border: #E2E8F0;
          --white: #FFFFFF;
          --bg: #FAFBFC;
        }
        
        @keyframes wave {
          0% { height: 4px; }
          100% { height: 22px; }
        }
        
        .wave-bar.playing span {
          animation: wave 0.6s ease-in-out infinite alternate;
        }
      `}</style>

      <div className="max-w-[420px] mx-auto px-4 pb-10 pt-8">
        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
            MANAS360 Sleep Therapy
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2" style={{ fontFamily: "'Baloo 2', cursive" }}>
            🌙 Nidra — Sleep Well
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            A guided sleep hygiene program that helps you wind down, disconnect, and fall into deep restorative sleep.
          </p>
        </div>

        {/* MODE TOGGLE */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setMode('self')}
            className={`flex-1 rounded-xl py-2 px-3 text-sm font-bold transition ${
              mode === 'self'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="text-base mb-1">🔍</div>
            Self Discovery
          </button>
          <button
            onClick={() => setMode('rx')}
            className={`flex-1 rounded-xl py-2 px-3 text-sm font-bold transition ${
              mode === 'rx'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="text-base mb-1">📋</div>
            Prescription Mode
          </button>
        </div>

        {/* PROGRESS */}
        <div className="flex gap-4 bg-indigo-50 rounded-2xl p-4 mb-6">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="#E8EAF6" strokeWidth="5" fill="none" />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="#5C6BC0"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.3s' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-indigo-600">
              {progressPercent}%
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Tonight's Sleep Prep
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {completedSteps.size === 0
                ? 'Tap each step when done. Complete all 7 for best results.'
                : completedSteps.size < 4
                ? `${completedSteps.size}/7 complete. Keep going — each step counts.`
                : completedSteps.size < 7
                ? `${completedSteps.size}/7 done! Almost there. Your body is thanking you.`
                : '🌟 All 7 steps complete! Perfect sleep hygiene tonight. Goodnight.'}
            </p>
          </div>
        </div>

        {/* STEPS */}
        <div className="space-y-3 mb-6">
          {steps.map((step) => {
            const isExpanded = expandedStep === step.id;
            const isDone = completedSteps.has(step.id);
            const rxTagIds = [2, 3, 4, 6];
            const showRxTag = mode === 'rx' && rxTagIds.includes(step.id);

            return (
              <div
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className={`bg-white border-2 rounded-2xl p-4 pl-16 relative cursor-pointer transition ${
                  isDone
                    ? 'border-teal-400 bg-teal-50'
                    : isExpanded
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 hover:border-lavender'
                }`}
              >
                {/* Step Number */}
                <div
                  className={`absolute left-3 top-4 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition ${
                    isDone
                      ? 'bg-teal-500 text-white'
                      : isExpanded
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  style={{ fontFamily: "'Baloo 2', cursive" }}
                >
                  {step.id}
                </div>

                {/* Content */}
                <div className="font-black text-slate-900 flex items-center gap-2" style={{ fontFamily: "'Baloo 2', cursive" }}>
                  <span className="text-lg">{step.emoji}</span>
                  {step.title}
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">{step.shortDescription}</p>
                <div className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1">
                  ⏱ {step.when}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 leading-relaxed font-medium mb-2">
                      <strong className="text-slate-900">Why it works:</strong> {step.detailedExplanation}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                        showRxTag ? 'bg-indigo-200 text-indigo-700' : 'bg-teal-200 text-teal-700'
                      }`}
                    >
                      {showRxTag ? '📋 Prescribed' : '🔍 Self Discovery'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SOUND PLAYER */}
        <div
          className="rounded-2xl p-5 mb-6 text-white overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12" />

          <div className="relative z-10">
            <div className="font-black text-base mb-1" style={{ fontFamily: "'Baloo 2', cursive" }}>
              🎵 Relaxation Soundscape
            </div>
            <div className="text-xs text-white/60 mb-4 font-medium">
              Choose a sound · 5-minute guided wind-down
            </div>

            {/* Sound Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['🌧 Rain', '🌊 Ocean', '🌲 Forest', '🕉 Singing Bowl', '🍃 Night Wind'].map(sound => (
                <button
                  key={sound}
                  onClick={() => setSelectedSound(sound.split(' ')[1].toLowerCase())}
                  className={`px-3 py-1.5 rounded-full border text-xs font-bold transition ${
                    selectedSound === sound.split(' ')[1].toLowerCase()
                      ? 'bg-white/15 border-white'
                      : 'border-white/20 hover:border-white/50'
                  }`}
                >
                  {sound}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-11 h-11 rounded-full border-2 border-white flex items-center justify-center text-lg hover:bg-white/10 transition"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div>
                <div className="font-black text-2xl" style={{ fontFamily: "'Baloo 2', cursive" }}>
                  {updateTimerDisplay()}
                </div>
                <div className="text-xs text-white/50 font-bold">
                  {isPlaying ? selectedSound.toUpperCase() + ' · PLAYING' : 'TAP TO START'}
                </div>
              </div>
              <div className="flex gap-1 items-end ml-auto h-6">
                {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 flex-1 rounded-sm bg-white/30"
                    style={{
                      height: isPlaying ? '12px' : '6px',
                      animation: isPlaying ? `wave 0.6s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BODY SCANNER */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 mb-6">
          <div className="font-black text-slate-900 mb-1" style={{ fontFamily: "'Baloo 2', cursive" }}>
            🧘 Progressive Body Relaxation
          </div>
          <p className="text-xs text-slate-600 font-medium mb-4">
            Tap "Start Scan" — relax each zone as it highlights (5s each)
          </p>

          {/* Simple SVG body outline */}
          <div className="flex justify-center mb-4">
            <svg viewBox="0 0 120 220" className="w-20 h-auto">
              {/* Head */}
              <circle
                cx="60"
                cy="20"
                r="12"
                fill={activeZone === 'head' ? '#818cf84d' : relaxedZones.includes('head') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'head' ? '#6366f1' : relaxedZones.includes('head') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
              {/* Neck */}
              <rect
                x="54"
                y="34"
                width="12"
                height="8"
                fill={activeZone === 'neck' ? '#818cf84d' : relaxedZones.includes('neck') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'neck' ? '#6366f1' : relaxedZones.includes('neck') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
              {/* Shoulders */}
              <rect
                x="30"
                y="44"
                width="60"
                height="12"
                rx="4"
                fill={activeZone === 'shoulders' ? '#818cf84d' : relaxedZones.includes('shoulders') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'shoulders' ? '#6366f1' : relaxedZones.includes('shoulders') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
              {/* Chest */}
              <rect
                x="42"
                y="58"
                width="36"
                height="20"
                rx="4"
                fill={activeZone === 'chest' ? '#818cf84d' : relaxedZones.includes('chest') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'chest' ? '#6366f1' : relaxedZones.includes('chest') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
              {/* Belly */}
              <rect
                x="45"
                y="80"
                width="30"
                height="16"
                rx="3"
                fill={activeZone === 'belly' ? '#818cf84d' : relaxedZones.includes('belly') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'belly' ? '#6366f1' : relaxedZones.includes('belly') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
              {/* Hips */}
              <rect
                x="42"
                y="98"
                width="36"
                height="12"
                rx="3"
                fill={activeZone === 'hips' ? '#818cf84d' : relaxedZones.includes('hips') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'hips' ? '#6366f1' : relaxedZones.includes('hips') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
              {/* Legs */}
              <rect
                x="40"
                y="112"
                width="40"
                height="30"
                rx="4"
                fill={activeZone === 'legs' ? '#818cf84d' : relaxedZones.includes('legs') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'legs' ? '#6366f1' : relaxedZones.includes('legs') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
              {/* Feet */}
              <rect
                x="36"
                y="144"
                width="48"
                height="14"
                rx="3"
                fill={activeZone === 'feet' ? '#818cf84d' : relaxedZones.includes('feet') ? '#4db6ac26' : '#f1f5f9'}
                stroke={activeZone === 'feet' ? '#6366f1' : relaxedZones.includes('feet') ? '#4db6ac' : '#cbd5e1'}
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <button
            onClick={startScan}
            disabled={scanning}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl py-2.5 font-bold text-sm hover:opacity-90 disabled:opacity-50 transition mb-2"
          >
            {scanning ? 'Scanning...' : 'Start Body Scan'}
          </button>
          <div className="text-xs text-indigo-700 font-bold min-h-5">
            {scanning
              ? `Relaxing: ${activeZone ? `${activeZone.charAt(0).toUpperCase()}${activeZone.slice(1)}` : 'complete'}`
              : 'Ready to begin'}
          </div>
        </div>

        {/* COMING SOON */}
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
          <div className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg mb-3 uppercase tracking-wider">
            Coming Soon
          </div>
          <h3 className="font-black text-slate-900 text-lg mb-3" style={{ fontFamily: "'Baloo 2', cursive" }}>
            🔮 Advanced Sleep Features
          </h3>
          <ul className="text-xs text-slate-600 font-medium text-left inline-block space-y-1">
            <li>◇ AI sleep pattern analysis with 7-day tracking</li>
            <li>◇ CBT-I full protocol (6-week structured program)</li>
            <li>◇ Smart alarm with sleep cycle detection</li>
            <li>◇ Sleep debt calculator & recovery planner</li>
            <li>◇ Therapist-prescribed custom sleep schedules</li>
            <li>◇ Binaural beats & 432Hz deep sleep frequencies</li>
            <li>◇ Dream journaling with AI interpretation</li>
            <li>◇ Sleep environment sensor integration</li>
            <li>◇ Paired therapy with companion (Endorphin wind-down)</li>
            <li>◇ Multilingual guided relaxation</li>
          </ul>
        </div>

        {/* FOOTER */}
        <div className="text-center py-6 text-xs text-stone-500 font-medium">
          🌙 <strong className="text-slate-700">MANAS360</strong> · Nidra Sleep Therapy · Premium Wellness Hub
          <br />
          Prototype · April 2026
        </div>
      </div>
    </div>
  );
}
