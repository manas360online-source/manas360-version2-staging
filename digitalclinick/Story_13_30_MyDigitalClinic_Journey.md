# Story 13.37 — MyDigitalClinic: Digitize Your Existing Practice

**One-liner:** An existing brick-and-mortar clinic creates a digital profile on MANAS360, gets 21 days free, adds up to 5 therapists under one roof, bulk-uploads their existing patients, and runs their practice digitally — scheduling, Jitsi sessions, TherapeuticGPS, session notes, reports — all under one clinic tenant. At 50 patients, the upgrade prompt kicks in.

**Stack:** Existing MANAS360 codebase (React + Node.js + Supabase + Jitsi) + tenant isolation layer  
**Code reuse:** ~80% — therapist profile, credential verification (Story 13.35), scheduling, Jitsi video, session notes, TherapeuticGPS, PhonePe payments all exist. New code is the clinic wrapper, multi-therapist tenant, bulk upload, and clinic dashboard.  
**Owner:** Chandu (implementation) + Subramanya (clinic credential review)

---

## 1. What MyDigitalClinic IS and ISN'T

| IS | ISN'T |
|----|-------|
| A digital extension of an existing physical clinic | A new marketplace competing with MANAS360 individual therapists |
| The clinic's own patients, own therapists, own brand | MANAS360 sending leads TO the clinic (that's the individual therapist model) |
| A SaaS tool for practice management | A white-label MANAS360 (clinic stays on manas360.com/clinic/{id}) |
| Self-contained tenant — clinic data is isolated | Shared patient pool with MANAS360 marketplace |

**The pitch to clinic owners:** "You already have patients. You already have therapists. You just don't have the digital infrastructure. MyDigitalClinic gives you video sessions, scheduling, session notes, progress tracking, and a dashboard — without building anything yourself."

---

## 2. The Journey — End to End

```
STEP 1: CLINIC OWNER SIGNS UP
  → Creates clinic profile (name, address, license, specializations)
  → Gets Clinic ID: MDC-2026-XXX
  → 21-day free trial starts (up to 5 therapists, 50 patients)
  → Clinic Owner = Admin (login: MDC-2026-XXX-ADMIN)

STEP 2: ADD THERAPISTS (up to 5 on free/starter)
  → Clinic Admin adds therapists from dashboard
  → Each therapist gets login: MDC-2026-XXX-1, MDC-2026-XXX-2, ... -5
  → Therapist credentials auto-verified (Story 13.35 — reused)
  → Therapists see ONLY their own patients within this clinic

STEP 3: BULK UPLOAD PATIENTS
  → Clinic Admin uploads CSV: name, phone, email, therapist_assigned, condition
  → System creates patient records under clinic tenant
  → Patients get WhatsApp/SMS invite: "Your clinic is now on MANAS360"
  → Patients do NOT need to create their own MANAS360 account — clinic-managed

STEP 4: SCHEDULING
  → Therapist sets availability in calendar (reused from MANAS360)
  → Clinic Admin can see ALL therapist calendars (unified view)
  → Patients book via WhatsApp link or clinic admin books on their behalf
  → Reminders via WATI (reused templates T-DO-01)

STEP 5: SESSIONS VIA JITSI
  → Video sessions through existing Jitsi integration (reused)
  → Session timer, recording consent, audio-only fallback (all reused)
  → Session linked to clinic tenant → appears in clinic dashboard

STEP 6: THERAPEUTICGPS + SESSION NOTES
  → Post-session: therapist fills session notes (reused form)
  → TherapeuticGPS: PHQ-9/GAD-7 tracking over time (reused)
  → Progress visible to therapist + clinic admin (not to other therapists)

STEP 7: PATIENT COUNTER → UPGRADE PROMPT
  → Dashboard shows: "42/50 patients used"
  → At 50 patients: "Upgrade to continue adding patients"
  → Upgrade options presented (see Section 5)

STEP 8: REPORTS & DASHBOARD
  → Clinic-level dashboard: total sessions, utilization by therapist,
    patient progress trends, revenue summary
  → Therapist-level dashboard: their patients only
  → Exportable monthly reports (PDF)
```

---

## 3. Clinic ID & Login System

### 3A. ID Format

```
Clinic ID:    MDC-2026-001
Admin login:  MDC-2026-001-ADMIN
Therapist 1:  MDC-2026-001-1
Therapist 2:  MDC-2026-001-2
Therapist 3:  MDC-2026-001-3
Therapist 4:  MDC-2026-001-4
Therapist 5:  MDC-2026-001-5
```

- Clinic ID is auto-generated on registration (sequential)
- Admin login is the clinic owner — full access to all data within the clinic
- Therapist logins are created by the Clinic Admin from the dashboard
- Each login requires Phone + OTP authentication (reused from MANAS360 auth)
- The Clinic ID prefix ensures all accounts are scoped to the same tenant

