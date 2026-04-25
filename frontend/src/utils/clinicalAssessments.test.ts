import { describe, expect, it } from 'vitest';
import {
	CLINICAL_ASSESSMENT_TEMPLATE_KEYS,
	CLINICAL_QUESTION_BANK,
	getClinicalAssessmentSummary,
	inferClinicalAssessmentType,
	severityFromClinicalScore,
} from './clinicalAssessments';

describe('clinicalAssessments', () => {
	it('exports the expected assessment question banks and template keys', () => {
		expect(CLINICAL_ASSESSMENT_TEMPLATE_KEYS['PHQ-9']).toContain('phq-9');
		expect(CLINICAL_ASSESSMENT_TEMPLATE_KEYS['GAD-7']).toContain('gad-7');
		expect(CLINICAL_QUESTION_BANK['PHQ-9']).toHaveLength(9);
		expect(CLINICAL_QUESTION_BANK['GAD-7']).toHaveLength(7);
	});

	it('infers assessment type and score severity consistently', () => {
		expect(inferClinicalAssessmentType('phq9')).toBe('PHQ-9');
		expect(inferClinicalAssessmentType('gad-7')).toBe('GAD-7');
		expect(severityFromClinicalScore('PHQ-9', 16)).toBe('moderately-severe');
		expect(severityFromClinicalScore('GAD-7', 12)).toBe('moderate');
	});

	it('summarizes completion state from assessment history', () => {
		const summary = getClinicalAssessmentSummary([
			{ type: 'PHQ-9', score: 11, level: 'moderate', createdAt: '2026-04-15T10:00:00Z' },
			{ type: 'GAD-7', score: 8, level: 'mild', createdAt: '2026-04-15T11:00:00Z' },
		]);

		expect(summary.hasPhq9).toBe(true);
		expect(summary.hasGad7).toBe(true);
		expect(summary.isComplete).toBe(true);
		expect(summary.missingTypes).toEqual([]);
	});
});