import { scoreGAD7, scorePHQ9 } from '../services/riskScoring';

export type ClinicalAssessmentType = 'PHQ-9' | 'GAD-7';

export const PHQ9_QUESTIONS = [
	'Little interest or pleasure in doing things',
	'Feeling down, depressed, or hopeless',
	'Trouble falling or staying asleep, or sleeping too much',
	'Feeling tired or having little energy',
	'Poor appetite or overeating',
	'Feeling bad about yourself, or that you are a failure or have let yourself or your family down',
	'Trouble concentrating on things, such as reading the newspaper or watching television',
	'Moving or speaking so slowly that other people could have noticed, or the opposite',
	'Thoughts that you would be better off dead or of hurting yourself in some way',
] as const;

export const GAD7_QUESTIONS = [
	'Feeling nervous, anxious, or on edge',
	'Not being able to stop or control worrying',
	'Worrying too much about different things',
	'Trouble relaxing',
	'Being so restless that it is hard to sit still',
	'Becoming easily annoyed or irritable',
	'Feeling afraid, as if something awful might happen',
] as const;

const normalizeClinicalAnswers = (answers: number[], expectedLength: number): number[] => {
	const normalized = Array.isArray(answers) ? answers.map((value) => Number(value || 0)) : [];
	if (normalized.length !== expectedLength) {
		throw new Error(`answers must contain exactly ${expectedLength} values`);
	}
	return normalized.map((value) => Math.min(3, Math.max(0, Math.floor(value))));
};

export const calculateClinicalAssessmentScore = (type: ClinicalAssessmentType, answers: number[]): { totalScore: number; severityLevel: string } => {
	if (type === 'PHQ-9') {
		const normalizedAnswers = normalizeClinicalAnswers(answers, 9);
		const scored = scorePHQ9(normalizedAnswers);
		if (scored.severity === 'none') return { totalScore: scored.total, severityLevel: 'minimal' };
		if (scored.severity === 'moderate-severe') return { totalScore: scored.total, severityLevel: 'moderately_severe' };
		return { totalScore: scored.total, severityLevel: scored.severity };
	}

	const normalizedAnswers = normalizeClinicalAnswers(answers, 7);
	const scored = scoreGAD7(normalizedAnswers);
	return { totalScore: scored.total, severityLevel: scored.severity };
};

export const getPHQ9SeverityLabel = (score: number): string => {
	if (score <= 4) return 'None';
	if (score <= 9) return 'Mild';
	if (score <= 14) return 'Moderate';
	if (score <= 19) return 'Moderately Severe';
	return 'Severe';
};

export const getGAD7SeverityLabel = (score: number): string => {
	if (score <= 4) return 'Minimal';
	if (score <= 9) return 'Mild';
	if (score <= 14) return 'Moderate';
	return 'Severe';
};
