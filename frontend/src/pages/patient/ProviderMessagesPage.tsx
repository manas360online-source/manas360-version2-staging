import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Send, ArrowLeft, MessageSquare, Clock, Check, CheckCheck } from 'lucide-react';
import { patientApi } from '../../api/patient';

// ── Types ──────────────────────────────────────────────────────────
type ConversationSummary = {
  id: string;
  providerId?: string;
  providerName: string;
  providerRole?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isPinned: boolean;
  isSupport: boolean;
};

const normalizeConversation = (raw: any): ConversationSummary => {
  const providerId = String(
    raw?.providerId || raw?.provider_id || raw?.providerUserId || raw?.provider?.id || '',
  ).trim();
  return {
    id: String(raw?.id || raw?.conversationId || ''),
    providerId: providerId || undefined,
    providerName: String(raw?.providerName || raw?.provider_name || raw?.provider?.name || 'Provider'),
    providerRole: String(raw?.providerRole || raw?.provider_role || ''),
    lastMessage: raw?.lastMessage || raw?.last_message || '',
    lastMessageAt: raw?.lastMessageAt || raw?.last_message_at || '',
    unreadCount: Number(raw?.unreadCount || raw?.unread_count || 0),
    isPinned: Boolean(raw?.isPinned),
    isSupport: Boolean(raw?.isSupport),
  };
};

