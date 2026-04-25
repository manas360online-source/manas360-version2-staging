export type SessionPlayerQuestionType = 'multiple_choice' | 'text' | 'slider' | 'checkbox';

export interface SessionPlayerOption {
  id: string;
  label: string;
  value: string;
}

export interface SessionPlayerQuestion {
  id: string;
  type: SessionPlayerQuestionType;
  prompt: string;
  description?: string | null;
  orderIndex: number;
  required: boolean;
  helpText?: string | null;
  metadata?: Record<string, any> | null;
  options?: SessionPlayerOption[];
  slider?: {
    min: number;
    max: number;
    step: number;
  };
  branchingRules?: Array<{
    id: string;
    toQuestionId: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN_ARRAY';
    conditionValue: string;
  }>;
}

export type SessionAnswerValue = string | number | string[] | null;

export interface SessionAnswer {
  questionId: string;
  value: SessionAnswerValue;
  touched: boolean;
  updatedAt: number;
  localVersion: number;
}

export interface SessionDraftSnapshot {
  sessionId: string;
  currentQuestionId: string | null;
  answers: Record<string, SessionAnswer>;
  visitedQuestionIds: string[];
  updatedAt: number;
}

export interface SessionOutboxItem {
  id: string;
  sessionId: string;
  questionId: string;
  responseData: any;
  timeSpentSeconds?: number;
  createdAt: number;
  retries: number;
  idempotencyKey: string;
}

export interface SessionPlayerProgress {
  completionPercent: number;
  visitedCount: number;
  totalCount: number;
  requiredAnswered: number;
  requiredTotal: number;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';
