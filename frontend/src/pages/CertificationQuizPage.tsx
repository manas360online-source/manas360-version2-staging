import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowLeft, Award, RotateCcw } from "lucide-react";
import { useEnrollmentStore } from "../store/CertificationEnrollmentStore";
import { getModulesByCertification } from "../utils/certificationLessonUtils";

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
  // ─── PRACTITIONER PATH ───
  "ATMT-OPENING": {
    title: "Opening Session Quiz",
    subtitle: "Test your understanding of the course overview",
    icon: "🎬",
    accentColor: "#2d8a4e",
    accentLight: "#d4f0de",
    questions: [
      { id: "q1", text: "What is the primary goal of MANAS360 onboarding?", options: [{ letter: "A", text: "To sell therapy packages" }, { letter: "B", text: "To equip practitioners with empathy-first, evidence-based skills" }, { letter: "C", text: "To complete paperwork quickly" }], correctLetter: "B", explanation: "MANAS360 onboarding focuses on building empathy-first, evidence-based therapeutic skills." },
      { id: "q2", text: "How many core modules must you complete for certification?", options: [{ letter: "A", text: "3 modules" }, { letter: "B", text: "5 modules" }, { letter: "C", text: "10 modules" }], correctLetter: "B", explanation: "The certification journey consists of 5 core modules covering all essential skills." },
    ],
  },
  "ATMT-1": {
    title: "5Whys + Empathy Quiz",
    subtitle: "Root cause inquiry & empathetic engagement",
    icon: "🔍",
    accentColor: "#c7943e",
    accentLight: "#f5e6c8",
    questions: [
      { id: "q1", text: "What is the correct sequence for the integrated approach?", options: [{ letter: "A", text: "Diagnose → Treat → Solve → Done" }, { letter: "B", text: "Empathy → Daily Journey → 5Whys → Projecting Questions → Collaborate" }, { letter: "C", text: "Ask questions → Fix problems → Next patient" }], correctLetter: "B", explanation: "The correct order is always: Empathy FIRST → Journey SECOND → 5Whys THIRD. Never skip steps." },
      { id: "q2", text: "When a patient stops at a surface answer during 5Whys, you should:", options: [{ letter: "A", text: "Push harder — ask \"but WHY really?\"" }, { letter: "B", text: "Try a different entry: \"What do you notice?\" or \"If you had to guess?\"" }, { letter: "C", text: "Move on — they clearly don't want to share" }], correctLetter: "B", explanation: "Try alternative entry points like 'What do you notice?' to gently continue the inquiry without pressure." },
      { id: "q3", text: "Empathy has 3 layers. What are they in order?", options: [{ letter: "A", text: "Listening → Advising → Fixing" }, { letter: "B", text: "Validation → Perspective-taking → Compassionate action" }, { letter: "C", text: "Sympathy → Pity → Treatment" }], correctLetter: "B", explanation: "Empathy flows through Validation → Perspective-taking → Compassionate action. Never skip to solutions." },
    ],
  },
  "ATMT-2": {
    title: "Fundamentals of NLP Quiz",
    subtitle: "Neuro-Linguistic Programming essentials",
    icon: "🧠",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "NLP should NEVER be used to:", options: [{ letter: "A", text: "Build patient confidence" }, { letter: "B", text: "Manipulate patients or override their autonomy" }, { letter: "C", text: "Help change limiting beliefs" }], correctLetter: "B", explanation: "Ethical NLP practice always respects patient autonomy and never seeks to manipulate." },
      { id: "q2", text: "Visualization works because:", options: [{ letter: "A", text: "It's relaxing and distracting" }, { letter: "B", text: "The brain activates similar neural pathways as during actual experience" }, { letter: "C", text: "It only works for creative people" }], correctLetter: "B", explanation: "Research shows the brain activates similar neural pathways during vivid visualization as during real experiences." },
    ],
  },
  "ATMT-3": {
    title: "NRI Mindset Quiz",
    subtitle: "Understanding Diaspora Cultural Context",
    icon: "🌏",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "When an NRI client describes feeling like \"two different people,\" the therapist should:", options: [{ letter: "A", text: "Diagnose identity disorder" }, { letter: "B", text: "Validate the code-switching and help them integrate both selves" }, { letter: "C", text: "Tell them to choose one identity" }], correctLetter: "B", explanation: "This duality is adaptive, not pathological. Validation and integration are the clinical goal." },
      { id: "q2", text: "NRI clients who present with \"work stress\" may actually be experiencing:", options: [{ letter: "A", text: "Only work stress — take them at face value" }, { letter: "B", text: "Unprocessed guilt about leaving India, masked as surface-level issues" }, { letter: "C", text: "Homesickness — just suggest they visit India" }], correctLetter: "B", explanation: "The underlying driver is frequently unprocessed family guilt masked as common stress markers." },
    ],
  },
  "ATMT-4": {
    title: "What Good CBT Looks Like Quiz",
    subtitle: "Gold standard cognitive therapy",
    icon: "💭",
    accentColor: "#4361ee",
    accentLight: "#dfe6fd",
    questions: [
      { id: "q1", text: "When a patient says \"I always fail,\" good CBT practice is to:", options: [{ letter: "A", text: "\"That's just all-or-nothing thinking, a cognitive distortion\"" }, { letter: "B", text: "Validate the feeling first, then collaboratively examine evidence for and against" }, { letter: "C", text: "Assign a thought record worksheet as homework" }], correctLetter: "B", explanation: "Never use CBT to invalidate a patient's feelings. Validate first, then thoughtfully and collaboratively challenge it." },
      { id: "q2", text: "CBT is NOT appropriate when:", options: [{ letter: "A", text: "Patient is in active crisis or acute trauma — stabilize first" }, { letter: "B", text: "Patient has anxiety" }, { letter: "C", text: "Patient is from a different culture" }], correctLetter: "A", explanation: "Cognitive restructuring is ineffective and potentially harmful during active crisis or acute trauma. Stabilization is priority one." },
    ],
  },
  "ATMT-5": {
    title: "Dashboard & Tools Quiz",
    subtitle: "Platform Navigation",
    icon: "📊",
    accentColor: "#d97706",
    accentLight: "#fef0d5",
    questions: [
      { id: "q1", text: "When a patient's mood chart shows a sudden spike after weeks of improvement, you should:", options: [{ letter: "A", text: "Check for a crisis event and reach out proactively" }, { letter: "B", text: "Ignore it — regression is normal" }, { letter: "C", text: "Wait for the next scheduled session" }], correctLetter: "A", explanation: "Sudden deviations from a trend map may indicate a triggering event or crisis requiring immediate proactive care." },
      { id: "q2", text: "The settlement report on your dashboard shows:", options: [{ letter: "A", text: "Only your total earnings" }, { letter: "B", text: "60/40 split breakdown — your 60% share, platform 40%, per session and monthly total" }, { letter: "C", text: "Patient payment history" }], correctLetter: "B", explanation: "The dashboard transparently maps the 60/40 split, showing earnings at both the per-session and monthly levels." },
    ],
  },
  "ATMT-6": {
    title: "Module 6 Quiz",
    subtitle: "Session closure & protocols",
    icon: "📋",
    accentColor: "#d97706",
    accentLight: "#fef0d5",
    questions: [
      { id: "q1", text: "A good session closure should include:", options: [{ letter: "A", text: "Just saying goodbye" }, { letter: "B", text: "Summary, positive reinforcement, and a takeaway task" }, { letter: "C", text: "Scheduling the next appointment only" }], correctLetter: "B", explanation: "Effective closures include a summary of key insights, positive reinforcement, and a clear takeaway task." },
      { id: "q2", text: "When a patient's mood trend shows a sudden spike after improvement:", options: [{ letter: "A", text: "Check for a crisis event and reach out proactively" }, { letter: "B", text: "Ignore it — regression is normal" }, { letter: "C", text: "Wait for the next scheduled session" }], correctLetter: "A", explanation: "Sudden spikes require proactive outreach to check for crisis events. Don't wait for the next session." },
    ],
  },
  "ATMT-7": {
    title: "Module 7 Quiz",
    subtitle: "Ethics & professional boundaries",
    icon: "⚖️",
    accentColor: "#2d8a4e",
    accentLight: "#d4f0de",
    questions: [
      { id: "q1", text: "When should CBT NOT be used?", options: [{ letter: "A", text: "Patient is in active crisis or acute trauma — stabilize first" }, { letter: "B", text: "Patient has anxiety" }, { letter: "C", text: "Patient is from a different culture" }], correctLetter: "A", explanation: "CBT is not appropriate during active crisis or acute trauma. Stabilization must come first." },
      { id: "q2", text: "MANAS360's non-negotiable rule for CBT is:", options: [{ letter: "A", text: "Always diagnose quickly" }, { letter: "B", text: "Never use CBT to tell patients their feelings are 'wrong'. Validate first, challenge second" }, { letter: "C", text: "Assign homework every session" }], correctLetter: "B", explanation: "Never use CBT as a weapon. Validate first. Challenge second. Always collaborative." },
    ],
  },

  // ─── NLP PATH ───
  "ATMT-C1.1": {
    title: "NLP Sensory Acuity Quiz",
    subtitle: "Understanding representational systems",
    icon: "👁️",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "The three pillars of NLP are:", options: [{ letter: "A", text: "Mind, Body, Spirit" }, { letter: "B", text: "Neuro, Linguistic, Programming" }, { letter: "C", text: "Think, Act, Feel" }], correctLetter: "B", explanation: "NLP stands for Neuro (brain processing), Linguistic (language shaping reality), Programming (changing patterns)." },
      { id: "q2", text: "NLP should NEVER be used to:", options: [{ letter: "A", text: "Build patient confidence" }, { letter: "B", text: "Manipulate patients or override their autonomy" }, { letter: "C", text: "Help change limiting beliefs" }], correctLetter: "B", explanation: "NLP must always be used ethically. Manipulating patients or overriding their autonomy is strictly prohibited." },
    ],
  },
  "ATMT-C1.2": {
    title: "Anchoring Quiz",
    subtitle: "Creating positive state triggers",
    icon: "⚓",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "What is an Anchor in NLP?", options: [{ letter: "A", text: "A permanent emotional fix" }, { letter: "B", text: "A learned trigger that activates a specific desired emotional state" }, { letter: "C", text: "A physical restraint technique" }], correctLetter: "B", explanation: "Anchors are learned triggers — they can be created, used, and changed. They are NOT permanent or magic." },
      { id: "q2", text: "How many times should you repeat an anchor to build it?", options: [{ letter: "A", text: "Once is enough" }, { letter: "B", text: "3-5 times" }, { letter: "C", text: "At least 20 times" }], correctLetter: "B", explanation: "Repeat the anchor process 3-5 times to build a reliable association between the trigger and the desired state." },
    ],
  },
  "ATMT-C1.3": {
    title: "Reframing Quiz",
    subtitle: "Changing meaning & perspective",
    icon: "🔄",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "The correct way to reframe 'I always fail' is:", options: [{ letter: "A", text: "\"Just think positive!\"" }, { letter: "B", text: "Challenge absolute language: \"Always? Can you think of ONE time you succeeded?\"" }, { letter: "C", text: "\"You're right, you do fail a lot\"" }], correctLetter: "B", explanation: "Challenge absolutes gently, then help create a new frame that acknowledges both setbacks and wins." },
    ],
  },
  "ATMT-C2.1": {
    title: "Pacing & Leading Quiz",
    subtitle: "Communication matching techniques",
    icon: "🤝",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "Pacing in NLP means:", options: [{ letter: "A", text: "Walking at the same speed as your patient" }, { letter: "B", text: "Matching the other person's communication style to build rapport" }, { letter: "C", text: "Speaking faster than your patient" }], correctLetter: "B", explanation: "Pacing means matching breathing, tempo, and communication style to build deep rapport before leading." },
    ],
  },
  "ATMT-C2.2": {
    title: "Milton Model Quiz",
    subtitle: "Persuasion & language patterns",
    icon: "🗣️",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "Visualization works because:", options: [{ letter: "A", text: "It's relaxing and distracting" }, { letter: "B", text: "The brain activates similar neural pathways as during actual experience" }, { letter: "C", text: "It only works for creative people" }], correctLetter: "B", explanation: "Research shows the brain activates similar neural pathways during vivid visualization as during real experiences." },
    ],
  },
  "ATMT-C4": {
    title: "Timeline Mapping Quiz",
    subtitle: "Meta-programs & time perception",
    icon: "⏳",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "The key ethical boundary in NLP practice is:", options: [{ letter: "A", text: "Use any technique that gets results" }, { letter: "B", text: "Always respect patient autonomy — never use NLP to manipulate" }, { letter: "C", text: "Ethics don't apply to NLP" }], correctLetter: "B", explanation: "Ethical NLP practice always respects patient autonomy and informed consent." },
    ],
  },
  "ATMT-C5.1": {
    title: "Strategy Elicitation Quiz",
    subtitle: "Uncovering motivation strategies",
    icon: "🧭",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "When eliciting a motivation strategy, you map the:", options: [{ letter: "A", text: "Patient's medical history only" }, { letter: "B", text: "VAKOG sequence and decision point" }, { letter: "C", text: "Patient's family tree" }], correctLetter: "B", explanation: "Strategy Elicitation maps the Visual, Auditory, Kinesthetic, Olfactory, Gustatory sequence and the decision trigger." },
    ],
  },
  "ATMT-C5.2": {
    title: "NLP Final Mastery Quiz",
    subtitle: "Integrating all NLP techniques",
    icon: "🏆",
    accentColor: "#1a8a7d",
    accentLight: "#d5f0ec",
    questions: [
      { id: "q1", text: "A complete NLP behavioral change session should combine:", options: [{ letter: "A", text: "Only Anchoring" }, { letter: "B", text: "Anchoring, Reframing, and Strategy Elicitation together" }, { letter: "C", text: "Medication and NLP" }], correctLetter: "B", explanation: "An integrated session combines Anchoring, Reframing, and Strategy Elicitation for comprehensive behavioral change." },
      { id: "q2", text: "NLP is NOT appropriate when:", options: [{ letter: "A", text: "Patient has phobias" }, { letter: "B", text: "Patient is in active psychosis or severe psychiatric crisis" }, { letter: "C", text: "Patient is unmotivated" }], correctLetter: "B", explanation: "NLP requires cognitive engagement. Active psychosis or severe psychiatric crisis requires medical intervention first." },
    ],
  },

  // ─── EXECUTIVE PATH ───
  "ATMT-E1": {
    title: "Aatman Engineering Quiz",
    subtitle: "Organizational culture & consciousness",
    icon: "🏢",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "The Aatman Engineering framework is primarily about:", options: [{ letter: "A", text: "Software engineering methodologies" }, { letter: "B", text: "Understanding and transforming organizational culture through consciousness" }, { letter: "C", text: "Financial auditing" }], correctLetter: "B", explanation: "Aatman Engineering integrates consciousness awareness into organizational transformation." },
    ],
  },
  "ATMT-E2.1": {
    title: "Executive Performance Quiz",
    subtitle: "Mental drivers & flow state",
    icon: "⚡",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "Flow State in executive performance is achieved when:", options: [{ letter: "A", text: "The executive works 16+ hours daily" }, { letter: "B", text: "Challenge level matches skill level with clear goals and immediate feedback" }, { letter: "C", text: "All distractions are eliminated permanently" }], correctLetter: "B", explanation: "Flow requires the right balance of challenge and skill, with clear goals and immediate feedback loops." },
    ],
  },
  "ATMT-E2.2": {
    title: "Leadership Influence Quiz",
    subtitle: "Mental blocks & team dynamics",
    icon: "👥",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "Mental blocks in leadership impact teams by:", options: [{ letter: "A", text: "Having no effect on team performance" }, { letter: "B", text: "Cascading anxiety and avoidance patterns down the organizational hierarchy" }, { letter: "C", text: "Only affecting the leader personally" }], correctLetter: "B", explanation: "Leadership mental blocks cascade through the organization, affecting team dynamics, morale, and performance." },
    ],
  },
  "ATMT-E4.1": {
    title: "Corporate Conflict Resolution Quiz",
    subtitle: "Mediation tools & techniques",
    icon: "🤝",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "The first step in corporate conflict mediation is:", options: [{ letter: "A", text: "Taking sides with the more senior person" }, { letter: "B", text: "Creating psychological safety for all parties to express their perspective" }, { letter: "C", text: "Immediately proposing a solution" }], correctLetter: "B", explanation: "Psychological safety must be established before any productive conflict resolution can occur." },
    ],
  },
  "ATMT-E4.2": {
    title: "Emotional Intelligence Dashboard Quiz",
    subtitle: "EQ metrics for executives",
    icon: "📊",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "Key EQ metrics for executives include:", options: [{ letter: "A", text: "Only revenue and profit numbers" }, { letter: "B", text: "Self-awareness, empathy, social skills, self-regulation, and motivation" }, { letter: "C", text: "Employee attendance only" }], correctLetter: "B", explanation: "EQ encompasses self-awareness, empathy, social skills, self-regulation, and intrinsic motivation." },
    ],
  },
  "ATMT-E4.3": {
    title: "Executive Crisis Simulation Quiz",
    subtitle: "Crisis response protocols",
    icon: "🚨",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "During an organizational crisis, the executive therapist should:", options: [{ letter: "A", text: "Wait for things to settle naturally" }, { letter: "B", text: "Provide immediate emotional stabilization before strategic planning" }, { letter: "C", text: "Focus only on business continuity metrics" }], correctLetter: "B", explanation: "Emotional stabilization must precede strategic planning — people cannot think clearly while in crisis mode." },
    ],
  },
  "ATMT-E5": {
    title: "Strategic Therapy Plan Quiz",
    subtitle: "Organizational therapy roadmaps",
    icon: "🗺️",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "A 3-month organizational therapy roadmap should:", options: [{ letter: "A", text: "Focus only on the CEO" }, { letter: "B", text: "Address individual, team, and systemic levels progressively" }, { letter: "C", text: "Replace HR entirely" }], correctLetter: "B", explanation: "Effective organizational therapy addresses individual healing, team dynamics, and systemic change progressively." },
    ],
  },
  "ATMT-E6": {
    title: "Executive Final Mastery Quiz",
    subtitle: "Comprehensive executive therapy assessment",
    icon: "🏆",
    accentColor: "#7c3aed",
    accentLight: "#ede5fd",
    questions: [
      { id: "q1", text: "Mental health is the cornerstone of corporate leadership because:", options: [{ letter: "A", text: "It's a trending HR topic" }, { letter: "B", text: "Leaders' mental states directly determine organizational culture, productivity, and innovation" }, { letter: "C", text: "It's legally required" }], correctLetter: "B", explanation: "A leader's mental wellness cascades through every decision, interaction, and cultural norm in the organization." },
      { id: "q2", text: "The integration of Western psychology and Eastern wisdom in executive therapy:", options: [{ letter: "A", text: "Is contradictory and shouldn't be attempted" }, { letter: "B", text: "Creates a holistic framework that addresses both cognitive and spiritual dimensions of leadership" }, { letter: "C", text: "Only works for Indian executives" }], correctLetter: "B", explanation: "Integrating both traditions creates a comprehensive approach addressing cognitive, emotional, and spiritual dimensions." },
    ],
  },

  // ─── PSYCHOLOGIST PATH ───
  "ATMT-P5.1": {
    title: "Clinical Intake Quiz",
    subtitle: "Patient assessment fundamentals",
    icon: "📋",
    accentColor: "#d97706",
    accentLight: "#fef0d5",
    questions: [
      { id: "q1", text: "The CBT triangle connects:", options: [{ letter: "A", text: "Doctor, Patient, Medicine" }, { letter: "B", text: "Thoughts → Feelings → Behaviors" }, { letter: "C", text: "Past, Present, Future" }], correctLetter: "B", explanation: "The CBT triangle shows how Thoughts trigger Feelings which drive Behaviors — and we intervene at the thought level." },
      { id: "q2", text: "In a clinical intake, the priority is to:", options: [{ letter: "A", text: "Diagnose immediately" }, { letter: "B", text: "Build rapport and identify red flags while gathering comprehensive history" }, { letter: "C", text: "Prescribe medication" }], correctLetter: "B", explanation: "Intake requires building trust, identifying safety concerns, and gathering a thorough clinical picture." },
    ],
  },
  "ATMT-P5.2": {
    title: "CBT Thought Records Quiz",
    subtitle: "Good vs bad CBT practice",
    icon: "💭",
    accentColor: "#d97706",
    accentLight: "#fef0d5",
    questions: [
      { id: "q1", text: "When a patient says 'I feel worthless', bad CBT would be:", options: [{ letter: "A", text: "\"That sounds really painful. When did you start feeling this way?\"" }, { letter: "B", text: "\"Well, that's just a cognitive distortion. Let's challenge it.\"" }, { letter: "C", text: "\"Let's look at evidence together\"" }], correctLetter: "B", explanation: "Immediately labeling a feeling as a 'cognitive distortion' dismisses the patient. Validate first, challenge second." },
      { id: "q2", text: "Good CBT thought records are:", options: [{ letter: "A", text: "Homework punishment for patients" }, { letter: "B", text: "Collaborative exploration of evidence for and against thoughts" }, { letter: "C", text: "Only for severe cases" }], correctLetter: "B", explanation: "Thought records should feel collaborative — not like being corrected. Patient feels heard throughout." },
    ],
  },
  "ATMT-P5.3": {
    title: "Therapeutic Bond Quiz",
    subtitle: "Alliance building & transference",
    icon: "🤝",
    accentColor: "#d97706",
    accentLight: "#fef0d5",
    questions: [
      { id: "q1", text: "When handling transference, the psychologist should:", options: [{ letter: "A", text: "Ignore it completely" }, { letter: "B", text: "Recognize it, explore it therapeutically, and maintain appropriate boundaries" }, { letter: "C", text: "Terminate the relationship immediately" }], correctLetter: "B", explanation: "Transference is a therapeutic tool when handled skillfully — it reveals the patient's relational patterns." },
    ],
  },
  "ATMT-P5.4": {
    title: "Clinical Final Evaluation Quiz",
    subtitle: "Comprehensive clinical assessment",
    icon: "🏆",
    accentColor: "#d97706",
    accentLight: "#fef0d5",
    questions: [
      { id: "q1", text: "CBT is NOT appropriate when:", options: [{ letter: "A", text: "Patient is in active crisis or acute trauma — stabilize first" }, { letter: "B", text: "Patient has anxiety" }, { letter: "C", text: "Patient is from a different culture" }], correctLetter: "A", explanation: "During active crisis, the priority is stabilization and safety — not cognitive restructuring." },
      { id: "q2", text: "Culturally-adapted CBT for Indian patients should consider:", options: [{ letter: "A", text: "Ignoring cultural context entirely" }, { letter: "B", text: "Family dynamics, collectivism, spiritual beliefs, and stigma around mental health" }, { letter: "C", text: "Using only Western frameworks" }], correctLetter: "B", explanation: "Indian cultural context — family systems, collectivism, spirituality — must inform how CBT is delivered." },
    ],
  },

  // ─── PSYCHIATRIST PATH ───
  "ATMT-MD1.1": {
    title: "Psychopharmacology Quiz",
    subtitle: "Medication mechanisms & classes",
    icon: "💊",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "SSRIs primarily work by:", options: [{ letter: "A", text: "Blocking dopamine receptors" }, { letter: "B", text: "Inhibiting serotonin reuptake at the synaptic cleft" }, { letter: "C", text: "Increasing GABA activity" }], correctLetter: "B", explanation: "SSRIs (Selective Serotonin Reuptake Inhibitors) increase serotonin availability by blocking its reuptake." },
    ],
  },
  "ATMT-MD1.2": {
    title: "DSM-5 Diagnosis Quiz",
    subtitle: "Differential diagnosis skills",
    icon: "📖",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "Differential diagnosis requires:", options: [{ letter: "A", text: "Picking the first diagnosis that fits" }, { letter: "B", text: "Systematically considering and ruling out alternative diagnoses" }, { letter: "C", text: "Using only patient self-report" }], correctLetter: "B", explanation: "Differential diagnosis requires careful consideration of all possible conditions, ruling out systematically." },
    ],
  },
  "ATMT-MD1.3": {
    title: "Clinical Documentation Quiz",
    subtitle: "Chart entries & standards",
    icon: "📝",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "A clinical chart entry for Bipolar I must include:", options: [{ letter: "A", text: "Only the diagnosis code" }, { letter: "B", text: "Presenting symptoms, clinical assessment, treatment plan, and risk factors" }, { letter: "C", text: "Just medication prescribed" }], correctLetter: "B", explanation: "Complete documentation requires symptoms, assessment, plan, and risk factors for continuity of care." },
    ],
  },
  "ATMT-MD2.1": {
    title: "Risk Assessment Quiz",
    subtitle: "SLAP assessment & safety planning",
    icon: "🚨",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "SLAP in suicide risk assessment stands for:", options: [{ letter: "A", text: "Sleep, Lifestyle, Activity, Purpose" }, { letter: "B", text: "Specificity, Lethality, Availability, Proximity" }, { letter: "C", text: "Screening, Labeling, Assessing, Planning" }], correctLetter: "B", explanation: "SLAP: Specificity of plan, Lethality of method, Availability of means, Proximity to help/rescue." },
    ],
  },
  "ATMT-MD2.2": {
    title: "Medication Monitoring Quiz",
    subtitle: "Blood work & therapeutic levels",
    icon: "🔬",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "Lithium monitoring requires:", options: [{ letter: "A", text: "No blood work needed" }, { letter: "B", text: "Regular serum levels, renal function, and thyroid function tests" }, { letter: "C", text: "Only checking blood pressure" }], correctLetter: "B", explanation: "Lithium has a narrow therapeutic window — regular monitoring of serum levels, kidney, and thyroid is critical." },
    ],
  },
  "ATMT-MD2.3": {
    title: "Adverse Reactions Quiz",
    subtitle: "Emergency protocols",
    icon: "⚠️",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "Serotonin Syndrome presents with:", options: [{ letter: "A", text: "Only drowsiness" }, { letter: "B", text: "Agitation, hyperthermia, clonus, and autonomic instability" }, { letter: "C", text: "No symptoms — it's asymptomatic" }], correctLetter: "B", explanation: "Serotonin Syndrome is a medical emergency with agitation, high fever, muscle rigidity, and autonomic dysfunction." },
    ],
  },
  "ATMT-MD3.1": {
    title: "Neuropsychiatry Quiz",
    subtitle: "Inflammation & depression link",
    icon: "🧬",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "The link between chronic inflammation and depression suggests:", options: [{ letter: "A", text: "Depression is purely psychological" }, { letter: "B", text: "Inflammatory cytokines can drive neuroinflammation contributing to depressive symptoms" }, { letter: "C", text: "Anti-inflammatory drugs replace antidepressants" }], correctLetter: "B", explanation: "Research shows inflammatory cytokines can cross the blood-brain barrier and contribute to depression pathophysiology." },
    ],
  },
  "ATMT-MD3.2": {
    title: "Geriatric Mental Health Quiz",
    subtitle: "Treating elderly patients",
    icon: "👴",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "Adjusting treatment for elderly patients requires:", options: [{ letter: "A", text: "Using the same doses as younger adults" }, { letter: "B", text: "Lower starting doses, monitoring for drug interactions, and considering comorbidities" }, { letter: "C", text: "Avoiding all medications" }], correctLetter: "B", explanation: "Elderly patients need 'start low, go slow' dosing with careful attention to polypharmacy and comorbidities." },
    ],
  },
  "ATMT-MD3.3": {
    title: "Pediatric Assessment Quiz",
    subtitle: "ADHD diagnosis in children",
    icon: "👶",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "Diagnosing ADHD in children under 6 requires:", options: [{ letter: "A", text: "A single questionnaire" }, { letter: "B", text: "Multiple informant reports, behavioral observation, and careful developmental consideration" }, { letter: "C", text: "Only parental report" }], correctLetter: "B", explanation: "Young children need comprehensive multi-source assessment — developmental norms must be carefully considered." },
    ],
  },
  "ATMT-MD4.1": {
    title: "Integrative Psychiatry Quiz",
    subtitle: "Lifestyle & complementary approaches",
    icon: "🌿",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "Integrative psychiatry combines:", options: [{ letter: "A", text: "Only traditional medicine" }, { letter: "B", text: "Evidence-based pharmacology with diet, exercise, and lifestyle modifications" }, { letter: "C", text: "Only alternative medicine" }], correctLetter: "B", explanation: "Integrative approaches complement medication with evidence-based lifestyle interventions — not replace them." },
    ],
  },
  "ATMT-MD4.2": {
    title: "SUD Treatment Quiz",
    subtitle: "Opioid use disorder protocols",
    icon: "💉",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "A 90-day OUD treatment plan should include:", options: [{ letter: "A", text: "Only detox" }, { letter: "B", text: "Medical detox, maintenance therapy (e.g., buprenorphine), and psychosocial support" }, { letter: "C", text: "Only counseling" }], correctLetter: "B", explanation: "Comprehensive OUD treatment requires medication-assisted treatment plus robust psychosocial rehabilitation." },
    ],
  },
  "ATMT-MD4.3": {
    title: "Forensic Ethics Quiz",
    subtitle: "Confidentiality vs. public safety",
    icon: "⚖️",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "The Tarasoff Rule states that:", options: [{ letter: "A", text: "Patient confidentiality is absolute" }, { letter: "B", text: "Therapists have a duty to warn identifiable potential victims of a patient's serious threats" }, { letter: "C", text: "Only police can break confidentiality" }], correctLetter: "B", explanation: "Tarasoff established the duty to protect — confidentiality must yield when there's a credible threat to an identifiable victim." },
    ],
  },
  "ATMT-MD6": {
    title: "Psychiatrist Final Mastery Quiz",
    subtitle: "Comprehensive psychiatric assessment",
    icon: "🏆",
    accentColor: "#d64045",
    accentLight: "#fce4e4",
    questions: [
      { id: "q1", text: "Personalized psychiatric medicine means:", options: [{ letter: "A", text: "Every patient gets the same treatment" }, { letter: "B", text: "Treatment tailored to genetics, biomarkers, lifestyle, and individual patient response" }, { letter: "C", text: "Patients choose their own treatment" }], correctLetter: "B", explanation: "Personalized medicine considers genetic, biological, psychological, and social factors for individualized treatment." },
      { id: "q2", text: "The future of psychiatry integrates:", options: [{ letter: "A", text: "Only medication" }, { letter: "B", text: "Pharmacogenomics, digital health tools, psychotherapy, and holistic well-being" }, { letter: "C", text: "Only AI-based diagnosis" }], correctLetter: "B", explanation: "Modern psychiatry is evolving toward integration of precision medicine, technology, therapy, and whole-person care." },
    ],
  },
  // ─── ASHA PATH ───
  "ATMT-ASHA": {
    title: "ASHA Training Quiz",
    subtitle: "Mental Wellness Champion fundamentals",
    icon: "🌟",
    accentColor: "#f59e0b",
    accentLight: "#fef3c7",
    questions: [
      { id: "q1", text: "As an ASHA Mental Wellness Champion, your primary role is to:", options: [{ letter: "A", text: "Diagnose and prescribe medication for mental illnesses" }, { letter: "B", text: "Provide psychosocial support, identify early signs of distress, and facilitate referrals" }, { letter: "C", text: "Perform clinical psychotherapy sessions" }], correctLetter: "B", explanation: "ASHA workers act as frontline community support, identifying distress and connecting individuals to professional care when needed." },
      { id: "q2", text: "When approaching mental wellness in rural communities, the most effective strategy is:", options: [{ letter: "A", text: "Using complex clinical terminology" }, { letter: "B", text: "Integrating awareness into existing community gatherings and using culturally relatable language" }, { letter: "C", text: "Waiting for individuals to come to the clinic" }], correctLetter: "B", explanation: "Community mental health relies on meeting people where they are and using language that resonates with local cultural contexts." },
    ],
  },
};

