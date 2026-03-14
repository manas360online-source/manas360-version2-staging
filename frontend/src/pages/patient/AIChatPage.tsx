import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CHAT_FALLBACK_MESSAGE } from '../../api/chat.api';
import useSpeechAssistant from '../../hooks/useSpeechAssistant';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';
import { readAIAssistantPreferences } from '../../lib/aiAssistantPreferences';
import { HeartPulse, Wind, Lock, AlertCircle, Send, Mic, Settings, Pause, Play, Square } from 'lucide-react';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type ThreadMessage = { role: 'user' | 'assistant' | 'system'; content: string };

const riskBadgeClass = (level: RiskLevel | null): string => {
  if (level === 'CRITICAL') return 'border-red-300 bg-red-50 text-red-700';
  if (level === 'HIGH') return 'border-orange-300 bg-orange-50 text-orange-700';
  if (level === 'MEDIUM') return 'border-amber-300 bg-amber-50 text-amber-700';
  if (level === 'LOW') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  return 'border-zinc-300 bg-zinc-50 text-zinc-600';
};

const QUICK_REPLIES = [
  "I'm feeling really anxious right now.",
  "Help me sleep.",
  "I just want to vent.",
  "Guide me through a quick reflection."
];

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
      <p className="mt-1 text-sm font-medium text-teal-700/80">Inhale for 4s, hold for 7s, exhale for 8s</p>
    </div>
  </div>
);

