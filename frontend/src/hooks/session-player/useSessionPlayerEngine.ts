import { useCallback, useMemo, useReducer } from 'react';
import type {
  SessionAnswer,
  SessionAnswerValue,
  SessionPlayerProgress,
  SessionPlayerQuestion,
} from '../../types/sessionPlayer';

type EngineState = {
  currentQuestionId: string | null;
  answers: Record<string, SessionAnswer>;
  visitedQuestionIds: string[];
};

type EngineAction =
  | { type: 'hydrate'; payload: Partial<EngineState> }
  | { type: 'set-current'; payload: string | null }
  | { type: 'set-answer'; payload: { questionId: string; value: SessionAnswerValue } }
  | { type: 'mark-visited'; payload: string };

const initialState: EngineState = {
  currentQuestionId: null,
  answers: {},
  visitedQuestionIds: [],
};

const upsertVisited = (visited: string[], questionId: string) =>
  visited.includes(questionId) ? visited : [...visited, questionId];

const reducer = (state: EngineState, action: EngineAction): EngineState => {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ...action.payload,
        currentQuestionId: action.payload.currentQuestionId ?? state.currentQuestionId,
        answers: action.payload.answers ?? state.answers,
        visitedQuestionIds: action.payload.visitedQuestionIds ?? state.visitedQuestionIds,
      };
    case 'set-current':
      return { ...state, currentQuestionId: action.payload };
    case 'mark-visited':
      return { ...state, visitedQuestionIds: upsertVisited(state.visitedQuestionIds, action.payload) };
    case 'set-answer': {
      const previous = state.answers[action.payload.questionId];
      const next: SessionAnswer = {
        questionId: action.payload.questionId,
        value: action.payload.value,
        touched: true,
        updatedAt: Date.now(),
        localVersion: (previous?.localVersion ?? 0) + 1,
      };
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.questionId]: next,
        },
      };
    }
    default:
      return state;
  }
};

const isAnswered = (question: SessionPlayerQuestion, answer?: SessionAnswer): boolean => {
  if (!question.required) return true;
  if (!answer) return false;

  const value = answer.value;
  switch (question.type) {
    case 'text':
      return typeof value === 'string' && value.trim().length > 0;
    case 'multiple_choice':
      return typeof value === 'string' && value.length > 0;
    case 'slider':
      return typeof value === 'number' && Number.isFinite(value);
    case 'checkbox':
      return Array.isArray(value) && value.length > 0;
    default:
      return false;
  }
};

const compareWithRule = (value: SessionAnswerValue, operator: string, conditionValue: string): boolean => {
  if (operator === 'EQUALS') return String(value ?? '') === String(conditionValue);
  if (operator === 'NOT_EQUALS') return String(value ?? '') !== String(conditionValue);
  if (operator === 'CONTAINS') return String(value ?? '').includes(String(conditionValue));
  if (operator === 'GREATER_THAN') return Number(value) > Number(conditionValue);
  if (operator === 'LESS_THAN') return Number(value) < Number(conditionValue);
  if (operator === 'IN_ARRAY') {
    if (!Array.isArray(value)) return false;
    return value.map(String).includes(String(conditionValue));
  }
  return false;
};

const resolveBranchNext = (
  question: SessionPlayerQuestion,
  answers: Record<string, SessionAnswer>,
): string | null => {
  if (!question.branchingRules?.length) return null;
  const answer = answers[question.id]?.value;
  for (const rule of question.branchingRules) {
    if (compareWithRule(answer, rule.operator, rule.conditionValue)) {
      return rule.toQuestionId;
    }
  }
  return null;
};

export const useSessionPlayerEngine = (questions: SessionPlayerQuestion[]) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const questionById = useMemo(() => {
    const map: Record<string, SessionPlayerQuestion> = {};
    questions.forEach((question) => {
      map[question.id] = question;
    });
    return map;
  }, [questions]);

  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.orderIndex - b.orderIndex),
    [questions],
  );

  const setCurrentQuestionId = useCallback((questionId: string | null) => {
    dispatch({ type: 'set-current', payload: questionId });
    if (questionId) dispatch({ type: 'mark-visited', payload: questionId });
  }, []);

  const setAnswer = useCallback((questionId: string, value: SessionAnswerValue) => {
    dispatch({ type: 'set-answer', payload: { questionId, value } });
  }, []);

  const hydrate = useCallback((payload: Partial<EngineState>) => {
    dispatch({ type: 'hydrate', payload });
  }, []);

  const getQuestionValidation = useCallback(
    (questionId: string): { valid: boolean; message?: string } => {
      const question = questionById[questionId];
      if (!question) return { valid: false, message: 'Question not found' };
      const valid = isAnswered(question, state.answers[questionId]);
      return valid ? { valid: true } : { valid: false, message: 'Please answer before continuing.' };
    },
    [questionById, state.answers],
  );

  const getPredictedNextQuestionId = useCallback(
    (questionId: string): string | null => {
      const question = questionById[questionId];
      if (!question) return null;

      const fromBranch = resolveBranchNext(question, state.answers);
      if (fromBranch) return fromBranch;

      const index = orderedQuestions.findIndex((item) => item.id === questionId);
      if (index < 0) return null;
      return orderedQuestions[index + 1]?.id ?? null;
    },
    [orderedQuestions, questionById, state.answers],
  );

  const progress = useMemo<SessionPlayerProgress>(() => {
    const totalCount = orderedQuestions.length;
    const required = orderedQuestions.filter((question) => question.required);
    const requiredAnswered = required.filter((question) => isAnswered(question, state.answers[question.id])).length;
    const requiredTotal = required.length;

    const completionPercent = Math.round((state.visitedQuestionIds.length / Math.max(1, totalCount)) * 100);

    return {
      completionPercent,
      visitedCount: state.visitedQuestionIds.length,
      totalCount,
      requiredAnswered,
      requiredTotal,
    };
  }, [orderedQuestions, state.answers, state.visitedQuestionIds.length]);

  const currentQuestion = state.currentQuestionId ? questionById[state.currentQuestionId] : undefined;

  return {
    state,
    currentQuestion,
    questionById,
    orderedQuestions,
    setCurrentQuestionId,
    setAnswer,
    hydrate,
    getQuestionValidation,
    getPredictedNextQuestionId,
    progress,
  };
};