### 3B. Authentication Flow

```
Login screen:
┌─────────────────────────────────────┐
│  MyDigitalClinic Login               │
│                                      │
│  Clinic ID:  [MDC-2026-___]         │
│  Your Role:  [Admin ▾] / [1-5]      │
│  Phone:      [+91 __________]       │
│                                      │
│  [Send OTP]                          │
│                                      │
│  OTP:        [______]               │
│  [Login]                             │
│                                      │
│  Don't have a clinic? [Register →]  │
└─────────────────────────────────────┘
```

Backend: Clinic ID + suffix → maps to `clinic_users.user_id` → OTP verified against registered phone → JWT issued with `clinic_id` and `role` in claims → all subsequent API calls filtered by `clinic_id`.

---

## 4. What's Reused vs. What's New

| Feature | Reused from MANAS360 | New for MyDigitalClinic |
|---------|---------------------|----------------------|
| Therapist profile creation | ✅ 100% (same form, same fields) | Linked to clinic_id |
| Credential verification (Story 13.35) | ✅ 100% (NMC/RCI auto-verify) | No change |
| Scheduling / calendar | ✅ 90% (same calendar component) | Clinic Admin sees all therapists' calendars |
| Jitsi video sessions | ✅ 100% (same Jitsi integration) | Session tagged with clinic_id |
| Session notes form | ✅ 100% (same form) | Notes scoped to clinic tenant |
| TherapeuticGPS (PHQ-9/GAD-7 tracking) | ✅ 100% (same tracking) | Dashboard aggregated per clinic |
| PhonePe payments | ✅ 100% (same gateway) | Revenue split: 100% to clinic (SaaS model, not commission) |
| WATI reminders | ✅ 90% (same templates) | Clinic name in template variables |
| Patient profile | ✅ 80% | Bulk upload via CSV (NEW) |
| Dashboard | ✅ 50% (therapist dashboard exists) | Clinic-level aggregate dashboard (NEW) |
| Reports | ❌ 0% | Clinic monthly reports (NEW) |
| Multi-user login (Clinic ID system) | ❌ 0% | Clinic ID + suffix auth (NEW) |
| Tenant isolation (RLS) | ❌ 0% | Row-level security by clinic_id (NEW) |
| Upgrade/pricing gate | ❌ 0% | Patient counter + tier enforcement (NEW) |

**Net new code: ~20%** — mostly the tenant wrapper, bulk upload, clinic dashboard, and the upgrade gate.

---

## 5. Pricing Tiers

| Tier | Price | Therapists | Patients | Features |
|------|-------|-----------|----------|----------|
| **Free Trial** | ₹0 (21 days) | Up to 5 | Up to 50 | Full features, no payment needed |
| **Solo** | ₹999/mo | 1 | Up to 50 | Scheduling, Jitsi, notes, TherapeuticGPS, basic dashboard |
| **Small Clinic** | ₹2,499/mo | Up to 3 | Up to 150 | Everything in Solo + clinic dashboard, monthly reports, bulk upload |
| **Standard Clinic** | ₹4,999/mo | Up to 5 | Up to 500 | Everything in Small + aggregate reports, priority support |
| **Large Clinic** | ₹9,999/mo | Up to 15 | Up to 2,000 | Everything in Standard + API access, custom branding, dedicated CSM |
| **Enterprise** | Custom | 15+ | 2,000+ | White-label option, multi-location, SLA |

**Revenue model:** Pure SaaS subscription — MANAS360 does NOT take a commission on the clinic's sessions. The clinic charges their patients whatever they want. MANAS360 earns from the subscription fee only.

**Upgrade trigger:** When patient count hits the tier limit, the dashboard shows a non-blocking upgrade prompt. Existing patients continue to work — the clinic just can't ADD new patients until they upgrade.

---

## 6. Database Schema

