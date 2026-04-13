export const FREE_SCREENING_TEMPLATE_KEY = 'free-mental-health-screening-v1';
export const PHQ9_SCREENING_TEMPLATE_KEY = 'phq-9-paid-assessment-v1';
export const GAD7_SCREENING_TEMPLATE_KEY = 'gad-7-paid-assessment-v1';

type ScreeningTemplateDefault = {
	key: string;
	title: string;
	description: string;
	estimatedMinutes: number;
	isPublic: boolean;
	randomizeOrder: boolean;
	status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
	questions: Array<{
		orderIndex: number;
		prompt: string;
		sectionKey: string;
		options: Array<{
			optionIndex: number;
			label: string;
			points: number;
		}>;
	}>;
	scoringBands: Array<{
		orderIndex: number;
		minScore: number;
		maxScore: number;
		severity: string;
		interpretation: string;
		recommendation: string;
		actionLabel: string;
	}>;
};

const commonPhqOptions = [
	{ optionIndex: 0, label: 'Not at all', points: 0 },
	{ optionIndex: 1, label: 'Several days', points: 1 },
	{ optionIndex: 2, label: 'More than half the days', points: 2 },
	{ optionIndex: 3, label: 'Nearly every day', points: 3 },
];

const DEFAULT_SCREENING_TEMPLATES: Record<string, ScreeningTemplateDefault> = {
	[FREE_SCREENING_TEMPLATE_KEY]: {
		key: FREE_SCREENING_TEMPLATE_KEY,
		title: 'FREE MENTAL HEALTH SCREENING ASSESSMENT',
		description: '5-Question General Wellbeing Screener | 2-3 minutes | Immediate Results',
		estimatedMinutes: 3,
		isPublic: true,
		randomizeOrder: true,
		status: 'PUBLISHED',
		questions: [
			{
				orderIndex: 1,
				sectionKey: 'general',
				prompt: 'Over the last 2 weeks, how often have you felt down, depressed, or hopeless?',
				options: commonPhqOptions,
			},
			{
				orderIndex: 2,
				sectionKey: 'general',
				prompt: 'Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?',
				options: commonPhqOptions,
			},
			{
				orderIndex: 3,
				sectionKey: 'general',
				prompt: 'How would you rate your overall sleep quality in the past week?',
				options: [
					{ optionIndex: 0, label: 'Very good - I sleep well most nights', points: 0 },
					{ optionIndex: 1, label: 'Fairly good - Some difficulties but manageable', points: 1 },
					{ optionIndex: 2, label: 'Fairly bad - Frequent sleep problems', points: 2 },
					{ optionIndex: 3, label: 'Very bad - Severe sleep difficulties', points: 3 },
				],
			},
			{
				orderIndex: 4,
				sectionKey: 'general',
				prompt: 'How often do you feel overwhelmed by daily responsibilities?',
				options: [
					{ optionIndex: 0, label: 'Rarely or never', points: 0 },
					{ optionIndex: 1, label: 'Sometimes (once or twice a week)', points: 1 },
					{ optionIndex: 2, label: 'Often (3-5 days a week)', points: 2 },
					{ optionIndex: 3, label: 'Almost always (daily)', points: 3 },
				],
			},
			{
				orderIndex: 5,
				sectionKey: 'general',
				prompt: 'In the past month, how satisfied have you been with your relationships and social connections?',
				options: [
					{ optionIndex: 0, label: 'Very satisfied - Strong support system', points: 0 },
					{ optionIndex: 1, label: 'Somewhat satisfied - Adequate connections', points: 1 },
					{ optionIndex: 2, label: 'Somewhat dissatisfied - Limited support', points: 2 },
					{ optionIndex: 3, label: 'Very dissatisfied - Feeling isolated', points: 3 },
				],
			},
		],
		scoringBands: [
			{
				orderIndex: 1,
				minScore: 0,
				maxScore: 3,
				severity: 'Minimal',
				interpretation: 'You appear to be doing well overall with minimal mental health concerns.',
				recommendation: 'Continue healthy habits. Maintain work-life balance.',
				actionLabel: 'Keep monitoring',
			},
			{
				orderIndex: 2,
				minScore: 4,
				maxScore: 7,
				severity: 'Mild',
				interpretation: 'You may be experiencing some mild stress or mood changes that could benefit from attention.',
				recommendation: 'Consider self-care activities. Try meditation, exercise, or journaling.',
				actionLabel: 'Self-care recommended',
			},
			{
				orderIndex: 3,
				minScore: 8,
				maxScore: 11,
				severity: 'Moderate',
				interpretation: 'You are experiencing moderate mental health symptoms that warrant professional attention.',
				recommendation: 'Speak with a mental health professional. Consider therapy sessions.',
				actionLabel: 'Professional help suggested',
			},
			{
				orderIndex: 4,
				minScore: 12,
				maxScore: 15,
				severity: 'Severe',
				interpretation: 'You are experiencing significant mental health difficulties requiring immediate professional support.',
				recommendation: 'Schedule consultation with psychiatrist or psychologist urgently. Consider therapy + medication evaluation.',
				actionLabel: 'Urgent - Book session now',
			},
		],
	},
	[PHQ9_SCREENING_TEMPLATE_KEY]: {
		key: PHQ9_SCREENING_TEMPLATE_KEY,
		title: 'PHQ-9: PATIENT HEALTH QUESTIONNAIRE (DEPRESSION ASSESSMENT)',
		description:
			'PHQ-9 depression screening questionnaire.',
		estimatedMinutes: 5,
		isPublic: false,
		randomizeOrder: false,
		status: 'PUBLISHED',
		questions: [
			{ orderIndex: 1, sectionKey: 'depression', prompt: 'Little interest or pleasure in doing things', options: commonPhqOptions },
			{ orderIndex: 2, sectionKey: 'depression', prompt: 'Feeling down, depressed, or hopeless', options: commonPhqOptions },
			{ orderIndex: 3, sectionKey: 'depression', prompt: 'Trouble falling or staying asleep, or sleeping too much', options: commonPhqOptions },
			{ orderIndex: 4, sectionKey: 'depression', prompt: 'Feeling tired or having little energy', options: commonPhqOptions },
			{ orderIndex: 5, sectionKey: 'depression', prompt: 'Poor appetite or overeating', options: commonPhqOptions },
			{ orderIndex: 6, sectionKey: 'depression', prompt: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down', options: commonPhqOptions },
			{ orderIndex: 7, sectionKey: 'depression', prompt: 'Trouble concentrating on things, such as reading the newspaper or watching television', options: commonPhqOptions },
			{ orderIndex: 8, sectionKey: 'depression', prompt: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual', options: commonPhqOptions },
			{ orderIndex: 9, sectionKey: 'depression', prompt: 'Thoughts that you would be better off dead, or of hurting yourself in some way', options: commonPhqOptions },
		],
		scoringBands: [
			{
				orderIndex: 1,
				minScore: 0,
				maxScore: 4,
				severity: 'None-Minimal',
				interpretation: 'Minimal or no depression. Symptoms do not significantly interfere with functioning.',
				recommendation: 'No treatment needed. Continue monitoring. Promote wellness activities. Monitoring: reassess in 3-6 months if risk factors are present.',
				actionLabel: 'Monitor in 3-6 months',
			},
			{
				orderIndex: 2,
				minScore: 5,
				maxScore: 9,
				severity: 'Mild Depression',
				interpretation: 'Mild depressive symptoms present. May cause minor functional impairment.',
				recommendation: 'Watchful waiting with repeat PHQ-9 at follow-up. Consider counseling, therapy, exercise, sleep hygiene, and stress management. Monitoring: reassess in 2-4 weeks.',
				actionLabel: 'Reassess in 2-4 weeks',
			},
			{
				orderIndex: 3,
				minScore: 10,
				maxScore: 14,
				severity: 'Moderate Depression',
				interpretation: 'Moderate depressive symptoms causing noticeable functional impairment.',
				recommendation: 'Treatment with antidepressants or psychotherapy. Combination therapy may be beneficial. Regular psychiatric follow-up. Monitoring: reassess every 2 weeks initially.',
				actionLabel: 'Book therapy or psychiatry',
			},
			{
				orderIndex: 4,
				minScore: 15,
				maxScore: 19,
				severity: 'Moderately Severe Depression',
				interpretation: 'Severe depressive symptoms with significant functional impairment.',
				recommendation: 'Immediate treatment with antidepressants and psychotherapy. Consider psychiatrist referral. Weekly therapy sessions recommended. Monitoring: weekly review and suicide risk assessment.',
				actionLabel: 'Urgent provider follow-up',
			},
			{
				orderIndex: 5,
				minScore: 20,
				maxScore: 27,
				severity: 'Severe Depression',
				interpretation: 'Severe depression with marked functional impairment and high risk.',
				recommendation: 'Urgent psychiatric evaluation required. Combination pharmacotherapy plus intensive psychotherapy. May require hospitalization if suicidal. Monitoring: daily or weekly contact with 24/7 crisis support.',
				actionLabel: 'Urgent psychiatric evaluation',
			},
		],
	},
	[GAD7_SCREENING_TEMPLATE_KEY]: {
		key: GAD7_SCREENING_TEMPLATE_KEY,
		title: 'GAD-7: GENERALIZED ANXIETY DISORDER ASSESSMENT',
		description:
			'GAD-7 anxiety screening questionnaire.',
		estimatedMinutes: 4,
		isPublic: false,
		randomizeOrder: false,
		status: 'PUBLISHED',
		questions: [
			{ orderIndex: 1, sectionKey: 'anxiety', prompt: 'Feeling nervous, anxious, or on edge', options: commonPhqOptions },
			{ orderIndex: 2, sectionKey: 'anxiety', prompt: 'Not being able to stop or control worrying', options: commonPhqOptions },
			{ orderIndex: 3, sectionKey: 'anxiety', prompt: 'Worrying too much about different things', options: commonPhqOptions },
			{ orderIndex: 4, sectionKey: 'anxiety', prompt: 'Trouble relaxing', options: commonPhqOptions },
			{ orderIndex: 5, sectionKey: 'anxiety', prompt: 'Being so restless that it\'s hard to sit still', options: commonPhqOptions },
			{ orderIndex: 6, sectionKey: 'anxiety', prompt: 'Becoming easily annoyed or irritable', options: commonPhqOptions },
			{ orderIndex: 7, sectionKey: 'anxiety', prompt: 'Feeling afraid as if something awful might happen', options: commonPhqOptions },
		],
		scoringBands: [
			{
				orderIndex: 1,
				minScore: 0,
				maxScore: 4,
				severity: 'Minimal Anxiety',
				interpretation: 'Minimal anxiety symptoms. No significant functional impairment.',
				recommendation: 'No treatment indicated. Provide reassurance. Promote stress management techniques. Monitoring: routine screening unless symptoms worsen.',
				actionLabel: 'Routine screening',
			},
			{
				orderIndex: 2,
				minScore: 5,
				maxScore: 9,
				severity: 'Mild Anxiety',
				interpretation: 'Mild anxiety symptoms with minimal functional impairment.',
				recommendation: 'Watchful waiting, psychoeducation, relaxation training, mindfulness, and breathing exercises. Consider brief therapy if symptoms persist. Monitoring: reassess in 2-4 weeks.',
				actionLabel: 'Reassess in 2-4 weeks',
			},
			{
				orderIndex: 3,
				minScore: 10,
				maxScore: 14,
				severity: 'Moderate Anxiety',
				interpretation: 'Moderate anxiety symptoms causing noticeable functional impairment.',
				recommendation: 'Active treatment warranted. Cognitive Behavioral Therapy is recommended. Consider SSRIs or SNRIs if therapy alone is insufficient. Monitoring: reassess every 2 weeks initially.',
				actionLabel: 'Start active treatment',
			},
			{
				orderIndex: 4,
				minScore: 15,
				maxScore: 21,
				severity: 'Severe Anxiety',
				interpretation: 'Severe anxiety with marked functional impairment and distress.',
				recommendation: 'Active treatment required. Combination therapy with CBT plus medication is recommended. Psychiatrist referral and weekly therapy sessions should be considered. Monitoring: weekly follow-up and assessment for comorbid depression or panic disorder.',
				actionLabel: 'Urgent anxiety care plan',
			},
		],
	},
};

export const getDefaultScreeningTemplateDefinition = (key?: string): ScreeningTemplateDefault | null => {
	void key;
	return null;
};

export const ensureDefaultScreeningTemplate = async (db: any, key?: string) => {
	void db;
	void key;
	return null;
};