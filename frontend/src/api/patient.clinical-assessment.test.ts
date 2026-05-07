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

		expect(http.post).toHaveBeenCalledWith('/v1/patient-journey/clinical-assessment', {
			type: 'PHQ-9',
			answers: answers.map((item) => item.optionIndex),
		});
		expect(result.attemptId).toBe(started.attemptId);
		expect(result.templateKey).toBe('PHQ-9');
		expect(result.totalScore).toBe(10);
		expect(result.severityLevel).toBe('moderate');
		expect(result.recommendation).toContain('recommended care pathway');
	});

	it('starts GAD-7 with the matching question set', async () => {
		const started = await patientApi.startStructuredAssessment({ templateKey: 'gad-7-paid-assessment-v1' });

		expect(started.template.key).toBe('gad-7-paid-assessment-v1');
		expect(started.questions).toHaveLength(7);
		expect(started.questions[0].prompt).toContain('Feeling nervous');
	});
});