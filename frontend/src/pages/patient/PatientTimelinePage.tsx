import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Clock3, FileText, MessageSquare, Activity } from 'lucide-react';
import { patientApi } from '../../api/patient';

type TimelineItem = {
  id: string;
  date: string;
  type: 'session' | 'mood' | 'assessment' | 'report' | 'system';
  title: string;
  description?: string;
  status?: 'completed' | 'scheduled' | 'pending';
};

const typeIcon = (type: TimelineItem['type']) => {
  switch (type) {
    case 'session':
      return CalendarDays;
    case 'mood':
      return Activity;
    case 'assessment':
      return CheckCircle2;
    case 'report':
      return FileText;
    default:
      return MessageSquare;
  }
};

const statusBadge = (status?: TimelineItem['status']) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'scheduled') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export default function PatientTimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, sessionsRes, reportsRes] = await Promise.all([
          patientApi.getDashboard().catch(() => null),
          patientApi.getSessionHistory().catch(() => null),
          patientApi.getReports().catch(() => null),
        ]);

        const dashboard = (dashboardRes as any)?.data ?? dashboardRes ?? {};
        const sessionsRaw = (sessionsRes as any)?.data ?? sessionsRes ?? [];
        const reportsRaw = (reportsRes as any)?.data ?? reportsRes ?? [];

        const timeline: TimelineItem[] = [];

        if (Array.isArray(dashboard?.recentActivity)) {
          for (const row of dashboard.recentActivity) {
            timeline.push({
              id: `activity-${row.id || Math.random()}`,
              date: row.date || new Date().toISOString(),
              type: row.type === 'mood' ? 'mood' : 'system',
              title: String(row.title || 'Activity update'),
              description: row.description ? String(row.description) : undefined,
              status: 'completed',
            });
          }
        }

        const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : Array.isArray(sessionsRaw?.items) ? sessionsRaw.items : [];
        for (const row of sessions.slice(0, 15)) {
          const rawStatus = String(row?.status || '').toLowerCase();
          timeline.push({
            id: `session-${row?.id || Math.random()}`,
            date: row?.date || row?.scheduledAt || row?.dateTime || new Date().toISOString(),
            type: 'session',
            title: rawStatus === 'completed' ? 'Therapy session completed' : 'Therapy session scheduled',
            description: row?.provider?.name ? `With ${row.provider.name}` : row?.therapistName,
            status: rawStatus === 'completed' ? 'completed' : 'scheduled',
          });
        }

        const reports = Array.isArray(reportsRaw) ? reportsRaw : [];
        for (const row of reports.slice(0, 10)) {
          timeline.push({
            id: `report-${row?.id || Math.random()}`,
            date: row?.createdAt || new Date().toISOString(),
            type: 'report',
            title: String(row?.title || row?.type || 'Clinical report available'),
            description: row?.summary ? String(row.summary) : undefined,
            status: 'completed',
          });
        }

        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(timeline);
      } catch (e: any) {
        setError(e?.message || 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const key = new Date(item.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm">
        <h1 className="font-serif text-3xl font-light md:text-4xl">Patient Timeline</h1>
        <p className="mt-2 text-sm text-charcoal/70">A chronological view of your therapy, assessments, and milestones.</p>
      </section>

      {loading && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-6 text-sm text-charcoal/60">
          Loading timeline...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && grouped.length === 0 && (
        <div className="rounded-xl border border-calm-sage/15 bg-white/90 p-6 text-sm text-charcoal/60">
          No timeline events yet. Complete an assessment or book a session to start building your timeline.
        </div>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(([day, rows]) => (
            <section key={day} className="rounded-xl border border-calm-sage/15 bg-white/90 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-charcoal/60">{day}</h2>
              <div className="mt-4 space-y-4">
                {rows.map((row) => {
                  const Icon = typeIcon(row.type);
                  return (
                    <div key={row.id} className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-calm-sage/10 text-calm-sage">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 rounded-lg border border-calm-sage/10 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-charcoal">{row.title}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                            {row.status || 'pending'}
                          </span>
                        </div>
                        {row.description ? <p className="mt-1 text-xs text-charcoal/70">{row.description}</p> : null}
                        <p className="mt-2 flex items-center gap-1 text-xs text-charcoal/50">
                          <Clock3 className="h-3 w-3" />
                          {new Date(row.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="pt-2 text-calm-sage/50">
                        {row.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
