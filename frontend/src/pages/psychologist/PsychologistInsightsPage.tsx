import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychologistInsightsPage() {
  return (
    <TherapistPageShell title="Insights" subtitle="Personal wellbeing insights generated from your activity.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TherapistCard className="p-4"><h3 className="font-semibold">Trend</h3><p className="text-sm text-ink-500 mt-1">Mood improving over last 2 weeks.</p></TherapistCard>
        <TherapistCard className="p-4"><h3 className="font-semibold">Recommendation</h3><p className="text-sm text-ink-500 mt-1">Continue breathing and journaling practice.</p></TherapistCard>
      </div>
    </TherapistPageShell>
  );
}
