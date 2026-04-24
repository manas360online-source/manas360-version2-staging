import React, { useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEnrollmentStore } from "../store/CertificationEnrollmentStore";
import { getModulesByCertification, ModuleData } from "../utils/certificationLessonUtils";
import { useCertificationProgress } from "../store/useCertificationProgress";
import { ClipboardCheck, Lock } from "lucide-react";

type ModuleStatus = "complete" | "in_progress" | "locked" | "locked_by_payment";

export const CertificationModulesPage: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { enrollments, syncEnrollments } = useEnrollmentStore();
  const { isModuleCompleted, isQuizUnlocked } = useCertificationProgress();

  useEffect(() => {
    void syncEnrollments();
  }, [syncEnrollments]);

  const enrollment = useMemo(() =>
    enrollments.find((e: any) => e.id === enrollmentId),
    [enrollments, enrollmentId]);

  const baseModules: ModuleData[] = useMemo(() =>
    getModulesByCertification(enrollment?.certificationName, enrollment?.slug),
    [enrollment]);

  /**
   * Derive the live status of each module:
   * - Module is "complete"     if its ID is in completedModules for this enrollment
   * - Module is "in_progress"  if it's the first one that's NOT yet complete AND
   *                              all previous ones ARE complete (i.e. it's unlocked)
   * - Module is "locked"       otherwise
   */
  const modules: ModuleData[] = useMemo(() => {
    if (!enrollmentId) return baseModules;

    // Payment-based locking logic
    const installmentsPaid = enrollment?.installmentsPaidCount || 0;
    const isFullPaid = enrollment?.paymentStatus === 'Paid';
    const isInstallmentPlan = enrollment?.paymentPlan === 'installment';

    let maxUnlockedByPayment = 0;
    if (isFullPaid) {
      maxUnlockedByPayment = baseModules.length;
    } else if (isInstallmentPlan && installmentsPaid > 0) {
      maxUnlockedByPayment = Math.ceil((baseModules.length / 3) * installmentsPaid);
    } else {
      maxUnlockedByPayment = 0;
    }

    return baseModules.map((module, index) => {
      // Determine if it's locked by payment first
      const isLockedByPayment = index >= maxUnlockedByPayment;

      if (isModuleCompleted(enrollmentId, module.id)) {
        return { ...module, status: "complete", progress: 100 };
      }

      if (isLockedByPayment) {
        return { ...module, status: "locked_by_payment" as const, progress: 0 };
      }

      // A module is unlocked if it's the first module OR all previous modules are complete
      const allPreviousComplete = baseModules
        .slice(0, index)
        .every((m) => isModuleCompleted(enrollmentId, m.id));

      if (allPreviousComplete) {
        return { ...module, status: "in_progress", progress: 0 };
      }

      return { ...module, status: "locked", progress: 0 };
    });
  }, [baseModules, enrollment, enrollmentId, isModuleCompleted]);

  const quizUnlocked = enrollmentId ? isQuizUnlocked(enrollmentId) : false;

  const getStatusStyles = (status: ModuleStatus) => {
    switch (status) {
      case "complete":
        return {
          wrapper: "border-l-[6px] border-emerald-500 opacity-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1",
          icon: "✅ Complete",
          barColor: "bg-emerald-500",
          barTrack: "bg-emerald-100",
          badge: "bg-white border border-slate-200 text-slate-700",
        };
      case "in_progress":
        return {
          wrapper: "border-l-[6px] border-blue-500 opacity-100 shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-1",
          icon: "🔄 In Progress",
          barColor: "bg-blue-500",
          barTrack: "bg-blue-100",
          badge: "bg-blue-50 border border-blue-200 text-blue-700",
        };
      case "locked_by_payment":
        return {
          wrapper: "border-l-[6px] border-amber-300 opacity-80 bg-amber-50 cursor-not-allowed",
          icon: "💳 Payment Required",
          barColor: "bg-transparent",
          barTrack: "bg-transparent",
          badge: "bg-amber-100 text-amber-800",
        };
      case "locked":
      default:
        return {
          wrapper: "border-l-[6px] border-slate-200 opacity-50 bg-slate-50 cursor-not-allowed",
          icon: "🔒 Locked",
          barColor: "bg-transparent",
          barTrack: "bg-transparent",
          badge: "",
        };
    }
  };

  const handleModuleClick = (status: ModuleStatus, moduleId: string) => {
    if (status === "locked_by_payment") {
      alert("Please pay your next installment to unlock more modules.");
      navigate('/my-certifications');
      return;
    }
    if (status !== "locked") {
      navigate(`/certifications/lessons/${moduleId}`, { state: { enrollmentId } });
    }
  };

  const handleQuizClick = () => {
    if (quizUnlocked) {
      navigate(`/certifications/quiz/${enrollmentId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-6 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-serif">
            Training Modules
          </h1>
          <p className="text-slate-500 text-sm">
            Complete your coursework to unlock your certification exam.
          </p>
          {enrollment?.paymentPlan === 'installment' && enrollment?.paymentStatus !== 'Paid' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium inline-block">
              You are on an installment plan. Pay next installment to unlock modules {Math.ceil((baseModules.length / 3) * (enrollment.installmentsPaidCount || 1)) + 1} and beyond.
            </div>
          )}
        </div>

        {/* Module List */}
        <div className="space-y-5 mb-10">
          {modules.map((module) => {
            const styles = getStatusStyles(module.status);

            return (
              <div
                key={module.id}
                onClick={() => handleModuleClick(module.status, module.id)}
                className={`p-6 bg-white rounded-2xl transition-all duration-200 flex flex-col gap-4 ${styles.wrapper}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-900 mb-1 font-serif">
                      {module.title}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {module.duration || (module.lessons === 1 ? '1 lesson' : `${module.lessons} lessons`)} • {styles.icon}
                    </p>

                    {module.status !== "locked" && (
                      <div className="mt-4 max-w-md">
                        <div className={`h-2 rounded-full overflow-hidden ${styles.barTrack}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${styles.barColor}`}
                            style={{ width: `${module.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {module.status !== "locked" ? (
                    <div className="flex-shrink-0 flex items-center gap-4">
                      {(module.score || module.progressText) && (
                        <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide ${styles.badge}`}>
                          {module.score || module.progressText}
                        </span>
                      )}
                      <span className="text-slate-400 font-bold text-lg">→</span>
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <Lock size={18} className="text-slate-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Attend the Quiz Button */}
        {modules.length > 0 && (
          <div className="flex flex-col items-center mt-8 mb-12 gap-3">
            <button
              onClick={handleQuizClick}
              disabled={!quizUnlocked}
              className={`flex items-center justify-center gap-3 px-8 py-4 font-bold text-lg rounded-2xl shadow-xl transition-all duration-300
                ${quizUnlocked
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-2xl hover:from-purple-700 hover:to-blue-700 transform hover:scale-[1.03] cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
            >
              {quizUnlocked ? (
                <ClipboardCheck size={24} />
              ) : (
                <Lock size={24} />
              )}
              Attend Certification Quiz
            </button>

            {!quizUnlocked && (
              <p className="text-xs text-slate-400 text-center">
                Complete all modules to unlock the certification quiz.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};