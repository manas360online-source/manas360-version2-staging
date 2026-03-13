import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cbtSessionPlayerApi } from '../../api/cbtSessionPlayer.api';
import PlayerHeader from '../../components/session-player/PlayerHeader';
import QuestionRenderer from '../../components/session-player/QuestionRenderer';
import SaveStatusPill from '../../components/session-player/SaveStatusPill';
import StickySessionNav from '../../components/session-player/StickySessionNav';
import { useAutoSave } from '../../hooks/session-player/useAutoSave';
import { sessionPlayerIdb } from '../../hooks/session-player/indexedDb';
import { useNetworkStatus } from '../../hooks/session-player/useNetworkStatus';
import { useOfflineQueue } from '../../hooks/session-player/useOfflineQueue';
import { useSessionPlayerEngine } from '../../hooks/session-player/useSessionPlayerEngine';
import type { SessionDraftSnapshot, SessionOutboxItem } from '../../types/sessionPlayer';

export default function CBTSessionPlayerPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();

  const [templateQuestions, setTemplateQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionStack, setQuestionStack] = useState<string[]>([]);

  const {
    state,
    currentQuestion,
    setCurrentQuestionId,
    setAnswer,
    hydrate,
    getQuestionValidation,
    getPredictedNextQuestionId,
    progress,
  } = useSessionPlayerEngine(templateQuestions);

  const headingFocusRef = useRef<HTMLDivElement>(null);

  const syncOne = useCallback(
    async (item: SessionOutboxItem) => {
      await cbtSessionPlayerApi.respond(
        item.sessionId,
        item.questionId,
        item.responseData?.value ?? null,
        item.timeSpentSeconds,
        item.idempotencyKey,
      );
    },
    [],
  );

  const { enqueue, drain, refreshPendingCount, state: queueState } = useOfflineQueue(sessionId, syncOne, isOnline);

  const hydrateFromServer = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const summary = await cbtSessionPlayerApi.getSessionSummary(sessionId);
      const template = await cbtSessionPlayerApi.getTemplate(String(summary.templateId));
      setTemplateQuestions(template.questions);

      const draft = await sessionPlayerIdb.getDraft(sessionId);
      if (draft) {
        hydrate({
          currentQuestionId: draft.currentQuestionId,
          answers: draft.answers,
          visitedQuestionIds: draft.visitedQuestionIds,
        });
      }

      const serverCurrentQuestion = await cbtSessionPlayerApi.getCurrentQuestion(sessionId);
      if (serverCurrentQuestion) {
        setCurrentQuestionId(serverCurrentQuestion.id);
      } else if (draft?.currentQuestionId) {
        setCurrentQuestionId(draft.currentQuestionId);
      } else {
        const first = template.questions[0]?.id ?? null;
        setCurrentQuestionId(first);
      }

      await refreshPendingCount();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || 'Unable to load session player.');
    } finally {
      setLoading(false);
    }
  }, [hydrate, refreshPendingCount, sessionId, setCurrentQuestionId]);

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  useEffect(() => {
    if (!isOnline) return;
    void drain();
  }, [drain, isOnline]);

  useEffect(() => {
    if (!currentQuestion?.id) return;
    headingFocusRef.current?.focus();
  }, [currentQuestion?.id]);

  const draftSnapshotFactory = useCallback((): SessionDraftSnapshot | null => {
    if (!sessionId) return null;
    return {
      sessionId,
      currentQuestionId: state.currentQuestionId,
      answers: state.answers,
      visitedQuestionIds: state.visitedQuestionIds,
      updatedAt: Date.now(),
    };
  }, [sessionId, state.answers, state.currentQuestionId, state.visitedQuestionIds]);

  const { saveState, saveNow } = useAutoSave<SessionDraftSnapshot>({
    payloadFactory: draftSnapshotFactory,
    isOnline,
    onSave: async (snapshot) => {
      await sessionPlayerIdb.putDraft(snapshot);
    },
  });

  const currentValue = useMemo(
    () => (currentQuestion?.id ? state.answers[currentQuestion.id]?.value ?? null : null),
    [currentQuestion?.id, state.answers],
  );

  const currentValidation = useMemo(() => {
    if (!currentQuestion?.id) return { valid: true as const };
    return getQuestionValidation(currentQuestion.id);
  }, [currentQuestion?.id, getQuestionValidation]);

  const canSkip = Boolean(currentQuestion && !currentQuestion.required);
  const canGoBack = questionStack.length > 0;
  const canProceed = Boolean(currentQuestion) && (currentValidation.valid || canSkip);

  const handleAnswerChange = useCallback(
    (value: any) => {
      if (!currentQuestion?.id) return;
      setAnswer(currentQuestion.id, value);
    },
    [currentQuestion?.id, setAnswer],
  );

  const handleBack = useCallback(() => {
    if (!canGoBack || busy) return;
    const previous = questionStack[questionStack.length - 1];
    setQuestionStack((stack) => stack.slice(0, -1));
    setCurrentQuestionId(previous);
    void saveNow('question-change');
  }, [busy, canGoBack, questionStack, saveNow, setCurrentQuestionId]);

  const queueResponse = useCallback(
    async (questionId: string, value: any) => {
      const outboxItem: SessionOutboxItem = {
        id: crypto.randomUUID(),
        sessionId,
        questionId,
        responseData: { value },
        createdAt: Date.now(),
        retries: 0,
        idempotencyKey: `${sessionId}:${questionId}:${Date.now()}`,
      };
      await enqueue(outboxItem);
    },
    [enqueue, sessionId],
  );

  const handleAdvance = useCallback(
    async (skip: boolean) => {
      if (!currentQuestion || busy) return;

      const questionId = currentQuestion.id;
      const responseValue = skip ? null : currentValue;

      if (!skip && !currentValidation.valid) return;

      setBusy(true);
      setError(null);

      try {
        await saveNow('question-change');

        setQuestionStack((stack) => [...stack, questionId]);

        if (isOnline) {
          const result = await cbtSessionPlayerApi.respond(
            sessionId,
            questionId,
            responseValue,
            undefined,
            `${sessionId}:${questionId}:${Date.now()}`,
          );
          if (result.sessionComplete) {
            await saveNow('question-change');
            toast.success('Exercise submitted. Your therapist will review this soon! ✨');
            navigate(`/patient/sessions/${sessionId}`);
            return;
          }

          const nextId = result.nextQuestionId ? String(result.nextQuestionId) : getPredictedNextQuestionId(questionId);
          setCurrentQuestionId(nextId);
        } else {
          await queueResponse(questionId, responseValue);
          const nextId = getPredictedNextQuestionId(questionId);
          setCurrentQuestionId(nextId);
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.response?.data?.message || 'Unable to continue. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      currentQuestion,
      currentValidation.valid,
      currentValue,
      getPredictedNextQuestionId,
      isOnline,
      navigate,
      queueResponse,
      saveNow,
      sessionId,
      setCurrentQuestionId,
    ],
  );

  const handlePause = useCallback(async () => {
    if (!sessionId || busy) return;
    setBusy(true);
    try {
      await saveNow('question-change');
      if (isOnline) {
        await cbtSessionPlayerApi.updateSessionStatus(sessionId, 'PAUSED');
      }
      navigate(`/patient/sessions/${sessionId}`);
    } finally {
      setBusy(false);
    }
  }, [busy, isOnline, navigate, saveNow, sessionId]);

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-6">Loading session player…</div>;
  }

  if (error && !currentQuestion) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-medium text-rose-700">{error}</p>
        <Link to="/patient/sessions" className="inline-flex min-h-[40px] items-center rounded-full bg-charcoal px-4 text-sm font-medium text-cream">
          Back to Sessions
        </Link>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="space-y-4 rounded-2xl border border-calm-sage/15 bg-white/85 p-6">
        <h1 className="text-2xl font-semibold text-charcoal">Session complete</h1>
        <p className="text-sm text-charcoal/65">You have completed this CBT session.</p>
        <Link to={`/patient/sessions/${sessionId}`} className="inline-flex min-h-[40px] items-center rounded-full bg-charcoal px-4 text-sm font-medium text-cream">
          View Session Summary
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream text-charcoal">
      <PlayerHeader title="CBT Session" progress={progress} offline={!isOnline} />

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <SaveStatusPill state={saveState} />
          <button
            type="button"
            onClick={handlePause}
            className="inline-flex min-h-8 items-center rounded-full border border-calm-sage/25 bg-white px-3 text-xs font-medium text-charcoal/70"
          >
            Pause Session
          </button>
        </div>

        <div ref={headingFocusRef} tabIndex={-1} />
        <QuestionRenderer
          question={currentQuestion}
          value={currentValue}
          onChange={handleAnswerChange}
          error={!currentValidation.valid ? currentValidation.message : undefined}
        />

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {queueState.pendingCount > 0 ? (
          <p className="mt-2 text-xs text-charcoal/60" role="status" aria-live="polite">
            {queueState.pendingCount} answer{queueState.pendingCount > 1 ? 's' : ''} pending sync.
          </p>
        ) : null}
      </main>

      <StickySessionNav
        canGoBack={canGoBack}
        canSkip={canSkip}
        canProceed={canProceed}
        busy={busy || queueState.syncing}
        onBack={handleBack}
        onSkip={() => void handleAdvance(true)}
        onNext={() => void handleAdvance(false)}
      />
    </div>
  );
}
