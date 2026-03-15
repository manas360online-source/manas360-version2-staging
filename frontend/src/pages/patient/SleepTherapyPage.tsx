import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../../api/patient';

type SleepStep = {
  id: number;
  title: string;
  emoji: string;
  shortDescription: string;
  selfRationale: string;
  rxRationale: string;
  when: string;
};

type AudioTrack = {
  id: string;
  module: string;
  category: string;
  subCategory: string;
  title: string;
  vimeoId: string;
  thumbnail: string;
  duration: number;
  rx: string[];
  premium: boolean;
  audioUrl?: string;
};

type LibraryResponse = {
  version: string;
  categories: string[];
  library: AudioTrack[];
};

type ZoneId = 'head' | 'neck' | 'shoulders' | 'chest' | 'belly' | 'hips' | 'legs' | 'feet';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SoundChoice = {
  key: 'rain' | 'raga' | 'ocean' | 'waves' | 'bowls';
  label: string;
  icon: string;
};

const steps: SleepStep[] = [
  {
    id: 1,
    title: 'Digital Detox',
    emoji: '📵',
    shortDescription: 'Confirm all screens are powered down at 8:15 PM.',
    selfRationale: 'Less screen light helps your body naturally switch to night mode.',
    rxRationale: 'Blue light reduces melatonin production and delays sleep onset. Target: zero screen exposure 45 minutes pre-bed.',
    when: '8:15 PM',
  },
  {
    id: 2,
    title: 'Physical Distance',
    emoji: '🔌',
    shortDescription: 'Confirm phone is charging in another room.',
    selfRationale: 'Distance from your phone reduces mindless checking before sleep.',
    rxRationale: 'Phone proximity increases cognitive vigilance. Device separation is a core behavioral sleep intervention.',
    when: '8:15 PM',
  },
  {
    id: 3,
    title: 'Stimulus Control',
    emoji: '🛏️',
    shortDescription: 'Acknowledge bedroom use is only for sleep.',
    selfRationale: 'Keeping bed only for sleep makes falling asleep easier over time.',
    rxRationale: 'CBT-I stimulus control: bed = sleep. Avoid TV/work in bed to improve conditioned sleep response.',
    when: '8:20 PM',
  },
  {
    id: 4,
    title: 'Melatonin Signal',
    emoji: '🌑',
    shortDescription: 'Lights off at 9:00 PM sharp.',
    selfRationale: 'Darkness tells your brain it is time to wind down.',
    rxRationale: 'Light suppression protocol at fixed time strengthens circadian rhythm and improves sleep depth consistency.',
    when: '9:00 PM',
  },
  {
    id: 5,
    title: 'Soundscape',
    emoji: '🎵',
    shortDescription: 'Run a 5-minute Rain, Ocean, or Raag Darbari track.',
    selfRationale: 'Calming audio reduces mental noise before bed.',
    rxRationale: 'Auditory down-regulation supports parasympathetic activation and lowers physiological arousal pre-sleep.',
    when: '9:00 PM',
  },
  {
    id: 6,
    title: 'PMR Body Scan',
    emoji: '🧘',
    shortDescription: 'Head-to-toe guided relaxation in 8 zones.',
    selfRationale: 'Relaxing each body area releases tension you may not notice during the day.',
    rxRationale: 'Progressive muscle relaxation decreases somatic tension and nighttime hyperarousal linked to insomnia.',
    when: '9:05 PM',
  },
  {
    id: 7,
    title: 'Final Let-Go',
    emoji: '😴',
    shortDescription: 'Release jaw, shoulders, and settle into sleep posture.',
    selfRationale: 'A final release cue helps your mind stop active effort and drift naturally.',
    rxRationale: 'Terminal relaxation cue reduces residual muscle tone and cognitive effort at lights-out transition.',
    when: '9:07 PM',
  },
];

