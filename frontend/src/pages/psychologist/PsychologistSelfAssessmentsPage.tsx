import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

const items = ['PHQ-9', 'GAD-7'];

export default function PsychologistSelfAssessmentsPage() {
  return (
    <TherapistPageShell title="Self Assessments" subtitle="Take personal assessments in Self Mode.">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((it) => (
          <TherapistCard key={it} className="flex items-center justify-between p-3">
            <div>
              <p className="font-semibold text-ink-800">{it}</p>
              <p className="text-xs text-ink-500">Personal assessment</p>
            </div>
            <TherapistButton variant="primary">Start</TherapistButton>
          </TherapistCard>
        ))}
      </div>
    </TherapistPageShell>
  );
}
