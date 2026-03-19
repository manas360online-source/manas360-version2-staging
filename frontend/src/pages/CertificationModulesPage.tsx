import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEnrollmentStore } from "../store/CertificationEnrollmentStore";
import { getModulesByCertification, ModuleData } from "../utils/certificationLessonUtils";
import { ClipboardCheck } from "lucide-react";

type ModuleStatus = "complete" | "in_progress" | "locked";

export const CertificationModulesPage: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { enrollments } = useEnrollmentStore();

  const enrollment = useMemo(() => 
    enrollments.find((e: any) => e.id === enrollmentId),
  [enrollments, enrollmentId]);

  const modules: ModuleData[] = useMemo(() => {
    return getModulesByCertification(enrollment?.certificationName);
  }, [enrollment]);

  // Updated styles to include interactive cursor and hover states
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
      case "locked":
      default:
        return {
          wrapper: "border-l-[6px] border-slate-200 opacity-60 bg-slate-50 cursor-not-allowed",
          icon: "🔒 Locked",
          barColor: "bg-transparent",
          barTrack: "bg-transparent",
          badge: "",
        };
    }
  };

  // Click handler for the cards
  const handleModuleClick = (status: ModuleStatus, moduleId: string) => {
    if (status !== "locked") {
      navigate(`/certifications/lessons/${moduleId}`);
    }
  };

  // Navigate to quiz page for the certification
  const handleQuizClick = () => {
    navigate(`/certifications/quiz/${enrollmentId}`);
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
                      {module.duration} • {styles.icon}
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

                  {module.status !== "locked" && (
                    <div className="flex-shrink-0 flex items-center gap-4">
                      {(module.score || module.progressText) && (
                        <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide ${styles.badge}`}>
                          {module.score || module.progressText}
                        </span>
                      )}
                      {/* Subtle arrow to indicate clickability */}
                      <span className="text-slate-400 font-bold text-lg">→</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Global Attend the Quiz Button */}
        {modules.length > 0 && (
          <div className="flex justify-center mt-8 mb-12">
            <button
              onClick={handleQuizClick}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:from-purple-700 hover:to-blue-700 transform hover:scale-[1.03] transition-all duration-300"
            >
              <ClipboardCheck size={24} />
              Attend Certification Quiz
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
