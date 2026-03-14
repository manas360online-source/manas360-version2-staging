import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Camera,
  ChevronDown,
  ChevronUp,
  CreditCard,
  LifeBuoy,
  Lock,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';

type HelpCategory = 'technical' | 'billing' | 'privacy' | 'ai';

type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  category: HelpCategory;
  keywords: string[];
};

type FaqItem = { id: string; question: string; answer: string };

type CrisisResource = {
  id: string;
  label: string;
  contact: string;
  note: string;
};

const helpArticles: HelpArticle[] = [
  {
    id: 'wallet-subscriptions',
    title: 'Wallet & Subscriptions',
    summary: 'Understand the ₹199 base fee, premium minutes top-up, and refund policy for wallet charges.',
    category: 'billing',
    keywords: ['refund', 'wallet', 'subscription', 'minutes', 'billing', 'plan'],
  },
  {
    id: 'join-session',
    title: 'How to Join a Video Session',
    summary: 'Step-by-step guide for entering your therapy session on mobile and desktop.',
    category: 'technical',
    keywords: ['video', 'join', 'session', 'camera', 'microphone'],
  },
  {
    id: 'camera-microphone',
    title: 'Fix Camera and Microphone Issues',
    summary: 'Permission checks and quick troubleshooting when your camera or mic is not detected.',
    category: 'technical',
    keywords: ['camera', 'microphone', 'audio', 'permissions', 'freezing'],
  },
  {
    id: 'privacy-data',
    title: 'Privacy, Encryption, and Data Safety',
    summary: 'Who can access your data, how we protect records, and compliance safeguards.',
    category: 'privacy',
    keywords: ['privacy', 'encrypted', 'security', 'PHQ-9', 'compliance'],
  },
  {
    id: 'anytime-buddy-basics',
    title: 'Using Anytime Buddy (AI) Safely',
    summary: 'How AI suggestions work, chat limits, and how to reset a conversation.',
    category: 'ai',
    keywords: ['ai', 'anytime buddy', 'chat', 'limits', 'reset'],
  },
];

const categoryCards: Array<{
  id: HelpCategory;
  title: string;
  subtitle: string;
  bullets: string[];
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'technical',
    title: 'Video Sessions & Tech',
    subtitle: 'Help with live session reliability and device setup.',
    bullets: ['Camera not working', 'How to join a session', 'App is freezing'],
    icon: Camera,
  },
  {
    id: 'billing',
    title: 'Billing & Premium Minutes',
    subtitle: 'Clear answers for plans, wallet minutes, and refunds.',
    bullets: ['How the ₹199 base plan works', 'Where to buy more AI minutes', 'Refund policy'],
    icon: CreditCard,
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    subtitle: 'Understand exactly what is protected and visible.',
    bullets: ['Who can see my PHQ-9 scores?', 'Is my data encrypted?', 'HIPAA/Data compliance'],
    icon: Lock,
  },
  {
    id: 'ai',
    title: 'Using Anytime Buddy (AI)',
    subtitle: 'How AI support works inside your care journey.',
    bullets: ['How AI uses your data', 'Chat limits', 'How to reset a conversation'],
    icon: Bot,
  },
];

const topFaqs: FaqItem[] = [
  {
    id: 'miss-session',
    question: 'What happens if I miss my session?',
    answer:
      'If you miss a scheduled session without cancelling in time, no-show charges may apply as per your therapist policy. Open the session details page to review cancellation windows before your booking.',
  },
  {
    id: 'employer-data',
    question: 'Can my employer see my therapy data?',
    answer:
      'No. Your therapy notes, PHQ-9 scores, chats, and clinical records are not visible to your employer. Your clinical information remains private within the care system.',
  },
  {
    id: 'switch-therapist',
    question: "How do I switch therapists if it isn't a good match?",
    answer:
      'You can change providers anytime from the Care Team page. Browse available clinicians and request a transfer with no penalty for switching.',
  },
  {
    id: 'chat-boundaries',
    question: 'Is this support form monitored by therapists?',
    answer:
      'No. This form reaches technical and billing support only. For clinical follow-up, message your therapist from the Messages tab.',
  },
  {
    id: 'response-time',
    question: 'How quickly does technical support reply?',
    answer:
      'Our technical support team usually replies within 24 hours. Critical payment and access issues are prioritized first.',
  },
];

