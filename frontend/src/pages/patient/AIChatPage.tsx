import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CHAT_FALLBACK_MESSAGE } from '../../api/chat.api';
import useSpeechAssistant from '../../hooks/useSpeechAssistant';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';
import { readAIAssistantPreferences } from '../../lib/aiAssistantPreferences';
import {
  HeartPulse, Wind, Lock, AlertCircle,
  Send, Mic, Settings, Pause, Play, Square, Volume2, Clock,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
type RiskLevel     = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ThreadMessage = { role: 'user' | 'assistant' | 'system'; content: string };
type VoiceStatus   = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

// ─── Language config ──────────────────────────────────────────────────────────
type SupportedLanguage = 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN' | 'kn-IN';

const LANGUAGES: { code: SupportedLanguage; label: string; name: string }[] = [
  { code: 'en-IN', label: 'English',  name: 'English'  },
  { code: 'hi-IN', label: 'हिन्दी',   name: 'Hindi'    },
  { code: 'ta-IN', label: 'தமிழ்',    name: 'Tamil'    },
  { code: 'te-IN', label: 'తెలుగు',   name: 'Telugu'   },
  { code: 'kn-IN', label: 'ಕನ್ನಡ',    name: 'Kannada'  },
];

// Translated UI strings for system messages shown in the chat thread
const LANG_STRINGS: Record<SupportedLanguage, {
  rateLimitMsg: (secs: number) => string;
  fallback: string;
  cooldownPlaceholder: (secs: number) => string;
}> = {
  'en-IN': {
    rateLimitMsg:        (s) => `I need a short breather — the server is receiving too many requests. You can send your next message in ${s} seconds. I'm still here! 🙏`,
    fallback:            `I'm here to help, but I'm having trouble responding right now. Please try again shortly.`,
    cooldownPlaceholder: (s) => `Please wait ${s}s before sending…`,
  },
  'hi-IN': {
    rateLimitMsg:        (s) => `मुझे एक छोटा विराम चाहिए — सर्वर पर बहुत अधिक अनुरोध आ रहे हैं। आप ${s} सेकंड में अगला संदेश भेज सकते हैं। मैं यहाँ हूँ! 🙏`,
    fallback:            `मैं मदद करना चाहता हूँ, लेकिन अभी जवाब देने में कठिनाई हो रही है। कृपया थोड़ी देर बाद प्रयास करें।`,
    cooldownPlaceholder: (s) => `${s} सेकंड प्रतीक्षा करें…`,
  },
  'ta-IN': {
    rateLimitMsg:        (s) => `எனக்கு ஒரு சிறு இடைவேளை தேவை — சேவையகம் அதிக கோரிக்கைகளைப் பெறுகிறது. ${s} வினாடிகளில் அடுத்த செய்தி அனுப்பலாம். நான் இங்கே இருக்கிறேன்! 🙏`,
    fallback:            `நான் உதவ விரும்புகிறேன், ஆனால் இப்போது பதில் அளிப்பதில் சிரமம் உள்ளது. சிறிது நேரம் கழித்து முயற்சிக்கவும்.`,
    cooldownPlaceholder: (s) => `${s} வினாடிகள் காத்திருக்கவும்…`,
  },
  'te-IN': {
    rateLimitMsg:        (s) => `నాకు కొంచెం విరామం కావాలి — సర్వర్‌కు చాలా అభ్యర్థనలు వస్తున్నాయి. మీరు ${s} సెకన్లలో తదుపరి సందేశం పంపవచ్చు. నేను ఇక్కడ ఉన్నాను! 🙏`,
    fallback:            `నేను సహాయం చేయాలనుకుంటున్నాను, కానీ ఇప్పుడు స్పందించడంలో సమస్య ఉంది. దయచేసి కొంచెం తర్వాత మళ్ళీ ప్రయత్నించండి.`,
    cooldownPlaceholder: (s) => `${s} సెకన్లు వేచి ఉండండి…`,
  },
  'kn-IN': {
    rateLimitMsg:        (s) => `ನನಗೆ ಸ್ವಲ್ಪ ವಿರಾಮ ಬೇಕು — ಸರ್ವರ್‌ಗೆ ತುಂಬಾ ವಿನಂತಿಗಳು ಬರುತ್ತಿವೆ. ${s} ಸೆಕೆಂಡ್‌ಗಳಲ್ಲಿ ಮುಂದಿನ ಸಂದೇಶ ಕಳುಹಿಸಬಹುದು. ನಾನು ಇಲ್ಲೇ ಇದ್ದೇನೆ! 🙏`,
    fallback:            `ನಾನು ಸಹಾಯ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ, ಆದರೆ ಈಗ ಪ್ರತಿಕ್ರಿಯಿಸಲು ತೊಂದರೆಯಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.`,
    cooldownPlaceholder: (s) => `${s} ಸೆಕೆಂಡ್ ನಿರೀಕ್ಷಿಸಿ…`,
  },
};

// Strong system-level language instruction prepended to every API message
const getLangInstruction = (code: SupportedLanguage): string => {
  if (code === 'en-IN') return '';
  const lang = LANGUAGES.find(l => l.code === code)!;
  return (
    `[SYSTEM INSTRUCTION — HIGHEST PRIORITY: You MUST respond EXCLUSIVELY in ${lang.name} (${lang.label}). ` +
    `This is a strict, non-negotiable requirement. Do NOT write even a single word in English or any other language. ` +
    `Your entire response must be in ${lang.name} only.]\n\n`
  );
};

// ─── helpers ──────────────────────────────────────────────────────────────────
const riskBadgeClass = (level: RiskLevel | null) => {
  if (level === 'CRITICAL') return 'border-red-300 bg-red-50 text-red-700';
  if (level === 'HIGH')     return 'border-orange-300 bg-orange-50 text-orange-700';
  if (level === 'MEDIUM')   return 'border-amber-300 bg-amber-50 text-amber-700';
  if (level === 'LOW')      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  return 'border-zinc-300 bg-zinc-50 text-zinc-600';
};

const QUICK_REPLIES = [
  "I'm feeling really anxious right now.",
  "Help me sleep.",
  "I just want to vent.",
  "Guide me through a quick reflection.",
];

// ─── BreathingWidget ──────────────────────────────────────────────────────────
const BreathingWidget = () => (
  <div className="my-4 flex w-full max-w-sm flex-col items-center justify-center rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-8 shadow-sm">
    <div className="relative flex h-32 w-32 items-center justify-center">
      <div className="absolute h-full w-full animate-ping rounded-full bg-teal-200 opacity-40" style={{ animationDuration: '4s' }} />
      <div className="z-10 flex h-24 w-24 items-center justify-center rounded-full bg-teal-500 shadow-md">
        <Wind className="h-8 w-8 text-white" />
      </div>
    </div>
    <div className="mt-6 text-center">
      <h4 className="text-base font-bold text-teal-900">4-7-8 Breathing</h4>
      <p className="mt-1 text-sm font-medium text-teal-700/80">Inhale 4s · Hold 7s · Exhale 8s</p>
    </div>
  </div>
);

// ─── VoiceWaveform ────────────────────────────────────────────────────────────
const VoiceWaveform = ({ active, color = 'teal' }: { active: boolean; color?: string }) => {
  const bars = [3, 5, 8, 5, 10, 6, 4, 9, 6, 3, 7, 5, 8, 4, 6];
  return (
    <div className="flex items-center gap-[3px] h-10">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-full ${color === 'sky' ? 'bg-sky-400' : 'bg-teal-400'}`}
          style={{
            height: active ? `${h * 3}px` : '4px',
            minHeight: '4px',
            animation: active ? `voiceBar 0.8s ease-in-out ${i * 60}ms infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`@keyframes voiceBar{from{transform:scaleY(.3);opacity:.5}to{transform:scaleY(1);opacity:1}}`}</style>
    </div>
  );
};

