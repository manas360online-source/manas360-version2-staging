import { Search } from 'lucide-react';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';
import { patientsTable } from './dashboardData';

export default function TherapistPatientsPage() {
  return (
    <TherapistPageShell title="My Patients" subtitle="Monitor patient activity, status, and continuity of care.">
      <TherapistCard className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-surface-card px-3 py-2">
            <Search className="h-4 w-4 text-ink-500" />
            <input
              placeholder="Search patients..."
              className="w-full border-0 bg-transparent p-0 text-sm text-ink-800 placeholder:text-ink-500 focus:ring-0"
            />
          </div>
          <select className="rounded-lg border border-ink-100 bg-surface-card px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0">
            <option>All Status</option>
            <option>Active</option>
            <option>New</option>
            <option>Needs Follow-up</option>
          </select>
        </div>
      </TherapistCard>

      <TherapistCard className="overflow-hidden">
        <TherapistTable
          columns={[
            { key: 'name', header: 'Patient', render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: 'concern', header: 'Primary Concern', render: (row) => row.concern },
            { key: 'sessions', header: 'Sessions', render: (row) => row.sessions },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <TherapistBadge
                  label={row.status}
                  variant={row.status === 'Active' ? 'success' : row.status === 'New' ? 'sage' : 'warning'}
                />
              ),
            },
          ]}
          rows={patientsTable}
          rowKey={(row) => row.id}
        />
      </TherapistCard>
    </TherapistPageShell>
  );
}
