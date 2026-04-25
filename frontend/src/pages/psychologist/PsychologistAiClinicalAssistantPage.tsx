import { useMemo, useState } from 'react';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { psychologistApi } from '../../api/psychologist.api';
import { TherapistErrorState } from '../../components/therapist/dashboard/TherapistDataState';

export default function PsychologistAiClinicalAssistantPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');

  const canAnalyze = useMemo(() => prompt.trim().length > 0 && !loading, [prompt, loading]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assessments, reports] = await Promise.all([psychologistApi.getAssessments(), psychologistApi.getReports()]);
      const assessmentCount = assessments.items?.length || 0;
      const reportCount = reports.items?.length || 0;
      const draft = [
        `Clinical prompt received: ${prompt.trim()}`,
        `Available context: ${assessmentCount} assessments and ${reportCount} reports.` ,
        'Suggested next step: review high-risk trends and draft a focused intervention plan.',
      ].join('\n');
      setResult(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze clinical prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TherapistPageShell title="AI Clinical Assistant" subtitle="Interpret assessments, draft reports, and suggest treatment options.">
      <TherapistCard className="p-4">
        <h3 className="font-semibold text-ink-800">Anytime Buddy Clinical Co-Pilot</h3>
        <p className="text-sm text-ink-500 mt-1">Use AI to summarize assessment outcomes and generate draft clinical notes.</p>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-3 w-full rounded-lg border border-ink-100 p-3 text-sm" rows={6} placeholder="Ask: Summarize PHQ-9 and GAD-7 trends for patient Rahul..." />
        <div className="mt-3 flex gap-2">
          <TherapistButton variant="primary" onClick={handleAnalyze} disabled={!canAnalyze}>{loading ? 'Analyzing...' : 'Analyze'}</TherapistButton>
          <TherapistButton variant="secondary" onClick={handleAnalyze} disabled={!canAnalyze}>Generate Report Draft</TherapistButton>
        </div>
        {error ? <div className="mt-3"><TherapistErrorState title="Assistant failed" description={error} /></div> : null}
        {result ? <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-ink-100 bg-ink-25 p-3 text-xs text-ink-700">{result}</pre> : null}
      </TherapistCard>
    </TherapistPageShell>
  );
}
