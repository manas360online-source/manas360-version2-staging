# Demo SaaS Quickstart

Use this when local data gets inconsistent and patient flow appears broken.

## 1) Seed deterministic demo state

```bash
npm run seed:demo:saas --prefix /Users/chandu/Project/MANAS360_version2/backend
```

This guarantees:
- Stable credentials
- Patient profile exists
- Baseline patient assessment exists
- Active patient subscription exists
- Therapist profile + care-team link exists

## 2) Demo credentials

- Patient: `patient@manas360.local` / `Manas@123`
- Therapist: `therapist@manas360.local` / `Manas@123`
- Admin: `admin@manas360.local` / `Manas@123`

## 3) Patient flow smoke checks

```bash
# Login + provider list
# Expected: providers_status=200 and providers_count > 0

# Login + journey recommendation
# Expected: journey_status=200 and has_assessment=true
```

## 4) UI path

- Login as patient
- Open `/patient/dashboard`
- Open `/patient/assessments`
- Open provider booking flow (providers list should not be empty)

If stale client state appears, run a hard refresh (`Cmd+Shift+R`).
