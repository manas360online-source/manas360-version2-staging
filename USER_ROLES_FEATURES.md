# MANAS360 — User Roles & Feature Reference

> Source of truth: live code in `backend/src/middleware/rbac.middleware.ts`, `frontend/src/App.tsx`, and all route files.  
> Last updated: 13 March 2026

---

## Overview — All Roles

| Role | Frontend Namespace | Backend Namespace | Patient-Facing? |
|---|---|---|---|
| **Patient** | `/patient/*` | `/v1`, `/patient` | Self |
| **Therapist** | `/therapist/*` | `/v1/therapists`, `/v1/therapist` | ✅ Yes |
| **Coach** | `/therapist/*` (shared) | Same as therapist (alias) | ✅ Yes |
| **Psychiatrist** | `/psychiatrist/*` | `/v1/psychiatrist` | ✅ Yes |
| **Psychologist** | `/psychologist/*` | `/v1/psychologist` | ✅ Yes |
| **Admin** | `/admin/*` | `/v1/admin` | Platform-wide oversight |
| **Corporate Admin/Member** | `/corporate/*` | `/v1/corporate` | Employee workforce only |

---

## 1. Patient

### Who they are
End-users seeking mental health support. They book sessions, complete exercises, track mood, and interact with their assigned providers.

### What they can do

#### Sessions & Booking
- Browse provider directory and smart-match to best provider
- Book sessions with any provider type (therapist, psychiatrist, psychologist, coach)
- View upcoming and past sessions
- Join live Jitsi video sessions (`/patient/sessions/:id/live`) — enabled 5 minutes before scheduled time
- Download session invoices and documents

#### Therapy & Clinical
- Follow a personalised therapy plan with tasks and milestones
- Complete CBT (Cognitive Behavioural Therapy) sessions assigned by providers
- Complete clinical assessments: PHQ-9, GAD-7
- View assessment history and progress reports

#### Daily Wellbeing
- Daily mood check-in and mood history tracking
- Sound therapy and meditation exercises
- Daily check-in (pre-session) before joining a video call

#### Communication
- Direct messaging with assigned providers
- Provider messages inbox
- Notifications (booking confirmations, reminders, alerts)

#### Account & Profile
- Manage personal profile, settings, emergency contacts
- Manage subscription and billing
- Manage active auth sessions (device logout)
- Privacy/data requests

#### AI Features
- AI chat for mental health support
- Personalised journey recommendations

---

## 2. Therapist

### Who they are
Licensed mental health therapists who conduct talk therapy sessions, manage patient cases, create CBT content, and run their practice.

### What they can do with Patients
- View full patient list (document-verified therapists only)
- View individual patient profiles, history, and notes
- Conduct live Jitsi video sessions (`/therapist/sessions/:sessionId/live`)
  - **Exclusive**: AI-powered GPS Dashboard overlay (real-time empathy score, 5-Why depth, crisis detection, coaching suggestions)
- Write structured session notes and response notes
- Assign therapy-plan tasks and exercises to patients
- Create and assign CBT modules, assessments, and worksheets
- Monitor patient mood tracking data
- Manage care team assignments for patients
- Reschedule, cancel, and remind patients

### What they can do (Practice Management)
- View earnings and payout history (practice mode)
- View analytics: session stats, patient outcomes
- Manage an exercise/resource library
- Manage CBT templates, questions, and branching logic
- Purchase and manage patient leads
- Export session data

### Communication
- Direct messaging with patients and other providers
- Dashboard notifications and alerts

### Unique capabilities vs other providers
| Feature | Therapist | Coach | Psychiatrist | Psychologist |
|---|---|---|---|---|
| CBT template authoring | ✅ | ✅ (shared) | ❌ | ❌ |
| Lead purchase pipeline | ✅ | ✅ (shared) | ❌ | ❌ |
| GPS AI dashboard in sessions | ✅ | ✅ (shared) | ✅ | ✅ |
| Prescriptions | ❌ | ❌ | ✅ | ❌ |
| Drug interaction check | ❌ | ❌ | ✅ | ❌ |
| Psychometric tests | ❌ | ❌ | ❌ | ✅ |
| Diagnostic reports | ❌ | ❌ | ❌ | ✅ |

---

## 3. Coach

### Who they are
Wellness coaches who support patients with goal-setting, lifestyle changes, and accountability — not licensed clinical therapy.

### What they can do with Patients
- All the same patient-facing workflows as a **Therapist** (coach uses the Therapist frontend and backend namespace via role alias)
- Conduct live Jitsi video sessions with patients
- Assign exercises, tasks, resources
- Message patients