type DirectMessage = {
  id: string;
  senderId: string;
  senderRole: 'patient' | 'provider';
  content: string;
  messageType: 'TEXT' | 'SYSTEM_PHQ9' | 'SYSTEM_SESSION_END' | 'SYSTEM_INFO';
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────
function getSocketOrigin(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '').trim();
  if (envUrl) return envUrl.replace(/\/api\/?$/, '');
  const productionHost = window.location.hostname === 'manas360.com' ? 'www.manas360.com' : window.location.hostname;
  return `${window.location.protocol}//${productionHost}:3000`;
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ── Component ──────────────────────────────────────────────────────
export default function ProviderMessagesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { providerId: providerIdFromPath } = useParams<{ providerId?: string }>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [typing, setTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConvIdRef = useRef<string | null>(null);

  const getSortedConversations = (items: ConversationSummary[]) => {
    return [...items].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isSupport && !b.isSupport) return 1;
      if (!a.isSupport && b.isSupport) return -1;
      return new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime();
    });
  };

  // ── Socket setup ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io(getSocketOrigin(), {
      auth: { token },
      transports: ['websocket'],
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_inbox');
    });

    socket.on('new_message', (msg: DirectMessage & { conversationId: string }) => {
      // Update chat if it's the open conversation
      if (msg.conversationId === activeConvIdRef.current) {
        setMessages((prev) => {
          const optimisticIdx = prev.findIndex((m) => m.id.startsWith('temp-') && m.content === msg.content);
          if (optimisticIdx !== -1) {
            const next = [...prev];
            next[optimisticIdx] = msg;
            return next;
          }
          return [...prev, msg];
        });
        socket.emit('dm_mark_read', { conversationId: msg.conversationId });
      }
      // Update sidebar preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessage: msg.content,
                lastMessageAt: msg.createdAt,
                unreadCount: msg.conversationId === activeConvIdRef.current ? 0 : c.unreadCount + 1,
              }
            : c,
        ),
      );
    });

    socket.on('dm_typing', ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeConvIdRef.current) {
        setTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTyping(false), 3000);
      }
    });

    socket.on('messages_read', ({ conversationId }: { conversationId: string }) => {
      setReadReceipts((prev) => ({ ...prev, [conversationId]: true }));
    });

    socket.on('presence_status', ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: online }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Load conversations ─────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (authRequired) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await patientApi.getConversations();
      const raw = (res as any)?.data ?? res;
      const data: ConversationSummary[] = Array.isArray(raw) ? raw.map(normalizeConversation) : [];
      const sorted = getSortedConversations(data);
      setConversations(sorted);
      sorted.forEach((c) => {
        if (!c.isSupport && c.providerId) {
          socketRef.current?.emit('check_presence', { userId: c.providerId });
        }
      });
    } catch (requestError: any) {
      const status = Number(requestError?.response?.status || 0);
      if (status === 401 || status === 403) {
        setAuthRequired(true);
        setError('Your session has expired. Please log in again to continue messaging.');
        setConversations([]);
        return;
      }
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [authRequired]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // ── Open conversation ──────────────────────────────────────────
  const openConversation = useCallback(async (conv: ConversationSummary) => {
    setActiveConv(conv);
    activeConvIdRef.current = conv.id;
    setMessages([]);
    setTyping(false);
    setMsgLoading(true);
    socketRef.current?.emit('join_conversation', { conversationId: conv.id });
    if (!conv.isSupport && conv.providerId) {
      socketRef.current?.emit('check_presence', { userId: conv.providerId });
    }
    try {
      const res = await patientApi.getMessages(conv.id);
      const raw = (res as any)?.data ?? res;
      setMessages(Array.isArray(raw) ? raw : []);
      socketRef.current?.emit('dm_mark_read', { conversationId: conv.id });
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  // If navigated with provider id, fetch/create thread and open by conversation id.
  useEffect(() => {
    if (authRequired) return;
    const providerId = String(providerIdFromPath || new URLSearchParams(location.search).get('providerId') || '').trim();
    if (!providerId || loading) return;

    let cancelled = false;
    const openOrCreateConversation = async () => {
      try {
        const startRes = await patientApi.startConversation({ providerId: String(providerId) });
        const startPayload = (startRes as any)?.data ?? startRes;
        const conversationId = String(startPayload?.conversationId || '').trim();

        const refreshed = await patientApi.getConversations();
        const refreshedRaw = (refreshed as any)?.data ?? refreshed;
        const refreshedData: ConversationSummary[] = Array.isArray(refreshedRaw)
          ? refreshedRaw.map(normalizeConversation)
          : [];
        const refreshedSorted = getSortedConversations(refreshedData);
        if (!cancelled) setConversations(refreshedSorted);

        let target = refreshedSorted.find((conv) => String(conv.id) === conversationId);
        if (!target && conversationId) {
          const providerName = String(new URLSearchParams(location.search).get('providerName') || 'Provider');
          target = {
            id: conversationId,
            providerId,
            providerName,
            providerRole: '',
            lastMessage: '',
            lastMessageAt: '',
            unreadCount: 0,
            isPinned: false,
            isSupport: false,
          };
        }

        if (!cancelled && target) {
          await openConversation(target);
        }
      } catch (requestError: any) {
        const status = Number(requestError?.response?.status || 0);
        if (status === 401 || status === 403) {
          setAuthRequired(true);
          setError('Your session has expired. Please log in again to continue messaging.');
          return;
        }
        // Keep page usable even when direct start fails.
      }

      if (!cancelled) {
        navigate('/patient/provider-messages', { replace: true });
      }
    };

    void openOrCreateConversation();
    return () => {
      cancelled = true;
    };
  }, [authRequired, location.search, loading, navigate, openConversation, providerIdFromPath]);

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // ── Auto-resize textarea ──────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  // ── Typing indicator emission ─────────────────────────────────
  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (activeConvIdRef.current) {
      socketRef.current?.emit('dm_typing', { conversationId: activeConvIdRef.current, isTyping: true });
    }
  };

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = async () => {
    if (!draft.trim() || !activeConv || sending) return;
    const text = draft.trim();
    setSending(true);
    setError(null);
    setDraft('');
    setReadReceipts((prev) => ({ ...prev, [activeConv.id]: false }));

    const optimistic: DirectMessage = {
      id: `temp-${Date.now()}`,
      senderId: 'me',
      senderRole: 'patient',
      content: text,
      messageType: 'TEXT',
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('dm_send', { conversationId: activeConv.id, content: text });
      } else {
        const res = await patientApi.sendMessage({ conversationId: activeConv.id, content: text });
        const msg = (res as any)?.data ?? res;
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (msg as DirectMessage) : m)));
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id ? { ...c, lastMessage: text, lastMessageAt: optimistic.createdAt } : c,
        ),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError('Message could not be sent. Please try again.');
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

    // ── Derived ────────────────────────────────────────────────────
    const isProviderOnline = activeConv && !activeConv.isSupport && activeConv.providerId
      ? (onlineStatus[activeConv.providerId] ?? false)
      : false;
    const allRead = activeConv ? (readReceipts[activeConv.id] ?? false) : false;

    const clearActiveConv = () => {
      setActiveConv(null);
      activeConvIdRef.current = null;
    };

    // ── Render ─────────────────────────────────────────────────────
    if (authRequired) {
      return (
        <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">Session expired</h2>
          <p className="mt-2 text-sm text-amber-800">Please log in again to continue messaging your providers.</p>
          <button
            type="button"
            onClick={() => navigate('/auth/login')}
            className="mt-4 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Go to Login
          </button>
        </div>
      );
    }

    return (
      <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-[1400px] flex-col pb-20 lg:h-[calc(100vh-5rem)] lg:pb-0">
        {/* Page header */}
        <section className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {activeConv && (
              <button
                type="button"
                onClick={clearActiveConv}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/70 hover:bg-calm-sage/10 lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-charcoal sm:text-3xl">Messages</h1>
              <p className="mt-0.5 text-sm text-charcoal/70">Communicate with your care providers.</p>
            </div>
          </div>
          <Link
            to="/patient/messages"
            className="inline-flex items-center gap-2 rounded-xl border border-calm-sage/25 px-3 py-2 text-sm font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
          >
            <MessageSquare className="h-4 w-4" />
            AI Support (Anytime Buddy)
          </Link>
        </section>

        {/* Main layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-calm-sage/15 bg-white shadow-soft-sm">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside
            className={`w-full flex-shrink-0 border-r border-calm-sage/15 bg-[#FAFAF8] lg:w-72 ${
              activeConv ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-calm-sage/15 p-4">
              <p className="text-sm font-semibold text-charcoal">Clinical Inbox</p>
            </div>
            <div className="overflow-y-auto">
              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-1 p-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex animate-pulse gap-3 rounded-xl p-3">
                      <div className="h-10 w-10 rounded-full bg-calm-sage/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 rounded bg-calm-sage/10" />
                        <div className="h-2.5 w-3/4 rounded bg-calm-sage/10" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && conversations.length === 0 && (
                <div className="space-y-3 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-calm-sage/10">
                    <MessageSquare className="h-6 w-6 text-calm-sage/50" />
                  </div>
                  <p className="text-sm text-charcoal/60">No conversations yet.</p>
                  <p className="text-xs text-charcoal/50">
                    Reach out to a provider from your Care Team to start a conversation.
                  </p>
                  <Link
                    to="/patient/care-team"
                    className="inline-flex items-center rounded-lg bg-calm-sage px-3 py-1.5 text-xs font-medium text-white"
                  >
                    View Care Team
                  </Link>
                </div>
              )}

              {conversations.map((conv) => {
                const isActive = activeConv?.id === conv.id;
                const online = conv.isSupport
                  ? true
                  : conv.providerId
                  ? onlineStatus[conv.providerId] ?? false
                  : false;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => void openConversation(conv)}
                    className={`flex w-full items-start gap-3 border-b border-calm-sage/10 p-4 text-left transition hover:bg-calm-sage/5 ${
                      isActive ? 'bg-calm-sage/10' : ''
                    }`}
                  >
                    {/* Avatar + presence dot */}
                    <div className="relative shrink-0">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                          conv.isSupport
                            ? 'bg-[#6B4FA0]/15 text-[#6B4FA0]'
                            : 'bg-calm-sage/15 text-calm-sage'
                        }`}
                      >
                        {conv.isSupport ? '💬' : conv.providerName?.charAt(0) || 'P'}
                      </div>
                      {!conv.isSupport && (
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                            online ? 'bg-green-400' : 'bg-charcoal/20'
                          }`}
                        />
                      )}
                      {conv.isPinned && !conv.isSupport && (
                        <span className="absolute -left-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-calm-sage text-[7px] text-white">
                          ★
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-semibold text-charcoal">{conv.providerName}</p>
                        <span className="shrink-0 text-[10px] text-charcoal/40">
                          {relativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-charcoal/55">
                        {conv.isSupport ? 'Manas360 Support' : conv.providerRole || 'Therapist'}
                      </p>
                      {conv.lastMessage && (
                        <p className="mt-0.5 truncate text-xs text-charcoal/50">{conv.lastMessage}</p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {conv.unreadCount > 0 && (
                      <span className="ml-1 mt-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-calm-sage px-1 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Chat panel ──────────────────────────────────────── */}
          <div className={`flex min-w-0 flex-1 flex-col ${!activeConv ? 'hidden lg:flex' : 'flex'}`}>
            {!activeConv ? (
              /* Empty / no-selection state */
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-calm-sage/10">
                    <MessageSquare className="h-8 w-8 text-calm-sage/40" />
                  </div>
                  <p className="text-sm font-medium text-charcoal/70">Select a conversation</p>
                  <p className="mt-1 text-xs text-charcoal/50">
                    Choose a provider from your inbox to start messaging.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-calm-sage/15 px-4 py-3">
                  <button
                    type="button"
                    onClick={clearActiveConv}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-charcoal/70 hover:bg-calm-sage/10 lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                        activeConv.isSupport
                          ? 'bg-[#6B4FA0]/15 text-[#6B4FA0]'
                          : 'bg-calm-sage/15 text-calm-sage'
                      }`}
                    >
                      {activeConv.isSupport ? '💬' : activeConv.providerName?.charAt(0) || 'P'}
                    </div>
                    {!activeConv.isSupport && (
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          isProviderOnline ? 'bg-green-400' : 'bg-charcoal/20'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{activeConv.providerName}</p>
                    <p className="text-[11px] text-charcoal/55">
                      {activeConv.isSupport
                        ? 'Manas360 Support · Always available'
                        : isProviderOnline
                        ? <span className="text-green-600">Online now</span>
                        : activeConv.providerRole || 'Therapist'}
                    </p>
                  </div>
                </div>

                {/* Working hours banner (provider threads only) */}
                {!activeConv.isSupport && (
                  <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2.5">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      <span className="font-medium">{activeConv.providerName}</span> typically replies within 24–48 hours
                      during business hours. If you're in distress, please use{' '}
                      <Link to="/patient/crisis" className="font-medium underline">
                        Crisis Support
                      </Link>
                      .
                    </p>
                  </div>
                )}

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {msgLoading && (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-calm-sage border-t-transparent" />
                    </div>
                  )}

                  {!msgLoading && messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-charcoal/50">
                        No messages yet. Send a message to start the conversation.
                      </p>
                    </div>
                  )}

                  {!msgLoading && (
                    <div className="space-y-2">
                      {messages.map((msg, idx) => {
                        const isPatient = msg.senderRole === 'patient';
                        const isSystem = msg.messageType !== 'TEXT';
                        // Last sent message by patient (for read receipt tick)
                        const isLastPatient =
                          isPatient &&
                          idx === messages.reduce((last, m, i) => (m.senderRole === 'patient' ? i : last), -1);

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="my-3 flex justify-center">
                              <div className="inline-flex max-w-[90%] items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-600">
                                <span className="text-xs">
                                  {msg.messageType === 'SYSTEM_PHQ9'
                                    ? '📋'
                                    : msg.messageType === 'SYSTEM_SESSION_END'
                                    ? '✅'
                                    : 'ℹ️'}
                                </span>
                                <p className="text-[11px] text-zinc-600">{msg.content}</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`flex max-w-[75%] flex-col gap-0.5 ${
                                isPatient ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div
                                className={`rounded-2xl px-4 py-2.5 ${
                                  isPatient
                                    ? 'rounded-br-sm bg-charcoal text-white'
                                    : 'rounded-bl-sm border border-calm-sage/15 bg-calm-sage/5 text-charcoal'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                              </div>
                              <div
                                className={`flex items-center gap-1 ${isPatient ? 'flex-row-reverse' : ''}`}
                              >
                                <span className="text-[10px] text-charcoal/40">
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isLastPatient && (
                                  allRead ? (
                                    <CheckCheck className="h-3 w-3 text-calm-sage" />
                                  ) : (
                                    <Check className="h-3 w-3 text-charcoal/30" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Typing indicator */}
                      {typing && (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-calm-sage/15 bg-calm-sage/5 px-4 py-3">
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-calm-sage/60"
                              style={{ animationDelay: '0ms' }}
                            />
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-calm-sage/60"
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-calm-sage/60"
                              style={{ animationDelay: '300ms' }}
                            />
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="ml-2 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Input bar */}
                <div className="border-t border-calm-sage/15 p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(e) => handleDraftChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message… (Shift+Enter for new line)"
                      rows={1}
                      className="max-h-40 flex-1 resize-none rounded-xl border border-calm-sage/20 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-calm-sage/40 focus:outline-none focus:ring-1 focus:ring-calm-sage/20"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!draft.trim() || sending}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-charcoal text-white transition hover:opacity-90 disabled:opacity-35"
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-right text-[10px] text-charcoal/35">
                    Enter to send · Shift+Enter for new line
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
