import { useEffect, useMemo, useState } from 'react';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistEmptyState, TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';

const tests = [
  ['MoCA', 'Cognitive impairment screening'],
  ['Memory Test', 'Short-term and working memory'],
  ['Attention Test', 'Focus and sustained attention'],
  ['Executive Function', 'Planning and task switching'],
];

export default function PsychologistCognitiveTestsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await psychologistApi.getTests();
        setItems(res.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tests');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const merged = useMemo(() => {
    const fromApi = items.map((i) => ({ title: i.testType || i.assessment_type || 'General Test', desc: 'Clinical test result available.' }));
    const all = [...tests.map(([title, desc]) => ({ title, desc })), ...fromApi];
    return all.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));
  }, [items, query]);

  return (
    <TherapistPageShell title="Cognitive Tests" subtitle="Run and review diagnostic cognitive evaluations.">
      <div className="mb-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests..." className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm" />
      </div>
      {loading ? <TherapistLoadingState title="Loading tests" description="Fetching cognitive test data." /> : null}
      {error ? <TherapistErrorState title="Could not load tests" description={error} onRetry={() => window.location.reload()} /> : null}
      {!loading && !error && merged.length === 0 ? <TherapistEmptyState title="No tests found" description="Try a different search keyword." /> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {merged.map(({ title, desc }) => (
          <TherapistCard key={title} className="p-4">
            <h3 className="font-semibold text-ink-800">{title}</h3>
            <p className="mt-1 text-sm text-ink-500">{desc}</p>
            <div className="mt-3 flex gap-2">
              <TherapistButton variant="primary">Start</TherapistButton>
              <TherapistButton variant="secondary">View Results</TherapistButton>
            </div>
          </TherapistCard>
        ))}
      </div>
    </TherapistPageShell>
  );
}
