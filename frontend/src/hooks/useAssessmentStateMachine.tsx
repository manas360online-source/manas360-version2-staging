import { useCallback, useReducer } from 'react';

export type AssessmentState =
  | 'idle'
  | 'intro'
  | 'loading'
  | 'question'
  | 'submitting'
  | 'results'
  | 'provider_selection'
  | 'booking'
  | 'error';

export type AssessmentEvent =
  | { type: 'START' }
  | { type: 'LOAD_SUCCESS' }
  | { type: 'LOAD_ERROR' }
  | { type: 'ANSWER' }
  | { type: 'SUBMIT_QUESTION' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR' }
  | { type: 'SELECT_PATH'; path: 'recommended' | 'direct' | 'urgent' }
  | { type: 'BOOK_PROVIDER' }
  | { type: 'RESET' }
  | { type: 'CLOSE' };

interface AssessmentContext {
  currentQuestionIndex: number;
  totalQuestions: number;
  answers: Record<string, number>;
  results: Array<{ type: string; score: number; severity: string }>;
  error?: string;
  selectedPath?: 'recommended' | 'direct' | 'urgent';
}

type AssessmentMachineState = {
  state: AssessmentState;
  context: AssessmentContext;
};

const initialContext: AssessmentContext = {
  currentQuestionIndex: 0,
  totalQuestions: 0,
  answers: {},
  results: [],
};

const initialState: AssessmentMachineState = {
  state: 'idle',
  context: initialContext,
};

function assessmentReducer(
  state: AssessmentMachineState,
  event: AssessmentEvent
): AssessmentMachineState {
  switch (state.state) {
    case 'idle':
      if (event.type === 'START') {
        return {
          ...state,
          state: 'intro',
        };
      }
      break;

    case 'intro':
      if (event.type === 'LOAD_SUCCESS') {
        return {
          ...state,
          state: 'question',
          context: {
            ...state.context,
            totalQuestions: 9, // Assuming PHQ-9 has 9 questions
          },
        };
      }
      if (event.type === 'LOAD_ERROR') {
        return {
          ...state,
          state: 'error',
          context: {
            ...state.context,
            error: 'Failed to load assessment',
          },
        };
      }
      break;

    case 'question':
      if (event.type === 'ANSWER') {
        return {
          ...state,
          context: {
            ...state.context,
            answers: {
              ...state.context.answers,
              // This would be handled by the component
            },
          },
        };
      }
      if (event.type === 'SUBMIT_QUESTION') {
        const isLastQuestion = state.context.currentQuestionIndex >= state.context.totalQuestions - 1;
        return {
          ...state,
          state: isLastQuestion ? 'submitting' : 'question',
          context: {
            ...state.context,
            currentQuestionIndex: isLastQuestion
              ? state.context.currentQuestionIndex
              : state.context.currentQuestionIndex + 1,
          },
        };
      }
      break;

    case 'submitting':
      if (event.type === 'SUBMIT_SUCCESS') {
        return {
          ...state,
          state: 'results',
        };
      }
      if (event.type === 'SUBMIT_ERROR') {
        return {
          ...state,
          state: 'error',
          context: {
            ...state.context,
            error: 'Failed to submit assessment',
          },
        };
      }
      break;

    case 'results':
      if (event.type === 'SELECT_PATH') {
        return {
          ...state,
          state: 'provider_selection',
          context: {
            ...state.context,
            selectedPath: event.path,
          },
        };
      }
      break;

    case 'provider_selection':
      if (event.type === 'BOOK_PROVIDER') {
        return {
          ...state,
          state: 'booking',
        };
      }
      break;

    case 'error':
      if (event.type === 'RESET') {
        return {
          state: 'idle',
          context: initialContext,
        };
      }
      break;

    default:
      return state;
  }

  return state;
}

export function useAssessmentStateMachine() {
  const [machineState, dispatch] = useReducer(assessmentReducer, initialState);

  const actions = {
    start: useCallback(() => dispatch({ type: 'START' }), []),
    loadSuccess: useCallback(() => dispatch({ type: 'LOAD_SUCCESS' }), []),
    loadError: useCallback(() => dispatch({ type: 'LOAD_ERROR' }), []),
    answer: useCallback(() => dispatch({ type: 'ANSWER' }), []),
    submitQuestion: useCallback(() => dispatch({ type: 'SUBMIT_QUESTION' }), []),
    submitSuccess: useCallback(() => dispatch({ type: 'SUBMIT_SUCCESS' }), []),
    submitError: useCallback(() => dispatch({ type: 'SUBMIT_ERROR' }), []),
    selectPath: useCallback((path: 'recommended' | 'direct' | 'urgent') =>
      dispatch({ type: 'SELECT_PATH', path }), []),
    bookProvider: useCallback(() => dispatch({ type: 'BOOK_PROVIDER' }), []),
    reset: useCallback(() => dispatch({ type: 'RESET' }), []),
    close: useCallback(() => dispatch({ type: 'CLOSE' }), []),
  };

  return {
    state: machineState.state,
    context: machineState.context,
    actions,
  };
}