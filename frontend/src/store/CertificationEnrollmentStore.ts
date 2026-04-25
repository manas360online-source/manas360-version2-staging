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
  loading: boolean;
  addEnrollment: (enrollment: Enrollment) => void;
  updateEnrollment: (id: string, patch: Partial<Enrollment>) => void;
  updateProgress: (id: string, progress: number) => void;
  payInstallment: (id: string) => void;
  syncEnrollments: () => Promise<void>;
  clearEnrollments: () => void;
  getEnrollmentBySlug: (slug: string) => Enrollment | undefined;
}

export const useEnrollmentStore = create<EnrollmentState>(
  devtoolsTyped(
    persistTyped(
      (set: any, get: any) => ({
        enrollments: [],
        loading: false,

        addEnrollment: (enrollment: Enrollment) => {
          set((state: EnrollmentState) => ({
            enrollments: [...state.enrollments, enrollment],
          }));
        },

        // ── ADDED ──────────────────────────────────────────────────────────────
        // Merges `patch` into the matching enrollment by id.
        // Used by CertificationCertificatePage to stamp certId onto the record
        // so the verification page can do an exact lookup.
        updateEnrollment: (id: string, patch: Partial<Enrollment>) => {
          set((state: EnrollmentState) => ({
            enrollments: state.enrollments.map((e: Enrollment) =>
              e.id === id ? { ...e, ...patch } : e
            ),
          }));
        },
        // ───────────────────────────────────────────────────────────────────────

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

        payInstallment: async (id: string) => {
          const { payCertificationInstallment } = await import('../api/certifications');
          
          set({ loading: true });
          try {
            await payCertificationInstallment(id);
            // After successful backend update, sync local state
            const current = get().enrollments.find((e: Enrollment) => e.id === id);
            if (current) {
               const nextPaidCount = (current.installmentsPaidCount || 1) + 1;
               const isFullyPaid = nextPaidCount >= 3;
               const nextDue = new Date();
               nextDue.setDate(nextDue.getDate() + 30);

               set((state: EnrollmentState) => ({
                 enrollments: state.enrollments.map((e: Enrollment) => e.id === id ? {
                   ...e,
                   installmentsPaidCount: nextPaidCount,
                   paymentStatus: isFullyPaid ? 'Paid' : 'Partial',
                   amountPaid: e.amountPaid + (e.totalAmount / 3),
                   nextInstallmentDue: isFullyPaid ? undefined : nextDue.toISOString()
                 } : e)
               }));
            }
          } catch (err) {
            console.error('Failed to record installment payment', err);
            alert("Failed to process payment. Please try again.");
          } finally {
            set({ loading: false });
          }
        },

        syncEnrollments: async () => {
          const { getMyCertificationState } = await import('../api/certifications');
          const { CERTIFICATIONS } = await import('../CertificationConstants');
          
          set({ loading: true });
          try {
            const state = await getMyCertificationState();
            const stateAny = state as any;
            const rawEnrollments = Array.isArray(stateAny?.enrollments)
              ? stateAny.enrollments
              : Array.isArray(stateAny?.certifications)
                ? stateAny.certifications
                : [];
            
            // Map the new CertificationEnrollment table data
            const backendEnrollments = rawEnrollments.map((e: any) => {
              const fullCert = CERTIFICATIONS.find(f => f.slug === e.certificationSlug);
              return {
                id: e.id,
                certificationId: e.certificationId || fullCert?.id || e.id,
                certificationName: fullCert?.name || e.certificationName || e.certificationSlug,
                slug: e.certificationSlug,
                badgeColor: (fullCert?.badgeColor || 'blue') as any,
                enrollmentDate: e.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                paymentStatus: e.status === 'PAID' || e.status === 'COMPLETED' || e.status === 'VERIFIED' || e.status === 'ENROLLED' ? 'Paid' : 
                              e.status === 'PARTIAL' ? 'Partial' : 'Pending',
                paymentPlan: (e.paymentPlan || 'full').toLowerCase() as any,
                amountPaid: e.amountPaid || 0,
                totalAmount: e.totalAmount || 0,
                installmentsPaidCount: e.installmentsPaidCount || 1,
                completionPercentage: e.progress || 0,
                modulesCompleted: e.modulesCompleted || 0,
                certId: e.certId || e.id,
                userName: stateAny.displayName || stateAny.name || 'MANAS360 Practitioner',
                nextInstallmentDue: e.nextInstallmentDue,
              } as Enrollment;
            });

            set({ enrollments: backendEnrollments });
          } catch (err) {
            console.error('Failed to sync enrollments', err);
          } finally {
            set({ loading: false });
          }
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