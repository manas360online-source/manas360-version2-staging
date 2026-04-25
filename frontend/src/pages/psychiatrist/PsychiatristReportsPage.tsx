import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychiatristReportsPage() {
  return (
    <TherapistPageShell
      title="Reports"
      subtitle="Practice analytics, prescription trends, and patient outcome reporting."
    >
      <TherapistCard className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-800">Practice Reports</h3>
        <p className="mt-2 text-sm text-ink-600">
          Practice analytics, prescription trends, and patient outcome reporting.
        </p>
      </TherapistCard>
    </TherapistPageShell>
  );
}
