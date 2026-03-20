// @ts-ignore
import { create } from 'zustand';
// @ts-ignore
import { devtools, persist } from 'zustand/middleware';
import { Enrollment } from '../CertificationTypes';

// @ts-ignore
const persistTyped = persist as any;
// @ts-ignore
const devtoolsTyped = devtools as any;

interface EnrollmentState {
  enrollments: Enrollment[];
  addEnrollment: (enrollment: Enrollment) => void;
  updateProgress: (id: string, progress: number) => void;
  payInstallment: (id: string) => void;
  clearEnrollments: () => void;
  getEnrollmentBySlug: (slug: string) => Enrollment | undefined;
}

export const useEnrollmentStore = create<EnrollmentState>(
  devtoolsTyped(
    persistTyped(
      (set: any, get: any) => ({
        enrollments: [],

        addEnrollment: (enrollment: Enrollment) => {
          set((state: EnrollmentState) => ({
            enrollments: [...state.enrollments, enrollment],
          }));
        },

        updateProgress: (id: string, progress: number) => {
          set((state: EnrollmentState) => ({
            enrollments: state.enrollments.map((e: Enrollment) =>
              e.id === id ? { 
                ...e, 
                completionPercentage: Math.min(100, Math.max(0, progress)),
                modulesCompleted: Math.floor((progress / 100) * 10)
              } : e
            ),
          }));
        },

        payInstallment: (id: string) => {
          set((state: EnrollmentState) => {
            const enrollment = state.enrollments.find((e: Enrollment) => e.id === id);
            if (!enrollment || enrollment.paymentPlan !== 'installment') return state;

            const nextPaidCount = enrollment.installmentsPaidCount + 1;
            const isFullyPaid = nextPaidCount >= 3;
            
            const nextDue = new Date();
            nextDue.setDate(nextDue.getDate() + 30);

            return {
              enrollments: state.enrollments.map((e: Enrollment) => e.id === id ? {
                ...e,
                installmentsPaidCount: nextPaidCount,
                paymentStatus: isFullyPaid ? 'Paid' : 'Partial',
                amountPaid: e.amountPaid + (e.totalAmount / 3),
                nextInstallmentDue: isFullyPaid ? undefined : nextDue.toISOString()
              } : e)
            };
          });
        },

        clearEnrollments: () => {
          set({ enrollments: [] });
        },

        getEnrollmentBySlug: (slug: string) => {
          return get().enrollments.find((e: Enrollment) => e.slug === slug);
        },
      }),
      {
        name: 'certification-enrollments',
      }
    )
  )
);

export default useEnrollmentStore;
