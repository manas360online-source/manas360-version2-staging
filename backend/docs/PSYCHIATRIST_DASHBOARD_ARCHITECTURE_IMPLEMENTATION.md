# Psychiatrist Module Architecture (Phase 1)

## Goal
Align psychiatrist workflows with provider architecture used by therapist modules while keeping psychiatrist-specific clinical tools.

## Mode Model
- Professional Mode: patient-centric clinical workspace
- Self Mode: psychiatrist practice analytics

## Implemented API Surface
Base: `/api/v1/psychiatrist`

- `GET /me/dashboard?patientId=`
  - No `patientId`: consultation and alert counters
  - With `patientId`: patient clinical summary, wellness plan (read-only), medication overview
- `GET /me/self-mode`
  - Practice KPIs (patients, active prescriptions, consultations, income)
- `GET /me/patients`
  - Patient list derived from psychiatrist sessions
- `POST /me/assessments`
  - Psychiatric assessment capture (chief complaint, symptoms, duration, history, labs, impression, severity)
- `GET /me/assessments?patientId=`
- `POST /me/prescriptions`
  - Prescription builder with auto-generated instructions
- `GET /me/prescriptions?patientId=`
- `POST /me/drug-interactions/check`
  - Rule-based first-pass interaction warnings with persisted audit entries
- `POST /me/medication-history`
- `GET /me/medication-history?patientId=`
- `GET /me/parameter-tracking/:patientId`
  - PHQ-9 trend, GAD-7 trend, vitals, side-effects, adherence, AI-style alert flags
- `POST /me/follow-ups`
  - Follow-up scheduling in therapy session calendar model

## Data Tables (auto-created by module service)
Created lazily on first psychiatrist API call:
- `psychiatric_assessments`
- `prescriptions`
- `drug_interactions`
- `medication_history`
- `patient_vitals`
- `psychologist_wellness_plans`

## Reused Existing Data
- `therapy_sessions`
- `patient_profiles`
- `users`
- `therapist_exercises`
- `phq9_assessments`
- `gad7_assessments`

## Access Control
All psychiatrist endpoints use:
- `requireAuth`
- `requireRole('psychiatrist')`

## Design Notes
- `Psychologist Wellness Plan` is read-only in psychiatrist dashboard context.
- Interaction checking currently uses deterministic rules and persists warnings.
- Follow-up reminder policy returned in response: `3 days`, `1 day`, `2 hours`.

## Next Iteration
- Add formal Prisma models and migrations for the new psychiatrist tables.
- Add request validators for each endpoint.
- Add integration tests for psychiatrist APIs.
- Add coordinated-care messaging events to therapist/coach channels.
- Add frontend pages for mode toggle, assessment form, and prescription builder.
