/**
 * Preset defaults for assessment entry points (Frontend)
 * Defines UI strings, defaults, and configurations for each preset type
 */

export type PresetEntryType =
  | 'therapist'
  | 'psychiatrist'
  | 'couples'
  | 'nri_psychologist'
  | 'nri_psychiatrist'
  | 'nri_therapist';

export type NriPresetEntryType = 'nri_psychologist' | 'nri_psychiatrist' | 'nri_therapist';

export interface PresetEntryConfig {
  displayName: string;
  description: string;
  assessmentType: 'PHQ-9' | 'GAD-7';
  defaultModality?: string;
  concernPrefill?: string[];
  badgeColor?: string;
  icon?: string;
  ctaText: string;
}

export interface PresetAssessmentLinkParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  source?: string;
}

export const PRESET_ENTRY_CONFIGS: Record<PresetEntryType, PresetEntryConfig> = {
  therapist: {
    displayName: 'Find a Therapist',
    description: 'Get matched with a therapist based on your mental health needs',
    assessmentType: 'PHQ-9',
    defaultModality: 'individual',
    badgeColor: 'bg-blue-100',
    icon: '👤',
    ctaText: 'Start Assessment',
  },
  psychiatrist: {
    displayName: 'Find a Psychiatrist',
    description: 'Get connected with a psychiatrist to explore medication options',
    assessmentType: 'PHQ-9',
    defaultModality: 'individual',
    badgeColor: 'bg-purple-100',
    icon: '👨‍⚕️',
    ctaText: 'Start Assessment',
  },
  couples: {
    displayName: 'Find Couples Therapy',
    description: 'Get matched with a couples therapist for relationship support',
    assessmentType: 'GAD-7',
    defaultModality: 'couples',
    concernPrefill: ['relationship', 'communication'],
    badgeColor: 'bg-pink-100',
    icon: '👫',
    ctaText: 'Start Assessment',
  },
  nri_psychologist: {
    displayName: 'Indian Psychologist (Global Timings)',
    description: 'Book a video consultation with an Indian psychologist (INR 2,999/session)',
    assessmentType: 'PHQ-9',
    defaultModality: 'individual',
    concernPrefill: ['stress', 'anxiety', 'loneliness'],
    badgeColor: 'bg-cyan-100',
    icon: '🌍',
    ctaText: 'Start Assessment',
  },
  nri_psychiatrist: {
    displayName: 'Indian Psychiatrist (Global Timings)',
    description: 'Book a medication consult with an Indian psychiatrist (INR 3,499/session)',
    assessmentType: 'PHQ-9',
    defaultModality: 'individual',
    concernPrefill: ['anxiety', 'depression'],
    badgeColor: 'bg-indigo-100',
    icon: '🩺',
    ctaText: 'Start Assessment',
  },
  nri_therapist: {
    displayName: 'Indian Therapist (Global Timings)',
    description: 'Book a video therapy session with an Indian therapist (INR 3,599/session)',
    assessmentType: 'PHQ-9',
    defaultModality: 'individual',
    concernPrefill: ['career', 'family', 'identity'],
    badgeColor: 'bg-teal-100',
    icon: '🧠',
    ctaText: 'Start Assessment',
  },
};

/**
 * Get preset config by entry type
 */
export const getPresetConfig = (entryType: string): PresetEntryConfig | null => {
  if (entryType in PRESET_ENTRY_CONFIGS) {
    return PRESET_ENTRY_CONFIGS[entryType as PresetEntryType];
  }
  return null;
};

/**
 * Validate if an entry type is recognized
 */
export const isValidPresetEntryType = (entryType: string): entryType is PresetEntryType => {
  return entryType in PRESET_ENTRY_CONFIGS;
};

export const buildPresetAssessmentLink = (
  entryType: PresetEntryType,
  params: PresetAssessmentLinkParams = {},
) => {
  const searchParams = new URLSearchParams({ entry: entryType });

  if (params.utmSource) searchParams.set('utm_source', params.utmSource);
  if (params.utmMedium) searchParams.set('utm_medium', params.utmMedium);
  if (params.utmCampaign) searchParams.set('utm_campaign', params.utmCampaign);
  if (params.source) searchParams.set('source', params.source);

  return `/assessment-preset?${searchParams.toString()}`;
};

export const buildNriPresetAssessmentLink = (
  entryType: NriPresetEntryType,
  params: PresetAssessmentLinkParams = {},
) => buildPresetAssessmentLink(entryType, params);

/**
 * Get UTM parameters from query string
 */
export const parseUtmParams = (input?: URLSearchParams | string) => {
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(typeof input === 'string' ? input : window.location.search);

  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  };
};
