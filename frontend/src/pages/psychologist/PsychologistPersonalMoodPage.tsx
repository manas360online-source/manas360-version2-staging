import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychologistPersonalMoodPage() {
  return (
    <TherapistPageShell title="Personal Mood" subtitle="Track your own mood, stress, sleep, and energy in Self Mode.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TherapistCard className="p-4"><div className="text-xs text-ink-500">Mood</div><div className="text-2xl font-semibold mt-1">7/10</div></TherapistCard>
        <TherapistCard className="p-4"><div className="text-xs text-ink-500">Stress</div><div className="text-2xl font-semibold mt-1">3/10</div></TherapistCard>
        <TherapistCard className="p-4"><div className="text-xs text-ink-500">Sleep</div><div className="text-2xl font-semibold mt-1">7.5h</div></TherapistCard>
        <TherapistCard className="p-4"><div className="text-xs text-ink-500">Energy</div><div className="text-2xl font-semibold mt-1">8/10</div></TherapistCard>
      </div>
    </TherapistPageShell>
  );
}
