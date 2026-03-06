import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychiatristMessagesPage() {
  return (
    <TherapistPageShell
      title="Messages"
      subtitle="Coordinated-care communication feed with therapist and coach updates."
    >
      <TherapistCard className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-800">Clinical Communication</h3>
        <p className="mt-2 text-sm text-ink-600">
          Coordinated-care communication feed for therapist and coach notifications.
        </p>
      </TherapistCard>
    </TherapistPageShell>
  );
}
