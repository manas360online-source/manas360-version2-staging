/**
 * Preset defaults for assessment entry points.
 * Defines assessment overrides and matching criteria for each preset type.
 */

export type PresetEntryType =
	| 'therapist'
	| 'psychiatrist'
	| 'couples'
	| 'nri_psychologist'
	| 'nri_psychiatrist'
	| 'nri_therapist';

export interface PresetAssessmentDefaults {
	// Assessment type (PHQ-9, GAD-7, etc.)
	assessmentType: string;
	// Default modality for matching (individual, couples, group, etc.)
	defaultModality?: string;
	// Whether med-seeking is prioritized for this preset
	medSeekingDefault?: boolean;
	// Budget multiplier for matching (1.0 = baseline, higher = higher budget/priority)
	budgetMultiplier?: number;
	// Provider type filter (therapist, psychiatrist, counselor, etc.)
	providerTypeFilter?: string;
	// Specialization requirements
	specializationRequired?: string[];
	// Credential filter
	credentialFilter?: string[];
	// Session type requirements
	sessionTypeFilter?: string[];
	// Concern prefill keys
	concernPrefill?: string[];
	// Localization/copy overrides
	displayName: string;
	description: string;
}

export const PRESET_DEFAULTS: Record<PresetEntryType, PresetAssessmentDefaults> = {
	therapist: {
		assessmentType: 'PHQ-9',
		defaultModality: 'individual',
		medSeekingDefault: false,
		budgetMultiplier: 1.0,
		providerTypeFilter: 'therapist',
		credentialFilter: ['PSYCHOLOGIST', 'COUNSELOR', 'THERAPIST'],
		displayName: 'Find a Therapist',
		description: 'Get matched with a therapist based on your mental health needs',
	},
	psychiatrist: {
		assessmentType: 'PHQ-9',
		defaultModality: 'individual',
		medSeekingDefault: true,
		budgetMultiplier: 1.5,
		providerTypeFilter: 'psychiatrist',
		specializationRequired: ['psychiatry', 'mental-health'],
		credentialFilter: ['PSYCHIATRIST', 'MEDICAL', 'MD', 'DO'],
		sessionTypeFilter: ['medical'],
		displayName: 'Find a Psychiatrist',
		description: 'Get connected with a psychiatrist to explore medication options',
	},
	couples: {
		assessmentType: 'GAD-7',
		defaultModality: 'couples',
		medSeekingDefault: false,
		budgetMultiplier: 1.2,
		providerTypeFilter: 'therapist',
		credentialFilter: ['COUPLES_THERAPIST', 'THERAPIST'],
		sessionTypeFilter: ['couples'],
		concernPrefill: ['relationship', 'communication', 'intimacy'],
		displayName: 'Find Couples Therapy',
		description: 'Get matched with a couples therapist for relationship support',
	},
	nri_psychologist: {
		assessmentType: 'PHQ-9',
		defaultModality: 'individual',
		medSeekingDefault: false,
		budgetMultiplier: 1.3,
		providerTypeFilter: 'psychologist',
		credentialFilter: ['PSYCHOLOGIST', 'COUNSELOR', 'THERAPIST'],
		sessionTypeFilter: ['video'],
		displayName: 'NRI Psychologist',
		description: 'NRI-focused psychologist session with timezone-aware matching',
	},
	nri_psychiatrist: {
		assessmentType: 'PHQ-9',
		defaultModality: 'individual',
		medSeekingDefault: true,
		budgetMultiplier: 1.5,
		providerTypeFilter: 'psychiatrist',
		specializationRequired: ['psychiatry', 'mental-health'],
		credentialFilter: ['PSYCHIATRIST', 'MEDICAL', 'MD', 'DO'],
		sessionTypeFilter: ['medical', 'video'],
		displayName: 'NRI Psychiatrist',
		description: 'NRI psychiatrist consult for medication and clinical support',
	},
	nri_therapist: {
		assessmentType: 'PHQ-9',
		defaultModality: 'individual',
		medSeekingDefault: false,
		budgetMultiplier: 1.4,
		providerTypeFilter: 'therapist',
		credentialFilter: ['PSYCHOLOGIST', 'COUNSELOR', 'THERAPIST'],
		sessionTypeFilter: ['video'],
		displayName: 'NRI Therapist',
		description: 'NRI-certified therapist matching for per-session video care',
	},
};

/**
 * Get preset defaults for an entry type
 */
export const getPresetDefaults = (entryType: string): PresetAssessmentDefaults | null => {
	if (entryType in PRESET_DEFAULTS) {
		return PRESET_DEFAULTS[entryType as PresetEntryType];
	}
	return null;
};

/**
 * Validate if an entry type is recognized
 */
export const isValidPresetEntryType = (entryType: string): entryType is PresetEntryType => {
	return entryType in PRESET_DEFAULTS;
};