export default function AIChatPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [assessmentContext, setAssessmentContext] = useState<{ type: string; score: number; severity: string } | null>(null);
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
  
  // Monetization limit flag
  const [isLimitReached, setIsLimitReached] = useState(false);

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on thread change
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

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

  // Load latest assessment for context-aware greeting
  useEffect(() => {
    (async () => {
      try {
        const history = await patientApi.getStructuredAssessmentHistory();
        const rows = Array.isArray(history) ? history : (Array.isArray((history as any)?.data) ? (history as any).data : []);
        if (rows.length === 0) return;
        const latest = rows.sort((a: any, b: any) => new Date(b.createdAt ?? b.completedAt ?? 0).getTime() - new Date(a.createdAt ?? a.completedAt ?? 0).getTime())[0];
        const score = Number(latest?.totalScore ?? latest?.score ?? 0);
        const type = String(latest?.templateKey ?? latest?.type ?? 'PHQ-9').toUpperCase();
        if (!score) return;
        let severity = 'mild';
        if (type.includes('PHQ')) {
          severity = score >= 20 ? 'severe' : score >= 15 ? 'moderately severe' : score >= 10 ? 'moderate' : score >= 5 ? 'mild' : 'minimal';
        } else if (type.includes('GAD')) {
          severity = score >= 15 ? 'severe' : score >= 10 ? 'moderate' : score >= 5 ? 'mild' : 'minimal';
        }
        setAssessmentContext({ type, score, severity });
      } catch {
        // silently ignore; generic greeting will show
      }
    })();
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
    if (isLimitReached) return;

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
      
      if (payload?.limit_reached) {
        setIsLimitReached(true);
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
          // Clean the inline widget tags before text-to-speech
          const cleanedReply = assistantReply.replace(/\[WIDGET:[^\]]+\]/g, '');
          speak(cleanedReply, {
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



  const voiceStatusBadge =
    voiceStatus === 'listening'
      ? { label: 'Listening...', className: 'bg-teal-100 text-teal-800 border-teal-200' }
      : voiceStatus === 'processing'
        ? { label: 'Anytime Buddy is thinking...', className: 'bg-amber-100 text-amber-800 border-amber-200' }
        : voiceStatus === 'speaking'
          ? { label: 'Anytime Buddy is speaking', className: 'bg-sky-100 text-sky-800 border-sky-200' }
          : voiceStatus === 'paused'
            ? { label: 'Paused', className: 'bg-zinc-100 text-zinc-700 border-zinc-200' }
            : { label: 'Ready', className: 'bg-zinc-100 text-zinc-700 border-zinc-200' };

  // Utility to parse widgets out of text
  const renderMessageContent = (content: string) => {
    if (content.includes('[WIDGET:BREATHING]')) {
      const parts = content.split('[WIDGET:BREATHING]');
      return (
        <div className="flex flex-col">
          <span>{parts[0]}</span>
          <BreathingWidget />
          <span>{parts[1]}</span>
        </div>
      );
    }
    return <span>{content}</span>;
  };

  return (
    <div className="min-h-full bg-[#FCF9F6] pb-24 md:pb-8">
      <div className="mx-auto w-full max-w-[1000px] px-4 md:px-6 py-8">
        
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
                <AlertCircle className="h-3.5 w-3.5" />
                Risk status: {riskLevel}
              </span>
            )}
            <Link to="/patient/settings?section=aiAssistant" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors shadow-sm">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {isLimitReached && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            <div className="flex items-center gap-4 p-4 md:p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Lock className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-amber-900">Premium Limit Reached</h3>
                <p className="text-sm text-amber-800/80 mt-0.5">You've reached your free daily message limit. You did great work today! Upgrade to Premium for 24/7 unlimited access to Anytime Buddy.</p>
              </div>
              <Link to="/patient/pricing" className="shrink-0 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition">
                View Plans
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-col rounded-3xl border border-zinc-200/60 bg-white shadow-sm h-[60vh] md:h-[65vh] overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
             <div className="flex rounded-xl bg-zinc-200/50 p-1">
               <button
                 type="button"
                 onClick={() => setInteractionMode('chat')}
                 className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${interactionMode === 'chat' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
               >
                 Text Chat
               </button>
               <button
                 type="button"
                 onClick={() => setInteractionMode('voice')}
                 className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${interactionMode === 'voice' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
               >
                 Voice Session
               </button>
             </div>
             {interactionMode === 'voice' && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${voiceStatusBadge.className}`}>
                  {voiceStatusBadge.label}
                </span>
             )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-texture-subtle rounded-b-3xl">
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
                     ? assessmentContext.severity === 'minimal' || assessmentContext.severity === 'mild'
                       ? `Your score suggests ${assessmentContext.severity} symptoms. That's something to acknowledge — you're doing the right thing by checking in. How are you feeling today?`
                       : `Your ${assessmentContext.severity} score of ${assessmentContext.score} tells me you've been having a tough time. I'm here. Want to try a quick grounding exercise together?`
                     : `I have reviewed your active therapy plan and recent check-ins. How can I support you right now?`
                   }
                 </p>
              </div>
            )}
            
            {thread.map((m, i) => (
              <div key={i} className={`flex w-full ${m.role === 'system' ? 'justify-center' : m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                {m.role === 'system' ? (
                  // Grey system injection bubble
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
                       <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                       <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                       <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                 </div>
              </div>
            )}

            {interactionMode === 'voice' && voiceConversationActive && liveTranscript && (
              <div className="flex w-full justify-end">
                <div className="flex max-w-[85%] gap-3 flex-row-reverse">
                   <div className="rounded-2xl rounded-tr-sm bg-zinc-900 opacity-60 px-5 py-3.5 text-[15px] text-white">
                      {liveTranscript}...
                   </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
          
          {/* Controller Area */}
          <div className="border-t border-zinc-100 bg-white p-4">
             {interactionMode === 'chat' && (
               <div className="flex flex-col gap-3 max-w-3xl mx-auto">
                 {/* Quick Chips */}
                 {!isLimitReached && thread.length < 2 && (
                   <div className="flex flex-wrap gap-2 pb-1">
                     {QUICK_REPLIES.map(reply => (
                       <button
                         key={reply}
                         onClick={() => sendMessage(reply)}
                         className="rounded-full border border-teal-100 bg-teal-50/50 px-4 py-1.5 text-[13px] font-semibold text-teal-800 transition hover:bg-teal-100"
                       >
                         {reply}
                       </button>
                     ))}
                   </div>
                 )}
                 
                 <div className="flex items-end gap-2">
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={loading || isLimitReached || cooldownRemaining > 0}
                      placeholder={isLimitReached ? "Chat limits reached. Upgrade to continue." : "Type your message to Anytime Buddy..."}
                      className="min-h-[52px] max-h-32 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-[15px] focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60"
                      rows={1}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={() => void sendMessage()}
                      disabled={loading || isLimitReached || !message.trim() || cooldownRemaining > 0}
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600"
                    >
                      <Send className="h-5 w-5 ml-1" />
                    </button>
                 </div>
               </div>
             )}

             {interactionMode === 'voice' && (
               <div className="flex flex-col items-center justify-center gap-4 py-4">
                 
                 <div className="flex items-center gap-4">
                    {!voiceConversationActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceConversationActive(true);
                          setVoiceStatus('listening');
                          beginVoiceListening();
                        }}
                        disabled={loading || cooldownRemaining > 0 || !supportsSpeechRecognition || isLimitReached}
                        className="flex items-center gap-2 rounded-full bg-teal-600 px-8 py-3.5 font-bold text-white shadow-lg transition hover:bg-teal-700 hover:shadow-xl hover:-translate-y-0.5"
                      >
                        <Mic className="h-5 w-5" />
                        Start Voice Session
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
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        >
                          {voiceStatus === 'paused' ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                        </button>
                        
                        {voiceStatus === 'listening' && (
                          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-teal-100 border border-teal-200">
                             <div className="h-4 w-4 bg-teal-500 rounded-full animate-ping" />
                          </div>
                        )}
                        
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
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        >
                           <Square className="h-5 w-5 fill-current" />
                        </button>
                      </>
                    )}
                 </div>
                 {voiceStatus === 'listening' && (
                    <p className="text-sm font-medium text-teal-700 animate-pulse">Go ahead, Meera is listening...</p>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Crisis Emergency Modal */}
        {showCrisisAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl md:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-center text-xl font-bold text-zinc-900">Are you safe right now?</h2>
              <p className="mt-3 text-center text-[15px] leading-relaxed text-zinc-600">
                You used words that indicate you might be in immediate distress. Your safety is more important than anything else. Please talk to a human professional immediately.
              </p>
              
              <div className="mt-6 space-y-3">
                <a href="tel:14416" className="flex w-full items-center justify-center rounded-xl bg-red-600 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-red-700 hover:shadow-xl">
                  Call Tele-MANAS (14416)
                </a>
                <a href="tel:919820466726" className="flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 py-3.5 text-base font-bold text-red-800 transition hover:bg-red-100">
                  Call AASRA (Mental Health Helpline)
                </a>
              </div>
              
              <button
                className="mt-6 w-full text-center text-sm font-semibold text-zinc-400 hover:text-zinc-600"
                onClick={() => setShowCrisisAlert(false)}
              >
                I am safe, close this alert
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
