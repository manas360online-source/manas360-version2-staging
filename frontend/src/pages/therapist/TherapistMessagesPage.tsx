import { useEffect, useState } from 'react';
import { CHAT_FALLBACK_MESSAGE, chatApi } from '../../api/chat.api';
import useSpeechAssistant from '../../hooks/useSpeechAssistant';
import { readAIAssistantPreferences } from '../../lib/aiAssistantPreferences';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistErrorState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function TherapistMessagesPage() {
  const [thread, setThread] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botName, setBotName] = useState('Anytime Buddy AI · Clinical Assistant');
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed'>('concise');
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [preferIndianAccent, setPreferIndianAccent] = useState(true);
  const [voiceName, setVoiceName] = useState('');
  const { supportsSpeechRecognition, supportsSpeechSynthesis, isListening, startListening, stopListening, speak } = useSpeechAssistant();

  useEffect(() => {
    const prefs = readAIAssistantPreferences();
    setSpeechLang(prefs.voiceLanguage);
    setPreferIndianAccent(prefs.preferIndianAccent);
    setVoiceName(prefs.voiceName);
    setResponseStyle(prefs.responseLength);
  }, []);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    setThread((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const res = await chatApi.sendMessage({ message, bot_type: 'clinical_ai', response_style: responseStyle });
      const payload: any = (res as any)?.data ?? res;
      setBotName(`${payload?.bot_name || 'Anytime Buddy AI'} · Clinical Assistant`);
      const messages = Array.isArray(payload?.messages) ? payload.messages : [];
      if (!messages.length) {
        setThread((prev) => [...prev, { role: 'assistant', content: String(payload?.response || CHAT_FALLBACK_MESSAGE) }]);
      } else {
        setThread(messages.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') })));
      }
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 429) {
        const retryAfterHeader = Number(err?.response?.headers?.['retry-after'] || 0);
        const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : 20;
        setCooldownUntil(Date.now() + retryAfterSeconds * 1000);
        setError(`Too many requests. Please wait ${retryAfterSeconds} seconds and try again.`);
      } else {
        setError(err?.response?.data?.message || err?.message || 'Failed to load messages');
      }
      setThread((prev) => [...prev, { role: 'assistant', content: CHAT_FALLBACK_MESSAGE }]);
    } finally {
      setLoading(false);
    }
  };

  const cooldownRemaining = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)) : 0;
  const lastAssistantMessage = [...thread].reverse().find((row) => row.role === 'assistant')?.content || '';

  return (
    <TherapistPageShell title="Anytime Buddy AI" subtitle="Anytime Buddy AI helps with clinical workflow and platform guidance.">
      {error ? (
        <TherapistErrorState title="Could not load assistant" description={error} onRetry={() => setError(null)} />
      ) : null}
      <TherapistCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-800">{botName}</h3>
          <TherapistBadge variant="sage" label="Live" />
        </div>

        <div className="min-h-[360px] space-y-3 bg-surface-bg px-4 py-4">
          {thread.length === 0 ? (
            <p className="text-sm text-ink-500">Ask about patient insights, clinical workflow, or platform operations.</p>
          ) : null}
          {thread.map((row, index) => (
            <div
              key={`${row.role}-${index}`}
              className={`flex max-w-[90%] items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                row.role === 'assistant'
                  ? 'bg-surface-card text-ink-800 shadow-soft-xs'
                  : 'ml-auto bg-sage-500 text-white'
              }`}
            >
              {row.role === 'assistant' ? (
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-500 text-[10px] font-semibold text-white">DM</span>
              ) : null}
              <span>{row.content}</span>
            </div>
          ))}
          {loading ? <p className="text-xs text-ink-500">Anytime Buddy AI is typing...</p> : null}
        </div>

        <div className="border-t border-ink-100 px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setResponseStyle((prev) => (prev === 'concise' ? 'detailed' : 'concise'))}
              className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700"
            >
              {responseStyle === 'concise' ? 'Mode: Concise' : 'Mode: Detailed'}
            </button>
            {supportsSpeechRecognition && (
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                    return;
                  }
                  startListening((transcript) => setInput((prev) => `${prev} ${transcript}`.trim()), speechLang);
                }}
                className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700"
              >
                {isListening ? 'Stop Mic' : 'Speak'}
              </button>
            )}
            {supportsSpeechSynthesis && (
              <button
                type="button"
                onClick={() => speak(lastAssistantMessage, { lang: speechLang, preferIndianVoice: preferIndianAccent, voiceName })}
                disabled={!lastAssistantMessage}
                className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 disabled:opacity-50"
              >
                Talk Back
              </button>
            )}
            {cooldownRemaining > 0 && <span className="text-xs text-red-600">Retry in {cooldownRemaining}s</span>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Ask Anytime Buddy AI about workflow or clinical insights..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void send();
                }
              }}
              className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-500 focus:border-sage-500 focus:ring-0"
            />
            <button
              onClick={() => void send()}
              disabled={loading || cooldownRemaining > 0}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
