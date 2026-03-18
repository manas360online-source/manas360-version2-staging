import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

export default function PsychologistMeditationPage() {
  return (
    <TherapistPageShell title="Meditation" subtitle="Guided recovery and focus sessions.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['5-min Breathing', 'Body Scan 10-min', 'Stress Release 15-min'].map((x) => (
          <TherapistCard key={x} className="p-4">
            <p className="font-semibold text-ink-800">{x}</p>
            <TherapistButton className="mt-3" variant="primary">Play</TherapistButton>
          </TherapistCard>
        ))}
      </div>
    </TherapistPageShell>
  );
}
