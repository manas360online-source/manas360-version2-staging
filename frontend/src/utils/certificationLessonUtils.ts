
export interface ModuleData {
  id: string;
  title: string;
  lessons: number;
  duration: string;
  status: "complete" | "in_progress" | "locked";
  progress: number;
  score?: string;
  progressText?: string;
}

export const getModulesByCertification = (certName: string | undefined): ModuleData[] => {
  if (certName === "Certified Executive Therapist") {
    return [
      { id: "ATMT-E1", title: "Executive Module 1", lessons: 1, duration: "2 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-E2.1", title: "Executive Module 2.1", lessons: 1, duration: "8 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-E2.2", title: "Executive Module 2.2", lessons: 1, duration: "8 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-E4.1", title: "Executive Module 4.1", lessons: 1, duration: "10 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-E4.2", title: "Executive Module 4.2", lessons: 1, duration: "8 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-E4.3", title: "Executive Module 4.3", lessons: 1, duration: "8 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-E5", title: "Executive Module 5", lessons: 1, duration: "10 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-E6", title: "Executive Module 6", lessons: 1, duration: "10 mins", status: "in_progress", progress: 0 },
    ];
  }

  if (certName === "Certified NLP Therapist") {
    return [
      { id: "ATMT-C1.1", title: "NLP Module 1.1", lessons: 1, duration: "8 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-C1.2", title: "NLP Module 1.2", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-C1.3", title: "NLP Module 1.3", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-C2.1", title: "NLP Module 2.1", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-C2.2", title: "NLP Module 2.2", lessons: 1, duration: "9 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-C4", title: "NLP Module 4", lessons: 1, duration: "3 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-C5.1", title: "NLP Module 5.1", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-C5.2", title: "NLP Module 5.2", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
    ];
  }

  if (certName === "Certified Psychologist") {
    return [
      { id: "ATMT-P5.1", title: "Psychologist Module 1", lessons: 5, duration: "1 min", status: "in_progress", progress: 0 },
      { id: "ATMT-P5.2", title: "Psychologist Module 2", lessons: 6, duration: "5 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-P5.3", title: "Psychologist Module 3", lessons: 4, duration: "5 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-P5.4", title: "Psychologist Module 4", lessons: 7, duration: "10 mins", status: "in_progress", progress: 0 }
    ];
  }

  if (certName === "Certified Psychiatrist") {
    return [
      { id: "ATMT-MD1.1", title: "MD Module 1.1", lessons: 1, duration: "6 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD1.2", title: "MD Module 1.2", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD1.3", title: "MD Module 1.3", lessons: 1, duration: "8 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD2.1", title: "MD Module 2.1", lessons: 1, duration: "4 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD2.2", title: "MD Module 2.2", lessons: 1, duration: "5 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD2.3", title: "MD Module 2.3", lessons: 1, duration: "5 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD3.1", title: "MD Module 3.1", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD3.2", title: "MD Module 3.2", lessons: 1, duration: "8 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD3.3", title: "MD Module 3.3", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD4.1", title: "MD Module 4.1", lessons: 1, duration: "10 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD4.2", title: "MD Module 4.2", lessons: 1, duration: "10 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD4.3", title: "MD Module 4.3", lessons: 1, duration: "10 mins", status: "in_progress", progress: 0 },
      { id: "ATMT-MD6", title: "MD Module 6", lessons: 1, duration: "15 mins", status: "in_progress", progress: 0 },
    ];
  }

  if (certName === "Certified ASHA Mental Wellness Champion") {
    return [
      { id: "ATMT-ASHA", title: "ASHA Training", lessons: 1, duration: "7 mins", status: "in_progress", progress: 0 }
    ];
  }

  // Default Practitioner
  return [
    { id: "ATMT-OPENING", title: "Opening Session", lessons: 1, duration: "5 mins", status: "complete", progress: 100, score: "Completed" },
    { id: "ATMT-1", title: "5Whys + Empathy", lessons: 4, duration: "45 mins", status: "in_progress", progress: 50 },
    { id: "ATMT-2", title: "Fundamentals of NLP", lessons: 5, duration: "50 mins", status: "in_progress", progress: 0 },
    { id: "ATMT-3", title: "NRI Mindset", lessons: 4, duration: "35 mins", status: "in_progress", progress: 0 },
    { id: "ATMT-4", title: "What Good CBT Looks Like", lessons: 4, duration: "40 mins", status: "in_progress", progress: 0 },
    { id: "ATMT-5", title: "Dashboard & Tools", lessons: 4, duration: "30 mins", status: "in_progress", progress: 0 },
    { id: "ATMT-6", title: "Module 6", lessons: 8, duration: "2 mins", status: "in_progress", progress: 0 },
    { id: "ATMT-7", title: "Module 7", lessons: 5, duration: "2 mins", status: "in_progress", progress: 0 }
  ];
};

export const getNextLessonId = (currentId: string, certName: string | undefined): string | null => {
  const modules = getModulesByCertification(certName);
  const currentIndex = modules.findIndex(m => m.id === currentId);

  if (currentIndex !== -1 && currentIndex < modules.length - 1) {
    return modules[currentIndex + 1].id;
  }

  return null;
};
