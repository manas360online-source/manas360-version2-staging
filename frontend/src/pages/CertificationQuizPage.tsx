import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowLeft, Award, RotateCcw } from "lucide-react";
import { useEnrollmentStore } from "../store/CertificationEnrollmentStore";
import { completeCertification } from "../api/certifications";

/* ──────────────────────────────────────────────────────────
   Quiz Data – one quiz per module, keyed by moduleId
   ────────────────────────────────────────────────────────── */

interface QuizOption {
  letter: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctLetter: string;
  explanation: string;
}

interface ModuleQuiz {
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  accentLight: string;
  questions: QuizQuestion[];
}

const QUIZ_DATA: Record<string, ModuleQuiz> = {
  "5whys": {
    title: "Certified 5Whys Practitioner",
    subtitle: "Root cause analysis, empathy framework, and Daily Journey mapping",
    icon: "🧠",
    accentColor: "#2d8a4e",
    accentLight: "#d4f0de",
    questions: [
      { id: "q1", text: "What is the PRIMARY purpose of the 5Whys technique in a therapeutic context?", options: [{ letter: "A", text: "To diagnose the patient's disorder within 5 questions" }, { letter: "B", text: "To peel through surface symptoms and reach the emotional root cause through empathic inquiry" }, { letter: "C", text: "To challenge the patient's beliefs and prove them wrong" }, { letter: "D", text: "To complete the intake assessment faster" }], correctLetter: "B", explanation: "Correct. 5Whys is about depth and empathy, not just speed or diagnosis." },
      { id: "q2", text: "A patient says 'I can't sleep.' Using the 5Whys with empathy, what is the BEST first response?", options: [{ letter: "A", text: "'How many hours do you sleep?' (clinical data collection)" }, { letter: "B", text: "'Have you tried melatonin?' (immediate solution)" }, { letter: "C", text: "'That sounds exhausting. Tell me — when you lie down, what shows up in your mind?' (empathy + first why)" }, { letter: "D", text: "'You need better sleep hygiene.' (prescriptive advice)" }], correctLetter: "C", explanation: "Empathy first, then exploratory inquiry." },
      { id: "q3", text: "What differentiates Daily Journey mapping from a standard symptom checklist?", options: [{ letter: "A", text: "It is shorter and takes less time" }, { letter: "B", text: "It asks 'Walk me through your day' — uncovering triggers, patterns, and coping in context" }, { letter: "C", text: "It replaces the PHQ-9 entirely" }, { letter: "D", text: "It focuses only on sleep and appetite" }], correctLetter: "B", explanation: "Contextual understanding is key to MANAS360's approach." },
      { id: "q4", text: "What are 'Projecting Questions' designed to do?", options: [{ letter: "A", text: "Project the therapist's opinion onto the patient" }, { letter: "B", text: "Speed up the session by skipping small talk" }, { letter: "C", text: "Invite the patient to examine their own beliefs and wisdom — 'What would you tell a friend?'" }, { letter: "D", text: "Test whether the patient is being honest" }], correctLetter: "C", explanation: "Empowers the patient to use their own wisdom." },
      { id: "q5", text: "A patient stops at 'I don't know why I feel this way.' What should you do?", options: [{ letter: "A", text: "End the session and try next week" }, { letter: "B", text: "Tell them they're not trying hard enough" }, { letter: "C", text: "Don't force it. Try lateral entry: 'What do you notice in your body right now?'" }, { letter: "D", text: "Move to a completely different topic" }], correctLetter: "C", explanation: "Lateral entry points bypass cognitive blocks." },
      { id: "q6", text: "What is Layer 1 of the MANAS360 Empathy Framework?", options: [{ letter: "A", text: "Asking diagnostic questions" }, { letter: "B", text: "Giving advice based on your experience" }, { letter: "C", text: "Validation — acknowledging feelings without judgment" }, { letter: "D", text: "Referring to a psychiatrist immediately" }], correctLetter: "C", explanation: "Validation is always the bedrock." },
      { id: "q7", text: "If building empathy takes longer than the 5Whys inquiry itself, what does that indicate?", options: [{ letter: "A", text: "You're doing it wrong — empathy should be faster" }, { letter: "B", text: "The patient is being difficult" }, { letter: "C", text: "That's exactly right — trust takes time. A patient who feels truly seen will go deeper" }, { letter: "D", text: "You should skip empathy and jump to questions" }], correctLetter: "C", explanation: "Depth requires trust, which requires felt empathy." },
      { id: "q8", text: "How does the 5Whys approach relate to CBT?", options: [{ letter: "A", text: "5Whys replaces CBT entirely" }, { letter: "B", text: "They are identical methodologies with different names" }, { letter: "C", text: "CBT focuses on thought patterns; 5Whys first maps the full picture. They complement each other." }, { letter: "D", text: "CBT is evidence-based; 5Whys is not" }], correctLetter: "C", explanation: "They are complementary frameworks." },
      { id: "q9", text: "What is 'compassionate action' in the Empathy Framework?", options: [{ letter: "A", text: "Solving all the patient's problems immediately" }, { letter: "B", text: "Feeling sorry for the patient and lowering your fees" }, { letter: "C", text: "Moving beyond understanding to collaborative, patient-led solutions that honor autonomy" }, { letter: "D", text: "Referring to another therapist because you feel too involved" }], correctLetter: "C", explanation: "Action must honor patient autonomy." },
    ],
  },
  "psychologist": {
    title: "Certified Psychologist",
    subtitle: "Clinical assessment, evidence-based therapy, and regulatory context",
    icon: "🎓",
    accentColor: "#f59e0b",
    accentLight: "#fef3c7",
    questions: [
      { id: "q1", text: "Under RCI guidelines, what is the minimum qualification required to practice clinical psychology in India?", options: [{ letter: "A", text: "BA Psychology with 1 year experience" }, { letter: "B", text: "MA Clinical Psychology (post NEP 2020) or M.Phil Clinical Psychology (pre-NEP)" }, { letter: "C", text: "Any psychology degree with a private certification" }, { letter: "D", text: "MD Psychiatry" }], correctLetter: "B", explanation: "Follows current Indian regulatory standards." },
      { id: "q2", text: "A patient scores 18 on the PHQ-9. What does this indicate and what is the appropriate action?", options: [{ letter: "A", text: "Mild depression — reassure and schedule a follow-up in 4 weeks" }, { letter: "B", text: "No clinical significance — no action needed" }, { letter: "C", text: "Moderately severe depression — initiate evidence-based therapy and consider referral" }, { letter: "D", text: "The patient is faking symptoms" }], correctLetter: "C", explanation: "18 indicates moderately severe depression on the PHQ-9 scale." },
      { id: "q3", text: "When is it ethically MANDATORY to break confidentiality under Indian law?", options: [{ letter: "A", text: "When the patient's family requests information" }, { letter: "B", text: "When you think it would help the patient's recovery" }, { letter: "C", text: "When there is imminent risk of harm to self or others, child abuse, or court order" }, { letter: "D", text: "Whenever a corporate HR department asks for data" }], correctLetter: "C", explanation: "Duty to protect overrides confidentiality in these specific cases." },
      { id: "q4", text: "What is the difference between CBT and DBT in clinical application?", options: [{ letter: "A", text: "There is no difference" }, { letter: "B", text: "CBT targets dysfunctional thoughts; DBT adds distress tolerance and mindfulness" }, { letter: "C", text: "DBT is only for substance abuse; CBT is for everything else" }, { letter: "D", text: "CBT is evidence-based; DBT is experimental" }], correctLetter: "B", explanation: "DBT is a dialectal expansion of CBT." },
      { id: "q5", text: "A patient presents with trauma symptoms. What should you assess BEFORE starting trauma-focused therapy?", options: [{ letter: "A", text: "Their income level" }, { letter: "B", text: "Nothing — start EMDR immediately" }, { letter: "C", text: "Safety and stabilization: current suicidality, substance use, and window of tolerance" }, { letter: "D", text: "Whether they have insurance coverage" }], correctLetter: "C", explanation: "Safety first. You cannot process trauma in an unstable patient." },
      { id: "q6", text: "Under DPDPA 2023, what are a patient's data rights on digital therapy platforms?", options: [{ letter: "A", text: "The platform owns all patient data" }, { letter: "B", text: "Access, correction, erasure, and portability. Consent can be withdrawn." }, { letter: "C", text: "Data rights only apply to government hospitals" }, { letter: "D", text: "Patients have no rights once they accept terms" }], correctLetter: "B", explanation: "Aligned with new Indian data protection regulations." },
      { id: "q7", text: "What is the therapeutic alliance and why does research show it matters more than technique?", options: [{ letter: "A", text: "It's a legal agreement" }, { letter: "B", text: "The quality of the collaborative bond. Accounts for ~30% of therapy outcomes." }, { letter: "C", text: "It's a marketing term with no evidence" }, { letter: "D", text: "It only matters in psychodynamic therapy" }], correctLetter: "B", explanation: "The relationship is the primary vehicle of change." },
      { id: "q8", text: "A patient asks you to prescribe medication for anxiety. What is the correct response as a psychologist?", options: [{ letter: "A", text: "Prescribe a low-dose SSRI" }, { letter: "B", text: "Tell them medication is unnecessary" }, { letter: "C", text: "Explain that psychologists cannot prescribe in India and offer to coordinate with a psychiatrist" }, { letter: "D", text: "Refer them to a pharmacy" }], correctLetter: "C", explanation: "Clear professional boundaries in the Indian medical context." },
      { id: "q9", text: "What does NEP 2020 change for psychology training in India?", options: [{ letter: "A", text: "Nothing" }, { letter: "B", text: "M.Phil Clinical Psychology transitions to integrated MA Clinical Psychology programs" }, { letter: "C", text: "Psychology is removed from university curricula" }, { letter: "D", text: "Only NIMHANS can grant psychology degrees" }], correctLetter: "B", explanation: "The new regulatory path under NEP 2020." },
    ],
  },
  "psychiatrist": {
    title: "Certified Psychiatrist",
    subtitle: "Psychopharmacology and collaborative care",
    icon: "⚕️",
    accentColor: "#ef4444",
    accentLight: "#fee2e2",
    questions: [
      { id: "q1", text: "Under NMC guidelines, what is required to practice psychiatry and prescribe in India?", options: [{ letter: "A", text: "MBBS with a mental health certificate" }, { letter: "B", text: "MD/DNB Psychiatry with active NMC registration" }, { letter: "C", text: "Any medical degree with 2 years experience" }, { letter: "D", text: "M.Phil Clinical Psychology" }], correctLetter: "B", explanation: "Strict medical qualification requirements." },
      { id: "q2", text: "A patient on SSRIs for 3 weeks reports no improvement. What is the appropriate clinical decision?", options: [{ letter: "A", text: "Switch class immediately" }, { letter: "B", text: "Wait 4-6 weeks for full effect. Assess side effects and reinforce adherence." }, { letter: "C", text: "Double the dose immediately" }, { letter: "D", text: "Add a benzodiazepine" }], correctLetter: "B", explanation: "Wait for clinical response time." },
      { id: "q3", text: "What is the key risk when a depressed patient suddenly appears 'much better' shortly after starting antidepressants?", options: [{ letter: "A", text: "No risk" }, { letter: "B", text: "Energy returns before mood lifts, increasing motivation for suicidal ideation" }, { letter: "C", text: "The patient is faking improvement" }, { letter: "D", text: "Indicates a misdiagnosis" }], correctLetter: "B", explanation: "Critical window for suicide risk." },
      { id: "q4", text: "On a telepsychiatry platform like MANAS360, what is NOT appropriate for remote consultation?", options: [{ letter: "A", text: "Medication review for stable patients" }, { letter: "B", text: "Initial assessment for acute psychosis with immediate safety concerns" }, { letter: "C", text: "Follow-up for depression management" }, { letter: "D", text: "Psychoeducation for family members" }], correctLetter: "B", explanation: "Safety and physical exam requirements." },
      { id: "q5", text: "A corporate executive presents with chronic insomnia and requests 'something to help me sleep.' What is the BEST approach?", options: [{ letter: "A", text: "Prescribe zolpidem immediately" }, { letter: "B", text: "Rule out underlying conditions, assess sleep hygiene, and consider CBT-I as first line" }, { letter: "C", text: "Recommend OTC melatonin" }, { letter: "D", text: "Tell them it's not a real condition" }], correctLetter: "B", explanation: "Holistic assessment before prescription." },
      { id: "q6", text: "What is the psychiatrist's role in a collaborative care model with psychologists on MANAS360?", options: [{ letter: "A", text: "Psychiatrists handle everything" }, { letter: "B", text: "Focus on diagnosis and medication, while psychologists handle therapy. Coordinate care." }, { letter: "C", text: "Psychologist decides medication" }, { letter: "D", text: "They should never communicate" }], correctLetter: "B", explanation: "Interdisciplinary collaboration is the gold standard." },
      { id: "q7", text: "A patient on lithium for bipolar disorder says 'I feel great, I want to stop medication.' What is the response?", options: [{ letter: "A", text: "Agree — medication no longer needed" }, { letter: "B", text: "Explain that feeling great IS the medication working. Abrupt stop risks manic relapse." }, { letter: "C", text: "Double the dose" }, { letter: "D", text: "Switch to an antidepressant" }], correctLetter: "B", explanation: "Maintenance education is vital." },
      { id: "q8", text: "Under the Mental Healthcare Act 2017 (India), what right does every patient have?", options: [{ letter: "A", text: "Right to free medication from any hospital" }, { letter: "B", text: "Right to access care, make an advance directive, and no cruel treatment." }, { letter: "C", text: "Right to choose their own diagnosis" }, { letter: "D", text: "Right to unlimited hospital stay" }], correctLetter: "B", explanation: "Fundamental rights under the MHCA." },
      { id: "q9", text: "What is serotonin syndrome and when should a psychiatrist suspect it?", options: [{ letter: "A", text: "Marketing term" }, { letter: "B", text: "Agitation, hyperthermia, clonus — from excessive serotonergic activity/interactions" }, { letter: "C", text: "Common condition that resolves alone" }, { letter: "D", text: "Only with illegal drugs" }], correctLetter: "B", explanation: "Emergency awareness." },
    ],
  },
  "nlp_nac": {
    title: "Certified NLP-NAC Coach",
    subtitle: "Neuro-Linguistic Programming and Anchoring",
    icon: "🧬",
    accentColor: "#10b981",
    accentLight: "#d1fae5",
    questions: [
      { id: "q1", text: "What does NLP stand for and what is its core premise?", options: [{ letter: "A", text: "Natural Language Processing — AI technology" }, { letter: "B", text: "Neuro-Linguistic Programming — language shapes neurology and drives behavior" }, { letter: "C", text: "Neurological Learning Practice" }, { letter: "D", text: "Non-Linear Psychology" }], correctLetter: "B", explanation: "Core NLP definition." },
      { id: "q2", text: "What is 'anchoring' in NLP and how would you use it for performance anxiety?", options: [{ letter: "A", text: "Imagine they're on a boat" }, { letter: "B", text: "Associating a physical trigger with a peak confident state" }, { letter: "C", text: "Anchoring them to their desk" }, { letter: "D", text: "A technique for client commitment" }], correctLetter: "B", explanation: "State modulation via triggers." },
      { id: "q3", text: "In Tony Robbins' Neuro-Associative Conditioning (NAC), what are the two forces driving behavior?", options: [{ letter: "A", text: "Logic and emotion" }, { letter: "B", text: "Desire to gain pleasure and desire to avoid pain" }, { letter: "C", text: "Money and status" }, { letter: "D", text: "Fear and love" }], correctLetter: "B", explanation: "The pain-pleasure principle." },
      { id: "q4", text: "A client says 'I always fail at everything.' What NLP technique is MOST appropriate?", options: [{ letter: "A", text: "Agree to build rapport" }, { letter: "B", text: "Reframing — challenge the generalization" }, { letter: "C", text: "Ignore it" }, { letter: "D", text: "Repeat positive affirmations" }], correctLetter: "B", explanation: "Breaking limiting language patterns." },
      { id: "q5", text: "What is a 'pattern interrupt' and when do you use it?", options: [{ letter: "A", text: "Interrupting to assert dominance" }, { letter: "B", text: "Breaking a loop by introducing an unexpected stimulus" }, { letter: "C", text: "A scheduling technique" }, { letter: "D", text: "Way to end sessions early" }], correctLetter: "B", explanation: "Physiological state change." },
      { id: "q6", text: "What is the NLP 'Meta Model' used for?", options: [{ letter: "A", text: "Business model" }, { letter: "B", text: "Language patterns that challenge deletions, distortions, and generalizations" }, { letter: "C", text: "Social media marketing" }, { letter: "D", text: "Diagnostic tool like DSM" }], correctLetter: "B", explanation: "Linguistic precision tool." },
      { id: "q7", text: "In NAC, what are the 6 steps to lasting change?", options: [{ letter: "A", text: "Plan, Execute, Review, Repeat" }, { letter: "B", text: "Link pain to not changing, pleasure to change, interrupt old pattern, create new one" }, { letter: "C", text: "Set goals, Track, Reward" }, { letter: "D", text: "Identify, Blame, Accept, Move on" }], correctLetter: "B", explanation: "Sequential NAC methodology." },
      { id: "q8", text: "What is the ethical boundary between NLP coaching and clinical therapy?", options: [{ letter: "A", text: "No boundary" }, { letter: "B", text: "Coaches work with goals/behavior; Clinical disorders require licensed therapists" }, { letter: "C", text: "NLP has replaced therapy" }, { letter: "D", text: "Difference in pricing" }], correctLetter: "B", explanation: "Critical professional boundaries." },
      { id: "q9", text: "A client wants to overcome a phobia. Which NLP technique is specifically designed for this?", options: [{ letter: "A", text: "Sticky notes" }, { letter: "B", text: "Fast Phobia Cure (Visual-Kinesthetic Dissociation)" }, { letter: "C", text: "Exposure therapy" }, { letter: "D", text: "Hypnosis" }], correctLetter: "B", explanation: "Specific NLP protocol for phobias." },
    ],
  },
  "executive_nri": {
    title: "Certified Executive-NRI Therapist",
    subtitle: "High-performance coaching and cross-cultural therapy",
    icon: "🌏",
    accentColor: "#6d28d9",
    accentLight: "#ede9fe",
    questions: [
      { id: "q1", text: "An NRI client in the US contacts MANAS360. What jurisdiction and compliance rules apply?", options: [{ letter: "A", text: "US HIPAA rules" }, { letter: "B", text: "Indian jurisdiction (Bengaluru), DPDPA 2023, INR payments" }, { letter: "C", text: "Strictest of both countries" }, { letter: "D", text: "No rules apply" }], correctLetter: "B", explanation: "Adheres to platform compliance standards." },
      { id: "q2", text: "What is 'Third Culture Identity Crisis' common among NRI clients?", options: [{ letter: "A", text: "DSM-5 disorder" }, { letter: "B", text: "Tension of belonging fully to neither home nor adopted country" }, { letter: "C", text: "Travel term" }, { letter: "D", text: "Marketing term" }], correctLetter: "B", explanation: "Core diaspora psychological challenge." },
      { id: "q3", text: "An executive says 'I can't show weakness — my team will lose respect.' What approach is BEST?", options: [{ letter: "A", text: "Agree — show no vulnerability" }, { letter: "B", text: "Explore the belief and reframe vulnerability as leadership strength" }, { letter: "C", text: "Tell them to quit" }, { letter: "D", text: "Prescribe medication" }], correctLetter: "B", explanation: "Executive coaching mindset shift." },
      { id: "q4", text: "On MANAS360, what does the HR dashboard show for corporate EAP programs?", options: [{ letter: "A", text: "Individual names and notes" }, { letter: "B", text: "Anonymous aggregate data only — total sessions and trends" }, { letter: "C", text: "Real-time video feeds" }, { letter: "D", text: "Attendance records" }], correctLetter: "B", explanation: "Privacy and compliance." },
      { id: "q5", text: "A Silicon Valley NRI client wants sessions at 11 PM IST. How is this matched?", options: [{ letter: "A", text: "Client must adjust to IST business hours" }, { letter: "B", text: "Region-locked matching to shift-pool therapists (e.g., 9PM-1AM pools)" }, { letter: "C", text: "All sessions 9-6 IST" }, { letter: "D", text: "No support" }], correctLetter: "B", explanation: "Timezone optimized matching." },
      { id: "q6", text: "What is 'burnout' (ICD-11) and how does it differ from depression?", options: [{ letter: "A", text: "They are the same" }, { letter: "B", text: "Burnout is occupational phenomenon; Depression is clinical disorder affecting all domains" }, { letter: "C", text: "Burnout is more serious" }, { letter: "D", text: "Not recognized" }], correctLetter: "B", explanation: "WHO classification standards." },
      { id: "q7", text: "An NRI's Indian parent is pressuring about marriage. Client feels guilty. Approach?", options: [{ letter: "A", text: "Ignore parents" }, { letter: "B", text: "Parents are right" }, { letter: "C", text: "Acknowledge cultural weight; help client find their own answer" }, { letter: "D", text: "Refer to family therapist" }], correctLetter: "C", explanation: "Culturally sensitive therapy." },
      { id: "q8", text: "What session formats/pricing apply to executive-NRI on MANAS360?", options: [{ letter: "A", text: "In-person at ₹5,000" }, { letter: "B", text: "Audio (₹1,499) or Video (₹1,649). 60/40 revenue split." }, { letter: "C", text: "Free unlimited" }, { letter: "D", text: "WhatsApp only" }], correctLetter: "B", explanation: "Platform pricing transparency." },
      { id: "q9", text: "A corporate partnership for 5,000 employees satisfies which compliances?", options: [{ letter: "A", text: "Only CSR Section 135" }, { letter: "B", text: "DPDPA, NMC/RCI, POSH Act, OSH Act, and CSR Section 135" }, { letter: "C", text: "No compliance" }, { letter: "D", text: "Only DPDPA" }], correctLetter: "B", explanation: "Comprehensive platform compliance." },
    ],
  },
  "asha": {
    title: "Certified ASHA Mental Wellness Champion",
    subtitle: "Frontline psychosocial support for community wellness",
    icon: "🌟",
    accentColor: "#f59e0b",
    accentLight: "#fef3c7",
    questions: [
      { id: "q1", text: "As an ASHA Mental Wellness Champion, your primary role is to:", options: [{ letter: "A", text: "Diagnose and prescribe medication" }, { letter: "B", text: "Provide psychosocial support and facilitate referrals" }, { letter: "C", text: "Perform clinical psychotherapy" }], correctLetter: "B", explanation: "Support and referral focus." },
      { id: "q2", text: "When approaching rural communities, the most effective strategy is:", options: [{ letter: "A", text: "Use clinical terminology" }, { letter: "B", text: "Integrate into gatherings using relatable language" }, { letter: "C", text: "Wait for them to come to clinic" }], correctLetter: "B", explanation: "Relatable language is key." },
    ]
  }
};

