import type { AssessmentHistoryEntry, ClinicalAssessmentKey } from '../types/patient';

export const CLINICAL_ASSESSMENT_KEYS: ClinicalAssessmentKey[] = ['PHQ-9', 'GAD-7'];

export const CLINICAL_ASSESSMENT_TEMPLATE_KEYS: Record<ClinicalAssessmentKey, string> = {
	'PHQ-9': 'phq-9-paid-assessment-v1',
	'GAD-7': 'gad-7-paid-assessment-v1',
};

export const CLINICAL_ASSESSMENT_OPTIONS = [
	{ optionIndex: 0, label: 'Not at all', points: 0 },
	{ optionIndex: 1, label: 'Several days', points: 1 },
	{ optionIndex: 2, label: 'More than half the days', points: 2 },
	{ optionIndex: 3, label: 'Nearly every day', points: 3 },
];

export const CLINICAL_QUESTION_BANK: Record<ClinicalAssessmentKey, string[]> = {
	'PHQ-9': [
		'Little interest or pleasure in doing things',
		'Feeling down, depressed, or hopeless',
		'Trouble falling or staying asleep, or sleeping too much',
		'Feeling tired or having little energy',
		'Poor appetite or overeating',
		'Feeling bad about yourself - or that you are a failure',
		'Trouble concentrating on things, such as reading or watching television',
		'Moving or speaking so slowly that other people could have noticed, or the opposite',
		'Thoughts that you would be better off dead, or of hurting yourself',
	],
	'GAD-7': [
		'Feeling nervous, anxious, or on edge',
		'Not being able to stop or control worrying',
		'Worrying too much about different things',
		'Trouble relaxing',
		'Being so restless that it is hard to sit still',
		'Becoming easily annoyed or irritable',
		'Feeling afraid as if something awful might happen',
	],
};

export const getClinicalAssessmentMaxScore = (type: ClinicalAssessmentKey): number => {
	return CLINICAL_QUESTION_BANK[type].length * 3;
};

export const inferClinicalAssessmentType = (value: string): ClinicalAssessmentKey => {
	const normalized = String(value || '').toUpperCase();
	if (normalized.includes('GAD-7') || normalized.includes('GAD7')) return 'GAD-7';
	return 'PHQ-9';
};

export const severityFromClinicalScore = (type: ClinicalAssessmentKey, score: number): string => {
	if (type === 'PHQ-9') {
		if (score >= 20) return 'severe';
		if (score >= 15) return 'moderately-severe';
		if (score >= 10) return 'moderate';
		if (score >= 5) return 'mild';
		return 'minimal';
	}

	if (score >= 15) return 'severe';
	if (score >= 10) return 'moderate';
	if (score >= 5) return 'mild';
	return 'minimal';
};

type ClinicalAssessmentHistoryItem = Pick<AssessmentHistoryEntry, 'type' | 'score' | 'level' | 'createdAt'> & {
	attemptId?: string;
	templateKey?: string;
	templateTitle?: string;
	submittedAt?: string;
};

export const getClinicalAssessmentSummary = (items: ClinicalAssessmentHistoryItem[]) => {
	const latestByType: Record<ClinicalAssessmentKey, ClinicalAssessmentHistoryItem | null> = {
		'PHQ-9': null,
		'GAD-7': null,
	};

	const getTimestamp = (item: ClinicalAssessmentHistoryItem | null): number => {
		if (!item) return 0;
		const raw = item.submittedAt || item.createdAt || '';
		const parsed = new Date(raw).getTime();
		return Number.isFinite(parsed) ? parsed : 0;
	};

	for (const item of items) {
		const type = inferClinicalAssessmentType(String(item?.type || item?.templateKey || item?.templateTitle || 'PHQ-9'));
		if (!latestByType[type] || getTimestamp(item) >= getTimestamp(latestByType[type])) {
			latestByType[type] = item;
		}
	}

	const hasPhq9 = Boolean(latestByType['PHQ-9']);
	const hasGad7 = Boolean(latestByType['GAD-7']);

	return {
		latestByType,
		hasPhq9,
		hasGad7,
		isComplete: hasPhq9 && hasGad7,
		missingTypes: [!hasPhq9 ? 'PHQ-9' : null, !hasGad7 ? 'GAD-7' : null].filter(Boolean) as ClinicalAssessmentKey[],
	};
};