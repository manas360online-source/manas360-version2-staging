import request from 'supertest';
import app from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/db';
import { FREE_SCREENING_TEMPLATE_KEY, PHQ9_SCREENING_TEMPLATE_KEY, GAD7_SCREENING_TEMPLATE_KEY } from '../src/services/screening-template-defaults.service';

describe('Phase 5 - E2E Integration: Screening Assessments & Scoring Matrix', () => {
        beforeAll(async () => {
                await connectDatabase();
        });

        afterAll(async () => {
                await prisma.$disconnect();
                await disconnectDatabase();
        });

        describe('Public Free Screening Pipeline', () => {
                it('should start a session and yield the default free screening template', async () => {
                        const res = await request(app)
                                .post('/api/v1/free-screening/start')
                                .send({});

                        expect(res.status).toBe(201);
                        expect(res.body.success).toBe(true);
                        expect(res.body.data.template.key).toBe(FREE_SCREENING_TEMPLATE_KEY);
                        expect(res.body.data.questions.length).toBeGreaterThan(0);
                });

                it('should accept a complete assessment and return a categorized recommendation', async () => {
                        // 1. Start session
                        const startRes = await request(app)
                                .post('/api/v1/free-screening/start')
                                .send({});
                        
                        expect(startRes.status).toBe(201);
                        const attemptId = startRes.body.data.attemptId;
                        const attemptToken = startRes.body.data.attemptToken;
                        const questions = startRes.body.data.questions;

                        // 2. Build mock answers (always choosing highest scoring options to force severe)
                        const answers = questions.map((q: any) => {
                                // Find option with highest points
                                const highestOption = q.options.reduce((prev: any, current: any) => 
                                        (prev.points > current.points) ? prev : current
                                );
                                return {
                                        questionId: q.questionId,
                                        optionIndex: highestOption.optionIndex
                                };
                        });

                        // 3. Submit session
                        const submitRes = await request(app)
                                .post(`/api/v1/free-screening/${attemptId}/submit`)
                                .send({
                                        attemptToken,
                                        answers
                                });

                        expect(submitRes.status).toBe(200);
                        expect(submitRes.body.success).toBe(true);
                        
                        const result = submitRes.body.data;
                        expect(result.totalScore).toBeGreaterThan(0);
                        expect(result.severityLevel).toBeDefined();
                        expect(result.recommendation).toBeDefined();
                        
                        // Because we picked highest points, we expect HIGH severity
                        expect(['Severe', 'High', 'Moderate-Severe']).toContain(result.severityLevel);
                });
        });

        describe('PHQ-9 Assessment Pipeline', () => {
                it('should execute start-to-finish PHQ-9 scoring with proper threshold bounds', async () => {
                        // 1. Start session with PHQ-9 template specified
                        const startRes = await request(app)
                                .post('/api/v1/free-screening/start')
                                .send({ templateKey: PHQ9_SCREENING_TEMPLATE_KEY });
                        
                        expect(startRes.status).toBe(201);
                        const attemptId = startRes.body.data.attemptId;
                        const attemptToken = startRes.body.data.attemptToken;
                        const questions = startRes.body.data.questions;

                        // Verify it is exactly 9 questions
                        expect(questions.length).toBe(9);

                        // 2. Submit session picking '0 points' (index 0) for all.
                        const answers = questions.map((q: any) => ({
                                questionId: q.questionId,
                                optionIndex: q.options.find((o: any) => o.points === 0)?.optionIndex || 0
                        }));

                        const submitRes = await request(app)
                                .post(`/api/v1/free-screening/${attemptId}/submit`)
                                .send({
                                        attemptToken,
                                        answers
                                });

                        expect(submitRes.status).toBe(200);
                        
                        const result = submitRes.body.data;
                        expect(result.totalScore).toBe(0);
                        expect(result.severityLevel.toLowerCase()).toContain('minimal');
                });
        });

        describe('GAD-7 Assessment Pipeline', () => {
                it('should perform start-to-finish GAD-7 mapping correctly', async () => {
                        const startRes = await request(app)
                                .post('/api/v1/free-screening/start')
                                .send({ templateKey: GAD7_SCREENING_TEMPLATE_KEY });
                        
                        expect(startRes.status).toBe(201);
                        const attemptId = startRes.body.data.attemptId;
                        const attemptToken = startRes.body.data.attemptToken;
                        const questions = startRes.body.data.questions;

                        expect(questions.length).toBe(7);

                        // Provide a mix of scores (let's say all 2 points) -> Total 14 (Moderate)
                        const answers = questions.map((q: any) => ({
                                questionId: q.questionId,
                                optionIndex: q.options.find((o: any) => o.points === 2)?.optionIndex || 2
                        }));

                        const submitRes = await request(app)
                                .post(`/api/v1/free-screening/${attemptId}/submit`)
                                .send({
                                        attemptToken,
                                        answers
                                });

                        expect(submitRes.status).toBe(200);
                        const result = submitRes.body.data;
                        expect(result.totalScore).toBe(14); // 7 questions * 2
                        expect(result.severityLevel.toLowerCase()).toContain('moderate');
                });
        });
});
