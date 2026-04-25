import { useEffect, useMemo, useState } from 'react';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistEmptyState, TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistResearchInsightsPage() {
  const [papers, setPapers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [assessments, reports] = await Promise.all([psychologistApi.getAssessments(), psychologistApi.getReports()]);
        const generated = [
          `Assessment outcome patterns from ${assessments.items?.length || 0} evaluations`,
          `Clinical report trends from ${reports.items?.length || 0} diagnostic reports`,
          'Evidence-backed suicide-risk triage with multi-signal monitoring',
        ];
        setPapers(generated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load research insights');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => papers.filter((p) => p.toLowerCase().includes(query.toLowerCase())), [papers, query]);

  return (
    <TherapistPageShell title="Research Insights" subtitle="Latest clinical evidence and treatment outcome studies.">
      {loading ? <TherapistLoadingState title="Loading insights" description="Preparing clinical evidence summaries." /> : null}
      {error ? <TherapistErrorState title="Could not load insights" description={error} onRetry={() => window.location.reload()} /> : null}
      <TherapistCard className="p-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search insights..." className="mb-3 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm" />
        {filtered.length === 0 ? <TherapistEmptyState title="No insights found" description="No insight matches your search." /> : null}
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p} className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700">{p}</li>
          ))}
        </ul>
      </TherapistCard>
    </TherapistPageShell>
  );
}
