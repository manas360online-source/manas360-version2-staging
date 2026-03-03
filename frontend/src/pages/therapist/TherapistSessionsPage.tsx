import { useState } from 'react';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';
import { todaySessions } from './dashboardData';

export default function TherapistSessionsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const rows = tab === 'upcoming' ? todaySessions.filter((row) => row.status !== 'Completed') : todaySessions.filter((row) => row.status === 'Completed');

  return (
    <TherapistPageShell title="Sessions" subtitle="Track upcoming and past sessions in one place.">
      <TherapistCard className="p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-ink-100 bg-surface-bg p-4">
            <p className="font-display text-sm font-bold text-ink-800">Calendar</p>
            <p className="mt-1 text-xs text-ink-500">Calendar view placeholder</p>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-ink-500">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                <span key={day} className="rounded-md bg-surface-card px-1 py-2">{day}</span>
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

            <TherapistCard className="overflow-hidden">
              <TherapistTable
                columns={[
                  { key: 'time', header: 'Time', render: (row) => row.time },
                  { key: 'patient', header: 'Patient', render: (row) => <span className="font-semibold">{row.patient}</span> },
                  { key: 'type', header: 'Type', render: (row) => row.type },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <TherapistBadge label={row.status} variant={row.status === 'Completed' ? 'success' : row.status === 'In 30 min' ? 'warning' : 'sage'} />,
                  },
                ]}
                rows={rows}
                rowKey={(row) => row.id}
              />
            </TherapistCard>
          </div>
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
