import type { JourneyRecommendationResponse } from '../api/patient';

export type JourneyPathway = 'stepped-care' | 'direct-provider' | 'urgent-care';

export type JourneyPayload = {
  pathway?: JourneyPathway;
  selectedPathway?: JourneyPathway;
  severity?: string;
  urgency?: string;
  recommendedProvider?: string;
  followUpDays?: number;
  rationale?: string[];
  actions?: string[];
};

export const parseJourneyPayload = (raw: JourneyRecommendationResponse | any): JourneyPayload | null => {
  const payload = (raw as any)?.data ?? raw;

  if (payload?.journey) {
    return payload.journey as JourneyPayload;
  }

  if (!payload || !payload.pathway) {
    return null;
  }

  return {
    pathway: payload.pathway,
    selectedPathway: payload?.selectedPathway?.pathway,
    severity: payload?.severity,
    urgency: payload?.recommendation?.urgency,
    recommendedProvider: Array.isArray(payload?.recommendation?.providerTypes)
      ? payload.recommendation.providerTypes[0]
      : undefined,
    followUpDays: payload?.followUpDays,
    rationale: Array.isArray(payload?.recommendation?.rationale) ? payload.recommendation.rationale : [],
    actions: Array.isArray(payload?.nextActions) ? payload.nextActions : [],
  };
};
