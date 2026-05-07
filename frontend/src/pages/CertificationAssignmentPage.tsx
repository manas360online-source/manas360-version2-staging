import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEnrollmentStore } from "../store/CertificationEnrollmentStore";
import { getNextLessonId } from "../utils/certificationLessonUtils";

export const CertificationAssignmentPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const { enrollments } = useEnrollmentStore();

  // Find the current enrollment context
  const activeEnrollment = enrollments[0]; 

  const getAssignmentContent = () => {
    // ... (rest of the dictionary)
    // Dictionary of assignments grouped by certification path
    const assignments: Record<string, { title: string; instruction: string }> = {
      // Practitioner Path
      "ATMT-OPENING": { 
        title: "Assignment: Vision & Intention", 
        instruction: "Submit your 100-word vision statement for your practice after completing the opening session. What do you hope to achieve for your patients?" 
      },
      "ATMT-1": { 
        title: "Assignment: 5-Why Practice", 
        instruction: "Conduct a mock session with a partner using the 5-Why framework. Record the sequence of questions and submit your findings." 
      },
      "ATMT-2": { 
        title: "Assignment: Symptom Analysis", 
        instruction: "Identify common surface-level symptoms in three hypothetical cases provided in the module resources." 
      },
      "ATMT-3": { 
        title: "Assignment: Emotional Hook Mapping", 
        instruction: "Submit a diagram or list showing how specific symptoms are linked to core emotional triggers based on your recent training." 
      },
      "ATMT-4": { 
        title: "Assignment: Active Listening Review", 
        instruction: "Perform a 10-minute active listening exercise. Note three non-verbal cues you observed and how you responded to them." 
      },
      "ATMT-5": { 
        title: "Assignment: Solution-Oriented Framing", 
        instruction: "Rewrite five negative patient statements into solution-oriented frames using the techniques from Module 5." 
      },
      "ATMT-6": { 
        title: "Assignment: Session Closure Protocol", 
        instruction: "Draft a closing summary for a 45-minute therapy session that includes a positive reinforcement and a takeaway task." 
      },
      "ATMT-7": { 
        title: "Assignment: Practical Ethics Review", 
        instruction: "Solve the ethical dilemma case study provided in the final practitioner module. Explain your reasoning." 
      },

      // Executive Path
      "ATMT-E1": { 
        title: "Assignment: Organizational Culture Audit", 
        instruction: "Analyze the culture of a current or previous company using the Aatman Engineering framework. Identify two areas for growth." 
      },
      "ATMT-E2.1": { 
        title: "Assignment: Executive Performance Drivers", 
        instruction: "Outline three high-stakes mental drivers that affect executive decision-making. How do they relate to 'Flow State'?" 
      },
      "ATMT-E2.2": { 
        title: "Assignment: Leadership Influence Map", 
        instruction: "Create an influence map for a hypothetical team. How do 'Mental Blocks' in leadership affect junior performance?" 
      },
      "ATMT-E4.1": { 
        title: "Assignment: Corporate Conflict Resolution", 
        instruction: "Drafte a mediation plan for a conflict between two department heads using the tools from Module 4.1." 
      },
      "ATMT-E4.2": { 
        title: "Assignment: Emotional Intelligence Dashboard", 
        instruction: "Build a set of 5 EQ metrics that an executive should track to maintain team mental well-being." 
      },
      "ATMT-E4.3": { 
        title: "Assignment: Executive Crisis Simulation", 
        instruction: "Write a 300-word response protocol for a sudden organizational shift or layoff announcement." 
      },
      "ATMT-E5": { 
        title: "Assignment: Strategic Therapy Plan", 
        instruction: "Develop a 3-month organizational therapy roadmap for a company facing high employee burnout." 
      },
      "ATMT-E6": { 
        title: "Assignment: Executive Final Reflection", 
        instruction: "Submit your final thesis on why Mental Health is the cornerstone of 21st-century corporate leadership." 
      },

      // NLP Path
      "ATMT-C1.1": { 
        title: "Assignment: Sensory Acuity Test", 
        instruction: "Practice detecting eye access patterns with 3 different people. Note your findings on their primary representational systems." 
      },
      "ATMT-C1.2": { 
        title: "Assignment: Calibration & Anchoring", 
        instruction: "Install a 'Calm Anchor' for yourself or a practice client. Record the trigger used and the intensity of the response." 
      },
      "ATMT-C1.3": { 
        title: "Assignment: Meaning Reframing", 
        instruction: "Take 5 limiting beliefs (e.g., 'I am not good enough') and reframe them using at least three NLP Sleight of Mouth patterns." 
      },
      "ATMT-C2.1": { 
        title: "Assignment: Pacing and Leading", 
        instruction: "Engage in a conversation where you match the other person's breathing and tempo. Record how it felt to 'lead' the conversation thereafter." 
      },
      "ATMT-C2.2": { 
        title: "Assignment: Milton Model Persuasion", 
        instruction: "Write a 1-page script using embedded commands, vague language, and nominalizations to facilitate a trance state." 
      },
      "ATMT-C4": { 
        title: "Assignment: Timeline Mapping", 
        instruction: "Guide a client through 'Time Line Therapy' for a minor past frustration. Record the 'In-time' vs 'Through-time' observations." 
      },
      "ATMT-C5.1": { 
        title: "Assignment: Strategy Elicitation", 
        instruction: "Elicit a 'Motivation Strategy' from a peer. Map the VAKOG sequence and identify the decision point." 
      },
      "ATMT-C5.2": { 
        title: "Assignment: Final NLP Behavioral Mastery", 
        instruction: "Combine Anchoring, Reframing, and Strategy Elicitation into one full 30-minute behavioral change session outline." 
      },

      // Psychologist Path
      "ATMT-P5.1": { 
        title: "Assignment: Clinical Intake Review", 
        instruction: "Review an intake form for a new patient with anxiety. Highlight three red flags and two strengths identified." 
      },
      "ATMT-P5.2": { 
        title: "Assignment: CBT Logic Mapping", 
        instruction: "Create a Cognitive Behavioral Thought Record for a case study patient suffering from social phobia." 
      },
      "ATMT-P5.3": { 
        title: "Assignment: Therapeutic Bond Strategy", 
        instruction: "Define how you would handle 'Transference' in a scenario where a patient treats you like a parent figure." 
      },
      "ATMT-P5.4": { 
        title: "Assignment: Clinical Final Evaluation", 
        instruction: "Draft a 500-word justification for a long-term treatment plan for a patient with complex PTSD." 
      },

      // Psychiatrist Path
      "ATMT-MD1.1": { 
        title: "Assignment: Psychopharmacology Check", 
        instruction: "List 5 primary classes of psychotropic medications and their mechanism of action on the synaptic level." 
      },
      "ATMT-MD1.2": { 
        title: "Assignment: DSM-5 Diagnosis Exercise", 
        instruction: "Match the clinical presentations of 3 provided vignettes to их secondary and differential diagnoses." 
      },
      "ATMT-MD1.3": { 
        title: "Assignment: Diagnosis Documentation", 
        instruction: "Draft a clinical chart entry according to hospital standards for a patient newly diagnosed with Bipolar I." 
      },
      "ATMT-MD2.1": { 
        title: "Assignment: Risk & Suicide Assessment", 
        instruction: "Perform a mock SLAP assessment (Specificity, Lethality, Availability, Proximity) for a high-risk patient case." 
      },
      "ATMT-MD2.2": { 
        title: "Assignment: Medication Monitoring Plan", 
        instruction: "Design a blood-work monitoring schedule for a patient starting on Lithium or Clozapine." 
      },
      "ATMT-MD2.3": { 
        title: "Assignment: Adverse Reaction Protocol", 
        instruction: "Draft an emergency response protocol for Acute Dystonia or Serotonin Syndrome." 
      },
      "ATMT-MD3.1": { 
        title: "Assignment: Neuropsychiatric Review", 
        instruction: "Explain the link between chronic inflammation and Major Depressive Disorder based on current research." 
      },
      "ATMT-MD3.2": { 
        title: "Assignment: Geriatric Mental Health", 
        instruction: "Adjust a standard depression treatment plan for an 80-year-old patient with multiple comorbidities." 
      },
      "ATMT-MD3.3": { 
        title: "Assignment: Pediatric Psych Assessment", 
        instruction: "Discuss the ethics and challenges of diagnosing ADHD in children under the age of 6." 
      },
      "ATMT-MD4.1": { 
        title: "Assignment: Integrative Psychiatry", 
        instruction: "Propose a diet and lifestyle modification plan to complement SSRI treatment for a patient with GAD." 
      },
      "ATMT-MD4.2": { 
        title: "Assignment: SUD Treatment Plan", 
        instruction: "Outline a 90-day medical detox and maintenance plan for Opioid Use Disorder (OUD)." 
      },
      "ATMT-MD4.3": { 
        title: "Assignment: Forensic Psychiatry Ethics", 
        instruction: "Analyze a case where patient confidentiality conflicts with public safety (Tarasoff Rule)." 
      },
      "ATMT-MD6": { 
        title: "Assignment: Psychiatrist Final Mastery", 
        instruction: "Submit your comprehensive thesis on the evolution of personalized psychiatric medicine." 
      },
    };

    return assignments[assignmentId || ""] || {
      title: "Practice Assignment: Course Reflection",
      instruction: "Write a summary of what you learned in this module and how you plan to apply it in your professional practice."
    };
  };

  const content = getAssignmentContent();

  const handleSkip = () => {
    const nextId = getNextLessonId(assignmentId || "", activeEnrollment?.certificationName);
    if (nextId) {
      navigate(`/certifications/lessons/${nextId}`);
    } else {
      // If no next lesson (end of course), go back to modules
      navigate(-1);
    }
  };

  const submitAssignment = () => {
    alert("Practice Assignment submitted successfully! Your instructor will review it within 48 hours.");
    handleSkip(); // Seamlessly transition to the next lesson upon successful submission
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-600 mb-6 text-sm font-medium flex items-center gap-1"
        >
          ← Back to Lesson
        </button>

        <div className="mb-8">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Practice Element
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mt-4 font-serif">
            {content.title}
          </h1>
          <p className="text-slate-600 mt-4 leading-relaxed">
            {content.instruction}
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Your Response / Reflection Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-2xl p-4 min-h-[200px] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-slate-700 bg-slate-50"
            placeholder="Type your practice assignment details here..."
          />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-slate-400 max-w-[200px]">
            Your instructor will provide feedback within 48 hours of submission.
          </p>
          <div className="flex gap-4">
            <button
                onClick={handleSkip}
                className="px-6 py-4 rounded-full font-bold text-slate-400 hover:text-slate-600 transition-all text-sm"
              >
                Skip for now
              </button>
            <button
              onClick={submitAssignment}
              disabled={!notes.trim()}
              className={`px-10 py-4 rounded-full font-bold transition-all shadow-md ${
                notes.trim() 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-105" 
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              }`}
            >
              Submit Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
