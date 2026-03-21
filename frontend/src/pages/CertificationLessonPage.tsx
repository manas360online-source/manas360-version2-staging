import React, { useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEnrollmentStore } from "../store/CertificationEnrollmentStore";
import { getModulesByCertification } from "../utils/certificationLessonUtils";
import { useCertificationProgress } from "../store/useCertificationProgress";

export const CertificationLessonPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Resolve enrollmentId from URL state or store ──────────────────────────
  // The modules page navigates here as: navigate(`/certifications/lessons/${moduleId}`)
  // We need the enrollmentId to call markModuleComplete.
  // Best practice: pass it via router state. If not available, fall back to
  // searching enrollments for a match.
  const { enrollments } = useEnrollmentStore();
  const { markModuleComplete } = useCertificationProgress();

  // Try to get enrollmentId from router location state (set by modules page)
  // If not present we find the enrollment whose module list includes this lessonId
  const enrollmentId = useMemo(() => {
    // Walk all enrollments and find the one whose module list contains lessonId
    for (const enrollment of enrollments) {
      const modules = getModulesByCertification((enrollment as any).certificationName);
      if (modules.some((m) => m.id === lessonId)) {
        return (enrollment as any).id as string;
      }
    }
    return null;
  }, [enrollments, lessonId]);

  const allModuleIds = useMemo(() => {
    if (!enrollmentId) return [];
    const enrollment = enrollments.find((e: any) => e.id === enrollmentId);
    return getModulesByCertification((enrollment as any)?.certificationName).map((m) => m.id);
  }, [enrollmentId, enrollments]);

  // ── Video completion handler ──────────────────────────────────────────────
  const handleVideoEnded = useCallback(() => {
    if (!enrollmentId || !lessonId) return;
    markModuleComplete(enrollmentId, lessonId, allModuleIds);
  }, [enrollmentId, lessonId, allModuleIds, markModuleComplete]);

  // ── Helpers (unchanged from original) ────────────────────────────────────
  const isOpeningSession = lessonId === "ATMT-OPENING";

  const getLessonTitle = () => {
    if (lessonId?.startsWith("ATMT-E")) return lessonId.replace("ATMT-E", "Executive Module ");
    if (lessonId?.startsWith("ATMT-MD")) return lessonId.replace("ATMT-MD", "MD Module ");
    if (lessonId?.startsWith("ATMT-C")) return lessonId.replace("ATMT-C", "NLP Module ");

    switch (lessonId) {
      case "ATMT-OPENING": return "Opening Session";
      case "ATMT-1": return "Onboarding Module 1";
      case "ATMT-2": return "Module 2";
      case "ATMT-3": return "Module 3";
      case "ATMT-4": return "Module 4";
      case "ATMT-5": return "Module 5";
      case "ATMT-6": return "Module 6";
      case "ATMT-7": return "Module 7";
      case "ATMT-P5.1": return "Psychologist Module 1";
      case "ATMT-P5.2": return "Psychologist Module 2";
      case "ATMT-P5.3": return "Psychologist Module 3";
      case "ATMT-P5.4": return "Psychologist Module 4";
      case "ATMT-ASHA": return "ASHA Training";
      default: return "Certification Lesson";
    }
  };

  const currentTitle = getLessonTitle();

  const getVideoSrc = () => {
    if (lessonId?.startsWith("ATMT-E")) {
      if (lessonId === "ATMT-E1") return "/ATMT-E1_Aatman_Engineering.pptx.mp4";
      return `/${lessonId}-Executive.mp4`;
    }
    if (lessonId?.startsWith("ATMT-MD")) return `/${lessonId}-Psychiatrist.mp4`;

    switch (lessonId) {
      case "ATMT-C1.1": return "/ATMT-C1.1-Behavioral Science NLP.mp4";
      case "ATMT-C1.2": return "/ATMT-C1.2--Behavioral Science NLP.mp4";
      case "ATMT-C1.3": return "/ATMT-C1.3-Behavioral Science NLP.mp4";
      case "ATMT-C2.1": return "/ATMT-C2.1-Behavioral Science NLP.mp4";
      case "ATMT-C2.2": return "/ATMT-C2.2-Behavioral Science NLP.mp4";
      case "ATMT-C4": return "/ATMT-C4-Integrated_Meta_NAC_Protocol.mp4";
      case "ATMT-C5.1": return "/ATMT-C5.1-Behavioral Science NLP.mp4";
      case "ATMT-C5.2": return "/ATMT-C5.2-Behavioral Science NLP.mp4";
    }

    switch (lessonId) {
      case "ATMT-OPENING": return "/ATMT-OPENING.mp4";
      case "ATMT-1": return "/ATMT1-5WHYs.mp4";
      case "ATMT-2": return "/ATMT2-5WHYs.mp4";
      case "ATMT-3": return "/ATMT3-5WHYs.mp4";
      case "ATMT-4": return "/ATMT4-5WHYs.mp4";
      case "ATMT-5": return "/ATMT5-5WHYs.mp4";
      case "ATMT-6": return "/ATMT6-5WHYs.mp4";
      case "ATMT-7": return "/ATMT7-5WHYs.mp4";
      case "ATMT-P5.1": return "/ATMT-P5.1-Psychologist.mp4";
      case "ATMT-P5.2": return "/ATMT-P5.2-Psychologist.mp4";
      case "ATMT-P5.3": return "/ATMT-P5.3-Psychologist.mp4";
      case "ATMT-P5.4": return "/ATMT-P5.4--Psychologist.mp4";
      case "ATMT-ASHA": return "/MANAS360_ASHA_Training_Virtual.pptx.mp4";
      default: return `/${lessonId}.mp4`;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-6 font-sans pb-20">
      <div className="max-w-4xl mx-auto">

        {/* Top Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            ← Back to Modules
          </button>
          <span className="text-xs font-bold tracking-wide text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
            {isOpeningSession ? "Introductory Module • Session 1" : `${currentTitle} • Training`}
          </span>
        </div>

        {/* Lesson Title */}
        <h1 className="text-3xl font-bold text-slate-900 mb-6 font-serif">
          {currentTitle}
        </h1>

        {/* Video Player — onEnded triggers module unlock */}
        <div className="bg-black rounded-2xl overflow-hidden shadow-md mb-8 relative aspect-video w-full">
          <video
            ref={videoRef}
            key={lessonId}
            controls
            controlsList="nodownload"
            className="absolute top-0 left-0 w-full h-full object-contain"
            preload="auto"
            onEnded={handleVideoEnded}
          >
            <source src={getVideoSrc()} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* Lesson Notes */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border-l-[6px] border-emerald-500">
            <h2 className="text-lg font-bold text-slate-900 mb-4 font-serif flex items-center gap-2">
              📝 Lesson Notes
            </h2>
            <ul className="space-y-4 text-slate-600 text-sm leading-relaxed">
              {isOpeningSession ? (
                <>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5 text-lg">•</span>
                    Welcome to the certification program! This session covers the course roadmap and core objectives.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5 text-lg">•</span>
                    Ensure you have downloaded the Resource Pack from the sidebar before continuing.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5 text-lg">•</span>
                    We recommend setting aside 30 minutes for this introductory video and following reflection.
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5 text-lg">•</span>
                    The 5-Why technique uncovers root emotional triggers rather than surface-level complaints.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5 text-lg">•</span>
                    Never ask "why" judgmentally — use a curious, open tone to avoid making the patient defensive.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5 text-lg">•</span>
                    Pause 3-5 seconds after each answer before asking the next "why" to allow the patient time to process.
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Downloadable Resources */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-[6px] border-blue-500">
            <h2 className="text-lg font-bold text-slate-900 mb-4 font-serif flex items-center gap-2">
              📎 Resources
            </h2>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                  📄 5-Why Worksheet (PDF)
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                  📑 Practice Scenarios Deck
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                  🗣️ Role-Play Script Guide
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200">
          <button className="px-6 py-3 bg-white text-slate-600 border border-slate-200 font-medium text-sm rounded-full hover:bg-slate-50 transition-colors shadow-sm">
            Mark for Review
          </button>
          <button
            onClick={() => navigate(`/certifications/assignments/${lessonId}`)}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-full transition-all shadow-md transform hover:scale-105"
          >
            Practice Assignment →
          </button>
        </div>

      </div>
    </div>
  );
};