### Key differences from Therapist
- **No** dedicated frontend for coach — they share the `/therapist` pages
- **No** clinical credentials gate (e.g. no psychiatry/prescriptions, no formal diagnostic flows)
- Conceptually focused on coaching/wellness rather than clinical therapy
- Same backend access as therapist because `requireTherapistRole` middleware alias includes `coach`

### What they **cannot** do
- Prescribe medication
- Order or interpret psychometric diagnostic tests
- Conduct formal clinical assessments (PHQ-9 / GAD-7) on behalf of the system
- Anything requiring admin or higher role

---

## 4. Psychiatrist

### Who they are
Medical doctors (psychiatrists) who can diagnose mental disorders and prescribe medication. The most medically-oriented provider role.

### What they can do with Patients
- View patient list and detailed patient profiles
- Conduct live Jitsi video consultations
- Create and manage **prescriptions** (unique to this role)
- Run **drug interaction safety checks** before prescribing (unique to this role)
- Track medication history and timelines for patients (unique to this role)
- Track physiological/clinical parameters over time (unique to this role)
- Set up follow-up consultation schedules
- Conduct and manage psychiatric assessments
- Create custom assessment templates

### Practice Management
- Professional/practice mode switching (earnings visibility)
- Consultation analytics and prescription analytics dashboards
- Medication library management
- Settings and profile management

### Unique capabilities vs Therapist
| Feature | Therapist | Psychiatrist |
|---|---|---|
| Prescriptions | ❌ | ✅ |
| Drug interaction checker | ❌ | ✅ |
| Medication history tracking | ❌ | ✅ |
| Parameter tracking (vitals etc.) | ❌ | ✅ |
| Assessment templates | ❌ | ✅ |
| CBT content authoring | ✅ | ❌ |
| Lead purchase pipeline | ✅ | ❌ (shared via alias) |

### Backend note
Psychiatrist is included in the `requireTherapistRole` alias, so they **can** access therapist-gated endpoints (dashboard, lead routes) in addition to their dedicated `/v1/psychiatrist` namespace.

---

## 5. Psychologist

### Who they are
Clinical or counselling psychologists who specialise in psychological assessment, cognitive testing, diagnostics, and evidence-based treatment planning — distinct from a psychiatrist (no prescribing) and a therapist (more assessment-focused).

### What they can do with Patients
- View patient list and patient overviews
- Administer and score **psychometric/cognitive tests** (unique to this role)
- Generate formal **diagnostic reports** (unique to this role)
- Conduct clinical assessments, mood analytics, and risk monitoring
- Create and manage structured **treatment plans**
- Manage care team and coordinate with other providers
- Use **AI Clinical Assistant** for clinical decision support (unique frontend tool)
- Conduct live Jitsi video sessions

### Wellbeing (self-facing)
- Personal mood log, self-assessments, self-CBT exercises, meditation, journal, and wellness insights — psychologist also has personal wellbeing tools for self care

### Practice Management
- Schedule management
- Messaging with patients and providers
- Profile and settings
- Research insights dashboard

### Unique capabilities vs Therapist
| Feature | Therapist | Psychologist |
|---|---|---|
| Cognitive / psychometric tests | ❌ | ✅ |
| Formal diagnostic reports | ❌ | ✅ |
| Risk monitoring dashboard | ❌ | ✅ |
| AI Clinical Assistant | ❌ | ✅ |
| CBT content authoring | ✅ | ❌ |
| Lead pipeline | ✅ | ❌ |

### Backend note
Psychologist is **not** included in the `requireTherapistRole` alias — they have their own dedicated `/v1/psychologist` namespace and **cannot** access therapist-exclusive endpoints automatically. There is also a known gap: the psychologist frontend renders chat and risk-analytics pages, but the backend chat/risk routes do not list `psychologist` in their allowed-role arrays. This means those API calls will return 403 for psychologists until the backend allows lists are updated.

---

## 6. Admin (Platform Admin)

### Who they are
Internal MANAS360 platform operators responsible for platform governance, user management, and quality control. This is not a clinical role.

### What they can do

#### User Management
- List, search, and view all users (patients, providers)
- Approve or reject therapist onboarding/verification
- Manage roles and permissions

#### Platform Configuration
- Manage pricing plans (session prices, subscription tiers)
- Configure screening templates and questions globally
- Manage payout configurations

