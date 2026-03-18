# MANAS360 Patient Journey Working Model Plan

## Goal
Implement a complete, production-grade patient journey using existing modules and routes, while preserving current dynamic pricing as the single source of truth (admin-managed pricing already implemented).

## Scope Guardrails
- Keep pricing source as backend config (`/api/v1/pricing`, admin updates via `/api/v1/admin/pricing`).
- Do not reintroduce static prices in landing/subscribe/booking flows.
- Reuse existing patient, provider, psychiatrist, psychologist, chat, risk, and crisis components.
- Prioritize end-to-end journey correctness over adding new UI sections.

## Current Assets Already Available
- Dynamic pricing API and admin pricing management.
- Patient subscription lifecycle with renewal-safe pricing metadata.
- Patient pathways pages and assessment-related UI.
- Risk scoring logic for PHQ-9/GAD-7 (`backend/src/services/riskScoring.ts`).
- Crisis escalation support service (`backend/src/services/crisisEscalation.service.ts`).
- Patient APIs and profile/session booking foundation (`backend/src/routes/patient.routes.ts`, `backend/src/services/patient.service.ts`).

## Target Journey (Working Model)
1. Entry:
- Landing -> Login/Register -> Patient dashboard.

2. Pathway selection:
- Stepped care (default), direct provider selection, urgent care.

3. Stepped care flow:
- Quick screening -> severity -> recommendation -> next action.

4. Clinical flow (paid):
- PHQ-9 + GAD-7 scoring -> severity tiers -> provider recommendation.

5. Booking flow:
- Choose provider (or recommended provider type) -> slot -> payment -> session.

6. Ongoing care:
- Session notes/progress updates -> dashboard timeline -> follow-up recommendations.

7. Safety flow:
- Crisis trigger from assessment or chat -> crisis UI + notification/escalation path.

## Architecture Design

### 1) Journey Orchestrator Layer
Create a thin orchestration service to unify branching logic across quick screening, clinical assessments, and recommendations.

- New backend service: `backend/src/services/patient-journey.service.ts`
- Responsibilities:
- Normalize assessment results into a common risk profile.
- Resolve recommended pathway and provider type.
- Emit journey state payload for frontend.

Suggested output shape:
```ts
{
  pathway: 'stepped-care' | 'direct-provider' | 'urgent-care',
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe',
  recommendation: {
    providerTypes: string[],
    urgency: 'routine' | 'priority' | 'urgent',
    rationale: string[]
  },
  crisis: {
    detected: boolean,
    reason?: string
  },
  nextActions: string[]
}
```

### 2) Assessment Engine Integration
Use existing scoring services and map to unified thresholds.

- PHQ-9 severity and Q9 crisis flag from `scorePHQ9`.
- GAD-7 severity from `scoreGAD7`.
- Add mapping table in orchestrator:
- minimal/mild -> coach/psychologist.
- moderate -> psychologist.
- moderately-severe/severe or Q9 flag -> psychiatrist urgent.
- specialized signals -> specialized therapist.

### 3) API Contract Additions
Add explicit patient journey endpoints (backward compatible with existing endpoints):

- `POST /api/v1/patient-journey/quick-screening`
- `POST /api/v1/patient-journey/clinical-assessment`
- `GET /api/v1/patient-journey/recommendation`
- `POST /api/v1/patient-journey/select-pathway`

Implementation note:
- If existing assessment endpoints already store responses, these can be wrappers that call existing services and return orchestrated output.

### 4) Crisis Safety Contract
Connect assessment and chat crisis triggers to one workflow:

- Trigger criteria:
- PHQ-9 Q9 > 0.
- Crisis keywords from chat detection.

- Unified response:
- Return `crisis.detected=true`.
- Include helpline block payload.
- Persist notification/escalation event.

### 5) Booking and Pricing Consistency
All booking/payment quotes must come from backend runtime pricing and not from UI constants.

- Continue using backend quote logic from pricing service.
- Frontend sends context only (`providerType`, `preferredTime`, `duration`), backend computes final amount.
- Subscribe page and booking page always fetch pricing via `patientApi.getPricing()`.

### 6) Provider Workflow Alignment
Ensure referral loops are represented as explicit transitions:

- Psychologist -> Psychiatrist (medication need).
- Psychiatrist -> Psychologist (therapy continuation).
- Psychologist/Psychiatrist -> Specialized therapist (trauma/couple/specialized).

