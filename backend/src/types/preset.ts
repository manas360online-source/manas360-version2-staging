/**
 * Types for preset assessment submission
 */

import type { PresetEntryType } from '../config/presetDefaults';

export interface PresetAssessmentSubmitRequest {
	// Entry type (therapist, psychiatrist, couples, nri_psychologist, nri_psychiatrist, nri_therapist)
	entryType: PresetEntryType;
	// Assessment responses (answer choices)
	responses: number[];
	// Optional source tracking
	source?: {
		entryType?: string;
		landingPage?: string;
		utmCampaign?: string;
		utmMedium?: string;
		utmSource?: string;
		experimentId?: string;
		timezoneRegion?: string;
		primaryConcerns?: string[];
		languagePreference?: string;
	};
	// Optional overrides for assessment type or modality
	overrides?: {
		assessmentType?: string;
		modality?: string;
	};
}

export interface PresetAssessmentSubmitResponse {
	assessmentId: string;
	entryType: PresetEntryType;
	score: number;
	severity: string;
	type: string;
	createdAt: Date;
	// Journey recommendation if available
	journey?: {
		recommendation: string;
		nextSteps: string[];
	};
}
