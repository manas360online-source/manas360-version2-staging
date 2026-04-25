import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/http', () => ({
	http: {
		get: vi.fn(async () => ({ data: { data: { items: [] } } })),
		patch: vi.fn(async () => ({ data: { ok: true } })),
		delete: vi.fn(async () => ({ data: { ok: true } })),
		put: vi.fn(async () => ({ data: { ok: true } })),
		post: vi.fn(async (_url: string, payload?: any) => ({ data: { data: { echoed: payload } } })),
	},
}));

import { http } from '../lib/http';
import { patientApi } from './patient';

describe('patientApi structured assessment flow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(http.post).mockImplementation(async (url: string, payload?: any) => {
			if (url === '/v1/free-screening/start/me') {
				const key = String(payload?.templateKey || 'phq-9-paid-assessment-v1');
				const isGad = key.includes('gad-7');
				const count = isGad ? 7 : 9;
				const title = isGad ? 'GAD-7: GENERALIZED ANXIETY DISORDER ASSESSMENT' : 'PHQ-9: PATIENT HEALTH QUESTIONNAIRE (DEPRESSION ASSESSMENT)';
				return {
					data: {
						data: {
							attemptId: `${isGad ? 'gad' : 'phq'}-attempt-1`,
							template: { id: key, key, title },
							questions: Array.from({ length: count }, (_, idx) => ({
								questionId: `${isGad ? 'GAD-7' : 'PHQ-9'}-${idx + 1}`,
								position: idx + 1,
								prompt: idx === 0 && isGad ? 'Feeling nervous, anxious, or on edge' : `Question ${idx + 1}`,
								sectionKey: isGad ? 'anxiety' : 'depression',
								options: [
									{ optionIndex: 0, label: 'Not at all', points: 0 },
									{ optionIndex: 1, label: 'Several days', points: 1 },
									{ optionIndex: 2, label: 'More than half the days', points: 2 },
									{ optionIndex: 3, label: 'Nearly every day', points: 3 },
								],
							})),
						},
					},
				};
			}

			if (url.includes('/v1/free-screening/') && url.endsWith('/submit/me')) {
				const answers = Array.isArray(payload?.answers) ? payload.answers : [];
				const totalScore = answers.reduce((sum: number, item: any) => sum + Number(item?.optionIndex || 0), 0);
				return {
					data: {
						data: {
							attemptId: 'phq-attempt-1',
							templateKey: 'phq-9-paid-assessment-v1',
							totalScore,
							severityLevel: 'moderate',
							interpretation: 'Submitted',
							recommendation: 'Continue with care plan',
							actionLabel: 'Continue',
						},
					},
				};
			}

			return { data: { data: { echoed: payload } } };
		});
	});

	it('starts PHQ-9 and submits results through the clinical assessment endpoint', async () => {
		const started = await patientApi.startStructuredAssessment({ templateKey: 'phq-9-paid-assessment-v1' });

		expect(started.template.key).toBe('phq-9-paid-assessment-v1');
		expect(started.questions).toHaveLength(9);
		expect(started.questions[0].options).toHaveLength(4);

		const answers = started.questions.map((question) => ({
			questionId: question.questionId,
			optionIndex: question.questionId.endsWith('-1')
				? (question.options[2]?.optionIndex ?? 0)
				: (question.options[1]?.optionIndex ?? 0),
		}));

		const result = await patientApi.submitStructuredAssessment(started.attemptId, { answers });

		expect(http.post).toHaveBeenCalledWith('/v1/free-screening/start/me', {
			templateKey: 'phq-9-paid-assessment-v1',
		});
		expect(http.post).toHaveBeenCalledWith(`/v1/free-screening/${encodeURIComponent(started.attemptId)}/submit/me`, {
			answers,
		});
		expect(result.attemptId).toBe(started.attemptId);
		expect(result.templateKey).toContain('phq-9');
		expect(result.totalScore).toBe(10);
		expect(result.severityLevel).toBe('moderate');
		expect(result.recommendation).toContain('care plan');
	});

	it('starts GAD-7 with the matching question set', async () => {
		const started = await patientApi.startStructuredAssessment({ templateKey: 'gad-7-paid-assessment-v1' });

		expect(started.template.key).toBe('gad-7-paid-assessment-v1');
		expect(started.questions).toHaveLength(7);
		expect(started.questions[0].prompt).toContain('Feeling nervous');
	});
});