import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function TherapistAnalyticsPage() {
  return (
    <TherapistPageShell title="Analytics" subtitle="Track outcomes and engagement trends for your care panel.">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TherapistCard className="p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-500">Avg PHQ-9 Change</p>
          <p className="mt-2 font-display text-3xl font-bold text-sage-500">-5.2</p>
        </TherapistCard>
        <TherapistCard className="p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-500">Session Completion</p>
          <p className="mt-2 font-display text-3xl font-bold text-ink-800">92%</p>
        </TherapistCard>
        <TherapistCard className="p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-500">Adherence</p>
          <p className="mt-2 font-display text-3xl font-bold text-ink-800">81%</p>
        </TherapistCard>
      </section>

      <TherapistCard className="p-5">
        <h3 className="font-display text-base font-bold text-ink-800">Outcome Insights</h3>
        <p className="mt-2 text-sm text-ink-500">
          Patients on structured weekly sessions with between-session exercises show stronger score improvements.
          Continue focus on high-risk follow-up within 24 hours.
        </p>
      </TherapistCard>
    </TherapistPageShell>
  );
}
