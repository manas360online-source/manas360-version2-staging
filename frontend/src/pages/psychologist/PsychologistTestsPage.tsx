import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';

const tests = [
  { key: 'cognitive', title: 'Cognitive Test', desc: 'Assess attention and processing speed.' },
  { key: 'personality', title: 'Personality Test', desc: 'Measure personality traits and styles.' },
  { key: 'behavioral', title: 'Behavioral Assessment', desc: 'Evaluate behavioral patterns.' },
  { key: 'memory', title: 'Memory Test', desc: 'Short-term and working memory tasks.' },
];

export default function PsychologistTestsPage() {
  return (
    <TherapistPageShell title="Tests" subtitle="Available psychological tests you can run or assign.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tests.map((t) => (
          <TherapistCard key={t.key} className="p-4">
            <h3 className="font-semibold text-ink-800">{t.title}</h3>
            <p className="mt-2 text-sm text-ink-600">{t.desc}</p>
            <div className="mt-4 flex gap-2">
              <TherapistButton variant="primary">Start Test</TherapistButton>
              <TherapistButton variant="secondary">View Results</TherapistButton>
            </div>
          </TherapistCard>
        ))}
      </div>
    </TherapistPageShell>
  );
}
