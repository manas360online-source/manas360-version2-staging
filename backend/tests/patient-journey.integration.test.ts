import express from 'express';
import request from 'supertest';

const pathwayState = new Map<string, {
  pathway: string;
  reason: string | null;
  selected_at: Date;
  updated_at: Date;
}>();

const mockDb = {
  $executeRawUnsafe: jest.fn(async (query: string, ...params: any[]) => {
    const sql = String(query || '').toLowerCase();
    if (sql.includes('insert into patient_pathway_state')) {
      const userId = String(params[1] || '');
      const pathway = String(params[2] || 'stepped-care');
      const reason = params[3] ? String(params[3]) : null;
      const now = new Date();
      const previous = pathwayState.get(userId);
      pathwayState.set(userId, {
        pathway,
        reason,
        selected_at: previous?.selected_at || now,
        updated_at: now,
      });
    }
    return null;
  }),
  $queryRawUnsafe: jest.fn(async (query: string, ...params: any[]) => {
    const sql = String(query || '').toLowerCase();
    if (sql.includes('select pathway, reason, selected_at, updated_at from patient_pathway_state')) {
      const userId = String(params[0] || '');
      const row = pathwayState.get(userId);
      return row ? [row] : [];
    }
    return [];
  }),
};

jest.mock('../src/config/db', () => ({ prisma: mockDb }));

jest.mock('../src/middleware/auth.middleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.auth = { userId: 'patient-1', role: 'patient' };
    next();
  },
}));

jest.mock('../src/middleware/rbac.middleware', () => ({
  requireRole:
    () =>
    (_req: any, _res: any, next: any) => {
      next();
    },
}));

jest.mock('../src/services/patient-v1.service', () => ({
  submitAssessment: jest.fn(),
  getLatestJourneyRecommendation: jest.fn(async () => ({
    assessment: {
      id: 'a1',
      type: 'PHQ-9',
      score: 18,
      severityLevel: 'Moderate',
      createdAt: new Date().toISOString(),
    },
    journey: {
      pathway: 'THERAPIST',
      urgency: 'MEDIUM',
      recommendedProvider: 'therapist',
      followUpDays: 3,
      rationale: ['PHQ-9 indicates moderate symptoms.'],
      actions: ['Book therapist session this week.'],
    },
  })),
}));

import patientJourneyRoutes from '../src/routes/patient-journey.routes';
import { errorHandler } from '../src/middleware/error.middleware';
import { getLatestJourneyRecommendation } from '../src/services/patient-v1.service';

const mockGetLatestJourneyRecommendation = getLatestJourneyRecommendation as jest.MockedFunction<typeof getLatestJourneyRecommendation>;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/v1/patient-journey', patientJourneyRoutes);
  app.use(errorHandler);
  return app;
};

describe('patient journey pathway selection roundtrip', () => {
  beforeEach(() => {
    pathwayState.clear();
    jest.clearAllMocks();
  });

  it('persists selected pathway and returns it in recommendation', async () => {
    const app = buildApp();

    const selectRes = await request(app)
      .post('/v1/patient-journey/select-pathway')
      .send({ pathway: 'direct-provider', reason: 'patient preference' });

    expect(selectRes.status).toBe(200);
    expect(selectRes.body.success).toBe(true);
    expect(selectRes.body.data.pathway).toBe('direct-provider');

    const recommendationRes = await request(app)
      .get('/v1/patient-journey/recommendation');

    expect(recommendationRes.status).toBe(200);
    expect(recommendationRes.body.success).toBe(true);
    expect(recommendationRes.body.data.selectedPathway.pathway).toBe('direct-provider');
    expect(recommendationRes.body.data.pathway).toBe('direct-provider');
  });

  it('uses selected pathway when it differs from computed pathway', async () => {
    const app = buildApp();

    mockGetLatestJourneyRecommendation.mockResolvedValueOnce({
      assessment: {
        id: 'a2',
        type: 'PHQ-9',
        score: 24,
        severityLevel: 'Severe',
        createdAt: new Date().toISOString(),
      },
      journey: {
        pathway: 'CRISIS_SUPPORT',
        urgency: 'CRITICAL',
        recommendedProvider: 'crisis-team',
        followUpDays: 0,
        rationale: ['Immediate risk indicators present.'],
        actions: ['Contact crisis support immediately.'],
      },
    } as any);

    const selectRes = await request(app)
      .post('/v1/patient-journey/select-pathway')
      .send({ pathway: 'direct-provider', reason: 'patient selected therapist-led route' });

    expect(selectRes.status).toBe(200);

    const recommendationRes = await request(app)
      .get('/v1/patient-journey/recommendation');

    expect(recommendationRes.status).toBe(200);
    expect(recommendationRes.body.data.selectedPathway.pathway).toBe('direct-provider');
    expect(recommendationRes.body.data.pathway).toBe('direct-provider');
    expect(recommendationRes.body.data.recommendation.urgency).toBe('urgent');
  });
});
