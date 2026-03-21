// @ts-ignore
import { create } from 'zustand';
// @ts-ignore
import { devtools, persist } from 'zustand/middleware';

// @ts-ignore
const persistTyped = persist as any;
// @ts-ignore
const devtoolsTyped = devtools as any;

interface CertificationProgressState {
    completedModules: Record<string, string[]>;
    quizUnlocked: Record<string, boolean>;
    markModuleComplete: (enrollmentId: string, moduleId: string, allModuleIds: string[]) => void;
    isModuleCompleted: (enrollmentId: string, moduleId: string) => boolean;
    isQuizUnlocked: (enrollmentId: string) => boolean;
}

export const useCertificationProgress = create<CertificationProgressState>(
    devtoolsTyped(
        persistTyped(
            (set: any, get: any) => ({
                completedModules: {},
                quizUnlocked: {},

                markModuleComplete: (enrollmentId: string, moduleId: string, allModuleIds: string[]) => {
                    const prev = get().completedModules[enrollmentId] ?? [];
                    const updated = Array.from(new Set([...prev, moduleId]));
                    const lastModuleId = allModuleIds[allModuleIds.length - 1];
                    const quizShouldUnlock =
                        updated.includes(lastModuleId) || (get().quizUnlocked[enrollmentId] ?? false);

                    set((state: CertificationProgressState) => ({
                        completedModules: { ...state.completedModules, [enrollmentId]: updated },
                        quizUnlocked: { ...state.quizUnlocked, [enrollmentId]: quizShouldUnlock },
                    }));
                },

                isModuleCompleted: (enrollmentId: string, moduleId: string): boolean => {
                    return (get().completedModules[enrollmentId] ?? []).includes(moduleId);
                },

                isQuizUnlocked: (enrollmentId: string): boolean => {
                    return get().quizUnlocked[enrollmentId] ?? false;
                },
            }),
            { name: 'certification-progress' }
        )
    )
);

export default useCertificationProgress;