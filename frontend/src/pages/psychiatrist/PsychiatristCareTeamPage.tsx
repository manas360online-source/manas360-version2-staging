import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychiatristCareTeamPage() {
  return (
    <TherapistPageShell
      title="Care Team"
      subtitle="Collaborative treatment context shared across psychiatrist, therapist, and coach roles."
    >
      <TherapistCard className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-800">Care Coordination</h3>
        <p className="mt-2 text-sm text-ink-600">
          Psychiatrist, therapist, and coach collaboration view is available here. Therapist notes and wellness plans remain read-only for psychiatrist.
        </p>
      </TherapistCard>
    </TherapistPageShell>
  );
}
