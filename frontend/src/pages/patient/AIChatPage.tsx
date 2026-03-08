import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CHAT_FALLBACK_MESSAGE } from '../../api/chat.api';
import useSpeechAssistant from '../../hooks/useSpeechAssistant';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';
import { readAIAssistantPreferences } from '../../lib/aiAssistantPreferences';

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
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed'>('concise');
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [interactionMode, setInteractionMode] = useState<'chat' | 'voice'>('chat');
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'paused'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceConversationActive, setVoiceConversationActive] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [preferIndianAccent, setPreferIndianAccent] = useState(true);
  const [voiceName, setVoiceName] = useState('');
  const [riskPollingEnabled, setRiskPollingEnabled] = useState(true);
  const { supportsSpeechRecognition, supportsSpeechSynthesis, isListening, startListening, stopListening, speak } = useSpeechAssistant();
  const riskPollingEnabledRef = useRef(true);
  const riskPollingStartedRef = useRef(false);
  const riskRequestInFlightRef = useRef(false);
  const voiceConversationActiveRef = useRef(false);
  const voiceStatusRef = useRef<'idle' | 'listening' | 'processing' | 'speaking' | 'paused'>('idle');
  const prevListeningRef = useRef(false);
  const capturedTranscriptRef = useRef('');
  const lastVoiceSentRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const ttsFinishedAtRef = useRef(0);

  useEffect(() => {
    const prefs = readAIAssistantPreferences();
    setSpeechLang(prefs.voiceLanguage);
    setPreferIndianAccent(prefs.preferIndianAccent);
    setVoiceName(prefs.voiceName);
    setResponseStyle(prefs.responseLength);
  }, []);

  useEffect(() => {
    riskPollingEnabledRef.current = riskPollingEnabled;
  }, [riskPollingEnabled]);

  useEffect(() => {
    voiceConversationActiveRef.current = voiceConversationActive;
  }, [voiceConversationActive]);

  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  useEffect(() => {
    if (interactionMode !== 'voice') {
      setVoiceConversationActive(false);
      setVoiceStatus('idle');
      setLiveTranscript('');
      capturedTranscriptRef.current = '';
      lastVoiceSentRef.current = { text: '', at: 0 };
      stopListening();
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.cancel();
      }
    }
  }, [interactionMode, stopListening]);

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

  const beginVoiceListening = useCallback(() => {
    if (!voiceConversationActiveRef.current) return;
    if (loading || cooldownRemaining > 0 || isListening || !supportsSpeechRecognition) return;

    const elapsedAfterTts = Date.now() - ttsFinishedAtRef.current;
    if (elapsedAfterTts < 1000) {
      window.setTimeout(() => {
        beginVoiceListening();
      }, 1000 - elapsedAfterTts);
      return;
    }

    capturedTranscriptRef.current = '';
    setLiveTranscript('');
    setVoiceStatus('listening');

    startListening(
      (transcript) => {
        const spoken = String(transcript || '').trim();
        capturedTranscriptRef.current = spoken;
        setLiveTranscript(spoken);
      },
      {
        lang: speechLang,
        continuous: true,
        interimResults: true,
        silenceMs: 2000,
        onSpeechStart: () => {
          if (voiceStatusRef.current === 'speaking' && typeof window !== 'undefined' && (window as any).speechSynthesis) {
            (window as any).speechSynthesis.cancel();
            setVoiceStatus('listening');
          }
        },
      },
    );
  }, [cooldownRemaining, isListening, loading, speechLang, startListening, supportsSpeechRecognition]);

  useEffect(() => {
    if (!voiceConversationActive) return;
    if (interactionMode !== 'voice') return;

    const wasListening = prevListeningRef.current;
    prevListeningRef.current = isListening;
    if (!wasListening || isListening) return;

    const spoken = capturedTranscriptRef.current.trim();
    if (!spoken) {
      if (voiceStatusRef.current !== 'paused') {
        window.setTimeout(() => {
          beginVoiceListening();
        }, 250);
      }
      return;
    }

    const normalized = spoken.toLowerCase().replace(/\s+/g, ' ').trim();
    const now = Date.now();
    const recentlySentSameMessage =
      normalized.length > 0 &&
      normalized === lastVoiceSentRef.current.text &&
      now - lastVoiceSentRef.current.at < 8000;

    if (recentlySentSameMessage) {
      window.setTimeout(() => {
        beginVoiceListening();
      }, 300);
      return;
    }

    lastVoiceSentRef.current = { text: normalized, at: now };

    void sendMessage(spoken, true);
  }, [beginVoiceListening, interactionMode, isListening, voiceConversationActive]);

  const sendMessage = async (explicitMessage?: string, fromVoice = false) => {
    const raw = typeof explicitMessage === 'string' ? explicitMessage : message;
    const msg = String(raw || '').trim();
    if (!msg) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    setThread((prev) => [...prev, { role: 'user', content: msg }]);
    setMessage('');
    setLoading(true);
    if (fromVoice) setVoiceStatus('processing');
    let assistantReply = '';
    try {
      const effectiveResponseStyle = fromVoice ? 'concise' : responseStyle;
      const res = await patientApi.aiChat({ message: msg, bot_type: 'mood_ai', response_style: effectiveResponseStyle });
      const payload = res.data ?? res;
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

      if (voiceConversationActiveRef.current && fromVoice) {
        if (supportsSpeechSynthesis && assistantReply) {
          setVoiceStatus('speaking');
          speak(assistantReply, {
            lang: speechLang,
            preferIndianVoice: preferIndianAccent,
            voiceName,
            onEnd: () => {
              ttsFinishedAtRef.current = Date.now();
              setVoiceStatus('listening');
              window.setTimeout(() => {
                beginVoiceListening();
              }, 1100);
            },
          });
        } else {
          setVoiceStatus('listening');
          window.setTimeout(() => {
            beginVoiceListening();
          }, 500);
        }
      }
    }
  };

  useEffect(() => {
    if (!voiceConversationActive || interactionMode !== 'voice' || loading || cooldownRemaining > 0) return;
    beginVoiceListening();
  }, [beginVoiceListening, cooldownRemaining, interactionMode, loading, voiceConversationActive]);

  const lastAssistantMessage = [...thread].reverse().find((item) => item.role === 'assistant')?.content || '';

  const voiceStatusBadge =
    voiceStatus === 'listening'
      ? { label: 'Listening', className: 'bg-emerald-100 text-emerald-700' }
      : voiceStatus === 'processing'
        ? { label: 'Processing', className: 'bg-amber-100 text-amber-700' }
        : voiceStatus === 'speaking'
          ? { label: 'AI speaking', className: 'bg-sky-100 text-sky-700' }
          : voiceStatus === 'paused'
            ? { label: 'Paused', className: 'bg-slate-100 text-slate-700' }
            : { label: 'Idle', className: 'bg-slate-100 text-slate-700' };

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Dr. Meera AI Mood Support</h1>
          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass(riskLevel)}`}>
            Risk status: {riskLevel || 'UNKNOWN'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setInteractionMode('chat')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${interactionMode === 'chat' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            Chat Mode
          </button>
          <button
            type="button"
            onClick={() => setInteractionMode('voice')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${interactionMode === 'voice' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            Voice Conversation
          </button>
          <Link to="/patient/settings?section=aiAssistant" className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline">
            AI settings in Settings: AI Assistant
          </Link>
          {cooldownRemaining > 0 && <span className="text-xs text-red-600">Retry in {cooldownRemaining}s</span>}
        </div>

        <div className="responsive-card min-h-[300px] section-stack">
          {interactionMode === 'chat' ? (
            <p className="text-sm font-medium text-slate-700">Chat with Dr. Meera AI</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Dr. Meera AI Voice Conversation</p>
                <p className="text-xs text-slate-500">Speak naturally. The assistant listens, responds, and continues.</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${voiceStatusBadge.className}`}>{voiceStatusBadge.label}</span>
            </div>
          )}

          {thread.length === 0 && <p className="text-sm text-slate-600">Start talking with Dr. Meera 'Ai.</p>}
          {thread.map((m, i) => (
            <div key={i} className={`flex text-sm ${m.role === 'assistant' ? 'items-start gap-2 text-slate-900' : 'justify-end text-slate-900'}`}>
              {m.role === 'assistant' ? (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  DM
                </span>
              ) : null}
              <div className={m.role === 'assistant' ? 'max-w-[88%] rounded-xl bg-slate-100 px-3 py-2' : 'max-w-[88%] rounded-xl bg-slate-900 px-3 py-2 text-white'}>
                <strong>{m.role === 'assistant' ? "Dr. Meera 'Ai" : 'You'}:</strong> {m.content}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-slate-500">Dr. Meera 'Ai is typing...</p>}

          {interactionMode === 'voice' && voiceConversationActive && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {voiceStatus === 'listening' ? 'Listening' : voiceStatus === 'processing' ? 'AI thinking' : voiceStatus === 'speaking' ? 'AI speaking' : 'Voice paused'}
              </p>
              {voiceStatus === 'listening' && (
                <div className="mt-3 flex items-end gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                    <span
                      key={`wave-${bar}`}
                      className="inline-block w-1 rounded-full bg-emerald-500/80 animate-pulse"
                      style={{ height: `${10 + (bar % 4) * 6}px`, animationDelay: `${bar * 0.1}s` }}
                    />
                  ))}
                </div>
              )}
              {liveTranscript ? <p className="mt-2 text-sm text-slate-700">Patient: {liveTranscript}</p> : null}
            </div>
          )}
        </div>
        {interactionMode === 'chat' ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5"
              placeholder="Type your message here..."
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            {supportsSpeechRecognition && (
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                    return;
                  }
                  startListening((transcript) => setMessage((prev) => `${prev} ${transcript}`.trim()), speechLang);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
              >
                {isListening ? 'Stop Mic' : 'Mic'}
              </button>
            )}
            <button onClick={() => void sendMessage()} disabled={loading || cooldownRemaining > 0} className="responsive-action-btn rounded-xl bg-slate-900 text-white">
              Send
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {!voiceConversationActive ? (
              <button
                type="button"
                onClick={() => {
                  setVoiceConversationActive(true);
                  setVoiceStatus('listening');
                  beginVoiceListening();
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                disabled={loading || cooldownRemaining > 0 || !supportsSpeechRecognition}
              >
                Start Conversation
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (voiceStatus === 'paused') {
                      setVoiceStatus('listening');
                      setVoiceConversationActive(true);
                      beginVoiceListening();
                    } else {
                      setVoiceStatus('paused');
                      stopListening();
                      setVoiceConversationActive(false);
                      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
                        (window as any).speechSynthesis.cancel();
                      }
                    }
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  {voiceStatus === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
                      (window as any).speechSynthesis.cancel();
                    }
                    setVoiceStatus('listening');
                    beginVoiceListening();
                  }}
                  disabled={voiceStatus !== 'speaking' || !supportsSpeechRecognition}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
                >
                  Interrupt AI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopListening();
                    setVoiceConversationActive(false);
                    setVoiceStatus('idle');
                    setLiveTranscript('');
                    capturedTranscriptRef.current = '';
                    if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
                      (window as any).speechSynthesis.cancel();
                    }
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
                >
                  End Conversation
                </button>
              </>
            )}
            {supportsSpeechSynthesis && lastAssistantMessage && (
              <button
                type="button"
                onClick={() => speak(lastAssistantMessage, { lang: speechLang, preferIndianVoice: preferIndianAccent, voiceName })}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                Repeat Last Reply
              </button>
            )}
          </div>
        )}
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
