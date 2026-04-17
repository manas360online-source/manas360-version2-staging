# MANAS360 Ad Preset Flow Implementation Summary

This document summarizes the current ad-entry preset flow, what changed in the codebase, how the flow works end to end, and how it differs from the regular patient flow.

## What Changed

- Added preset landing entry points for therapist, psychiatrist, and couples traffic.
- Added shared preset link building so all ad buttons use the same route format.
- Kept the existing PHQ-9 / GAD-7 assessment flow, but made it work as the first step for ad users.
- Added auth resume behavior so an unauthenticated ad user can complete the assessment, sign up, and then continue without losing answers.
- Forced ad users to register as patients only, so they do not see the provider role selector.
- Updated Sessions so ad users go directly into the ad-specific provider lane instead of being sent back through the normal assessment gate.
- Kept subscription, payment, and booking on the same shared platform flow.

## Ad User Flow

1. User clicks an ad button or landing CTA.
2. The app opens the preset assessment route with an `entry` value such as `therapist`, `psychiatrist`, or `couples`.
3. The user completes the preset PHQ-9 / GAD-7 questions.
4. If the user is not logged in, the answers are saved and the user is redirected to patient signup.
5. On signup, the user is treated as a patient, not as a provider.
6. After signup/login, the preset draft is restored and submitted automatically.
7. The user is sent to Sessions with the ad entry marker.
8. Sessions opens the matching lane for the selected preset type.
9. The user picks a provider from the available therapist / psychiatrist / couples list.
10. The user continues through the existing payment and booking flow.

## Regular User Flow

1. User enters through the normal site flow.
2. The user uses the standard assessment and sessions path.
3. After assessment, the user sees the normal care-path choices such as recommended, direct, and urgent.
4. The user continues through the same shared subscription, payment, and booking system.

## What Is Different From Regular Users

- Ad users start from a preset entry link, while regular users start from the general site flow.
- Ad users do not see the signup role selector; they register as patients only.
- Ad users get a locked provider lane based on the ad entry type.
- Regular users keep the normal assessment result options and care-path choice screen.
- The backend, database, subscription system, and booking system remain shared; only the entry and routing behavior differ.

## Important Notes

- The flow does not create a separate database or duplicate booking system.
- The preset flow reuses the existing assessment and matching infrastructure.
- The ad-specific behavior is an entry-layer change, not a separate product path.

## Example Preset Links

- Therapist: `/assessment-preset?entry=therapist&utm_source=landing&utm_medium=cpc&utm_campaign=therapist`
- Psychiatrist: `/assessment-preset?entry=psychiatrist&utm_source=landing&utm_medium=cpc&utm_campaign=psychiatrist`
- Couples: `/assessment-preset?entry=couples&utm_source=landing&utm_medium=cpc&utm_campaign=couples`

## Related Files

- `frontend/src/components/Landing/Hero.tsx`
- `frontend/src/components/Landing/FinalCtaSection.tsx`
- `frontend/src/components/Landing/QuickAccessRail.tsx`
- `frontend/src/components/patient/PresetAssessmentEntry.tsx`
- `frontend/src/pages/auth/SignupPage.tsx`
- `frontend/src/pages/patient/SessionsPage.tsx`
- `frontend/src/config/presetDefaults.ts`
