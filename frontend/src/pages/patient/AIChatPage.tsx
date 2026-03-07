import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_FALLBACK_MESSAGE } from '../../api/chat.api';
import useSpeechAssistant from '../../hooks/useSpeechAssistant';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const riskBadgeClass = (level: RiskLevel | null): string => {
  if (level === 'CRITICAL') return 'border-red-300 bg-red-50 text-red-700';
  if (level === 'HIGH') return 'border-orange-300 bg-orange-50 text-orange-700';
  if (level === 'MEDIUM') return 'border-amber-300 bg-amber-50 text-amber-700';
  if (level === 'LOW') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  return 'border-slate-300 bg-slate-50 text-slate-600';
};

export default function AIChatPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [botName, setBotName] = useState("Dr. Meera 'Ai · Mood Support");
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed'>('concise');
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [conversationMode, setConversationMode] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [preferIndianAccent, setPreferIndianAccent] = useState(true);
  const [voiceName, setVoiceName] = useState('');
  const [riskPollingEnabled, setRiskPollingEnabled] = useState(true);
  const { supportsSpeechRecognition, supportsSpeechSynthesis, availableVoices, isListening, startListening, stopListening, speak } = useSpeechAssistant();
  const riskPollingEnabledRef = useRef(true);
  const riskPollingStartedRef = useRef(false);
  const riskRequestInFlightRef = useRef(false);
  const conversationModeRef = useRef(false);

  useEffect(() => {
    riskPollingEnabledRef.current = riskPollingEnabled;
  }, [riskPollingEnabled]);

  useEffect(() => {
    conversationModeRef.current = conversationMode;
    if (!conversationMode) {
      stopListening();
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.cancel();
      }
    }
  }, [conversationMode, stopListening]);

  useEffect(() => {
    riskPollingStartedRef.current = false;
    riskRequestInFlightRef.current = false;
    riskPollingEnabledRef.current = true;
    setRiskPollingEnabled(true);
    setRiskLevel(null);
  }, [user?.id]);

  const refreshRisk = async () => {
    if (!riskPollingEnabledRef.current) return;
    if (riskRequestInFlightRef.current) return;
    const userId = String(user?.id || '').trim();
    if (!userId) return;
    riskRequestInFlightRef.current = true;
    try {
      const res = await patientApi.getCurrentRisk(userId);
      const payload = (res as any)?.data ?? res;
      const level = String(payload?.riskLevel || payload?.risk_level || '').toUpperCase();
      if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(level)) {
        setRiskLevel(level as RiskLevel);
      }
    } catch {
      riskPollingEnabledRef.current = false;
      setRiskPollingEnabled(false);
    } finally {
      riskRequestInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!riskPollingEnabled) return;
    if (riskPollingStartedRef.current) return;
    riskPollingStartedRef.current = true;

    void refreshRisk();
    const timer = window.setInterval(() => {
      void refreshRisk();
    }, 15000);
    return () => {
      window.clearInterval(timer);
    };
  }, [user?.id, riskPollingEnabled]);

  const cooldownRemaining = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)) : 0;

  const startConversationListening = useCallback(() => {
    if (!conversationModeRef.current) return;
    if (loading || cooldownRemaining > 0 || isListening || !supportsSpeechRecognition) return;

    startListening((transcript) => {
      const spoken = String(transcript || '').trim();
      if (!spoken) {
        window.setTimeout(() => {
          startConversationListening();
        }, 250);
        return;
      }
      setMessage(spoken);
      void sendMessage(spoken, true);
    }, speechLang);
  }, [cooldownRemaining, isListening, loading, speechLang, startListening, supportsSpeechRecognition]);

  const sendMessage = async (explicitMessage?: string, fromVoice = false) => {
    const raw = typeof explicitMessage === 'string' ? explicitMessage : message;
    const msg = String(raw || '').trim();
    if (!msg) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    setThread((prev) => [...prev, { role: 'user', content: msg }]);
    setMessage('');
    setLoading(true);
    let assistantReply = '';
    try {
      const res = await patientApi.aiChat({ message: msg, bot_type: 'mood_ai', response_style: responseStyle });
      const payload = res.data ?? res;
      setBotName(`${payload?.bot_name || "Dr. Meera 'Ai"} · Mood Support`);
      if (payload?.crisis_detected) {
        setShowCrisisAlert(true);
      }
      const messages = Array.isArray(payload?.messages)
        ? payload.messages.map((item: any) => ({
            role: item?.role === 'assistant' ? 'assistant' : 'user',
            content: String(item?.content || ''),
          }))
        : null;
      if (messages) {
        setThread(messages);
        assistantReply = String(messages.filter((row: { role: string; content: string }) => row.role === 'assistant').slice(-1)[0]?.content || '');
      } else {
        const fallbackResponse = String(payload?.response || CHAT_FALLBACK_MESSAGE);
        assistantReply = fallbackResponse;
        setThread((prev) => [...prev, { role: 'assistant', content: fallbackResponse }]);
      }
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 429) {
        const retryAfterHeader = Number(err?.response?.headers?.['retry-after'] || 0);
        const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : 20;
        setCooldownUntil(Date.now() + retryAfterSeconds * 1000);
      }
      setThread((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: CHAT_FALLBACK_MESSAGE,
        },
      ]);
      assistantReply = CHAT_FALLBACK_MESSAGE;
    } finally {
      setLoading(false);
      if (riskPollingEnabledRef.current) {
        void refreshRisk();
      }

      if (conversationModeRef.current && fromVoice) {
        if (supportsSpeechSynthesis && assistantReply) {
          speak(assistantReply, {
            lang: speechLang,
            preferIndianVoice: preferIndianAccent,
            voiceName,
            onEnd: () => {
              window.setTimeout(() => {
                startConversationListening();
              }, 250);
            },
          });
        } else {
          window.setTimeout(() => {
            startConversationListening();
          }, 250);
        }
      }
    }
  };

  useEffect(() => {
    if (!conversationMode || loading || cooldownRemaining > 0) return;
    startConversationListening();
  }, [conversationMode, cooldownRemaining, loading, startConversationListening]);

  const lastAssistantMessage = [...thread].reverse().find((item) => item.role === 'assistant')?.content || '';

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{botName}</h1>
          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass(riskLevel)}`}>
            Risk status: {riskLevel || 'UNKNOWN'}
          </span>
        </div>
      <div className="responsive-card min-h-[300px] section-stack">
          {thread.length === 0 && <p className="text-sm text-slate-600">Start talking with Dr. Meera 'Ai.</p>}
          {thread.map((m, i) => (
            <div key={i} className={`flex text-sm ${m.role === 'assistant' ? 'items-start gap-2 text-slate-900' : 'justify-end text-blue-700'}`}>
              {m.role === 'assistant' ? (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  DM
                </span>
              ) : null}
              <div className={m.role === 'assistant' ? '' : 'max-w-[90%] rounded-lg bg-slate-100 px-3 py-2'}>
                <strong>{m.role === 'assistant' ? "Dr. Meera 'Ai" : 'You'}:</strong> {m.content}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-slate-500">Dr. Meera 'Ai is typing...</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setResponseStyle((prev) => (prev === 'concise' ? 'detailed' : 'concise'))}
              className="rounded border bg-white px-2 py-1 text-xs"
            >
              {responseStyle === 'concise' ? 'Mode: Concise' : 'Mode: Detailed'}
            </button>
            <button
              type="button"
              onClick={() => setConversationMode((prev) => !prev)}
              className={`rounded border px-2 py-1 text-xs ${conversationMode ? 'bg-slate-900 text-white' : 'bg-white'}`}
            >
              {conversationMode ? 'Conversation Mode: ON' : 'Conversation Mode: OFF'}
            </button>
            {supportsSpeechRecognition && (
              <button
                type="button"
                onClick={() => {
                  if (conversationMode) return;
                  if (isListening) {
                    stopListening();
                    return;
                  }
                  startListening((transcript) => setMessage((prev) => `${prev} ${transcript}`.trim()), speechLang);
                }}
                className="rounded border bg-white px-2 py-1 text-xs disabled:opacity-50"
                disabled={conversationMode}
              >
                {isListening ? 'Stop Mic' : 'Speak'}
              </button>
            )}
            {supportsSpeechSynthesis && (
              <button
                type="button"
                onClick={() => speak(lastAssistantMessage, { lang: speechLang, preferIndianVoice: preferIndianAccent, voiceName })}
                disabled={!lastAssistantMessage}
                className="rounded border bg-white px-2 py-1 text-xs disabled:opacity-50"
              >
                Talk Back
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiSettingsOpen((prev) => !prev)}
              className="rounded border bg-white px-2 py-1 text-xs"
            >
              {aiSettingsOpen ? 'Hide AI Settings' : 'AI Settings'}
            </button>
            {cooldownRemaining > 0 && <span className="text-xs text-red-600">Retry in {cooldownRemaining}s</span>}
          </div>
          {aiSettingsOpen && (
            <div className="grid grid-cols-1 gap-2 rounded border bg-slate-50 p-2 sm:grid-cols-3">
              <label className="text-xs text-slate-700">
                Voice language
                <select
                  value={speechLang}
                  onChange={(event) => setSpeechLang(event.target.value)}
                  className="mt-1 w-full rounded border bg-white px-2 py-1 text-xs"
                >
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (India)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </label>
              <label className="text-xs text-slate-700">
                Voice profile
                <select
                  value={voiceName}
                  onChange={(event) => setVoiceName(event.target.value)}
                  className="mt-1 w-full rounded border bg-white px-2 py-1 text-xs"
                >
                  <option value="">Auto (Recommended)</option>
                  {availableVoices.map((voice) => (
                    <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={preferIndianAccent}
                  onChange={(event) => setPreferIndianAccent(event.target.checked)}
                />
                Prefer Indian accent voice
              </label>
            </div>
          )}
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 rounded border p-2"
            placeholder="How are you feeling today?"
          />
          <button onClick={() => void sendMessage()} disabled={loading || cooldownRemaining > 0} className="responsive-action-btn rounded-xl bg-slate-900 text-white">
            Send
          </button>
        </div>
        {showCrisisAlert ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-md rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 shadow-lg">
              <p className="font-semibold">Immediate Support Recommended</p>
              <p className="mt-1">
                If you are in danger, contact emergency services now. In India, call Tele-MANAS at 14416 or
                1-800-891-4416.
              </p>
              <button
                className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-white"
                onClick={() => setShowCrisisAlert(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