#### Operations & Monitoring
- View live sessions (oversight, not participation)
- Manage crisis alerts platform-wide
- View platform health metrics and AI monitoring

#### Analytics & Reports
- Platform-wide analytics: revenue, subscriptions, utilization, exports
- Company/corporate subscription reports
- Audit logs and compliance reports
- Data request processing

#### Company Management
- Create and configure corporate companies
- Manage company subscriptions

### What they **cannot** do (by design)
- Directly book or conduct clinical sessions with patients (no clinical namespace)
- Prescribe medication or conduct assessments

---

## 7. Corporate Admin / Company Member

### Who they are
HR managers or wellness officers at a company that has a B2B subscription to MANAS360. They manage their organisation's employee mental health programme — they are **not** clinicians and do **not** interact with individual patient health data.

### What they can do

#### Employee Management
- View and manage employee directory
- Bulk enrol employees onto the platform
- Allocate session credits/budgets to employees
- Enrolment and access management

#### Reporting (Aggregate, anonymised)
- Utilization reports (how many employees are using the platform)
- Wellbeing and engagement reports
- ROI reports for the programme

#### Billing & Account
- View and manage invoices and payment methods
- Manage corporate subscription plan
- Configure SSO (Single Sign-On) for their organisation
- Account help and support

#### Campaigns
- Create and manage mental wellness programmes, workshops, and campaigns for employees

### What they **cannot** do
- Access individual employee/patient clinical data, session notes, or health records
- Interact with individual patients in a clinical capacity
- Access any therapist, psychiatrist, or psychologist clinical APIs

---

## Role Interaction Matrix

Who can interact with whom:

| | Patient | Therapist | Coach | Psychiatrist | Psychologist | Admin | Corporate Admin |
|---|---|---|---|---|---|---|---|
| **Patient** | — | ✅ book/message/session | ✅ book/message/session | ✅ book/message/session | ✅ book/message/session | ❌ | ❌ |
| **Therapist** | ✅ session/notes/assign | — | ❌ | Via care team | Via care team | ❌ | ❌ |
| **Coach** | ✅ session/message/assign | Via care team | — | Via care team | Via care team | ❌ | ❌ |
| **Psychiatrist** | ✅ session/prescribe/assess | Via care team | Via care team | — | Via care team | ❌ | ❌ |
| **Psychologist** | ✅ session/test/report | Via care team | Via care team | Via care team | — | ❌ | ❌ |
| **Admin** | Platform-level only | Platform-level only | Platform-level only | Platform-level only | Platform-level only | — | ✅ company mgmt |
| **Corporate Admin** | ❌ (aggregate only) | ❌ | ❌ | ❌ | ❌ | ❌ | — |

---

## Live Session (Jitsi) — Role Behaviour Summary

| Role | Joins Jitsi? | GPS AI Dashboard? | Audio sent to AI Engine? |
|---|---|---|---|
| **Patient** | ✅ `/patient/sessions/:id/live` | ❌ Not visible | ❌ No (patient audio captured by therapist side) |
| **Therapist** | ✅ `/therapist/sessions/:sessionId/live` | ✅ Empathy, depth, crisis overlay | ✅ Patient remote audio → Whisper → Claude |
| **Coach** | ✅ Same as therapist page | ✅ | ✅ |
| **Psychiatrist** | ✅ Same as therapist page | ✅ | ✅ |
| **Psychologist** | ✅ Same as therapist page | ✅ | ✅ |
| **Admin** | ❌ Admin monitors, not participates | ❌ | ❌ |
| **Corporate** | ❌ | ❌ | ❌ |

---

## RBAC Hierarchy (Backend)

Higher roles inherit lower role permissions where `requireMinimumRole` is used:

```
superadmin  (highest)
    └── admin
            └── therapist / coach / psychiatrist / psychologist  (peer level, not hierarchical)
                    └── patient  (lowest)
```

`requireTherapistRole` alias matches: `therapist`, `psychiatrist`, `coach`  
`psychologist` has **its own namespace only** and is not in the therapist alias.

---

## Known Gaps (Backend vs Frontend Mismatch)

| Issue | Affected Role | Frontend | Backend |
|---|---|---|---|
| Chat API role allowlist | Psychologist | Has messages page | `chat.routes.ts` does not list `psychologist` → 403 |
| Risk analytics API | Psychologist | Has risk-monitoring page | `riskAnalytics.routes.ts` does not list `psychologist` → 403 |
| Coach dedicated UI | Coach | Uses `/therapist` pages | No dedicated route namespace |