```sql
-- ═══════════════════════════════════════════════
-- MyDigitalClinic — Tenant Tables
-- All use clinic_id for tenant isolation
-- ═══════════════════════════════════════════════

-- Clinics (the tenant root)
CREATE TABLE IF NOT EXISTS clinics (
  clinic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_code VARCHAR(15) UNIQUE NOT NULL,
    -- 'MDC-2026-001' — auto-generated
  clinic_name VARCHAR(255) NOT NULL,
  clinic_address TEXT,
  clinic_phone VARCHAR(15) NOT NULL,
  clinic_email VARCHAR(255) NOT NULL,
  clinic_license VARCHAR(50),
    -- State medical council / establishment license
  specializations TEXT[],
  city VARCHAR(100),
  state VARCHAR(50),
  
  -- Owner (Admin)
  owner_name VARCHAR(100) NOT NULL,
  owner_phone VARCHAR(15) NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  
  -- Subscription
  tier VARCHAR(20) DEFAULT 'trial',
    -- 'trial' | 'solo' | 'small' | 'standard' | 'large' | 'enterprise'
  trial_started_at TIMESTAMP DEFAULT NOW(),
  trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '21 days'),
  subscription_started_at TIMESTAMP,
  subscription_status VARCHAR(20) DEFAULT 'trial',
    -- 'trial' | 'active' | 'expired' | 'cancelled'
  max_therapists INT DEFAULT 5,
  max_patients INT DEFAULT 50,
  
  -- Counters (denormalized for fast reads)
  current_therapist_count INT DEFAULT 0,
  current_patient_count INT DEFAULT 0,
  total_sessions_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clinic Users (Admin + Therapists — max 6 per clinic: 1 admin + 5 therapists)
CREATE TABLE IF NOT EXISTS clinic_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(clinic_id),
  login_suffix VARCHAR(10) NOT NULL,
    -- 'ADMIN', '1', '2', '3', '4', '5'
  login_code VARCHAR(20) UNIQUE NOT NULL,
    -- 'MDC-2026-001-ADMIN', 'MDC-2026-001-1', etc.
  role VARCHAR(10) NOT NULL,
    -- 'admin' | 'therapist'
  
  -- Personal details
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  
  -- Therapist-specific (NULL for admin)
  license_number VARCHAR(50),
  license_type VARCHAR(10),
    -- 'NMC' | 'RCI' | 'SMC'
  qualification VARCHAR(100),
  specializations TEXT[],
  languages TEXT[],
  verification_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' | 'verified' | 'flagged' | 'rejected'
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Clinic Patients (bulk-uploaded or individually added)
CREATE TABLE IF NOT EXISTS clinic_patients (
  patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(clinic_id),
  assigned_therapist_id UUID REFERENCES clinic_users(user_id),
  
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(10),
  primary_condition VARCHAR(100),
  notes TEXT,
  
  -- Consent
  consent_digital_records BOOLEAN DEFAULT FALSE,
  consent_at TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
    -- 'active' | 'inactive' | 'discharged'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clinic Sessions (links to existing Jitsi session infrastructure)
CREATE TABLE IF NOT EXISTS clinic_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(clinic_id),
  therapist_id UUID NOT NULL REFERENCES clinic_users(user_id),
  patient_id UUID NOT NULL REFERENCES clinic_patients(patient_id),
  
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 50,
  session_type VARCHAR(20) DEFAULT 'individual',
    -- 'individual' | 'couple' | 'family' | 'group'
  modality VARCHAR(10) DEFAULT 'video',
    -- 'video' | 'audio' | 'in_person'
  
  jitsi_room_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'scheduled',
    -- 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  
  -- Session notes (filled by therapist post-session)
  session_notes TEXT,
  notes_completed_at TIMESTAMP,
  
  -- TherapeuticGPS scores
  phq9_score INT,
  gad7_score INT,
  therapeutic_gps_data JSONB,
    -- Full progress snapshot at this session
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- ROW-LEVEL SECURITY (Tenant Isolation)
-- ═══════════════════════════════════════════════

ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_sessions ENABLE ROW LEVEL SECURITY;

-- Clinic Admin sees all data within their clinic
CREATE POLICY "clinic_admin_all" ON clinic_patients
  FOR ALL USING (
    clinic_id = (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
  );

-- Therapist sees ONLY their assigned patients
CREATE POLICY "therapist_own_patients" ON clinic_patients
  FOR SELECT USING (
    assigned_therapist_id = auth.uid()
    OR
    (SELECT role FROM clinic_users WHERE user_id = auth.uid()) = 'admin'
  );

-- Therapist sees ONLY their own sessions
CREATE POLICY "therapist_own_sessions" ON clinic_sessions
  FOR ALL USING (
    therapist_id = auth.uid()
    OR
    (SELECT role FROM clinic_users WHERE user_id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════

CREATE INDEX idx_clinic_users_clinic ON clinic_users(clinic_id);
CREATE INDEX idx_clinic_users_login ON clinic_users(login_code);
CREATE INDEX idx_clinic_patients_clinic ON clinic_patients(clinic_id);
CREATE INDEX idx_clinic_patients_therapist ON clinic_patients(assigned_therapist_id);
CREATE INDEX idx_clinic_sessions_clinic ON clinic_sessions(clinic_id);
CREATE INDEX idx_clinic_sessions_therapist ON clinic_sessions(therapist_id);
CREATE INDEX idx_clinic_sessions_scheduled ON clinic_sessions(scheduled_at);
CREATE UNIQUE INDEX idx_clinics_code ON clinics(clinic_code);
```