// ─── VoiceSessionPanel ────────────────────────────────────────────────────────
interface VoiceSessionPanelProps {
  voiceStatus: VoiceStatus;
  active: boolean;
  liveTranscript: string;
  lastAIReply: string;
  loading: boolean;
  isLimitReached: boolean;
  supportsSpeechRecognition: boolean;
  onStart: () => void;
  onPauseResume: () => void;
  onStop: () => void;
}

const VoiceSessionPanel = ({
  voiceStatus, active, liveTranscript, lastAIReply,
  loading, isLimitReached, supportsSpeechRecognition,
  onStart, onPauseResume, onStop,
}: VoiceSessionPanelProps) => {
  const isListening  = voiceStatus === 'listening';
  const isSpeaking   = voiceStatus === 'speaking';
  const isProcessing = voiceStatus === 'processing';
  const isPaused     = voiceStatus === 'paused';

  if (!active) {
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-teal-100 opacity-60" />
          <div className="absolute inset-2 rounded-full bg-teal-50 border border-teal-200" />
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
            <Mic className="h-7 w-7 text-white" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-zinc-800">Voice Session</h3>
          <p className="mt-1 text-sm text-zinc-500 max-w-xs">
            Speak naturally — Anytime Buddy listens and replies in voice and text.
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={loading || !supportsSpeechRecognition || isLimitReached}
          className="flex items-center gap-2.5 rounded-full bg-teal-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-teal-700 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mic className="h-5 w-5" />
          Start Voice Session
        </button>
        {!supportsSpeechRecognition && (
          <p className="text-xs text-red-500 text-center max-w-xs">
            Speech recognition not available. Try Chrome or Edge.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="relative flex h-24 w-24 items-center justify-center select-none">
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-teal-200 opacity-30 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-2 rounded-full bg-teal-100 opacity-50 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          </>
        )}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full bg-sky-200 opacity-30 animate-ping" style={{ animationDuration: '1.2s' }} />
            <div className="absolute inset-2 rounded-full bg-sky-100 opacity-50 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.2s' }} />
          </>
        )}
        <div className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
          isListening  ? 'bg-gradient-to-br from-teal-400 to-teal-600'   :
          isSpeaking   ? 'bg-gradient-to-br from-sky-400 to-sky-600'     :
          isProcessing ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
          isPaused     ? 'bg-gradient-to-br from-zinc-300 to-zinc-400'   :
                         'bg-gradient-to-br from-teal-400 to-teal-600'
        }`}>
          {isListening  && <Mic     className="h-7 w-7 text-white" />}
          {isSpeaking   && <Volume2 className="h-7 w-7 text-white" />}
          {isProcessing && (
            <span className="flex gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
              ))}
            </span>
          )}
          {isPaused && <Pause className="h-7 w-7 text-white" />}
        </div>
      </div>

      <VoiceWaveform active={isListening || isSpeaking} color={isSpeaking ? 'sky' : 'teal'} />

      <div className={`rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide transition-all ${
        isListening  ? 'bg-teal-50  border-teal-200  text-teal-800'  :
        isSpeaking   ? 'bg-sky-50   border-sky-200   text-sky-800'   :
        isProcessing ? 'bg-amber-50 border-amber-200 text-amber-800' :
        isPaused     ? 'bg-zinc-100 border-zinc-200  text-zinc-600'  :
                       'bg-zinc-100 border-zinc-200  text-zinc-600'
      }`}>
        {isListening  ? '🎙 Listening...'           : null}
        {isSpeaking   ? '🔊 Anytime Buddy speaking' : null}
        {isProcessing ? '💭 Thinking...'             : null}
        {isPaused     ? '⏸ Paused'                  : null}
      </div>

      {isListening && liveTranscript && (
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 italic shadow-sm">
          <span className="not-italic text-zinc-400 text-xs font-semibold mr-1">You:</span>
          {liveTranscript}
          <span className="inline-block w-0.5 h-4 bg-teal-400 ml-0.5 animate-pulse align-middle" />
        </div>
      )}

      {isSpeaking && lastAIReply && (
        <div className="w-full max-w-sm rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 shadow-sm">
          <span className="text-sky-500 text-xs font-semibold mr-1">Anytime Buddy:</span>
          {lastAIReply.replace(/\[WIDGET:[^\]]+\]/g, '').slice(0, 140)}
          {lastAIReply.length > 140 ? '...' : ''}
        </div>
      )}

      <div className="flex items-center gap-3 mt-1">
        <button type="button" onClick={onPauseResume} title={isPaused ? 'Resume' : 'Pause'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shadow-sm">
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
        <button type="button" onClick={onStop} title="End session"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-sm">
          <Square className="h-5 w-5 fill-current" />
        </button>
      </div>

      <p className="text-[11px] text-zinc-400 h-4">
        {isListening  ? 'Speak — silence for 2s sends your message' : ''}
        {isSpeaking   ? 'Start speaking to interrupt'               : ''}
        {isPaused     ? 'Press play to resume'                      : ''}
      </p>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIChatPage() {
  const { user } = useAuth();

  // ── chat state ──
  const [message,           setMessage]           = useState('');
  const [thread,            setThread]            = useState<ThreadMessage[]>([]);
  const [assessmentContext, setAssessmentContext] = useState<{ type: string; score: number; severity: string } | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [showCrisisAlert,   setShowCrisisAlert]   = useState(false);
  const [riskLevel,         setRiskLevel]         = useState<RiskLevel | null>(null);
  const [responseStyle,     setResponseStyle]     = useState<'concise' | 'detailed'>('concise');
  const [isLimitReached,    setIsLimitReached]    = useState(false);
  const [interactionMode,   setInteractionMode]   = useState<'chat' | 'voice'>('chat');

  // ── language selector ──
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en-IN');

  // ── cooldown: stored as a timestamp, but we tick a display counter ──
  const [cooldownUntil,     setCooldownUntil]     = useState<number | null>(null);
  const [cooldownSecs,      setCooldownSecs]      = useState(0);

  // ── voice state ──
  const [voiceStatus,    setVoiceStatus]    = useState<VoiceStatus>('idle');
  const [voiceActive,    setVoiceActive]    = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastAIReply,    setLastAIReply]    = useState('');

  // ── preferences ──
  const [speechLang,         setSpeechLang]         = useState('en-IN');
  const [preferIndianAccent, setPreferIndianAccent] = useState(true);
  const [voiceName,          setVoiceName]          = useState('');

  // ── speech hook ──
  const {
    supportsSpeechRecognition,
    supportsSpeechSynthesis,
    isListening,
    startListening,
    stopListening,
    speak,
  } = useSpeechAssistant();

  // ── refs ──
  const voiceActiveRef   = useRef(false);
  const voiceStatusRef   = useRef<VoiceStatus>('idle');
  const capturedTextRef  = useRef('');
  const lastSentRef      = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const ttsEndedAtRef    = useRef(0);
  const speechLangRef    = useRef(speechLang);
  const preferIndianRef  = useRef(preferIndianAccent);
  const voiceNameRef     = useRef(voiceName);
  const riskEnabledRef   = useRef(true);
  const riskInflightRef  = useRef(false);
  const riskStartedRef   = useRef(false);
  const prevListeningRef = useRef(false);
  const chatEndRef       = useRef<HTMLDivElement>(null);

  // sync refs
  useEffect(() => { voiceStatusRef.current  = voiceStatus; },        [voiceStatus]);
  useEffect(() => { speechLangRef.current   = speechLang; },         [speechLang]);
  useEffect(() => { preferIndianRef.current = preferIndianAccent; }, [preferIndianAccent]);
  useEffect(() => { voiceNameRef.current    = voiceName; },          [voiceName]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  useEffect(() => {
    const p = readAIAssistantPreferences();
    setSpeechLang(p.voiceLanguage);
    setPreferIndianAccent(p.preferIndianAccent);
    setVoiceName(p.voiceName);
    setResponseStyle(p.responseLength);
  }, []);

  // ── sync selectedLang → speechLang so voice uses the chosen language ──
  useEffect(() => {
    setSpeechLang(selectedLang);
    speechLangRef.current = selectedLang;
  }, [selectedLang]);

  // ── cooldown ticker ──
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSecs(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSecs(remaining);
      if (remaining === 0) setCooldownUntil(null);
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  // ── risk polling ──
  const refreshRisk = useCallback(async () => {
    if (!riskEnabledRef.current || riskInflightRef.current) return;
    const uid = String(user?.id || '').trim();
    if (!uid) return;
    riskInflightRef.current = true;
    try {
      const res     = await patientApi.getCurrentRisk(uid);
      const payload = (res as any)?.data ?? res;
      const level   = String(payload?.riskLevel || payload?.risk_level || '').toUpperCase();
      if (['LOW','MEDIUM','HIGH','CRITICAL'].includes(level)) setRiskLevel(level as RiskLevel);
    } catch { riskEnabledRef.current = false; }
    finally   { riskInflightRef.current = false; }
  }, [user?.id]);

  useEffect(() => {
    if (riskStartedRef.current) return;
    riskStartedRef.current = true;
    void refreshRisk();
    const t = window.setInterval(refreshRisk, 15000);
    return () => window.clearInterval(t);
  }, [user?.id, refreshRisk]);

  useEffect(() => {
    (async () => {
      try {
        const history = await patientApi.getStructuredAssessmentHistory();
        const rows    = Array.isArray(history) ? history : ((history as any)?.data ?? []);
        if (!rows.length) return;
        const latest  = [...rows].sort((a: any, b: any) =>
          new Date(b.createdAt ?? b.completedAt ?? 0).getTime() - new Date(a.createdAt ?? a.completedAt ?? 0).getTime()
        )[0];
        const score = Number(latest?.totalScore ?? latest?.score ?? 0);
        const type  = String(latest?.templateKey ?? latest?.type ?? 'PHQ-9').toUpperCase();
        if (!score) return;
        let severity = 'mild';
        if (type.includes('PHQ'))      severity = score>=20?'severe':score>=15?'moderately severe':score>=10?'moderate':score>=5?'mild':'minimal';
        else if (type.includes('GAD')) severity = score>=15?'severe':score>=10?'moderate':score>=5?'mild':'minimal';
        setAssessmentContext({ type, score, severity });
      } catch { /* silent */ }
    })();
  }, [user?.id]);

  // clean up voice when switching modes
  useEffect(() => {
    if (interactionMode !== 'voice') {
      voiceActiveRef.current = false;
      setVoiceActive(false);
      setVoiceStatus('idle');
      setLiveTranscript('');
      capturedTextRef.current = '';
      stopListening();
      window.speechSynthesis?.cancel();
    }
  }, [interactionMode, stopListening]);

  // ── voice loop ──
  const beginVoiceListening = useCallback(() => {
    if (!voiceActiveRef.current) return;
    if (isListening) return;
    const elapsed = Date.now() - ttsEndedAtRef.current;
    if (elapsed < 600) { window.setTimeout(beginVoiceListening, 600 - elapsed); return; }

    capturedTextRef.current = '';
    setLiveTranscript('');
    setVoiceStatus('listening');

    startListening(
      (transcript) => {
        capturedTextRef.current = String(transcript || '').trim();
        setLiveTranscript(capturedTextRef.current);
      },
      {
        lang: speechLangRef.current,
        continuous: true,
        interimResults: true,
        silenceMs: 2000,
        onSpeechStart: () => {
          if (voiceStatusRef.current === 'speaking') {
            window.speechSynthesis?.cancel();
            setVoiceStatus('listening');
          }
        },
      },
    );
  }, [isListening, startListening]);

  useEffect(() => {
    if (interactionMode !== 'voice') return;
    const wasListening = prevListeningRef.current;
    prevListeningRef.current = isListening;
    if (!wasListening || isListening) return;
    if (!voiceActiveRef.current || voiceStatusRef.current === 'paused') return;

    const spoken = capturedTextRef.current.trim();
    if (!spoken) { window.setTimeout(beginVoiceListening, 250); return; }

    const norm = spoken.toLowerCase().replace(/\s+/g, ' ').trim();
    const now  = Date.now();
    if (norm === lastSentRef.current.text && now - lastSentRef.current.at < 8000) {
      window.setTimeout(beginVoiceListening, 300);
      return;
    }
    lastSentRef.current = { text: norm, at: now };
    void sendVoiceMessage(spoken);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, interactionMode]);

  const sendVoiceMessage = async (spoken: string) => {
    setVoiceStatus('processing');
    setLiveTranscript('');
    setThread(prev => [...prev, { role: 'user', content: spoken }]);
    setLoading(true);
    let assistantReply = '';

    // Prepend language instruction so the AI always replies in the selected language
    const langPrefix = getLangInstruction(selectedLang);
    const apiMessage = langPrefix ? `${langPrefix}${spoken}` : spoken;

    try {
      const res     = await patientApi.aiChat({ message: apiMessage, bot_type: 'mood_ai', response_style: 'concise' });
      const payload = res.data ?? res;
      if (payload?.crisis_detected) setShowCrisisAlert(true);
      if (payload?.limit_reached)   setIsLimitReached(true);
      const msgs = Array.isArray(payload?.messages)
        ? payload.messages.map((item: any) => ({ role: item?.role === 'assistant' ? 'assistant' : 'user', content: String(item?.content || '') }))
        : null;
      if (msgs) {
        setThread(msgs);
        assistantReply = String(msgs.filter((r: any) => r.role === 'assistant').slice(-1)[0]?.content || '');
      } else {
        assistantReply = String(payload?.response || CHAT_FALLBACK_MESSAGE);
        setThread(prev => [...prev, { role: 'assistant', content: assistantReply }]);
      }
    } catch (err: any) {
      if (Number(err?.response?.status) === 429) {
        const ra = Number(err?.response?.headers?.['retry-after'] || 20);
        setCooldownUntil(Date.now() + ra * 1000);
      }
      assistantReply = LANG_STRINGS[selectedLang].fallback;
      setThread(prev => [...prev, { role: 'assistant', content: LANG_STRINGS[selectedLang].fallback }]);
    } finally {
      setLoading(false);
      void refreshRisk();
    }

    if (!voiceActiveRef.current) return;
    if (assistantReply && supportsSpeechSynthesis) {
      setLastAIReply(assistantReply);
      setVoiceStatus('speaking');
      speak(assistantReply.replace(/\[WIDGET:[^\]]+\]/g, ''), {
        lang: speechLangRef.current,
        preferIndianVoice: preferIndianRef.current,
        voiceName: voiceNameRef.current,
        onEnd: () => {
          ttsEndedAtRef.current = Date.now();
          setLastAIReply('');
          if (voiceActiveRef.current) {
            setVoiceStatus('listening');
            window.setTimeout(beginVoiceListening, 800);
          }
        },
      });
    } else {
      setVoiceStatus('listening');
      window.setTimeout(beginVoiceListening, 400);
    }
  };

  const handleStartVoice = () => {
    voiceActiveRef.current = true;
    setVoiceActive(true);
    setVoiceStatus('listening');
    capturedTextRef.current = '';
    lastSentRef.current     = { text: '', at: 0 };
    setLiveTranscript('');
    startListening(
      (transcript) => {
        capturedTextRef.current = String(transcript || '').trim();
        setLiveTranscript(capturedTextRef.current);
      },
      {
        lang: speechLangRef.current,
        continuous: true,
        interimResults: true,
        silenceMs: 2000,
        onSpeechStart: () => {
          if (voiceStatusRef.current === 'speaking') {
            window.speechSynthesis?.cancel();
            setVoiceStatus('listening');
          }
        },
      },
    );
  };

  const handlePauseResume = () => {
    if (voiceStatus === 'paused') {
      voiceActiveRef.current = true;
      setVoiceActive(true);
      setVoiceStatus('listening');
      window.setTimeout(beginVoiceListening, 200);
    } else {
      stopListening();
      window.speechSynthesis?.cancel();
      voiceActiveRef.current = false;
      setVoiceActive(false);
      setVoiceStatus('paused');
      setLiveTranscript('');
    }
  };

  const handleStopVoice = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    voiceActiveRef.current = false;
    setVoiceActive(false);
    setVoiceStatus('idle');
    setLiveTranscript('');
    setLastAIReply('');
    capturedTextRef.current = '';
  };

  // ── text chat send ──
  const sendMessage = async (explicitMessage?: string) => {
    const msg = String(typeof explicitMessage === 'string' ? explicitMessage : message).trim();
    if (!msg) return;
    if (isLimitReached) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    setThread(prev => [...prev, { role: 'user', content: msg }]);
    setMessage('');
    setLoading(true);

    // Prepend language instruction so the AI always replies in the selected language
    const langPrefix = getLangInstruction(selectedLang);
    const apiMessage = langPrefix ? `${langPrefix}${msg}` : msg;

    try {
      const res     = await patientApi.aiChat({ message: apiMessage, bot_type: 'mood_ai', response_style: responseStyle });
      const payload = res.data ?? res;
      if (payload?.crisis_detected) setShowCrisisAlert(true);
      if (payload?.limit_reached)   setIsLimitReached(true);
      const msgs = Array.isArray(payload?.messages)
        ? payload.messages.map((item: any) => ({ role: item?.role === 'assistant' ? 'assistant' : 'user', content: String(item?.content || '') }))
        : null;
      if (msgs) {
        setThread(msgs);
      } else {
        setThread(prev => [...prev, { role: 'assistant', content: String(payload?.response || CHAT_FALLBACK_MESSAGE) }]);
      }
    } catch (err: any) {
      if (Number(err?.response?.status) === 429) {
        const retryAfterSecs = Number(err?.response?.headers?.['retry-after'] || 20);
        const until = Date.now() + retryAfterSecs * 1000;
        setCooldownUntil(until);
        setThread(prev => [...prev, {
          role: 'assistant',
          content: LANG_STRINGS[selectedLang].rateLimitMsg(retryAfterSecs),
        }]);
      } else {
        setThread(prev => [...prev, { role: 'assistant', content: LANG_STRINGS[selectedLang].fallback }]);
      }
    } finally {
      setLoading(false);
      void refreshRisk();
    }
  };

  // ── render helpers ──
  const renderMessageContent = (content: string) => {
    if (!content.includes('[WIDGET:BREATHING]')) return <span>{content}</span>;
    const [before, after] = content.split('[WIDGET:BREATHING]');
    return <div className="flex flex-col"><span>{before}</span><BreathingWidget /><span>{after}</span></div>;
  };

  const isCoolingDown = cooldownSecs > 0;

  const voiceStatusBadge =
    voiceStatus === 'listening'  ? { label: 'Listening…',             cls: 'bg-teal-100 text-teal-800 border-teal-200'   } :
    voiceStatus === 'processing' ? { label: 'Thinking…',              cls: 'bg-amber-100 text-amber-800 border-amber-200' } :
    voiceStatus === 'speaking'   ? { label: 'Anytime Buddy speaking', cls: 'bg-sky-100 text-sky-800 border-sky-200'       } :
    voiceStatus === 'paused'     ? { label: 'Paused',                 cls: 'bg-zinc-100 text-zinc-700 border-zinc-200'    } :
                                   { label: 'Ready',                  cls: 'bg-zinc-100 text-zinc-700 border-zinc-200'    };

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#FCF9F6] pb-24 md:pb-8">
      <div className="mx-auto w-full max-w-[1000px] px-4 md:px-6 py-8">

        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-md">
              <HeartPulse className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Anytime Buddy</h1>
              <p className="text-sm font-medium text-teal-700/80">Your Personal Wellness Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {riskLevel && riskLevel !== 'LOW' && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${riskBadgeClass(riskLevel)}`}>
                <AlertCircle className="h-3.5 w-3.5" /> Risk status: {riskLevel}
              </span>
            )}
            <Link to="/patient/settings?section=aiAssistant" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors shadow-sm">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Limit banner */}
        {isLimitReached && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            <div className="flex items-center gap-4 p-4 md:p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Lock className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-amber-900">Premium Limit Reached</h3>
                <p className="text-sm text-amber-800/80 mt-0.5">You've reached your free daily message limit. Upgrade for 24/7 unlimited access.</p>
              </div>
              <Link to="/patient/pricing" className="shrink-0 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition">
                View Plans
              </Link>
            </div>
          </div>
        )}

        {/* Cooldown banner */}
        {isCoolingDown && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 shadow-sm">
            <Clock className="h-5 w-5 shrink-0 text-orange-500" />
            <p className="text-sm font-semibold text-orange-800">
              Server rate limit hit — you can send your next message in{' '}
              <span className="tabular-nums font-bold">{cooldownSecs}s</span>.
            </p>
          </div>
        )}

        {/* Chat card */}
        <div className="flex flex-col rounded-3xl border border-zinc-200/60 bg-white shadow-sm h-[60vh] md:h-[65vh] overflow-hidden">

          {/* ── Mode toggle + Language selector bar ── */}
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 sm:px-6 sm:py-4">

            {/* Text Chat / Voice Session toggle */}
            <div className="flex rounded-xl bg-zinc-200/50 p-1 shrink-0">
              {(['chat', 'voice'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setInteractionMode(mode)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${
                    interactionMode === mode
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {mode === 'chat' ? 'Text Chat' : 'Voice Session'}
                </button>
              ))}
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block h-6 w-px bg-zinc-200 shrink-0" />

            {/* Language pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedLang(code)}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-all ${
                    selectedLang === code
                      ? 'bg-[#2a3142] border-[#2a3142] text-white shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Voice status badge — pushed to the right */}
            {interactionMode === 'voice' && voiceActive && (
              <span className={`ml-auto inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold shrink-0 ${voiceStatusBadge.cls}`}>
                {voiceStatusBadge.label}
              </span>
            )}
          </div>

          {/* Thread */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {thread.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                  <HeartPulse className="h-8 w-8 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {assessmentContext ? `I saw your recent ${assessmentContext.type}.` : 'Good to see you.'}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 max-w-xs leading-relaxed">
                  {assessmentContext
                    ? (assessmentContext.severity === 'minimal' || assessmentContext.severity === 'mild')
                      ? `Your score suggests ${assessmentContext.severity} symptoms. You're doing the right thing by checking in. How are you feeling today?`
                      : `Your ${assessmentContext.severity} score of ${assessmentContext.score} tells me you've been having a tough time. I'm here with you.`
                    : 'I have reviewed your active therapy plan and recent check-ins. How can I support you right now?'
                  }
                </p>
              </div>
            )}

            {thread.map((m, i) => (
              <div key={i} className={`flex w-full ${m.role === 'system' ? 'justify-center' : m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                {m.role === 'system' ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-500">
                    {m.content}
                  </div>
                ) : (
                  <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {m.role === 'assistant' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm mt-1">
                        <HeartPulse className="h-4 w-4" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                      m.role === 'assistant'
                        ? 'rounded-tl-sm bg-zinc-50 border border-zinc-100 text-zinc-800'
                        : 'rounded-tr-sm bg-zinc-900 text-white'
                    }`}>
                      {renderMessageContent(m.content)}
                      {m.role === 'assistant' && interactionMode === 'voice' && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-zinc-400">
                          <Volume2 className="h-3 w-3" /> spoken
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex w-full justify-start">
                <div className="flex max-w-[85%] gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm mt-1">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-zinc-50 border border-zinc-100 px-5 py-4 shadow-sm flex items-center gap-1.5">
                    {[0,150,300].map(d => (
                      <span key={d} className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Controls */}
          <div className="border-t border-zinc-100 bg-white p-4">
            {interactionMode === 'chat' && (
              <div className="flex flex-col gap-3 max-w-3xl mx-auto">
                {!isLimitReached && !isCoolingDown && thread.length < 2 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {QUICK_REPLIES.map(r => (
                      <button
                        key={r}
                        onClick={() => void sendMessage(r)}
                        className="rounded-full border border-teal-100 bg-teal-50/50 px-4 py-1.5 text-[13px] font-semibold text-teal-800 transition hover:bg-teal-100"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    disabled={loading || isLimitReached || isCoolingDown}
                    placeholder={
                      isLimitReached  ? 'Upgrade to continue.' :
                      isCoolingDown   ? LANG_STRINGS[selectedLang].cooldownPlaceholder(cooldownSecs) :
                                        'Type your message to Anytime Buddy…'
                    }
                    className="min-h-[52px] max-h-32 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-[15px] focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                    rows={1}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={loading || isLimitReached || isCoolingDown || !message.trim()}
                    className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCoolingDown
                      ? <span className="text-xs font-bold tabular-nums">{cooldownSecs}s</span>
                      : <Send className="h-5 w-5 ml-1" />
                    }
                  </button>
                </div>
              </div>
            )}

            {interactionMode === 'voice' && (
              <VoiceSessionPanel
                voiceStatus={voiceStatus}
                active={voiceActive}
                liveTranscript={liveTranscript}
                lastAIReply={lastAIReply}
                loading={loading}
                isLimitReached={isLimitReached}
                supportsSpeechRecognition={supportsSpeechRecognition}
                onStart={handleStartVoice}
                onPauseResume={handlePauseResume}
                onStop={handleStopVoice}
              />
            )}
          </div>
        </div>

        {/* Crisis modal */}
        {showCrisisAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl md:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-center text-xl font-bold text-zinc-900">Are you safe right now?</h2>
              <p className="mt-3 text-center text-[15px] leading-relaxed text-zinc-600">
                You used words that suggest immediate distress. Your safety matters most — please speak with a professional now.
              </p>
              <div className="mt-6 space-y-3">
                <a href="tel:14416" className="flex w-full items-center justify-center rounded-xl bg-red-600 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-red-700">
                  Call Tele-MANAS (14416)
                </a>
                <a href="tel:919820466726" className="flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 py-3.5 text-base font-bold text-red-800 transition hover:bg-red-100">
                  Call AASRA (Mental Health Helpline)
                </a>
              </div>
              <button className="mt-6 w-full text-center text-sm font-semibold text-zinc-400 hover:text-zinc-600" onClick={() => setShowCrisisAlert(false)}>
                I am safe, close this alert
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}