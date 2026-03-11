import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, MessageSquare, XCircle, RefreshCw, Video, FileText, Download, Star } from 'lucide-react';
import { isOnboardingRequiredError, patientApi } from '../../api/patient';

export default function SessionsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const [u, h] = await Promise.all([patientApi.getUpcomingSessions(), patientApi.getSessionHistory()]);
        const upData = u?.data ?? u;
        const histData = h?.data ?? h;
        setUpcoming(Array.isArray(upData) ? upData : []);
        setHistory(Array.isArray(histData) ? histData : []);
      } catch (err: any) {
        if (isOnboardingRequiredError(err)) {
          navigate('/patient/onboarding', { replace: true });
          return;
        }
        setError(err?.response?.data?.message || err?.message || 'Unable to load sessions right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const completed = history.filter((session) => session.status === 'completed');
  const cancelled = history.filter((session) => session.status === 'cancelled');

  const visibleSessions =
    activeTab === 'upcoming'
      ? upcoming
      : activeTab === 'completed'
        ? completed
        : cancelled;

  const handleDownloadInvoice = async (sessionId: string) => {
    try {
      await patientApi.downloadInvoicePdf(sessionId);
    } catch {
      // silently fail - PDF download may open in new tab
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-20 lg:pb-6">
      {/* Header with Book Session */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal sm:text-3xl">Sessions</h1>
          <p className="mt-1 text-sm text-charcoal/70">View, manage and join your therapy appointments.</p>
        </div>
        <Link
          to="/patient/care-team?tab=browse"
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2.5 text-sm font-medium text-cream transition hover:opacity-95"
        >
          <CalendarPlus className="h-4 w-4" />
          Book New Session
        </Link>
      </section>

      {/* Tabs */}
      <div className="inline-flex rounded-full border border-calm-sage/20 bg-white/80 p-1">
        {[
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'completed', label: `Completed (${completed.length})` },
          { key: 'cancelled', label: `Cancelled (${cancelled.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition md:text-sm ${
              activeTab === tab.key
                ? 'bg-calm-sage text-white'
                : 'text-charcoal/70 hover:bg-calm-sage/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <section className="space-y-3">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-8 text-center text-sm text-charcoal/60">
            Loading sessions...
          </div>
        )}

        {!loading && visibleSessions.length === 0 && (
          <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-8 text-center">
            <p className="text-sm text-charcoal/60">
              {activeTab === 'upcoming'
                ? 'No upcoming sessions. Book a session with a provider to get started.'
                : `No ${activeTab} sessions yet.`}
            </p>
            {activeTab === 'upcoming' && (
              <Link
                to="/patient/care-team?tab=browse"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-calm-sage px-4 py-2 text-sm font-medium text-white transition hover:opacity-95"
              >
                <CalendarPlus className="h-4 w-4" />
                Browse Providers
              </Link>
            )}
          </div>
        )}

        {!loading &&
          visibleSessions.map((session) => {
            const hasLiveAccess = session.agora_channel && session.agora_token;
            const scheduledDate = new Date(session.scheduled_at || session.scheduledAt);
            const isValidDate = !isNaN(scheduledDate.getTime());

            return (
              <article key={session.id} className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Session Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-charcoal">
                        {session.provider?.name || 'Assigned Therapist'}
                      </h2>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        session.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : session.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {(session.status || 'scheduled').toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-charcoal/65">
                      {isValidDate ? scheduledDate.toLocaleString() : '—'}
                      {' · '}
                      <span className="inline-flex items-center gap-1">
                        <Video className="inline h-3 w-3" /> Video Session
                      </span>
                    </p>
                    {session.provider?.specialization && (
                      <p className="mt-0.5 text-xs text-charcoal/55">{session.provider.specialization}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {/* View Details */}
                    <Link
                      to={`/patient/sessions/${session.id}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Details
                    </Link>

                    {/* Join Session (upcoming with live access) */}
                    {activeTab === 'upcoming' && hasLiveAccess && (
                      <Link
                        to={`/patient/sessions/${session.id}/live`}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-charcoal px-4 text-xs font-medium text-cream transition hover:opacity-95"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join Session
                      </Link>
                    )}

                    {/* Message Therapist */}
                    {activeTab === 'upcoming' && (
                      <Link
                        to="/patient/messages"
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message
                      </Link>
                    )}

                    {/* Reschedule (upcoming only) */}
                    {activeTab === 'upcoming' && (
                      <Link
                        to="/patient/care-team?tab=browse"
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-amber-300/50 bg-amber-50 px-3 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reschedule
                      </Link>
                    )}

                    {/* Cancel (upcoming only) */}
                    {activeTab === 'upcoming' && (
                      <button
                        type="button"
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-red-200/50 bg-red-50 px-3 text-xs font-medium text-red-700 transition hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}

                    {/* Download Invoice */}
                    <button
                      type="button"
                      onClick={() => void handleDownloadInvoice(session.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Invoice
                    </button>

                    {/* Feedback (completed only) */}
                    {activeTab === 'completed' && (
                      <button
                        type="button"
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-calm-sage/25 px-3 text-xs font-medium text-charcoal/70 transition hover:bg-calm-sage/10"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Feedback
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
      </section>
    </div>
  );
}
