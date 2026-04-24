export interface ModuleData {
  id: string;
  title: string;
  lessons: number;
  status: "complete" | "in_progress" | "locked" | "locked_by_payment";
  progress: number;
  duration?: string;
  score?: string;
  progressText?: string;
}

const normalize = (value: string | undefined): string => String(value || '').trim().toLowerCase();

const withDurations = (modules: ModuleData[]): ModuleData[] =>
  modules.map((module) => ({
    ...module,
    duration: module.lessons === 1 ? '1 lesson' : `${module.lessons} lessons`,
  }));

export const getModulesByCertification = (certName?: string, certSlug?: string): ModuleData[] => {
  const nameKey = normalize(certName);
  const slugKey = normalize(certSlug);
  const key = slugKey || nameKey;

  if (!key) return [];

  if (key === 'certified-executive-therapist' || key === 'certified executive therapist') {
    return withDurations([
      { id: "ATMT-E1", title: "Executive Module 1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-E2.1", title: "Executive Module 2.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-E2.2", title: "Executive Module 2.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-E4.1", title: "Executive Module 4.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-E4.2", title: "Executive Module 4.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-E4.3", title: "Executive Module 4.3", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-E5", title: "Executive Module 5", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-E6", title: "Executive Module 6", lessons: 1, status: "in_progress", progress: 0 },
    ]);
  }

  if (key === 'certified-nlp-therapist' || key === 'certified nlp therapist') {
    return withDurations([
      { id: "ATMT-C1.1", title: "NLP Module 1.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-C1.2", title: "NLP Module 1.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-C1.3", title: "NLP Module 1.3", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-C2.1", title: "NLP Module 2.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-C2.2", title: "NLP Module 2.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-C4", title: "NLP Module 4", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-C5.1", title: "NLP Module 5.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-C5.2", title: "NLP Module 5.2", lessons: 1, status: "in_progress", progress: 0 },
    ]);
  }

  if (key === 'certified-psychologist' || key === 'certified psychologist') {
    return withDurations([
      { id: "ATMT-P5.1", title: "Psychologist Module 1", lessons: 5, status: "in_progress", progress: 0 },
      { id: "ATMT-P5.2", title: "Psychologist Module 2", lessons: 6, status: "in_progress", progress: 0 },
      { id: "ATMT-P5.3", title: "Psychologist Module 3", lessons: 4, status: "in_progress", progress: 0 },
      { id: "ATMT-P5.4", title: "Psychologist Module 4", lessons: 7, status: "in_progress", progress: 0 },
    ]);
  }

  if (key === 'certified-psychiatrist' || key === 'certified psychiatrist') {
    return withDurations([
      { id: "ATMT-MD1.1", title: "MD Module 1.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD1.2", title: "MD Module 1.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD1.3", title: "MD Module 1.3", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD2.1", title: "MD Module 2.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD2.2", title: "MD Module 2.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD2.3", title: "MD Module 2.3", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD3.1", title: "MD Module 3.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD3.2", title: "MD Module 3.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD3.3", title: "MD Module 3.3", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD4.1", title: "MD Module 4.1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD4.2", title: "MD Module 4.2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD4.3", title: "MD Module 4.3", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-MD6", title: "MD Module 6", lessons: 1, status: "in_progress", progress: 0 },
    ]);
  }

  if (key === 'certified-asha-mental-wellness-champion' || key === 'certified asha mental wellness champion') {
    return withDurations([
      { id: "ATMT-ASHA-1", title: "Module 1", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-ASHA-2", title: "Module 2", lessons: 1, status: "in_progress", progress: 0 },
      { id: "ATMT-ASHA-3", title: "Module 3", lessons: 1, status: "in_progress", progress: 0 },
    ]);
  }

  if (key === 'certified-practitioner' || key === 'certified practitioner') {
    return withDurations([
      { id: "ATMT-1", title: "5Whys + Empathy", lessons: 4, status: "in_progress", progress: 50 },
      { id: "ATMT-2", title: "Fundamentals of NLP", lessons: 5, status: "in_progress", progress: 0 },
      { id: "ATMT-3", title: "NRI Mindset", lessons: 4, status: "in_progress", progress: 0 },
      { id: "ATMT-4", title: "What Good CBT Looks Like", lessons: 4, status: "in_progress", progress: 0 },
      { id: "ATMT-5", title: "Dashboard & Tools", lessons: 4, status: "in_progress", progress: 0 },
      { id: "ATMT-6", title: "Module 6", lessons: 8, status: "in_progress", progress: 0 },
      { id: "ATMT-7", title: "Module 7", lessons: 5, status: "in_progress", progress: 0 },
    ]);
  }

  // Unknown key: avoid leaking another certification's modules.
  return [];
};

export const getNextLessonId = (
  currentId: string,
  certName: string | undefined,
  certSlug?: string,
): string | null => {
  const modules = getModulesByCertification(certName, certSlug);
  const currentIndex = modules.findIndex((m) => m.id === currentId);

  if (currentIndex !== -1 && currentIndex < modules.length - 1) {
    return modules[currentIndex + 1].id;
  }

  return null;
};
