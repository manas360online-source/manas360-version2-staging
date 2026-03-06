export type ProviderRole = 'therapist' | 'psychiatrist' | 'coach';

export type CareDomainModule =
  | 'patientProfile'
  | 'diagnosis'
  | 'moodTracking'
  | 'assessments'
  | 'therapyProgress'
  | 'carePlanSummary'
  | 'therapyNotes'
  | 'cbtExercises'
  | 'prescriptions'
  | 'medicationManagement'
  | 'drugInteractions'
  | 'habits'
  | 'lifestyleGoals';

export const SHARED_READ_MODULES: CareDomainModule[] = [
  'patientProfile',
  'diagnosis',
  'moodTracking',
  'assessments',
  'therapyProgress',
  'carePlanSummary',
];

const editableByRole: Record<ProviderRole, CareDomainModule[]> = {
  therapist: ['therapyNotes', 'cbtExercises'],
  psychiatrist: ['prescriptions', 'medicationManagement', 'drugInteractions'],
  coach: ['habits', 'lifestyleGoals'],
};

export const roleDisplayName: Record<ProviderRole, string> = {
  therapist: 'Therapist',
  psychiatrist: 'Psychiatrist',
  coach: 'Mental Health Coach',
};

export function isProviderRole(value: unknown): value is ProviderRole {
  if (typeof value !== 'string') return false;
  return value === 'therapist' || value === 'psychiatrist' || value === 'coach';
}

export function getEditableModules(role: ProviderRole): CareDomainModule[] {
  return editableByRole[role];
}

export function canEditModule(role: ProviderRole, module: CareDomainModule): boolean {
  return editableByRole[role].includes(module);
}

export type RoleCapabilityRow = {
  role: ProviderRole;
  treatmentFocus: string;
  canEdit: string[];
  cannotEdit: string[];
};

export const ROLE_CAPABILITY_ROWS: RoleCapabilityRow[] = [
  {
    role: 'therapist',
    treatmentFocus: 'Psychological treatment (CBT, behavioral, trauma, emotional regulation)',
    canEdit: ['Therapy notes', 'CBT exercises'],
    cannotEdit: ['Prescriptions', 'Medication changes', 'Drug interaction controls'],
  },
  {
    role: 'psychiatrist',
    treatmentFocus: 'Medication treatment and psychiatric review',
    canEdit: ['Prescriptions', 'Medication plans', 'Drug interaction management'],
    cannotEdit: ['CBT exercises', 'Therapy notes'],
  },
  {
    role: 'coach',
    treatmentFocus: 'Lifestyle support and adherence coaching',
    canEdit: ['Habits', 'Lifestyle goals'],
    cannotEdit: ['Prescriptions', 'Therapy notes', 'CBT protocol changes'],
  },
];
