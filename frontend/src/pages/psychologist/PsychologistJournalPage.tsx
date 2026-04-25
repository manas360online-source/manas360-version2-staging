import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';

export default function PsychologistJournalPage() {
  return (
    <TherapistPageShell title="Journal" subtitle="Capture daily reflections, triggers, and emotional insights.">
      <TherapistCard className="p-4">
        <textarea className="w-full rounded-lg border border-ink-100 p-3 text-sm" rows={8} placeholder="Write your reflection for today..." />
        <div className="mt-3"><TherapistButton variant="primary">Save Entry</TherapistButton></div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
