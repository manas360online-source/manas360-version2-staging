import { useEffect, useMemo, useState } from 'react';
import { FileText, History, Plus, Save, Sparkles, X } from 'lucide-react';
import { therapistApi, type AiClinicalSummary, type TherapistSessionNoteItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistEmptyState,
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistModeGate from '../../components/therapist/dashboard/TherapistModeGate';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';

type SessionNoteStatus = 'draft' | 'submitted';

type SessionNoteRecord = {
  id: string;
  sessionId: string;
  patientName: string;
  sessionDate: string;
  sessionType: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  phq9: string;
  gad7: string;
  assignedExercise: string;
  nextSessionDate: string;
  status: SessionNoteStatus;
  updatedAt: string;
  history: Array<{ at: string; event: string }>;
};

type DraftOverlayState = {
  visible: boolean;
  draft: AiClinicalSummary | null;
};

const deriveMoodInsight = (summary: AiClinicalSummary | null): { text: string; toneClass: string } | null => {
  if (!summary) return null;

  const primaryState = String(
    summary.moodSentiment?.primaryEmotionalState || summary.moodAnalysis?.emotionalTone || 'Guarded',
  ).trim();

  const anxietyLevel = Number(summary.moodSentiment?.anxietyLevelScore || 0);
  const sentimentPercent = Math.max(10, Math.min(95, anxietyLevel > 0 ? anxietyLevel * 10 : 60));
  const normalized = primaryState.toLowerCase();

  if (normalized.includes('anx')) {
    return { text: `Sentiment: ${sentimentPercent}% Anxious`, toneClass: 'bg-amber-100 text-amber-700 border-amber-200' };
  }

  if (normalized.includes('depress') || normalized.includes('low')) {
    return { text: `Sentiment: ${sentimentPercent}% Low Mood`, toneClass: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
  }

  if (normalized.includes('distress') || normalized.includes('guard')) {
    return { text: `Sentiment: ${sentimentPercent}% Guarded`, toneClass: 'bg-rose-100 text-rose-700 border-rose-200' };
  }

  return { text: `Sentiment: ${sentimentPercent}% ${primaryState}`, toneClass: 'bg-sky-100 text-sky-700 border-sky-200' };
};

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const buildFromSession = (row: TherapistSessionNoteItem): SessionNoteRecord => ({
  id: row.id,
  sessionId: row.sessionId,
  patientName: row.patientName,
  sessionDate: row.sessionAt,
  sessionType: row.sessionType || 'Therapy Session',
  subjective: row.subjective || '',
  objective: row.objective || '',
  assessment: row.assessment || '',
  plan: row.plan || '',
  phq9: row.phq9 || '',
  gad7: row.gad7 || '',
  assignedExercise: row.assignedExercise || '',
  nextSessionDate: row.nextSessionDate || '',
  status: row.status === 'submitted' ? 'submitted' : 'draft',
  updatedAt: row.noteUpdatedAt || new Date().toISOString(),
  history: Array.isArray(row.history) ? row.history : [],
});

export default function TherapistSessionNotesPage() {
  const { dashboardMode } = useProviderDashboardContext();

  const [apiRows, setApiRows] = useState<TherapistSessionNoteItem[]>([]);
  const [noteRows, setNoteRows] = useState<SessionNoteRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAiDraft, setGeneratingAiDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftOverlay, setDraftOverlay] = useState<DraftOverlayState>({ visible: false, draft: null });
  const [aiInsights, setAiInsights] = useState<AiClinicalSummary | null>(null);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const [apiRes] = await Promise.all([therapistApi.getStructuredSessionNotes()]);
      const merged = (apiRes.items || []).map((item) => buildFromSession(item));
      setApiRows(apiRes.items || []);
      setNoteRows(merged);

      if (!selectedId && merged.length > 0) {
        setSelectedId(merged[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session notes';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const selected = useMemo(() => noteRows.find((row) => row.id === selectedId) || null, [noteRows, selectedId]);
  const aiMoodInsight = useMemo(() => deriveMoodInsight(aiInsights), [aiInsights]);

  useEffect(() => {
    setDraftOverlay({ visible: false, draft: null });
    setAiInsights(null);
  }, [selectedId]);

  const updateSelected = (patch: Partial<SessionNoteRecord>) => {
    setNoteRows((prev) =>
      prev.map((row) => (row.id === selectedId ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row)),
    );
  };

  const saveNote = async (status: SessionNoteStatus) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated: SessionNoteRecord[] = noteRows.map((row) => {
        if (row.id !== selected.id) return row;
        return {
          ...row,
          status,
          updatedAt: new Date().toISOString(),
          history: [
            ...row.history,
            {
              at: new Date().toISOString(),
              event: status === 'submitted' ? 'Submitted SOAP note' : 'Saved draft',
            },
          ],
        };
      });

      const selectedAfterUpdate = updated.find((row) => row.id === selected.id);
      if (!selectedAfterUpdate) {
        throw new Error('Failed to save selected note');
      }

      await therapistApi.upsertStructuredSessionNote(selectedAfterUpdate.sessionId, {
        sessionType: selectedAfterUpdate.sessionType,
        subjective: selectedAfterUpdate.subjective,
        objective: selectedAfterUpdate.objective,
        assessment: selectedAfterUpdate.assessment,
        plan: selectedAfterUpdate.plan,
        phq9: selectedAfterUpdate.phq9,
        gad7: selectedAfterUpdate.gad7,
        assignedExercise: selectedAfterUpdate.assignedExercise,
        nextSessionDate: selectedAfterUpdate.nextSessionDate || null,
        status,
        history: selectedAfterUpdate.history,
      });

      setNoteRows(updated);
      setSuccess(status === 'submitted' ? 'SOAP note submitted successfully.' : 'Draft saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const generateAiDraft = async () => {
    if (!selected) return;

    setGeneratingAiDraft(true);
    setError(null);
    setSuccess(null);

    try {
      const aiDraft = await therapistApi.generateAiSessionNote(selected.sessionId);
      setDraftOverlay({ visible: true, draft: aiDraft });
      setAiInsights(aiDraft);
      setSuccess('AI draft generated. Review and apply to note when ready.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI draft';
      setError(message);
    } finally {
      setGeneratingAiDraft(false);
    }
  };

  const applyDraftToNote = () => {
    if (!draftOverlay.draft || !selected) return;

    updateSelected({
      subjective: draftOverlay.draft.soapNote.subjective || selected.subjective,
      objective: draftOverlay.draft.soapNote.objective || selected.objective,
      assessment: draftOverlay.draft.soapNote.assessment || selected.assessment,
      plan: draftOverlay.draft.soapNote.plan || selected.plan,
      history: [
        ...selected.history,
        {
          at: new Date().toISOString(),
          event: 'Applied AI draft to SOAP note',
        },
      ],
    });

    setDraftOverlay((prev) => ({ ...prev, visible: false }));
    setSuccess('AI draft applied to editor. Save or submit when ready.');
  };

  return (
    <TherapistPageShell title="Session Notes" subtitle="Create and manage SOAP documentation with assessment and treatment planning.">
      {dashboardMode !== 'professional' ? (
        <TherapistModeGate
          requiredMode="professional"
          title="Session Notes Available in Professional Mode"
          description="Clinical documentation is part of patient treatment workflows and is only available in Professional Mode."
        />
      ) : null}

      {dashboardMode === 'professional' ? (
        loading ? (
          <TherapistLoadingState title="Loading notes" description="Fetching submitted and pending notes." />
        ) : error ? (
          <TherapistErrorState title="Could not load notes" description={error} onRetry={() => void loadNotes()} />
        ) : noteRows.length === 0 ? (
          <TherapistEmptyState title="No notes found" description="Completed sessions without notes will appear here." />
        ) : (
          <>
            {success ? (
              <TherapistCard className="border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">{success}</p>
              </TherapistCard>
            ) : null}

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1fr]">
              <TherapistCard className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                  <p className="text-sm font-semibold text-ink-800">Session Notes Queue</p>
                  <TherapistButton
                    variant="secondary"
                    className="min-h-[34px] px-3 py-1 text-xs"
                    onClick={() => {
                      if (apiRows.length > 0) setSelectedId(apiRows[0].id);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Note
                  </TherapistButton>
                </div>
                <TherapistTable
                  columns={[
                    {
                      key: 'patient',
                      header: 'Patient',
                      render: (row) => <span className="font-semibold">{row.patientName}</span>,
                    },
                    {
                      key: 'session',
                      header: 'Session',
                      render: (row) => formatDateTime(row.sessionDate),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <TherapistBadge
                          label={row.status === 'submitted' ? 'Submitted' : 'Draft'}
                          variant={row.status === 'submitted' ? 'success' : 'warning'}
                        />
                      ),
                    },
                    {
                      key: 'action',
                      header: 'Action',
                      render: (row) => (
                        <TherapistButton
                          variant={selectedId === row.id ? 'soft' : 'secondary'}
                          className="min-h-[34px] px-3 py-1 text-xs"
                          onClick={() => setSelectedId(row.id)}
                        >
                          {selectedId === row.id ? 'Editing' : 'Open'}
                        </TherapistButton>
                      ),
                    },
                  ]}
                  rows={noteRows}
                  rowKey={(row) => row.id}
                />
              </TherapistCard>

              <TherapistCard className="p-5">
                {selected ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-bold text-ink-800">SOAP Note Editor</h3>
                        <p className="text-xs text-ink-500">{selected.patientName} · {formatDateTime(selected.sessionDate)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <TherapistBadge label={selected.status === 'submitted' ? 'Submitted' : 'Draft'} variant={selected.status === 'submitted' ? 'success' : 'warning'} />
                        {aiMoodInsight ? (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${aiMoodInsight.toneClass}`}>
                            Mood Insight: {aiMoodInsight.text}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                      <p className="text-xs text-sky-800">
                        Use AI to generate a draft SOAP note from the saved transcript, then review before applying.
                      </p>
                      <TherapistButton variant="secondary" onClick={() => void generateAiDraft()} disabled={generatingAiDraft}>
                        <Sparkles className="h-4 w-4" />
                        {generatingAiDraft ? 'Generating...' : '🪄 Generate AI Draft'}
                      </TherapistButton>
                    </div>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-sm text-ink-500">
                        Session Type
                        <input
                          value={selected.sessionType}
                          onChange={(event) => updateSelected({ sessionType: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                        />
                      </label>
                      <label className="text-sm text-ink-500">
                        Next Session
                        <input
                          type="datetime-local"
                          value={selected.nextSessionDate}
                          onChange={(event) => updateSelected({ nextSessionDate: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                        />
                      </label>
                        </div>

                        <label className="block text-sm text-ink-500">
                      Subjective
                      <textarea
                        rows={3}
                        value={selected.subjective}
                        onChange={(event) => updateSelected({ subjective: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                        placeholder="Patient-reported concerns, feelings, and symptom narrative."
                      />
                        </label>

                        <label className="block text-sm text-ink-500">
                      Objective
                      <textarea
                        rows={3}
                        value={selected.objective}
                        onChange={(event) => updateSelected({ objective: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                        placeholder="Observed behavior, affect, participation, and measurable findings."
                      />
                        </label>

                        <label className="block text-sm text-ink-500">
                      Assessment
                      <textarea
                        rows={3}
                        value={selected.assessment}
                        onChange={(event) => updateSelected({ assessment: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                        placeholder="Clinical impression, response to intervention, risk level changes."
                      />
                        </label>

                        <label className="block text-sm text-ink-500">
                      Plan
                      <textarea
                        rows={3}
                        value={selected.plan}
                        onChange={(event) => updateSelected({ plan: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                        placeholder="Next intervention plan, goals, and follow-up actions."
                      />
                        </label>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <label className="text-sm text-ink-500">
                            PHQ-9 Score
                            <input
                              value={selected.phq9}
                              onChange={(event) => updateSelected({ phq9: event.target.value })}
                              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                              placeholder="0-27"
                            />
                          </label>
                          <label className="text-sm text-ink-500">
                            GAD-7 Score
                            <input
                              value={selected.gad7}
                              onChange={(event) => updateSelected({ gad7: event.target.value })}
                              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                              placeholder="0-21"
                            />
                          </label>
                          <label className="text-sm text-ink-500">
                            Assign Exercise
                            <input
                              value={selected.assignedExercise}
                              onChange={(event) => updateSelected({ assignedExercise: event.target.value })}
                              className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
                              placeholder="Thought Record, Breathing Practice"
                            />
                          </label>
                        </div>
                      </div>

                      <aside className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-800">Manas AI Insights</p>
                        {aiMoodInsight ? (
                          <div className={`rounded-lg border p-2 text-xs font-semibold ${aiMoodInsight.toneClass}`}>
                            {aiMoodInsight.text}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600">Generate AI draft to view mood insights.</p>
                        )}

                        {aiInsights?.moodSentiment ? (
                          <div className="space-y-1 text-xs text-slate-700">
                            <p><span className="font-semibold">Volatility:</span> {aiInsights.moodSentiment.emotionalVolatilityScore}/10</p>
                            <p><span className="font-semibold">Anxiety:</span> {aiInsights.moodSentiment.anxietyLevelScore}/10</p>
                            <p><span className="font-semibold">Keywords:</span> {(aiInsights.moodSentiment.keywords || []).join(', ') || 'n/a'}</p>
                          </div>
                        ) : null}

                        {Array.isArray(aiInsights?.actionItems) && aiInsights?.actionItems.length > 0 ? (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Action Items</p>
                            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
                              {aiInsights.actionItems.map((item, index) => (
                                <li key={`${item}-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </aside>
                    </div>

                    <div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                        <History className="h-3.5 w-3.5" />
                        Note History
                      </p>
                      <div className="space-y-1 text-xs text-ink-600">
                        {selected.history.length > 0 ? (
                          selected.history.slice().reverse().map((entry, index) => (
                            <p key={`${entry.at}-${index}`}>{formatDateTime(entry.at)} · {entry.event}</p>
                          ))
                        ) : (
                          <p>No history yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <TherapistButton variant="secondary" onClick={() => void saveNote('draft')} disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Draft'}
                      </TherapistButton>
                      <TherapistButton onClick={() => void saveNote('submitted')} disabled={saving}>
                        <FileText className="h-4 w-4" />
                        {saving ? 'Signing...' : 'Sign & Lock'}
                      </TherapistButton>
                    </div>
                    <p className="text-right text-xs text-ink-500">Provider confirmation required: AI suggestions are never finalized until you click Sign & Lock.</p>
                  </div>
                ) : (
                  <TherapistEmptyState title="No note selected" description="Select a note from the queue to open SOAP editor." />
                )}
              </TherapistCard>
            </section>

            {draftOverlay.visible && draftOverlay.draft ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <p className="text-base font-bold text-slate-800">AI Draft Preview</p>
                      <p className="text-xs text-slate-600">Review generated SOAP content before applying it to the note.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftOverlay((prev) => ({ ...prev, visible: false }))}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close AI draft preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4 px-5 py-4 text-sm text-slate-700">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Mood Analysis</p>
                        <p><span className="font-semibold">Tone:</span> {draftOverlay.draft.moodAnalysis.emotionalTone || 'n/a'}</p>
                        <p><span className="font-semibold">Energy:</span> {draftOverlay.draft.moodAnalysis.energyLevel || 'n/a'}</p>
                        <p><span className="font-semibold">Risk Signals:</span> {draftOverlay.draft.moodAnalysis.riskSignals || 'n/a'}</p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">SOAP Draft</p>
                        <p><span className="font-semibold">Subjective:</span> {draftOverlay.draft.soapNote.subjective || 'n/a'}</p>
                        <p><span className="font-semibold">Objective:</span> {draftOverlay.draft.soapNote.objective || 'n/a'}</p>
                        <p><span className="font-semibold">Assessment:</span> {draftOverlay.draft.soapNote.assessment || 'n/a'}</p>
                        <p><span className="font-semibold">Plan:</span> {draftOverlay.draft.soapNote.plan || 'n/a'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <TherapistButton
                      variant="secondary"
                      className="min-h-[34px] px-3 py-1 text-xs"
                      onClick={() => setDraftOverlay((prev) => ({ ...prev, visible: false }))}
                    >
                      Cancel
                    </TherapistButton>
                    <TherapistButton className="min-h-[34px] px-3 py-1 text-xs" onClick={applyDraftToNote}>
                      Apply Draft
                    </TherapistButton>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )
      ) : null}
    </TherapistPageShell>
  );
}
