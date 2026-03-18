# Daily Check-in Implementation

This replaces the patient-facing `Mood Tracker` experience with a 3-step `Daily Check-in` flow on `frontend/src/pages/patient/MoodTrackerPage.tsx`.

## Frontend

- Step 1 captures mood and intensity.
- Step 2 captures context tags, energy, and sleep.
- Step 3 captures the optional journal note and save action.
- Screen transitions use `framer-motion` with `AnimatePresence`.
- Save success now shows a celebratory overlay with streak feedback and an audio CTA.
- Trend data is still shown as a line chart, but backend-generated insights are displayed alongside it.

## Backend compatibility

The current Prisma models only support `mood` and `note`, so the structured Daily Check-in data is stored in the existing note field using a readable appended block:

```text
Journal text here

Check-in details:
- Tags: work, sleep
- Intensity: 8/10
- Energy: medium
- Sleep: 7-8 hours
```

This allows the system to ship the richer UX without a schema migration while keeping the raw note understandable for clinicians.

## Server-side behavior

- `createMoodLog` now accepts `intensity`, `tags`, `energy`, and `sleepHours`.
- Mood history responses now return parsed `metadata` plus a cleaned `note` field.
- Mood stats now include `insights` derived from recent tags and check-in patterns.
- Saving a Daily Check-in automatically marks the pending `MOOD_CHECKIN` therapy-plan task complete.
- Three consecutive low-mood days create provider notifications with type `PATIENT_MOOD_DECLINE_ALERT`.
- Dr. Meera context now includes recent Daily Check-in tags, energy, sleep, and journal context.

## Validation

- Frontend utility test: `npm --prefix frontend test -- --run src/utils/dailyCheckIn.test.ts`
- Frontend build: `npm --prefix frontend run build`
- Backend typecheck: `npm --prefix backend run typecheck`