/* ──────────────────────────────────────────────────────────
   Quiz Page Component
   ────────────────────────────────────────────────────────── */

export const CertificationQuizPage: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { enrollments, updateProgress } = useEnrollmentStore();

  const enrollment = useMemo(() =>
    enrollments.find((e: any) => e.id === enrollmentId),
    [enrollments, enrollmentId]
  );

  // `certName` was previously unused — keep enrollment reference directly where needed.

  // New logic: Match certification slug to track ID
  const trackId = useMemo(() => {
    if (!enrollment?.slug) return "5whys";
    if (enrollment.slug === "certified-practitioner") return "5whys";
    if (enrollment.slug === "certified-psychologist") return "psychologist";
    if (enrollment.slug === "certified-psychiatrist") return "psychiatrist";
    if (enrollment.slug === "certified-nlp-therapist") return "nlp_nac";
    if (enrollment.slug === "certified-executive-therapist") return "executive_nri";
    if (enrollment.slug === "certified-asha-mental-wellness-champion") return "asha";
    return "5whys";
  }, [enrollment?.slug]);

  const quiz = useMemo(() => {
    const trackQuiz = QUIZ_DATA[trackId];
    if (!trackQuiz) return null;

    return {
      ...trackQuiz,
      questions: trackQuiz.questions.map((q, idx) => ({ ...q, id: `q${idx}` }))
    };
  }, [trackId]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [claimingCertificate, setClaimingCertificate] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const questions = quiz?.questions || [];
  const totalQuestions = questions.length;

  const score = useMemo(() => {
    if (!submitted) return 0;
    return questions.filter((q) => answers[q.id] === q.correctLetter).length;
  }, [submitted, answers, questions]);

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  // Rule: 7/9 correct (78%)
  const passed = totalQuestions === 9 ? score >= 7 : percentage >= 78;

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center max-w-md">
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-xl font-bold text-slate-900 font-serif mb-2">Quiz Not Available</h2>
          <p className="text-slate-500 text-sm mb-6">No quiz has been configured for this certification yet.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-full hover:bg-slate-800 transition"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSelect = (questionId: string, letter: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: letter }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < totalQuestions) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setClaimError(null);
  };

  const handleClaimCertificate = async () => {
    if (!passed || !enrollmentId || !enrollment?.slug) return;

    setClaimError(null);
    setClaimingCertificate(true);

    try {
      await completeCertification(enrollment.slug);
      updateProgress(enrollmentId, 100);
      navigate(`/certifications/certificate/${enrollmentId}`);
    } catch {
      setClaimError("Unable to finalize certification right now. Please try again.");
    } finally {
      setClaimingCertificate(false);
    }
  };

  const getOptionStyle = (q: QuizQuestion, letter: string) => {
    const isSelected = answers[q.id] === letter;
    const isCorrect = q.correctLetter === letter;

    if (!submitted) {
      if (isSelected) return "border-blue-500 bg-blue-50 ring-2 ring-blue-200";
      return "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
    }

    if (isCorrect) return "border-emerald-500 bg-emerald-50";
    if (isSelected && !isCorrect) return "border-red-400 bg-red-50";
    return "border-slate-100 opacity-60";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 md:p-6 font-sans pb-20">
      <div className="max-w-3xl mx-auto">

        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Lesson
        </button>

        {/* Quiz Header */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: quiz.accentLight }}
            >
              {quiz.icon}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-serif">{quiz.title}</h1>
              <p className="text-slate-500 text-sm">{quiz.subtitle}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${submitted ? 100 : (Object.keys(answers).length / totalQuestions) * 100}%`,
                  background: `linear-gradient(90deg, ${quiz.accentColor}, #4361ee)`,
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500">
              {submitted ? `${score}/${totalQuestions}` : `${Object.keys(answers).length}/${totalQuestions}`}
            </span>
          </div>
        </div>

        {/* Results Card (shown after submission) */}
        {submitted && (
          <div
            className={`rounded-2xl p-6 md:p-8 mb-6 border-2 ${passed ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
              }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${passed ? "bg-emerald-100" : "bg-amber-100"
                  }`}
              >
                {passed ? "🏅" : "📚"}
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif">
                  {passed ? "Congratulations! Quiz Passed!" : "Keep Learning!"}
                </h2>
                <p className="text-sm text-slate-600">
                  You scored <strong>{percentage}%</strong> ({score}/{totalQuestions}).
                  {passed
                    ? " You've met the 78% (7/9) passing threshold."
                    : " You need 78% (7/9) to pass. Review the explanations below and try again."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              {!passed && (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  <RotateCcw size={14} /> Retry Quiz
                </button>
              )}
              {passed && (
                <button
                  onClick={handleClaimCertificate}
                  disabled={claimingCertificate}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full text-sm font-bold hover:from-amber-600 hover:to-amber-700 transition shadow-lg transform hover:scale-[1.02]"
                >
                  <Award size={16} /> {claimingCertificate ? "Finalizing..." : "Get Certificate"}
                </button>
              )}
            </div>
            {claimError && <p className="mt-3 text-xs text-red-600 font-medium">{claimError}</p>}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-5">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 transition-all"
            >
              {/* Question Header */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
                  style={{ background: quiz.accentLight, color: quiz.accentColor }}
                >
                  Question {idx + 1} of {totalQuestions}
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-base font-bold text-slate-900 mb-4 leading-relaxed">{q.text}</h3>

              {/* Options */}
              <div className="space-y-2.5">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.letter;
                  const isCorrectAnswer = q.correctLetter === opt.letter;

                  return (
                    <button
                      key={opt.letter}
                      onClick={() => handleSelect(q.id, opt.letter)}
                      disabled={submitted}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${getOptionStyle(q, opt.letter)} ${!submitted ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${submitted && isCorrectAnswer
                          ? "bg-emerald-500 text-white"
                          : submitted && isSelected && !isCorrectAnswer
                            ? "bg-red-400 text-white"
                            : isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {submitted && isCorrectAnswer ? (
                          <CheckCircle2 size={16} />
                        ) : submitted && isSelected && !isCorrectAnswer ? (
                          <XCircle size={16} />
                        ) : (
                          opt.letter
                        )}
                      </div>
                      <span className="text-sm text-slate-700">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation (shown after submission) */}
              {submitted && (
                <div
                  className={`mt-4 p-3.5 rounded-xl text-sm leading-relaxed ${answers[q.id] === q.correctLetter
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                >
                  <strong>{answers[q.id] === q.correctLetter ? "✅ Correct!" : "❌ Incorrect."}</strong>{" "}
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {!submitted && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < totalQuestions}
              className={`px-10 py-4 rounded-full font-bold text-sm transition-all shadow-lg ${Object.keys(answers).length >= totalQuestions
                ? "text-white transform hover:scale-105"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              style={
                Object.keys(answers).length >= totalQuestions
                  ? { background: `linear-gradient(135deg, ${quiz.accentColor}, #4361ee)` }
                  : {}
              }
            >
              Submit Quiz →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};