# Therapist Dashboard Architecture - MANAS360

## 1) Architecture Explanation

The therapist workspace is implemented as a provider-centric shell with shared patient context and role-aware module controls.

- Layout layer: `TherapistDashboardLayout` provides sidebar, topbar, patient selector, and context provider.
- State layer: `ProviderDashboardContext` stores:
  - `selectedPatientId` (global patient context)
  - `dashboardMode` (`professional` or `practice`)
- Data layer:
  - Dashboard KPIs: `/v1/therapists/me/dashboard`
  - Patient list: `/v1/therapists/me/patients`
  - Mood insights: prediction/history/accuracy APIs
- Permission layer: `providerPermissions.ts` defines shared-read domains and edit ownership per provider role.

## 2) Provider Role Comparison

| Role | Primary Focus | Edit Rights | Restricted from Editing |
|---|---|---|---|
| Therapist | CBT, behavioral therapy, trauma therapy, emotional regulation | Therapy notes, CBT exercises | Prescriptions, medication plans, drug interaction controls |
| Psychiatrist | Diagnosis + medication treatment | Prescriptions, medication management, drug interactions | CBT exercise assignment, therapist notes |
| Mental Health Coach | Lifestyle adherence and behavior support | Habits, lifestyle goals | Prescriptions, therapist notes, CBT protocol controls |

## 3) Shared Patient Data Model

Shared read model across care team:

- Patient profile
- Diagnosis
- Mood tracking history
- Assessment results (PHQ-9, GAD-7)
- Therapy progress
- Care plan summary

Conceptual entity model:

```text
Patient
  ├─ CareTeamMembers[] (therapist, psychiatrist, coach)
  ├─ SharedClinicalRecord
  │   ├─ profile
  │   ├─ diagnosis
  │   ├─ moodTimeline
  │   ├─ assessments
  │   ├─ progressSummary
  │   └─ carePlanSummary
  └─ RoleOwnedModules
      ├─ TherapistOwned (therapyNotes, cbtExercises)
      ├─ PsychiatristOwned (prescriptions, medication, interactions)
      └─ CoachOwned (habits, lifestyleGoals)
```

## 4) Role-Based Permission Model

Policy strategy:

- `canRead(sharedDomain)` is true for all provider roles.
- `canEdit(roleOwnedDomain)` is true only for owner role.
- Unauthorized writes are blocked in UI and must be blocked by backend RBAC.

UI behavior:

- Role badge shows current provider role.
- Editable modules are shown as `Edit`.
- Non-owned modules are shown as `Read only`.

## 5) Care Team Architecture

Care team panel for selected patient includes:

- Provider identity and role
- Treatment focus
- Most recent update

Clinical coordination principle:

- Shared visibility for cross-disciplinary continuity.
- Scoped edit capability for legal/safety boundaries.

## 6) Responsive React Layout Example

Implemented breakpoints in React + Tailwind:

- `max-[1200px]`: collapse 3-column dashboards into 2-column patterns.
- `max-[768px]`: single-column main content + mobile sidebar behavior.
- `max-[480px]`: compact card typography and reduced grid density.

Example:

```tsx
<section className="grid grid-cols-1 gap-6 xl:grid-cols-3 max-[1200px]:grid-cols-2 max-[768px]:grid-cols-1">
  <div className="rounded-xl border p-5">...</div>
  <div className="rounded-xl border p-5">...</div>
  <div className="rounded-xl border p-5 max-[480px]:p-3">...</div>
</section>
```

## 7) Dashboard Toggle Implementation Logic

Toggle modes:

- Professional Mode:
  - Patient-first widgets (sessions, alerts, notes pending, patient context, care team, mood trends, assessments)
  - Green/sage visual identity
- My Practice Mode:
  - Practice analytics (connected patients, throughput, earnings, monthly projection, ratings, growth insights)
  - Blue/cyan visual identity

Mode + patient selection persistence:

- Stored in local storage for continuity across navigation.
- Context provider shares state between topbar selector and dashboard page.

Security reminder:

- Mode toggle changes visualization and workflow emphasis only.
- Backend authorization remains source of truth for all write operations.