Persist referral event with:
- source provider role/id,
- target provider type,
- reason,
- patient acknowledgment status.

## Frontend Design Plan

### Patient
- `frontend/src/pages/patient/AssessmentsPage.tsx`
- Add pathway chooser header and clear next-step CTA from recommendation payload.

- `frontend/src/pages/patient/BookSessionPage.tsx`
- Pre-fill provider type and urgency from recommendation.
- Keep price display as estimate; confirm backend quote response before payment.

- `frontend/src/pages/SubscribePage.tsx`
- Already dynamic; keep as read-only pricing catalog from backend config.

- `frontend/src/pages/patient/DashboardPage.tsx`
- Add journey timeline card:
- latest assessment severity,
- active pathway,
- next recommended action,
- referral status.

### Provider
- Psychologist/Psychiatrist dashboard pages:
- add referral action panel with predefined reasons,
- show incoming referrals and pending actions,
- show latest PHQ-9/GAD-7 snapshot.

## Backend Design Plan

### Routes
- Add `backend/src/routes/patient-journey.routes.ts`.
- Mount at `/api/v1/patient-journey`.

### Controllers
- Add `backend/src/controllers/patient-journey.controller.ts`.
- Keep handlers thin; orchestrator in service layer.

### Services
- Add `backend/src/services/patient-journey.service.ts`.
- Reuse:
- `riskScoring.ts`
- assessment services
- patient booking/session services
- crisis escalation service

### Data
- Reuse current assessment and session tables.
- Add only if missing:
- `patient_pathway_state` (current pathway + last decision context)
- `patient_referrals` (cross-provider referral lifecycle)

## Execution Phases

### Phase 1: Journey Core (Backend)
- Build orchestrator service.
- Add pathway/recommendation endpoints.
- Integrate crisis flag from PHQ-9 Q9 and chat.

Acceptance:
- Given assessment scores, recommendation output is deterministic and test-covered.

### Phase 2: Patient UX Wiring
- Wire assessments page to orchestrator outputs.
- Wire booking prefill to recommended provider type.
- Add dashboard journey timeline.

Acceptance:
- User can complete quick screening -> receive recommendation -> book recommended provider in one flow.

### Phase 3: Referral Workflow
- Implement referral persistence and provider action endpoints.
- Add provider UI actions and status tracking.

Acceptance:
- Provider A can refer, patient sees referral, provider B receives actionable queue.

### Phase 4: Safety Hardening
- Unify crisis alert presentation.
- Validate notifications, escalation events, and emergency CTA display.

Acceptance:
- Crisis triggers are captured from both assessment and chat with visible support actions.

### Phase 5: End-to-End Validation
- Automated tests:
- quick screening decision matrix,
- PHQ-9/GAD-7 recommendation mapping,
- crisis trigger path,
- booking quote with live pricing,
- referral lifecycle.

- Manual QA scripts:
- first-time user (stepped care),
- returning user (direct provider),
- urgent care path.

## Testing Matrix
- Unit:
- scoring and mapping logic,
- pathway transition reducer,
- referral state transitions.

- Integration:
- assessment submission -> recommendation endpoint,
- recommendation -> booking quote,
- crisis trigger -> notification.

- Frontend:
- pathway selection components,
- recommendation CTA routing,
- subscription/booking dynamic pricing rendering.

## Non-Functional Requirements
- Every decision and recommendation must be auditable (reason list in response).
- No client-side authoritative pricing calculations.
- Crisis route should remain reachable without deep navigation.
- Keep endpoint latency low for recommendation responses (<300ms p95 target with cached definitions).

## Rollout Strategy
- Feature flag `patientJourneyV2`:
- Enable for internal users first,
- then staged rollout by cohort.

- Backward compatibility:
- Keep existing patient assessment endpoints active.
- New journey endpoints can wrap old behavior to avoid frontend breakage.

## Immediate Next Build Tasks
1. Create `patient-journey` backend route/controller/service skeleton.
2. Implement recommendation mapping table and tests.
3. Wire `AssessmentsPage` to call journey recommendation endpoint.
4. Wire `BookSessionPage` prefill + backend quote confirmation.
5. Add dashboard journey timeline card.
6. Add referral create/list endpoints and provider UI actions.

## Pricing Constraint (Explicit)
- Existing admin-managed pricing implementation is final source.
- Any prices shown in earlier drafts/messages are ignored.
- All UI prices must come from existing dynamic pricing APIs.
