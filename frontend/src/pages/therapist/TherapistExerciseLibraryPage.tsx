import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

const exercises = [
  { id: 'e1', title: '5-Minute Grounding Breath', category: 'Anxiety', duration: '5 min' },
  { id: 'e2', title: 'Thought Reframing Worksheet', category: 'CBT', duration: '10 min' },
  { id: 'e3', title: 'Body Scan Relaxation', category: 'Stress', duration: '12 min' },
];

export default function TherapistExerciseLibraryPage() {
  return (
    <TherapistPageShell title="Exercise Library" subtitle="Assign guided exercises for patient progress between sessions.">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exercises.map((exercise) => (
          <TherapistCard key={exercise.id} className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-500">{exercise.category}</p>
            <h3 className="mt-2 font-display text-lg font-bold text-ink-800">{exercise.title}</h3>
            <p className="mt-1 text-sm text-ink-500">Duration: {exercise.duration}</p>
            <div className="mt-4">
              <TherapistButton variant="soft" className="w-full">Assign Exercise</TherapistButton>
            </div>
          </TherapistCard>
        ))}
      </section>
    </TherapistPageShell>
  );
}
