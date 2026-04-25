import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { psychologistApi } from '../../api/psychologist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistEmptyState,
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

export default function PsychologistPatientsPage() {
  const navigate = useNavigate();
  const { setSelectedPatientId } = useProviderDashboardContext();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await psychologistApi.getPatients({ search: search.trim() || undefined });
      const mapped = (res.items || []).map((p: any) => ({
        id: p.patientProfileId,
        name: p.patientName,
        age: p.age,
        caseId: p.patientProfileId,
        assignedAt: p.assignedAt,
        status: 'Assigned',
        therapist: '-',
        lastEvaluation: null,
      }));
      setRows(status ? mapped.filter((r: any) => String(r.status) === status) : mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load patients';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, [status]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPatients();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <TherapistPageShell title="Assigned Patients" subtitle="Manage patients assigned to you, start evaluations, and review status.">
      <TherapistCard className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-surface-card px-3 py-2">
            <Search className="h-4 w-4 text-ink-500" />
            <input
              placeholder="Search patients..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full border-0 bg-transparent p-0 text-sm text-ink-800 placeholder:text-ink-500 focus:ring-0"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-ink-100 bg-surface-card px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
          >
            <option value="">All Status</option>
            <option value="Assigned">Assigned</option>
          </select>
        </div>
      </TherapistCard>

      {loading ? (
        <TherapistLoadingState title="Loading patients" description="Fetching your assigned patient list." />
      ) : error ? (
        <TherapistErrorState title="Could not load patients" description={error} onRetry={() => void loadPatients()} />
      ) : rows.length === 0 ? (
        <TherapistEmptyState title="No patients found" description="Try changing search or status filters." />
      ) : (
        <TherapistCard className="overflow-hidden">
          <TherapistTable
            columns={[
              { key: 'name', header: 'Patient Name', render: (row) => <span className="font-semibold">{row.name}</span> },
              { key: 'age', header: 'Age', render: (row) => row.age },
              { key: 'caseId', header: 'Case ID', render: (row) => row.caseId },
              { key: 'assignedAt', header: 'Assigned Date', render: (row) => (row.assignedAt ? new Date(row.assignedAt).toLocaleDateString() : '-') },
              { key: 'status', header: 'Current Status', render: (row) => <TherapistBadge label={row.status} variant="sage" /> },
              { key: 'therapist', header: 'Therapist Assigned', render: (row) => row.therapist },
              { key: 'lastEvaluation', header: 'Last Evaluation', render: (row) => (row.lastEvaluation ? new Date(row.lastEvaluation).toLocaleString() : '-') },
              {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (row) => (
                  <div className="flex justify-end gap-2">
                    <TherapistButton
                      variant="secondary"
                      className="min-h-[34px] px-3 py-1 text-xs"
                      onClick={() => {
                        setSelectedPatientId(String(row.id));
                        navigate('/psychologist/patients');
                      }}
                    >
                      View Patient
                    </TherapistButton>
                    <TherapistButton
                      variant="primary"
                      className="min-h-[34px] px-3 py-1 text-xs"
                      onClick={() => {
                        setSelectedPatientId(String(row.id));
                        navigate(`/psychologist/assessments?patientId=${encodeURIComponent(row.id)}`);
                      }}
                    >
                      Start Evaluation
                    </TherapistButton>
                  </div>
                ),
              },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
          />
        </TherapistCard>
      )}
    </TherapistPageShell>
  );
}