const zoneOrder: ZoneId[] = ['head', 'neck', 'shoulders', 'chest', 'belly', 'hips', 'legs', 'feet'];
const circumference = 2 * Math.PI * 22;
const soundChoices: SoundChoice[] = [
  { key: 'rain', label: 'Rain', icon: '🌧️' },
  { key: 'raga', label: 'Raga', icon: '🎼' },
  { key: 'ocean', label: 'Ocean', icon: '🌊' },
  { key: 'waves', label: 'Waves', icon: '〰️' },
  { key: 'bowls', label: 'Bowls', icon: '🥣' },
];

export default function SleepTherapyPage() {
  const navigate = useNavigate();

  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const [library, setLibrary] = useState<AudioTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioIssue, setAudioIssue] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scannerTimeoutsRef = useRef<number[]>([]);

  const [finalReflection, setFinalReflection] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const [scannerRunning, setScannerRunning] = useState(false);
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);
  const [relaxedZones, setRelaxedZones] = useState<ZoneId[]>([]);
  const [scannerPrompt, setScannerPrompt] = useState('Progressive body scan will guide relaxation silently.');
  const [sessionFinished, setSessionFinished] = useState(false);
  const [savingReflection, setSavingReflection] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [saveError, setSaveError] = useState('');

  const completedCount = useMemo(() => Object.values(completed).filter(Boolean).length, [completed]);
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  const selectedTrack = useMemo(() => library.find((item) => item.id === selectedTrackId) || null, [library, selectedTrackId]);
  const activeStep = steps[activeStepIndex];

  const previousTrack = useCallback(() => {
    if (!library.length) return;
    const currentIdx = library.findIndex((item) => item.id === selectedTrackId);
    const nextIdx = currentIdx <= 0 ? library.length - 1 : currentIdx - 1;
    setSelectedTrackId(library[nextIdx].id);
  }, [library, selectedTrackId]);

  const nextTrack = useCallback(() => {
    if (!library.length) return;
    const currentIdx = library.findIndex((item) => item.id === selectedTrackId);
    const nextIdx = currentIdx >= library.length - 1 ? 0 : currentIdx + 1;
    setSelectedTrackId(library[nextIdx].id);
  }, [library, selectedTrackId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch('/wellness-vimeo-library.json');
        const payload: LibraryResponse = await response.json();
        if (!mounted) return;
        const firstFive = (payload.library || []).slice(0, 5);
        setLibrary(firstFive);
        if (firstFive[0]) {
          setSelectedTrackId(firstFive[0].id);
        }
      } catch {
        setLibrary([]);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTrack) return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.loop = true;
      audioRef.current.setAttribute('playsinline', 'true');
    }

    if (selectedTrack.audioUrl) {
      audioRef.current.src = selectedTrack.audioUrl;
      audioRef.current.load();
      audioRef.current.volume = 1;
      audioRef.current.crossOrigin = 'anonymous';
    }

    setIsPlaying(false);
    setAudioIssue('');
  }, [selectedTrack]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        void audioRef.current.pause();
        audioRef.current.src = '';
      }

      scannerTimeoutsRef.current.forEach((id) => window.clearTimeout(id));

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

    };
  }, []);

  useEffect(() => {
    if (!selectedTrack) return;
    if (!('mediaSession' in navigator)) return;

    const artwork = selectedTrack.thumbnail
      ? [{ src: selectedTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      : undefined;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: selectedTrack.title,
      artist: 'Nidra Sleep Therapy',
      album: 'Clinical Audio Library',
      artwork,
    });
  }, [selectedTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      void toggleAudioIfNeeded(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      void toggleAudioIfNeeded(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [nextTrack, previousTrack]);

  const goStep = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    setDirection(nextIndex > activeStepIndex ? 1 : -1);
    setActiveStepIndex(nextIndex);
  };

  const nextStep = () => goStep(activeStepIndex + 1);
  const prevStep = () => goStep(activeStepIndex - 1);

  const completeAndNext = () => {
    setCompleted((prev) => ({ ...prev, [activeStep.id]: true }));
    setSessionFinished(false);
    setSaveFeedback('');
    setSaveError('');
    nextStep();
  };

  const completeFinalStep = async () => {
    setCompleted((prev) => ({ ...prev, [activeStep.id]: true }));
    setSessionFinished(true);

    setSavingReflection(true);
    setSaveFeedback('');
    setSaveError('');

    try {
      await patientApi.saveSleepSessionReflection({
        reflection: finalReflection,
        mood: 4,
        stressLevel: 2,
        gratitude: 'I completed my Nidra sleep routine.',
        challenge: 'Preparing to settle the body and thoughts before sleep.',
      });
      setSaveFeedback('Final Let-Go saved to clinical records for provider review.');
    } catch {
      setSaveError('Session finished, but reflection could not be saved right now. Please try again.');
    } finally {
      setSavingReflection(false);
    }
  };

  const toggleAudioIfNeeded = async (forcePlay?: boolean) => {
    if (!selectedTrack?.audioUrl || !audioRef.current) return;

    const shouldPlay = typeof forcePlay === 'boolean' ? forcePlay : !isPlaying;

    if (!shouldPlay) {
      await audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    const playableSources = getPlayableAudioSources(selectedTrack.audioUrl);
    let didPlay = false;

    for (const source of playableSources) {
      try {
        if (audioRef.current.src !== source) {
          audioRef.current.src = source;
          audioRef.current.load();
        }
        await audioRef.current.play();
        didPlay = true;
        setAudioIssue('');
        break;
      } catch {
        // Try next fallback source.
      }
    }

    if (!didPlay) {
      setAudioIssue('Audio did not play. Ensure Google Drive sharing is set to Anyone with link (Viewer).');
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
  };

  const toggleAudio = async () => {
    await toggleAudioIfNeeded();
  };

  const pickTrackForChoice = useCallback(
    (choice: SoundChoice['key']) => {
      if (!library.length) return null;

      const byTitle = (fragment: string) =>
        library.find((track) => track.title.toLowerCase().includes(fragment));

      if (choice === 'rain') return byTitle('rain') || byTitle('breeze') || null;
      if (choice === 'raga') return byTitle('raag') || byTitle('raga') || byTitle('sitar') || null;
      if (choice === 'ocean') return byTitle('ocean') || byTitle('another-world') || null;
      if (choice === 'waves') return byTitle('waves') || byTitle('flute') || null;
      return byTitle('om-mani') || byTitle('mantra') || byTitle('delta') || byTitle('bowl') || null;
    },
    [library],
  );

  const handleSoundChoice = (choice: SoundChoice['key']) => {
    const mapped = pickTrackForChoice(choice);
    if (!mapped) return;
    setSelectedTrackId(mapped.id);
  };

  const runScanner = useCallback(() => {
    scannerTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    scannerTimeoutsRef.current = [];

    setScannerRunning(true);
    setRelaxedZones([]);
    setActiveZone(null);
    setScannerPrompt('Progressive body scan in progress. Keep breathing naturally.');

    zoneOrder.forEach((zone, index) => {
      const startMs = index * 10000;
      const startId = window.setTimeout(() => {
        setActiveZone(zone);
      }, startMs);
      scannerTimeoutsRef.current.push(startId);

      const relaxId = window.setTimeout(() => {
        setRelaxedZones((prev) => (prev.includes(zone) ? prev : [...prev, zone]));
      }, startMs + 9000);
      scannerTimeoutsRef.current.push(relaxId);
    });

    const finishId = window.setTimeout(() => {
      setScannerRunning(false);
      setActiveZone(null);
      setScannerPrompt('Body scan complete. Keep jaw soft, shoulders dropped, and breath natural.');
    }, zoneOrder.length * 10000);
    scannerTimeoutsRef.current.push(finishId);
  }, []);

  useEffect(() => {
    if (activeStep.id === 6) {
      runScanner();
    }

    return () => {
      scannerTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      scannerTimeoutsRef.current = [];
    };
  }, [activeStep.id, runScanner]);

  const startVoiceReflection = () => {
    const SpeechCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechCtor) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition: SpeechRecognitionLike = new SpeechCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0].transcript} `;
      }
      setFinalReflection(transcript.trim());
    };

    recognition.onerror = () => {
      setVoiceListening(false);
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setVoiceListening(true);
  };

  const stopVoiceReflection = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceListening(false);
  };

  return (
    <section
      className="relative min-h-[calc(100vh-160px)] w-full bg-gradient-to-br from-[#edf2f9] via-[#f4f6fb] to-[#f8f8fc] pb-[140px]"
      style={{ fontFamily: 'Quicksand, sans-serif' }}
    >
      <div className="mx-auto w-full max-w-[800px] px-4 py-5 sm:px-6">
        <header className="mb-4 rounded-2xl border border-slate-200 bg-white/92 px-4 py-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500">Nidra · Session Mode</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Sleep Therapy Player</h1>
              <p className="mt-1 text-xs text-slate-500">One focused prep step at a time.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/patient/wellness-library')}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
            >
              Back to Premium
            </button>
            <div className="relative h-14 w-14">
              <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
                <circle cx="28" cy="28" r="22" stroke="#e2e8f0" strokeWidth="5" fill="none" />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="#5c6bc0"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-600">{progressPercent}%</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">Step {activeStepIndex + 1} of {steps.length} · {completedCount}/7 completed</p>
        </header>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.article
            key={activeStep.id}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">⏱ {activeStep.when}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{activeStep.emoji} {activeStep.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{activeStep.shortDescription}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {activeStep.selfRationale}
            </div>

            {activeStep.id === 5 && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                <p className="mb-2 text-xs font-semibold text-indigo-700">Choose from the shared PM clinical audio set. Playback starts here and continues while you move to the next steps.</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {soundChoices.map((choice) => {
                    const mapped = pickTrackForChoice(choice.key);
                    const isActive = Boolean(mapped && mapped.id === selectedTrackId);

                    return (
                      <button
                        key={choice.key}
                        type="button"
                        onClick={() => handleSoundChoice(choice.key)}
                        className={`rounded-xl border px-2 py-2 text-center transition ${
                          isActive ? 'border-indigo-400 bg-indigo-100' : 'border-indigo-200 bg-white'
                        }`}
                        title={mapped?.audioUrl ? `audioUrl: ${mapped.audioUrl}` : mapped?.vimeoId ? `vimeoId: ${mapped.vimeoId}` : 'No track mapped'}
                      >
                        <div className="text-lg">{choice.icon}</div>
                        <div className="text-[11px] font-bold text-slate-700">{choice.label}</div>
                        <div className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-500">
                          {mapped?.title || 'Not mapped'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-indigo-700/90">Current: {selectedTrack?.title || 'No track selected'} · {selectedTrack?.audioUrl ? 'audioUrl connected' : selectedTrack?.vimeoId ? `vimeoId ${selectedTrack.vimeoId}` : 'no source'}</p>
                {audioIssue && <p className="mt-1 text-[11px] font-semibold text-rose-600">{audioIssue}</p>}

                <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-white px-3 py-2">
                  <p className="truncate text-xs font-semibold text-slate-700">{selectedTrack?.title || 'Select a sound to play'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void toggleAudio();
                    }}
                    disabled={!selectedTrack?.audioUrl}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-40"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {activeStep.id === 6 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Automated PMR Body Scan</p>
                  <button
                    type="button"
                    onClick={runScanner}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {scannerRunning ? 'Restart Scan' : 'Restart Scan'}
                  </button>
                </div>

                <div className="flex justify-center">
                  <svg viewBox="0 0 220 440" className="h-[300px] w-[170px]">
                    <defs>
                      <filter id="zoneGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <path
                      d="M110 22c20 0 34 14 34 34s-14 34-34 34-34-14-34-34 14-34 34-34zm-46 86h92v18H64zm8 22h76v68H72zm-6 68h88v34H66zm2 34h84v108H68zm-2 108h88v60H66z"
                      fill="#eef2ff"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                    />

                    {renderZone('head', 74, 24, 72, 64, activeZone, relaxedZones)}
                    {renderZone('neck', 90, 92, 40, 20, activeZone, relaxedZones)}
                    {renderZone('shoulders', 54, 110, 112, 26, activeZone, relaxedZones)}
                    {renderZone('chest', 68, 136, 84, 54, activeZone, relaxedZones)}
                    {renderZone('belly', 74, 192, 72, 46, activeZone, relaxedZones)}
                    {renderZone('hips', 66, 242, 88, 34, activeZone, relaxedZones)}
                    {renderZone('legs', 64, 278, 92, 102, activeZone, relaxedZones)}
                    {renderZone('feet', 58, 382, 104, 44, activeZone, relaxedZones)}

                    {activeZone && (
                      <rect
                        x="54"
                        y="12"
                        width="112"
                        height="420"
                        fill="none"
                        stroke="#6366f1"
                        strokeOpacity="0.15"
                        strokeWidth="0"
                        filter="url(#zoneGlow)"
                      />
                    )}
                  </svg>
                </div>

                <p className="mt-2 min-h-[42px] text-xs font-semibold text-indigo-700">{scannerPrompt}</p>
                <p className="text-xs font-bold text-slate-700">
                  Active Zone: {activeZone ? activeZone.charAt(0).toUpperCase() + activeZone.slice(1) : 'Completed'}
                </p>
                <p className="text-[11px] text-slate-500">Automation: each zone glows for 10 seconds from Head to Feet.</p>
              </div>
            )}

            {activeStep.id === 7 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Voice Reflection Journal</p>
                  <button
                    type="button"
                    onClick={voiceListening ? stopVoiceReflection : startVoiceReflection}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${
                      voiceListening ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    {voiceListening ? 'Stop Mic' : 'Voice Reflection'}
                  </button>
                </div>
                <textarea
                  value={finalReflection}
                  onChange={(event) => setFinalReflection(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                  placeholder="Speak or type your final let-go reflection for today's journal..."
                />
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prevStep}
                disabled={activeStepIndex === 0}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>

              {activeStepIndex < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={completeAndNext}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void completeFinalStep();
                  }}
                  disabled={savingReflection}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  {savingReflection ? 'Saving...' : 'Finish Session'}
                </button>
              )}
            </div>

            {activeStepIndex === steps.length - 1 && sessionFinished && (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Session completed. You can stay here for reflection or go back to review steps.
              </p>
            )}

            {saveFeedback && (
              <p className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                {saveFeedback}
              </p>
            )}

            {saveError && (
              <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {saveError}
              </p>
            )}
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
}

function renderZone(
  zone: ZoneId,
  x: number,
  y: number,
  width: number,
  height: number,
  activeZone: ZoneId | null,
  relaxedZones: ZoneId[],
) {
  const isActive = activeZone === zone;
  const isRelaxed = relaxedZones.includes(zone);

  return (
    <g key={zone}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={Math.min(width, height) / 2.8}
        fill={isActive ? '#818cf84d' : isRelaxed ? '#4db6ac26' : '#f1f5f9'}
        stroke={isActive ? '#6366f1' : isRelaxed ? '#4db6ac' : '#cbd5e1'}
        strokeWidth={isActive ? 3 : 2}
        filter={isActive ? 'url(#zoneGlow)' : undefined}
      />
    </g>
  );
}

function getPlayableAudioSources(sourceUrl: string): string[] {
  const input = sourceUrl.trim();
  const idMatch = input.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
  if (!idMatch) {
    return [input];
  }

  const fileId = idMatch[1];
  return [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/uc?export=open&id=${fileId}`,
    `https://docs.google.com/uc?export=download&id=${fileId}`,
    `https://docs.google.com/uc?export=open&id=${fileId}`,
    input,
  ];
}
