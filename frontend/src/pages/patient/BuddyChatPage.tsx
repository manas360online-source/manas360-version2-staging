import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../../api/patient';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const copy = {
  title: 'AnytimeBuddy',
  subtitle: '24/7 companion support. ₹150/call or Premium Free.',
  placeholder: 'Share how you are feeling right now...',
};

export default function BuddyChatPage() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi, I am AnytimeBuddy. I can support you between sessions. What would help most right now?',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const quickPrompts = useMemo(
    () => ['Help me calm anxiety quickly', 'Give me a sleep reset plan', 'Guide me through a 2-minute grounding'],
    [],
  );

  const send = async (event?: FormEvent<HTMLFormElement>, explicit?: string) => {
    if (event) event.preventDefault();
    const value = String(explicit ?? input).trim();
    if (!value || sending) return;

    setMessages((prev) => [...prev, { role: 'user', content: value }]);
    setInput('');
    setSending(true);

    try {
      const response = await patientApi.aiChat({
        message: value,
        bot_type: 'mood_ai',
        response_style: 'concise',
      });
      const payload = (response as any)?.data ?? response;
      const reply = String(payload?.response || 'I hear you. I am with you. Let us take this one step at a time.');
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection is unstable right now. I am still here. Try again in a moment.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="fixed inset-0 z-40 bg-gradient-to-br from-[#e8f1ef] via-[#f3f7f6] to-[#f8efe7]">
      <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col px-4 pb-4 pt-5 sm:px-6">
        <header className="mb-4 flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-[0_12px_30px_rgba(18,38,55,0.10)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/55">Full-Screen AI Interface</p>
            <h1 className="text-xl font-bold text-charcoal">{copy.title}</h1>
            <p className="text-sm text-charcoal/66">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/patient/wellness-library')}
            className="rounded-full border border-charcoal/20 px-4 py-2 text-sm font-semibold text-charcoal/75 hover:bg-white"
          >
            Back to Library
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/60 bg-white/78 p-4 shadow-[0_16px_36px_rgba(23,41,61,0.12)] backdrop-blur">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={sending}
                onClick={() => {
                  void send(undefined, prompt);
                }}
                className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-charcoal/70 hover:border-charcoal/40"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-[#f6f8f8] p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    message.role === 'user' ? 'bg-charcoal text-white' : 'bg-white text-charcoal/82 shadow-sm'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {sending && <p className="text-xs text-charcoal/55">Typing...</p>}
          </div>

          <form onSubmit={send} className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={copy.placeholder}
              className="h-11 flex-1 rounded-xl border border-ink-200 bg-white px-3 text-sm text-charcoal outline-none focus:border-calm-sage"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-11 rounded-xl bg-charcoal px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </main>
      </div>
    </section>
  );
}
