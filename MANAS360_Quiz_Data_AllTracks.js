// ═══════════════════════════════════════════════════════════════
// MANAS360 — Certification Quiz Data (Story 8.8)
//
// 5 tracks × 9 questions × 4 options each = 45 questions total
//
// FORMAT:
//   q: question text
//   options: [4 choices]
//   correct: index of correct answer (0-3)
//
// HOW TO USE:
// Paste this QUIZ_DATA object into the existing quiz module JS.
// Replace the old quiz data arrays.
// The quiz selector cards should map to these 5 keys.
//
// Pass rate: 7/9 correct (78%) to earn certification
// ═══════════════════════════════════════════════════════════════

const QUIZ_DATA = {

// ═══════════════════════════════════════
// TRACK 1: CERTIFIED 5WHYS PRACTITIONER
// ═══════════════════════════════════════
"5whys": {
  title: "Certified 5Whys Practitioner",
  icon: "🧠",
  description: "Root cause analysis, empathy framework, projecting questions, and Daily Journey mapping.",
  passScore: 7,
  questions: [
    {
      q: "What is the PRIMARY purpose of the 5Whys technique in a therapeutic context?",
      options: [
        "To diagnose the patient's disorder within 5 questions",
        "To peel through surface symptoms and reach the emotional root cause through empathic inquiry",
        "To challenge the patient's beliefs and prove them wrong",
        "To complete the intake assessment faster"
      ],
      correct: 1
    },
    {
      q: "A patient says 'I can't sleep.' Using the 5Whys with empathy, what is the BEST first response?",
      options: [
        "'How many hours do you sleep?' (clinical data collection)",
        "'Have you tried melatonin?' (immediate solution)",
        "'That sounds exhausting. Tell me — when you lie down, what shows up in your mind?' (empathy + first why)",
        "'You need better sleep hygiene.' (prescriptive advice)"
      ],
      correct: 2
    },
    {
      q: "What differentiates Daily Journey mapping from a standard symptom checklist?",
      options: [
        "It is shorter and takes less time",
        "It asks 'Walk me through your day' — uncovering triggers, patterns, and coping in context rather than isolated symptoms",
        "It replaces the PHQ-9 entirely",
        "It focuses only on sleep and appetite"
      ],
      correct: 1
    },
    {
      q: "What are 'Projecting Questions' designed to do?",
      options: [
        "Project the therapist's opinion onto the patient",
        "Speed up the session by skipping small talk",
        "Invite the patient to examine their own beliefs and wisdom — 'What would you tell a friend in your situation?'",
        "Test whether the patient is being honest"
      ],
      correct: 2
    },
    {
      q: "A patient stops at 'I don't know why I feel this way.' What should you do?",
      options: [
        "End the session and try next week",
        "Tell them they're not trying hard enough",
        "Don't force it. Try lateral entry: 'What do you notice in your body right now?' or 'If you had to guess, what might it be?'",
        "Move to a completely different topic"
      ],
      correct: 2
    },
    {
      q: "What is Layer 1 of the MANAS360 Empathy Framework?",
      options: [
        "Asking diagnostic questions",
        "Giving advice based on your experience",
        "Validation — acknowledging feelings without judgment: 'That sounds really heavy.'",
        "Referring to a psychiatrist immediately"
      ],
      correct: 2
    },
    {
      q: "If building empathy takes longer than the 5Whys inquiry itself, what does that indicate?",
      options: [
        "You're doing it wrong — empathy should be faster",
        "The patient is being difficult",
        "That's exactly right — trust takes time. A patient who feels truly seen will go deeper voluntarily",
        "You should skip empathy and jump to questions"
      ],
      correct: 2
    },
    {
      q: "How does the 5Whys approach relate to CBT?",
      options: [
        "5Whys replaces CBT entirely",
        "They are identical methodologies with different names",
        "CBT focuses on thought patterns; 5Whys first maps the full picture. They complement each other.",
        "CBT is evidence-based; 5Whys is not"
      ],
      correct: 2
    },
    {
      q: "What is 'compassionate action' in the Empathy Framework?",
      options: [
        "Solving all the patient's problems immediately",
        "Feeling sorry for the patient and lowering your fees",
        "Moving beyond understanding to collaborative, patient-led solutions that honor autonomy",
        "Referring to another therapist because you feel too involved"
      ],
      correct: 2
    }
  ]
},

// ═══════════════════════════════════════
// TRACK 2: CERTIFIED PSYCHOLOGIST
// ═══════════════════════════════════════
"psychologist": {
  title: "Certified Psychologist",
  icon: "🎓",
  description: "Clinical assessment, evidence-based therapy, ethical practice, and Indian regulatory context (RCI/NEP 2020).",
  passScore: 7,
  questions: [
    {
      q: "Under RCI guidelines, what is the minimum qualification required to practice clinical psychology in India?",
      options: [
        "BA Psychology with 1 year experience",
        "MA Clinical Psychology (post NEP 2020) or M.Phil Clinical Psychology (pre-NEP)",
        "Any psychology degree with a private certification",
        "MD Psychiatry"
      ],
      correct: 1
    },
    {
      q: "A patient scores 18 on the PHQ-9. What does this indicate and what is the appropriate action?",
      options: [
        "Mild depression — reassure and schedule a follow-up in 4 weeks",
        "No clinical significance — no action needed",
        "Moderately severe depression — initiate evidence-based therapy (CBT/IPT) and consider psychiatric referral for medication evaluation",
        "The patient is faking symptoms"
      ],
      correct: 2
    },
    {
      q: "When is it ethically MANDATORY to break confidentiality under Indian law?",
      options: [
        "When the patient's family requests information",
        "When you think it would help the patient's recovery",
        "When there is imminent risk of harm to self or others, suspected child abuse, or a court order",
        "Whenever a corporate HR department asks for employee wellness data"
      ],
      correct: 2
    },
    {
      q: "What is the difference between CBT and DBT in clinical application?",
      options: [
        "There is no difference — they are the same therapy with different names",
        "CBT targets dysfunctional thought patterns; DBT adds distress tolerance, emotional regulation, and mindfulness — designed originally for BPD and high-emotion states",
        "DBT is only for substance abuse; CBT is for everything else",
        "CBT is evidence-based; DBT is experimental and unproven"
      ],
      correct: 1
    },
    {
      q: "A patient presents with trauma symptoms. What should you assess BEFORE starting trauma-focused therapy?",
      options: [
        "Their income level to determine session pricing",
        "Nothing — start EMDR immediately in the first session",
        "Safety and stabilization: current suicidality, substance use, support system, and window of tolerance. Trauma processing only after stabilization.",
        "Whether they have insurance coverage"
      ],
      correct: 2
    },
    {
      q: "Under DPDPA 2023, what are a patient's data rights on a digital therapy platform like MANAS360?",
      options: [
        "The platform owns all patient data once shared",
        "Right to access, correction, erasure, and data portability. Consent must be explicit and can be withdrawn.",
        "Data rights only apply to government hospitals, not private platforms",
        "Patients have no rights once they accept terms of service"
      ],
      correct: 1
    },
    {
      q: "What is the therapeutic alliance and why does research show it matters more than technique?",
      options: [
        "It's a legal agreement between therapist and patient",
        "It's the quality of the collaborative bond — warmth, trust, shared goals. Research shows it accounts for ~30% of therapy outcomes regardless of modality.",
        "It's a marketing term with no clinical evidence",
        "It only matters in psychodynamic therapy, not CBT"
      ],
      correct: 1
    },
    {
      q: "A patient asks you to prescribe medication for anxiety. What is the correct response as a psychologist?",
      options: [
        "Prescribe a low-dose SSRI since the case is mild",
        "Tell them medication is unnecessary and therapy alone is sufficient",
        "Explain that psychologists cannot prescribe medication in India, and offer to coordinate with a psychiatrist for a combined approach if clinically indicated",
        "Refer them to a pharmacy"
      ],
      correct: 2
    },
    {
      q: "What does NEP 2020 change for psychology training in India?",
      options: [
        "Nothing — the old system continues indefinitely",
        "M.Phil Clinical Psychology (RCI's final cohort) transitions to integrated MA Clinical Psychology programs with supervised practicum hours",
        "Psychology is removed from university curricula entirely",
        "Only NIMHANS can grant psychology degrees going forward"
      ],
      correct: 1
    }
  ]
},

// ═══════════════════════════════════════
// TRACK 3: CERTIFIED PSYCHIATRIST
// ═══════════════════════════════════════
"psychiatrist": {
  title: "Certified Psychiatrist",
  icon: "⚕️",
  description: "Psychopharmacology, clinical diagnosis, medication management, and collaborative care on digital platforms.",
  passScore: 7,
  questions: [
    {
      q: "Under NMC guidelines, what is required to practice psychiatry and prescribe psychotropic medication in India?",
      options: [
        "MBBS with a mental health certificate course",
        "MD/DNB Psychiatry with active NMC registration",
        "Any medical degree with 2 years experience in a psychiatric ward",
        "M.Phil Clinical Psychology with pharmacology elective"
      ],
      correct: 1
    },
    {
      q: "A patient on SSRIs for 3 weeks reports no improvement. What is the appropriate clinical decision?",
      options: [
        "Switch to a different medication class immediately",
        "SSRIs typically require 4-6 weeks for full therapeutic effect. Assess side effects, reinforce adherence, and schedule review at week 6 before changing.",
        "Double the dose immediately",
        "Add a benzodiazepine for faster results"
      ],
      correct: 1
    },
    {
      q: "What is the key risk when a depressed patient suddenly appears 'much better' shortly after starting antidepressants?",
      options: [
        "No risk — the medication is working as expected",
        "Energy returns before mood lifts, creating a window where the patient has motivation to act on suicidal ideation that was previously too debilitating to execute",
        "The patient is faking improvement to end treatment",
        "This indicates a misdiagnosis — they never had depression"
      ],
      correct: 1
    },
    {
      q: "On a telepsychiatry platform like MANAS360, what is NOT appropriate for remote consultation?",
      options: [
        "Medication review and dose adjustment for stable patients",
        "Initial psychiatric assessment for acute psychosis with immediate safety concerns requiring physical examination and potential involuntary admission",
        "Follow-up for depression management",
        "Psychoeducation for family members"
      ],
      correct: 1
    },
    {
      q: "A corporate executive presents with chronic insomnia and requests 'something to help me sleep.' What is the BEST approach?",
      options: [
        "Prescribe zolpidem for immediate relief",
        "Rule out underlying conditions (depression, anxiety, substance use), assess sleep hygiene, consider CBT-I as first line, and use short-term pharmacotherapy only if CBT-I is insufficient",
        "Recommend over-the-counter melatonin and no follow-up",
        "Tell them insomnia is not a real psychiatric condition"
      ],
      correct: 1
    },
    {
      q: "What is the psychiatrist's role in a collaborative care model with psychologists on MANAS360?",
      options: [
        "Psychiatrists handle everything; psychologists are unnecessary",
        "Psychiatrists focus on diagnosis, medication management, and complex cases. Psychologists handle therapy. Both coordinate through shared (anonymized) care notes.",
        "The psychologist decides medication; the psychiatrist does therapy",
        "They should never communicate due to confidentiality rules"
      ],
      correct: 1
    },
    {
      q: "A patient on lithium for bipolar disorder says 'I feel great, I want to stop medication.' What is the clinical response?",
      options: [
        "Agree — if they feel great, medication is no longer needed",
        "Explain that feeling great IS the medication working. Abrupt discontinuation risks manic relapse. Discuss long-term maintenance and shared decision-making.",
        "Double the dose to prevent relapse",
        "Switch to an antidepressant instead"
      ],
      correct: 1
    },
    {
      q: "Under the Mental Healthcare Act 2017 (India), what right does every patient have?",
      options: [
        "Right to free medication from any hospital",
        "Right to access mental healthcare, make an advance directive, and not be subjected to cruel/degrading treatment. Electroconvulsive therapy prohibited on minors.",
        "Right to choose their own diagnosis",
        "Right to unlimited hospital stay at government expense"
      ],
      correct: 1
    },
    {
      q: "What is serotonin syndrome and when should a psychiatrist suspect it?",
      options: [
        "It's a marketing term for SSRI side effects — not clinically significant",
        "A potentially life-threatening condition from excessive serotonergic activity — suspect when a patient on SSRIs is also taking MAOIs, tramadol, or St. John's Wort. Symptoms: agitation, hyperthermia, clonus, tremor.",
        "A common condition that resolves without intervention",
        "It only occurs with illegal drug use, not prescribed medication"
      ],
      correct: 1
    }
  ]
},

// ═══════════════════════════════════════
// TRACK 4: CERTIFIED NLP-NAC COACH
// ═══════════════════════════════════════
"nlp_nac": {
  title: "Certified NLP-NAC Coach",
  icon: "🧬",
  description: "Neuro-Linguistic Programming, Neuro-Associative Conditioning (Tony Robbins), anchoring, reframing, and pattern interrupts.",
  passScore: 7,
  questions: [
    {
      q: "What does NLP stand for and what is its core premise?",
      options: [
        "Natural Language Processing — an AI technology for chatbots",
        "Neuro-Linguistic Programming — the language we use (linguistic) shapes our neurology (thoughts/emotions) and drives our behavior (programming)",
        "Neurological Learning Practice — a medical treatment for brain disorders",
        "Non-Linear Psychology — a branch of behavioral science"
      ],
      correct: 1
    },
    {
      q: "What is 'anchoring' in NLP and how would you use it with a client experiencing performance anxiety?",
      options: [
        "Telling the client to imagine they're on a boat — a relaxation metaphor",
        "Associating a specific physical trigger (like pressing thumb and finger) with a peak confident state, so the client can fire that anchor before high-pressure moments",
        "Anchoring them to their desk so they can't leave during sessions",
        "A technique for keeping clients committed to long-term coaching packages"
      ],
      correct: 1
    },
    {
      q: "In Tony Robbins' Neuro-Associative Conditioning (NAC), what are the two forces that drive all human behavior?",
      options: [
        "Logic and emotion",
        "The desire to gain pleasure and the desire to avoid pain — and pain is the stronger motivator",
        "Money and status",
        "Fear and love"
      ],
      correct: 1
    },
    {
      q: "A client says 'I always fail at everything.' What NLP technique is MOST appropriate?",
      options: [
        "Agree with them to build rapport",
        "Reframing — challenge the generalization: 'Always? Everything? Tell me about one time you succeeded, even something small.'",
        "Ignore it and move to the next agenda item",
        "Prescribe positive affirmations to repeat 100 times daily"
      ],
      correct: 1
    },
    {
      q: "What is a 'pattern interrupt' and when do you use it?",
      options: [
        "Interrupting the client mid-sentence to assert dominance",
        "Breaking a habitual emotional or behavioral loop by introducing an unexpected stimulus — used when a client is stuck in a negative spiral",
        "A scheduling technique for spacing out coaching sessions",
        "A way to end sessions early when they're unproductive"
      ],
      correct: 1
    },
    {
      q: "What is the NLP 'Meta Model' used for?",
      options: [
        "Creating a business model for your coaching practice",
        "A set of language patterns that challenge deletions, distortions, and generalizations in a client's speech to recover deeper meaning",
        "A framework for social media marketing",
        "A diagnostic tool equivalent to the DSM-5"
      ],
      correct: 1
    },
    {
      q: "In NAC, what are the 6 steps to lasting change?",
      options: [
        "Plan → Execute → Review → Repeat × 3",
        "Decide what you want → Know what's preventing you → Associate massive pain with not changing → Associate massive pleasure with changing → Create a new pattern → Test it",
        "Set goals → Track progress → Reward yourself → Repeat",
        "Identify the problem → Blame the cause → Accept it → Move on"
      ],
      correct: 1
    },
    {
      q: "What is the ethical boundary between NLP coaching and clinical therapy?",
      options: [
        "There is no boundary — NLP coaches can treat all mental health conditions",
        "NLP coaches work with performance, goals, and behavioral patterns. Clinical disorders (depression, PTSD, bipolar) require licensed therapists/psychiatrists. Coaches must recognize and refer.",
        "Clinical therapy is outdated; NLP has replaced it",
        "The only difference is pricing — coaches charge more"
      ],
      correct: 1
    },
    {
      q: "A client wants to overcome a phobia. Which NLP technique is specifically designed for this?",
      options: [
        "Positive affirmations written on sticky notes",
        "The Fast Phobia Cure (Visual-Kinesthetic Dissociation) — having the client watch their phobic experience like a movie, then rewind it, dissociating the emotional response",
        "Exposure therapy — force them to face the fear immediately",
        "Hypnosis to erase the memory entirely"
      ],
      correct: 1
    }
  ]
},

// ═══════════════════════════════════════
// TRACK 5: CERTIFIED EXECUTIVE-NRI THERAPIST
// ═══════════════════════════════════════
"executive_nri": {
  title: "Certified Executive-NRI Therapist",
  icon: "🌏",
  description: "Executive coaching, cross-cultural therapy, NRI-specific challenges, corporate wellness, and DPDPA/jurisdiction compliance.",
  passScore: 7,
  questions: [
    {
      q: "An NRI client in the US contacts MANAS360 for therapy. What jurisdiction and compliance rules apply?",
      options: [
        "US HIPAA rules since the client is in the US",
        "Indian jurisdiction (Bengaluru courts), DPDPA 2023 data residency in India, INR payments only. Client self-declares NRI status via checkbox — no IP tracing.",
        "The laws of whichever country has stricter rules",
        "No compliance rules apply to cross-border digital therapy"
      ],
      correct: 1
    },
    {
      q: "What is 'Third Culture Identity Crisis' and why is it common among NRI clients?",
      options: [
        "A diagnosed psychiatric disorder listed in the DSM-5",
        "The psychological tension of belonging fully to neither the home culture nor the adopted country — feeling 'too Indian abroad, too foreign at home'",
        "A term for people who travel to three or more countries",
        "A marketing term with no clinical significance"
      ],
      correct: 1
    },
    {
      q: "An executive client says 'I can't show weakness at work — my team will lose respect for me.' What therapeutic approach is BEST?",
      options: [
        "Agree — leaders should never show vulnerability",
        "Explore the belief: 'What evidence supports this? What would happen if a leader you admire showed they were human?' Reframe vulnerability as leadership strength, not weakness.",
        "Tell them to quit their job to reduce stress",
        "Prescribe medication for anxiety"
      ],
      correct: 1
    },
    {
      q: "On MANAS360, what does the HR dashboard show for corporate EAP programs?",
      options: [
        "Individual employee names, session topics, and therapist notes",
        "Anonymous aggregate data only — total sessions used, utilization percentage, department-level trends. No employee PII visible to employer. DPDPA compliant.",
        "Real-time video feeds of therapy sessions for compliance monitoring",
        "Employee attendance records linked to therapy appointments"
      ],
      correct: 1
    },
    {
      q: "A Silicon Valley NRI client wants sessions at 11 PM IST (10:30 AM PST). How does MANAS360 handle timezone matching?",
      options: [
        "NRI clients must adjust to Indian business hours",
        "Region-locked lead matching: NRI clients are matched to therapists in timezone shift pools — US-West pool therapists are available 9 PM-1 AM IST",
        "All sessions must happen between 9 AM and 6 PM IST regardless of client location",
        "Timezone matching is not supported — clients figure it out themselves"
      ],
      correct: 1
    },
    {
      q: "What is 'burnout' according to WHO classification and how does it differ from clinical depression?",
      options: [
        "Burnout and depression are the same condition with different names",
        "Burnout is an occupational phenomenon (ICD-11) — exhaustion, cynicism, reduced efficacy — specifically tied to work context. Depression is a clinical disorder affecting all life domains. They can co-occur but require different interventions.",
        "Burnout is more serious than depression",
        "Burnout is not recognized by any medical organization"
      ],
      correct: 1
    },
    {
      q: "An NRI client's Indian parent is pressuring them about marriage. The client is 32, single, and feels guilty. What is the culturally competent approach?",
      options: [
        "Tell them to set boundaries and ignore their parents completely",
        "Tell them their parents are right and they should get married",
        "Acknowledge the cultural weight without dismissing it. Explore: 'What does marriage mean to YOU versus what it means to your family?' Help them find their own answer within their cultural context.",
        "Refer to a family therapist in India and close the case"
      ],
      correct: 2
    },
    {
      q: "What session formats does MANAS360 offer for executive coaching and what is the pricing structure?",
      options: [
        "Only in-person sessions at ₹5,000/session",
        "Audio (₹1,499/session) or Video (₹1,649 / +10%). No home or hotel visits. Revenue split: 60% therapist, 40% platform.",
        "Free unlimited sessions for corporate clients",
        "Only WhatsApp text-based coaching at ₹500/session"
      ],
      correct: 1
    },
    {
      q: "A corporate client wants to use MANAS360 for 5,000 employees. What compliance does this single partnership satisfy?",
      options: [
        "Only CSR Section 135",
        "5 compliances in one shot: DPDPA (data protection), NMC/RCI (verified providers), POSH Act (workplace harassment support), OSH Act (occupational health), and CSR Section 135 (tax deduction)",
        "No compliance requirements — it's just a wellness benefit",
        "Only DPDPA and nothing else"
      ],
      correct: 1
    }
  ]
}

};

// ═══ USAGE IN EXISTING QUIZ MODULE ═══
//
// Replace the old quiz data with:
//
//   const selectedQuiz = QUIZ_DATA[trackId];
//   const questions = selectedQuiz.questions;
//   const passScore = selectedQuiz.passScore;
//
// Quiz selector cards should show:
//   QUIZ_DATA["5whys"]         → 🧠 Certified 5Whys Practitioner
//   QUIZ_DATA["psychologist"]  → 🎓 Certified Psychologist
//   QUIZ_DATA["psychiatrist"]  → ⚕️ Certified Psychiatrist
//   QUIZ_DATA["nlp_nac"]       → 🧬 Certified NLP-NAC Coach
//   QUIZ_DATA["executive_nri"] → 🌏 Certified Executive-NRI Therapist
//
// Pass criteria: 7/9 correct (78%)
// On pass: Issue certificate + update therapist_profiles.certifications[] in Supabase
// On fail: Show missed questions + "Retake in 24 hours"
