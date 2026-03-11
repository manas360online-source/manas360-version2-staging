import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft, User, MessageSquare } from 'lucide-react';
import { patientApi } from '../../api/patient';

type Conversation = {
  id: string;
  providerName: string;
  providerRole?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

type Message = {
  id: string;
  role: 'patient' | 'provider';
  content: string;
  createdAt: string;
};

export default function ProviderMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getConversations();
      const data = (res as any)?.data ?? res;
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // API may not be ready yet - show empty state
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await patientApi.getMessages(conversationId);
      const data = (res as any)?.data ?? res;
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;
    setSending(true);
    setError(null);

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      role: 'patient',
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');

    try {
      await patientApi.sendMessage({
        conversationId: activeConversation.id,
        content: optimistic.content,
      });
      await loadMessages(activeConversation.id);
    } catch (err: any) {
      setError('Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      void loadMessages(activeConversation.id);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-[1400px] flex-col pb-20 lg:h-[calc(100vh-5rem)] lg:pb-0">
      {/* Header */}
      <section className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {activeConversation && (
            <button
              type="button"
              onClick={() => setActiveConversation(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/70 hover:bg-calm-sage/10 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="font-serif text-2xl font-semibold text-charcoal sm:text-3xl">Messages</h1>
            <p className="mt-0.5 text-sm text-charcoal/70">Communicate with your care providers.</p>
          </div>
        </div>
        <Link
          to="/patient/messages"
          className="inline-flex items-center gap-2 rounded-xl border border-calm-sage/25 px-3 py-2 text-sm font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
        >
          <MessageSquare className="h-4 w-4" />
          AI Support (Dr. Meera)
        </Link>
      </section>

      {/* Main chat layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-calm-sage/15 bg-white shadow-soft-sm">
        {/* Conversation List */}
        <aside
          className={`w-full flex-shrink-0 border-r border-calm-sage/15 bg-[#FAFAF8] lg:w-72 ${
            activeConversation ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="border-b border-calm-sage/15 p-4">
            <p className="text-sm font-semibold text-charcoal">Conversations</p>
          </div>
          <div className="overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-sm text-charcoal/60">Loading...</div>
            )}

            {!loading && conversations.length === 0 && (
              <div className="space-y-3 p-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-calm-sage/10">
                  <MessageSquare className="h-6 w-6 text-calm-sage/50" />
                </div>
                <div>
                  <p className="text-sm text-charcoal/60">No conversations yet.</p>
                  <p className="mt-1 text-xs text-charcoal/50">Start a conversation by messaging a provider from your Care Team.</p>
                </div>
                <Link
                  to="/patient/care-team"
                  className="inline-flex items-center rounded-lg bg-calm-sage px-3 py-1.5 text-xs font-medium text-white"
                >
                  Go to Care Team
                </Link>
              </div>
            )}

            {conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConversation(conv)}
                className={`flex w-full items-start gap-3 border-b border-calm-sage/10 p-4 text-left transition ${
                  activeConversation?.id === conv.id
                    ? 'bg-calm-sage/10'
                    : 'hover:bg-calm-sage/5'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-calm-sage/15 text-sm font-semibold text-calm-sage">
                  {conv.providerName?.charAt(0) || 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-charcoal">{conv.providerName}</p>
                    <span className="shrink-0 text-[10px] text-charcoal/50">{formatDate(conv.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-xs text-charcoal/60">{conv.providerRole || 'Therapist'}</p>
                  {conv.lastMessage && (
                    <p className="mt-0.5 truncate text-xs text-charcoal/50">{conv.lastMessage}</p>
                  )}
                </div>
                {(conv.unreadCount ?? 0) > 0 && (
                  <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-calm-sage text-[10px] font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <div className={`flex min-w-0 flex-1 flex-col ${!activeConversation ? 'hidden lg:flex' : 'flex'}`}>
          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-calm-sage/10">
                  <MessageSquare className="h-8 w-8 text-calm-sage/40" />
                </div>
                <p className="mt-3 text-sm text-charcoal/60">Select a conversation to start messaging.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-calm-sage/15 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/70 hover:bg-calm-sage/10 lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-calm-sage/15">
                  <User className="h-4 w-4 text-calm-sage" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">{activeConversation.providerName}</p>
                  <p className="text-xs text-charcoal/55">{activeConversation.providerRole || 'Therapist'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-charcoal/50">No messages yet. Send a message to start the conversation.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          msg.role === 'patient'
                            ? 'bg-charcoal text-white'
                            : 'border border-calm-sage/15 bg-calm-sage/5 text-charcoal'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`mt-1 text-[10px] ${msg.role === 'patient' ? 'text-white/60' : 'text-charcoal/40'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-calm-sage/15 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    rows={1}
                    className="min-h-[40px] flex-1 resize-none rounded-xl border border-calm-sage/20 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-calm-sage/40 focus:outline-none focus:ring-1 focus:ring-calm-sage/20"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!newMessage.trim() || sending}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-charcoal text-white transition hover:opacity-95 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