---

## 7. Bulk Patient Upload

### 7A. CSV Format

```csv
full_name,phone,email,date_of_birth,gender,primary_condition,assigned_therapist_suffix,notes
"Rahul Kumar","+919876543210","rahul@email.com","1990-05-15","M","Anxiety","1","Existing patient since 2024"
"Priya Sharma","+919876543211","priya@email.com","1985-11-20","F","Depression","2","Referred by Dr. Gupta"
"Amit Patel","+919876543212","","1978-03-08","M","Couples","1","Wife will also join sessions"
```

### 7B. Upload Rules

- Max 500 rows per upload (Large tier). Smaller tiers: 50/150/500
- Phone number required (used for OTP + WhatsApp)
- Email optional
- `assigned_therapist_suffix` maps to Clinic ID suffix (1-5)
- Duplicate phone check: if phone already exists in clinic, skip row and report
- After upload: each patient gets a WATI message (T-MDC-01):
  ```
  Hi {{1}}, {{2}} has upgraded to digital care with MANAS360.
  Your therapist {{3}} can now see you via video.
  No app needed — sessions happen via a link we'll send before each appointment.
  Reply HI to confirm. — {{2}}
  ```
  Variables: patient_name, clinic_name, therapist_name

---

## 8. Clinic Dashboard (Clinic Admin View)

```
┌──────────────────────────────────────────────────────────┐
│  MyDigitalClinic: MDC-2026-001 — Wellness Mind Clinic     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 42/50   │  │ 3/5     │  │ 127      │  │ 14 DAYS  │   │
│  │ Patients│  │Therapists│  │ Sessions │  │ Trial    │   │
│  │         │  │         │  │ This Mo  │  │ Left     │   │
│  └─────────┘  └─────────┘  └──────────┘  └──────────┘   │
│                                                           │
│  ── Today's Schedule ──────────────────────────────────   │
│  10:00 AM  Dr. Anjali (T1)  → Rahul Kumar     [Join]    │
│  11:00 AM  Dr. Priya (T2)   → Meera Singh     [Join]    │
│  02:00 PM  Dr. Anjali (T1)  → Amit Patel      [Join]    │
│  04:00 PM  Dr. Suresh (T3)  → Lakshmi Reddy   [Join]    │
│                                                           │
│  ── Therapist Utilization ─────────────────────────────   │
│  Dr. Anjali (T1):  ████████████░░  18/20 slots filled    │
│  Dr. Priya  (T2):  ██████████░░░░  15/20 slots filled    │
│  Dr. Suresh (T3):  ████████░░░░░░  12/20 slots filled    │
│                                                           │
│  ── Patient Progress (TherapeuticGPS) ─────────────────   │
│  PHQ-9 Avg (clinic):  12.4 → 8.7 (↓29% improvement)     │
│  GAD-7 Avg (clinic):  14.1 → 10.2 (↓28% improvement)    │
│                                                           │
│  [Upload Patients]  [Add Therapist]  [Monthly Report]    │
│                                                           │
│  ⚠️ 42/50 patients used. [Upgrade Plan →]               │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Therapist View (e.g., MDC-2026-001-1)

```
┌──────────────────────────────────────────────────────────┐
│  Dr. Anjali — Wellness Mind Clinic (MDC-2026-001-1)       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  ── My Patients (18) ──────────────────────────────────   │
│  Rahul Kumar    │ Anxiety     │ PHQ-9: 12→8  │ Next: Apr 18│
│  Amit Patel     │ Couples     │ PHQ-9: 15→11 │ Next: Apr 19│
│  Sneha Iyer     │ Depression  │ PHQ-9: 18→14 │ Next: Apr 20│
│  ...                                                      │
│                                                           │
│  ── Today ─────────────────────────────────────────────   │
│  10:00 AM  Rahul Kumar      [Start Session]               │
│  02:00 PM  Amit Patel       [Start Session]               │
│                                                           │
│  ── Session Notes (pending) ───────────────────────────   │
│  ⚠️ Sneha Iyer (Apr 14) — notes not yet completed        │
│  [Complete Notes]                                         │
│                                                           │
│  Cannot see: Other therapists' patients, clinic financials│
└──────────────────────────────────────────────────────────┘
```

---

## 10. Code Reuse Map

The heavy lifting — Jitsi, scheduling, session notes, TherapeuticGPS, credential verification (Story 13.35), WATI, PhonePe — is already built. The new work is the tenant layer, bulk upload, clinic dashboard, and the Clinic ID auth system.

**Incremental infrastructure cost: ~₹0** — same Supabase, same Jitsi, same WATI. Clinic data uses the same infrastructure. Revenue is pure SaaS subscription (₹999-₹9,999/mo per clinic).
