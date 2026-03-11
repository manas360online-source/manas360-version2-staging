import { describe, expect, it } from 'vitest';
import { parseJourneyPayload } from './journey';

describe('parseJourneyPayload', () => {
  it('normalizes journey payload from wrapped legacy response', () => {
    const raw = {
      data: {
        journey: {
          pathway: 'direct-provider',
          selectedPathway: 'direct-provider',
          urgency: 'priority',
          followUpDays: 3,
          actions: ['Book therapist session this week.'],
          rationale: ['Moderate symptom burden.'],
        },
      },
    };

    const result = parseJourneyPayload(raw);

    expect(result).toEqual({
      pathway: 'direct-provider',
      selectedPathway: 'direct-provider',
      urgency: 'priority',
      followUpDays: 3,
      actions: ['Book therapist session this week.'],
      rationale: ['Moderate symptom burden.'],
    });
  });

  it('normalizes new recommendation contract shape', () => {
    const raw = {
      pathway: 'urgent-care',
      severity: 'severe',
      followUpDays: 1,
      recommendation: {
        urgency: 'urgent',
        providerTypes: ['psychiatrist'],
        rationale: ['Elevated risk factors.'],
      },
      nextActions: ['Schedule urgent consult within 24 hours.'],
      selectedPathway: {
        pathway: 'direct-provider',
      },
    };

    const result = parseJourneyPayload(raw);

    expect(result).toEqual({
      pathway: 'urgent-care',
      selectedPathway: 'direct-provider',
      severity: 'severe',
      urgency: 'urgent',
      recommendedProvider: 'psychiatrist',
      followUpDays: 1,
      rationale: ['Elevated risk factors.'],
      actions: ['Schedule urgent consult within 24 hours.'],
    });
  });

  it('returns null when payload has no pathway', () => {
    const result = parseJourneyPayload({ data: { foo: 'bar' } });
    expect(result).toBeNull();
  });
});