/* ──────────────────────────────────────────────────────────
   Quiz Page Component
   ────────────────────────────────────────────────────────── */

export const CertificationQuizPage: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { enrollments } = useEnrollmentStore();

  const enrollment = useMemo(() => 
    enrollments.find((e: any) => e.id === enrollmentId),
  [enrollments, enrollmentId]);

  const certName = enrollment?.certificationName || "Certified Practitioner";

  // Build the combined quiz dynamically based on the certification modules
  const quiz = useMemo(() => {
    const modules = getModulesByCertification(certName);
    
    let allQuestions: QuizQuestion[] = [];
    modules.forEach(m => {
      const moduleQuiz = QUIZ_DATA[m.id];
      if (moduleQuiz && moduleQuiz.questions) {
        allQuestions = [...allQuestions, ...moduleQuiz.questions];
      }
    });

    if (allQuestions.length === 0) return null;

    // Deduplicate questions by using a map (optional safety, or just map ids to be unique)
    const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.text, q])).values());
    const finalQuestions = uniqueQuestions.map((q, idx) => ({ ...q, id: `q${idx}` }));

    const firstQuiz = QUIZ_DATA[modules[0]?.id] || QUIZ_DATA["ATMT-OPENING"];

    return {
      title: `${certName} Final Quiz`,
      subtitle: "Comprehensive assessment covering all modules for this certification",
      icon: "🎓",
      accentColor: firstQuiz?.accentColor || "#4361ee",
      accentLight: firstQuiz?.accentLight || "#dfe6fd",
      questions: finalQuestions
    };
  }, [certName]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const questions = quiz?.questions || [];
  const totalQuestions = questions.length;

  const score = useMemo(() => {
    if (!submitted) return 0;
    return questions.filter((q) => answers[q.id] === q.correctLetter).length;
  }, [submitted, answers, questions]);

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const passed = percentage >= 85;

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center max-w-md">
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-xl font-bold text-slate-900 font-serif mb-2">Quiz Not Available</h2>
          <p className="text-slate-500 text-sm mb-6">No quiz has been configured for this module yet.</p>
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
            className={`rounded-2xl p-6 md:p-8 mb-6 border-2 ${
              passed ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                  passed ? "bg-emerald-100" : "bg-amber-100"
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
                    ? " You've met the 85% passing threshold."
                    : " You need 85% to pass. Review the explanations below and try again."}
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
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition shadow-md"
                >
                  <Award size={14} /> Continue to Next Module
                </button>
              )}
            </div>
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
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                          submitted && isCorrectAnswer
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
                  className={`mt-4 p-3.5 rounded-xl text-sm leading-relaxed ${
                    answers[q.id] === q.correctLetter
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
              className={`px-10 py-4 rounded-full font-bold text-sm transition-all shadow-lg ${
                Object.keys(answers).length >= totalQuestions
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
