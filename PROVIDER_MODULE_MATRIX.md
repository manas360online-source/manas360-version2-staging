# Provider Module Matrix

## Purpose
This matrix defines which provider modules are common and which are role-specific for:
- Therapist
- Coach
- Psychiatrist
- Psychologist

Use this as the baseline for a unified provider dashboard shell with role-based module visibility.

## Legend
- Yes: role should see and use this module
- Limited: role can view or use a reduced subset
- No: role should not see this module by default

## A. Core Shared Modules (Recommended Common Shell)

| Module | Therapist | Coach | Psychiatrist | Psychologist | Notes |
|---|---|---|---|---|---|
| Dashboard Home | Yes | Yes | Yes | Yes | Same shell, different cards based on role |
| Assigned Patients | Yes | Yes | Yes | Yes | Core for all providers |
| Sessions List | Yes | Yes | Limited | Limited | Psychiatrist/Psychologist may use consultation/evaluation specific views |
| Live Session Access | Yes | Yes | Yes | Limited | Psychologist may not need all live therapy controls |
| Messages | Yes | Yes | Yes | Yes | Shared communication UX |
| Profile | Yes | Yes | Yes | Yes | Same profile framework |
| Settings | Yes | Yes | Yes | Yes | Same settings framework with role-specific fields |
| Care Team View | Yes | Limited | Yes | Yes | Coach can be view-first in many orgs |

## B. Therapist-Focused Modules

| Module | Therapist | Coach | Psychiatrist | Psychologist | Why It Is Therapist-Focused |
|---|---|---|---|---|---|
| Session Notes (Therapy style) | Yes | Limited | No | Limited | Primary psychotherapy workflow |
| CBT Modules Management | Yes | Limited | No | Limited | Therapy intervention planning |
| Exercise Library Assignments | Yes | Yes | No | Limited | Behavioral assignments tied to therapy |
| Therapeutic Resource Assignment | Yes | Yes | No | Limited | Psychoeducation and therapy resources |
| Earnings and Payout Analytics (Therapist view) | Yes | Limited | No | No | Therapist business operations |

## C. Coach-Focused Modules

| Module | Therapist | Coach | Psychiatrist | Psychologist | Why It Is Coach-Focused |
|---|---|---|---|---|---|
| Habit/Goal Tracking Board | Limited | Yes | No | No | Coaching outcome management |
| Accountability Check-ins | Limited | Yes | No | No | High-frequency coaching touchpoints |
| Non-clinical Action Plans | Limited | Yes | No | No | Keeps coach workflow non-medical |

## D. Psychiatrist-Focused Modules

| Module | Therapist | Coach | Psychiatrist | Psychologist | Why It Is Psychiatrist-Focused |
|---|---|---|---|---|---|
| Prescriptions | No | No | Yes | No | Medication authority |
| Drug Interaction Checker | No | No | Yes | No | Medical safety workflow |
| Medication History | No | No | Yes | No | Medication continuity |
| Parameter Tracking (clinical metrics) | No | No | Yes | Limited | Psychiatric medication monitoring |
| Medication Library | No | No | Yes | No | Standardized pharmacology references |
| Assessment Templates (Psychiatric) | No | No | Yes | Limited | Psychiatry-specific structured templates |
| Assessment Drafts | No | No | Yes | No | Psychiatric draft and sign-off flow |

## E. Psychologist-Focused Modules

| Module | Therapist | Coach | Psychiatrist | Psychologist | Why It Is Psychologist-Focused |
|---|---|---|---|---|---|
| Diagnostic Reports | No | No | Limited | Yes | Formal psychological diagnostics |
| Cognitive Tests | No | No | Limited | Yes | Cognitive and neuropsych workflows |
| Risk Monitoring | Limited | No | Limited | Yes | Psychological risk observation |
| Treatment Plans (psychology) | Limited | No | Limited | Yes | Psychology-led treatment design |
| AI Clinical Assistant (Psychology context) | Limited | No | Limited | Yes | Specialty support for psych workflows |
| Research Insights | Limited | No | No | Yes | Evidence and psych research usage |

## F. Recommended Unification Model

1. Build one Provider Dashboard Shell for all provider roles.
2. Keep one shared route namespace for common modules.
3. Render menu items by role capability map.
4. Keep specialty modules as role-gated subroutes:
   - Psychiatrist specialty modules
   - Psychologist specialty modules
   - Therapist/Coach specialty modules
5. Keep backend enforcement as source of truth; frontend gating is convenience only.

## G. Minimal Capability Map (Starter)

| Capability | Therapist | Coach | Psychiatrist | Psychologist |
|---|---|---|---|---|
| manage_sessions | Yes | Yes | Yes | Limited |
| manage_assessments | Yes | Limited | Yes | Yes |
| manage_reports | Limited | No | Limited | Yes |
| manage_medication | No | No | Yes | No |
| manage_cbt | Yes | Limited | No | Limited |
| manage_risk | Limited | No | Limited | Yes |
| view_earnings | Yes | Limited | Yes | Limited |

## H. Immediate Practical Decision

If you want low-risk consolidation first:
1. Merge Therapist + Coach fully into one provider UI now.
2. Keep Psychiatrist and Psychologist specialty modules separate but mounted inside the same unified provider shell.
3. De-duplicate shared components (patients, messages, profile, settings, common dashboard cards).
