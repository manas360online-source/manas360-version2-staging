import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { therapistApi, type MoodHistoryResponse, type MoodPredictionResponse, type TherapistPatientItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import { TherapistErrorState, TherapistLoadingState } from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

type MoodPoint = { label: string; value: number; note: string };

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });

export default function TherapistMoodTrackingPage() {
  const { dashboardMode, selectedPatientId } = useProviderDashboardContext();
  const [patients, setPatients] = useState<TherapistPatientItem[]>([]);
  const [history, setHistory] = useState<MoodHistoryResponse | null>(null);
  const [prediction, setPrediction] = useState<MoodPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const pRes = await therapistApi.getPatients();
      setPatients(pRes.items || []);

      if (!selectedPatientId) {
        setHistory(null);
        setPrediction(null);
        return;
      }

      const [h, pred] = await Promise.all([
        therapistApi.getPatientMoodHistory(selectedPatientId),
        therapistApi.getPatientMoodPrediction(selectedPatientId),
      ]);
      setHistory(h);
      setPrediction(pred);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mood tracking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((item) => String(item.id) === String(selectedPatientId)) || null,
    [patients, selectedPatientId],
  );

  const timeline = useMemo<MoodPoint[]>(() => {
    const rows: Array<{ at: string; value: number }> = [];
    for (const item of history?.mood_logs || []) {
      const at = String(item.loggedAt || item.createdAt || '');
      const value = Number(item.moodValue || 0);
      if (at && value > 0) rows.push({ at, value });
    }
    for (const item of history?.legacy_mood_entries || []) {
      const at = String(item.date || item.createdAt || '');
      const value = Number(item.moodScore || 0);
      if (at && value > 0) rows.push({ at, value });
    }

    return rows
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .slice(-10)
      .map((row) => ({
        label: formatDate(row.at),
        value: row.value,
        note: row.value <= 4 ? 'Low mood reported' : row.value <= 7 ? 'Stable mood' : 'Positive mood',
      }));
  }, [history]);

  const alerts = useMemo(() => {
    if (!timeline.length) return [] as string[];
    const latest = timeline[timeline.length - 1].value;
    const prev = timeline.length > 1 ? timeline[timeline.length - 2].value : latest;
    const rows: string[] = [];
    if (latest <= 4) rows.push('Mood alert: patient reports low mood in latest entry.');
    if (latest - prev >= 2) rows.push('Mood improvement detected over the latest entry.');
    if (prev - latest >= 2) rows.push('Mood decline detected compared to previous entry.');
    if (prediction?.deteriorationAlert) rows.push('Prediction model indicates deterioration risk in coming days.');
    return rows;
  }, [timeline, prediction]);

  return (
    <TherapistPageShell title="Mood Tracking" subtitle="Track patient mood timeline, trends, notes, and risk alerts.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="Mood Tracking Available in Professional Mode"
          description="Mood monitoring is part of patient treatment workflows and is available only in Professional Mode."
        />
      ) : null}

      {dashboardMode === 'professional' ? (
        loading ? (
          <TherapistLoadingState title="Loading mood history" description="Fetching mood timeline and prediction insights." />
        ) : error ? (
          <TherapistErrorState title="Could not load mood tracking" description={error} onRetry={() => void load()} />
        ) : !selectedPatient ? (
          <TherapistCard className="p-5">
            <p className="text-sm text-ink-600">Select a patient from the top bar to view mood trend chart, timeline, and alerts.</p>
          </TherapistCard>
        ) : (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <TherapistCard className="p-5 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink-800">Mood Trend Chart · {selectedPatient.name}</h3>
                <TherapistBadge label={prediction?.trendDirection || 'STABLE'} variant="sage" />
              </div>
              {timeline.length === 0 ? (
                <p className="text-sm text-ink-500">No mood entries available for this patient.</p>
              ) : (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {timeline.map((point, index) => (
                    <div key={`${point.label}-${index}`} className="rounded-lg border border-ink-100 p-2 text-center">
                      <div className="mx-auto mb-1 flex h-16 w-5 items-end rounded bg-ink-100">
                        <span
                          className={`w-full rounded ${point.value <= 4 ? 'bg-red-400' : point.value <= 7 ? 'bg-amber-400' : 'bg-sage-500'}`}
                          style={{ height: `${Math.max(8, Math.min(100, point.value * 10))}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-ink-500">{point.label}</p>
                      <p className="text-xs font-semibold text-ink-800">{point.value.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              )}
            </TherapistCard>

            <TherapistCard className="p-5">
              <h3 className="mb-3 font-display text-base font-bold text-ink-800">Mood Alerts</h3>
              <div className="space-y-2">
                {alerts.length > 0 ? (
                  alerts.map((item, index) => (
                    <p key={`${item}-${index}`} className="flex items-start gap-2 rounded-lg bg-surface-bg px-3 py-2 text-xs text-ink-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-clay-500" />
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-ink-500">No critical mood alerts right now.</p>
                )}
              </div>
            </TherapistCard>

            <TherapistCard className="p-5 xl:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink-800">Mood Timeline and Notes</h3>
                <span className="inline-flex items-center gap-1 text-xs text-ink-500"><TrendingUp className="h-3.5 w-3.5" />Last 10 entries</span>
              </div>
              <div className="space-y-2">
                {timeline.map((point, index) => (
                  <div key={`timeline-${point.label}-${index}`} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                    <span className="text-sm font-medium text-ink-800">{point.label}</span>
                    <span className="text-xs text-ink-600">Mood {point.value.toFixed(1)} · {point.note}</span>
                  </div>
                ))}
                {timeline.length === 0 ? <p className="text-sm text-ink-500">No timeline entries yet.</p> : null}
              </div>
            </TherapistCard>
          </section>
        )
      ) : null}
    </TherapistPageShell>
  );
}
