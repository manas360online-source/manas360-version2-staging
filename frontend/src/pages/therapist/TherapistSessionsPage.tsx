import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { therapistApi } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistEmptyState,
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';

type TherapistSessionRow = {
  sessionId: string;
  bookingReferenceId: string;
  dateTime: string;
  status: string;
  timing: 'past' | 'upcoming';
  patient?: {
    initials?: string | null;
  };
};

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function TherapistSessionsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [rows, setRows] = useState<TherapistSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getSessions({ page: 1, limit: 50 });
      setRows((res?.items || []) as TherapistSessionRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const filteredRows = rows.filter((row) => row.timing === tab);
  const statusLabel = (status: string) => {
    if (status === 'completed') return 'Completed';
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'pending') return 'Pending';
    return status;
  };

  return (
    <TherapistPageShell title="Sessions" subtitle="Track upcoming and past sessions in one place.">
      <TherapistCard className="p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-ink-100 bg-surface-bg p-4">
            <p className="font-display text-sm font-bold text-ink-800">Calendar</p>
            <p className="mt-1 text-xs text-ink-500">Calendar view placeholder</p>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-ink-500">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <span key={`${day}-${index}`} className="rounded-md bg-surface-card px-1 py-2">{day}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 inline-flex rounded-lg bg-ink-100 p-0.5">
              <button
                onClick={() => setTab('upcoming')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${tab === 'upcoming' ? 'bg-white text-sage-500 shadow-soft-xs' : 'text-ink-500'}`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setTab('past')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${tab === 'past' ? 'bg-white text-sage-500 shadow-soft-xs' : 'text-ink-500'}`}
              >
                Past
              </button>
            </div>

            {loading ? (
              <TherapistLoadingState title="Loading sessions" description="Fetching your upcoming and past sessions." />
            ) : error ? (
              <TherapistErrorState title="Could not load sessions" description={error} onRetry={() => void loadSessions()} />
            ) : filteredRows.length === 0 ? (
              <TherapistEmptyState title="No sessions found" description={`No ${tab} sessions are available.`} />
            ) : (
              <TherapistCard className="overflow-hidden">
                <TherapistTable
                  columns={[
                    { key: 'time', header: 'Time', render: (row) => formatDateTime(row.dateTime) },
                    {
                      key: 'patient',
                      header: 'Patient',
                      render: (row) => (
                        <span className="font-semibold">{row.patient?.initials ? `Patient ${row.patient.initials}` : 'Patient'}</span>
                      ),
                    },
                    { key: 'type', header: 'Type', render: () => 'Therapy Session' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <TherapistBadge
                          label={statusLabel(row.status)}
                          variant={row.status === 'completed' ? 'success' : row.status === 'pending' ? 'warning' : 'sage'}
                        />
                      ),
                    },
                    {
                      key: 'action',
                      header: '',
                      render: (row) =>
                        row.timing === 'upcoming' ? (
                          <button
                            onClick={() => navigate(`/therapist/sessions/${row.sessionId}/live`)}
                            className="rounded-lg bg-sage-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-600"
                          >
                            Start Session
                          </button>
                        ) : null,
                    },
                  ]}
                  rows={filteredRows}
                  rowKey={(row) => row.sessionId}
                />
              </TherapistCard>
            )}
          </div>
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