const defaultCrisisResources: CrisisResource[] = [
  {
    id: 'vandrevala',
    label: 'Vandrevala Foundation (24/7)',
    contact: '+91 9999 666 555',
    note: '24x7 mental health helpline support.',
  },
  {
    id: 'aasra',
    label: 'AASRA Suicide Prevention',
    contact: '+91 22 2754 6669',
    note: '24x7 crisis line and emotional support.',
  },
  {
    id: 'emergency',
    label: 'Emergency Services',
    contact: '112',
    note: 'For immediate life-threatening emergencies.',
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | 'all'>('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(topFaqs[0].id);

  const [ticketCategory, setTicketCategory] = useState<'bug' | 'billing' | 'feature' | 'other'>('bug');
  const [ticketDescription, setTicketDescription] = useState('');

  const [crisisResources, setCrisisResources] = useState<CrisisResource[]>(defaultCrisisResources);
  const [tickets, setTickets] = useState<Array<{ id: string; title: string; message: string; status: string; createdAt: string }>>([]);

  const patientName =
    String((user as any)?.firstName || '').trim() ||
    String((user as any)?.name || '').trim().split(' ')[0] ||
    'there';

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return helpArticles
      .filter((article) => selectedCategory === 'all' || article.category === selectedCategory)
      .filter((article) => {
        if (!query) return true;
        const source = `${article.title} ${article.summary} ${article.keywords.join(' ')}`.toLowerCase();
        return source.includes(query);
      });
  }, [searchQuery, selectedCategory]);

  const searchSuggestions = useMemo(() => filteredArticles.slice(0, 6), [filteredArticles]);

  const loadSupportCenter = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getSupportCenter();
      const data = (response as any)?.data ?? response ?? {};
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);

      const contacts = Array.isArray(data.emergencyContacts) ? data.emergencyContacts : [];
      if (contacts.length > 0) {
        const mapped = contacts.map((item: any, index: number) => ({
          id: `api-contact-${index}`,
          label: String(item?.label || 'Crisis Support'),
          contact: String(item?.value || item?.contact || ''),
          note: 'Verified local support resource.',
        }));
        setCrisisResources([...defaultCrisisResources, ...mapped]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load support data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSupportCenter();
  }, []);

  const submitSupportRequest = async () => {
    if (!ticketDescription.trim()) return;

    const categoryLabel: Record<'bug' | 'billing' | 'feature' | 'other', string> = {
      bug: 'Bug Report',
      billing: 'Billing Issue',
      feature: 'Feature Request',
      other: 'Other',
    };

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await patientApi.createSupportTicket({
        subject: categoryLabel[ticketCategory],
        message: ticketDescription.trim(),
        category: ticketCategory,
        priority: 'medium',
      });
      setSuccess('Support request submitted. Our tech team typically replies within 24 hours.');
      setTicketDescription('');
      await loadSupportCenter();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit support request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-6">Loading support center...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-20 lg:pb-8">
      <section className="sticky top-2 z-20 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Safety first:</span> If you are in a life-threatening situation or experiencing a mental health emergency, please do not use this app.
          </p>
          <a
            href="#crisis-resources"
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
          >
            View 24/7 Crisis Resources
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <section className="rounded-3xl border border-calm-sage/20 bg-white p-5 shadow-soft-sm sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F3F8F1] px-3 py-1 text-xs font-semibold text-calm-sage">
          <LifeBuoy className="h-3.5 w-3.5" />
          Help Center
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-charcoal sm:text-3xl">How can we support you today, {patientName}?</h1>
        <p className="mt-2 text-sm text-charcoal/70">
          Find quick answers, get technical help fast, and reach crisis support if you need immediate emotional safety.
        </p>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-charcoal/45" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedArticle(null);
            }}
            placeholder="Search for articles, video call help, or billing..."
            className="w-full rounded-2xl border border-calm-sage/25 bg-[#FAFCF9] py-3 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/45 focus:border-calm-sage/40 focus:outline-none focus:ring-1 focus:ring-calm-sage/20"
          />

          {searchQuery.trim().length > 0 && (
            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-calm-sage/20 bg-white shadow-lg">
              {searchSuggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-charcoal/60">No matching articles found.</p>
              ) : (
                searchSuggestions.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => {
                      setSelectedArticle(article);
                      setSearchQuery(article.title);
                    }}
                    className="block w-full border-b border-calm-sage/10 px-4 py-3 text-left last:border-b-0 hover:bg-calm-sage/5"
                  >
                    <p className="text-sm font-semibold text-charcoal">{article.title}</p>
                    <p className="mt-0.5 text-xs text-charcoal/60">{article.summary}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-calm-sage/20 bg-[#F6FAF4] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-calm-sage">Technical Support</p>
            <p className="mt-1 text-sm text-charcoal/75">App issues, billing help, session tech troubleshooting.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Clinical/Crisis Support</p>
            <p className="mt-1 text-sm text-amber-900">Use Messages for therapist contact or crisis resources for emergencies.</p>
          </div>
        </div>

        {selectedArticle && (
          <div className="mt-4 rounded-xl border border-calm-sage/20 bg-white p-4">
            <p className="text-sm font-semibold text-charcoal">{selectedArticle.title}</p>
            <p className="mt-1 text-sm text-charcoal/70">{selectedArticle.summary}</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-charcoal">Quick Topic Categories</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {categoryCards.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(item.id);
                  setSearchQuery('');
                  setSelectedArticle(null);
                }}
                className={`rounded-2xl border p-4 text-left transition ${selectedCategory === item.id ? 'border-calm-sage bg-[#F5F9F3]' : 'border-calm-sage/20 bg-white hover:bg-calm-sage/5'}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-calm-sage" />
                  <p className="text-sm font-semibold text-charcoal">{item.title}</p>
                </div>
                <p className="mt-2 text-xs text-charcoal/65">{item.subtitle}</p>
                <ul className="mt-3 space-y-1 text-xs text-charcoal/75">
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-charcoal">Top FAQs</h2>
        <div className="space-y-2">
          {topFaqs.map((faq) => {
            const open = openFaqId === faq.id;
            return (
              <div key={faq.id} className="overflow-hidden rounded-xl border border-calm-sage/20 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenFaqId((prev) => (prev === faq.id ? null : faq.id))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-charcoal">{faq.question}</span>
                  {open ? <ChevronUp className="h-4 w-4 text-charcoal/60" /> : <ChevronDown className="h-4 w-4 text-charcoal/60" />}
                </button>
                <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="border-t border-calm-sage/15 px-4 py-3 text-sm text-charcoal/75">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="support-form" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-charcoal">Still Need Help?</h2>
        <p className="mt-2 text-sm text-charcoal/75">
          Please note: This form goes to our technical and billing support team. We cannot provide medical or psychological advice here. To contact your therapist, use the{' '}
          <Link to="/patient/messages" className="font-semibold text-calm-sage underline">
            Messages
          </Link>{' '}
          tab.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-charcoal/80">
            Category
            <select
              value={ticketCategory}
              onChange={(e) => setTicketCategory(e.target.value as 'bug' | 'billing' | 'feature' | 'other')}
              className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
            >
              <option value="bug">Bug Report</option>
              <option value="billing">Billing Issue</option>
              <option value="feature">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="rounded-xl border border-calm-sage/20 bg-white p-3 text-sm text-charcoal/70">
            Our tech team typically replies within 24 hours.
          </div>
        </div>

        <label className="mt-3 block text-sm text-charcoal/80">
          Description
          <textarea
            value={ticketDescription}
            onChange={(e) => setTicketDescription(e.target.value)}
            rows={5}
            placeholder="Tell us what happened and what you were trying to do..."
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>

        <button
          type="button"
          onClick={() => void submitSupportRequest()}
          disabled={submitting || !ticketDescription.trim()}
          className="mt-3 rounded-lg bg-calm-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? 'Submitting...' : 'Submit Support Request'}
        </button>
      </section>

      <section id="crisis-resources" className="rounded-2xl border border-red-200 bg-red-50/80 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <h2 className="text-base font-semibold text-red-800">24/7 Crisis Resources</h2>
        </div>
        <p className="mt-1 text-sm text-red-700">If you are in immediate danger, call emergency services right away.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {crisisResources.map((item) => (
            <div key={item.id} className="rounded-xl border border-red-200 bg-white px-3 py-2.5">
              <p className="text-sm font-semibold text-red-800">{item.label}</p>
              <p className="mt-0.5 text-sm text-red-700">{item.contact}</p>
              <p className="text-xs text-red-600">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      <section className="rounded-2xl border border-calm-sage/20 bg-white p-4">
        <p className="text-sm font-semibold text-charcoal">Recent Support Requests</p>
        {tickets.length === 0 ? (
          <p className="mt-2 text-sm text-charcoal/65">No support requests yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {tickets.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="flex items-start justify-between gap-3 rounded-lg border border-calm-sage/15 bg-[#FAFAF8] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-charcoal">{ticket.title}</p>
                  <p className="text-xs text-charcoal/65">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
                <span className="rounded-full bg-calm-sage/15 px-2 py-0.5 text-[11px] font-semibold text-calm-sage">
                  {String(ticket.status || 'OPEN').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
