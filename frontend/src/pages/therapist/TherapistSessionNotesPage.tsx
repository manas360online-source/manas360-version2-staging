import { FileText } from 'lucide-react';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';
import { notesTable } from './dashboardData';

export default function TherapistSessionNotesPage() {
  return (
    <TherapistPageShell title="Session Notes" subtitle="Create and manage clinical session documentation.">
      <TherapistCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <p className="text-sm font-semibold text-ink-800">Pending and submitted notes</p>
          <TherapistButton className="w-full sm:w-auto">
            <FileText className="h-4 w-4" />
            Write Note
          </TherapistButton>
        </div>
        <TherapistTable
          columns={[
            { key: 'patient', header: 'Patient', render: (row) => <span className="font-semibold">{row.patient}</span> },
            { key: 'session', header: 'Session', render: (row) => row.session },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <TherapistBadge label={row.status} variant={row.status === 'Submitted' ? 'success' : 'warning'} />,
            },
            {
              key: 'action',
              header: 'Action',
              render: (row) => (
                <TherapistButton variant="secondary" className="min-h-[34px] px-3 py-1 text-xs">
                  {row.status === 'Submitted' ? 'View Note' : 'Write Note'}
                </TherapistButton>
              ),
            },
          ]}
          rows={notesTable}
          rowKey={(row) => row.id}
        />
      </TherapistCard>
    </TherapistPageShell>
  );
}
