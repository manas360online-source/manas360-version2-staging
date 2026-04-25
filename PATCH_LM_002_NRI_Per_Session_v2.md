# PATCH-LM-002 v2.0 — NRI Per-Session Lead Matching

**What changed from v1.0:** Removed the 3-tier monthly subscription model (Saathi $49 / Bandham $99 / Kutumbam $179) — heavy therapist demand and timezone matching challenges made fixed monthly bundles unworkable. Replaced with **per-session pricing** matching the V3 pricing matrix. Each session type maps directly to provider type and price.

**Patch summary:** Adds 3 new preset entry points (one per NRI session type), timezone-aware filter layer, NRI pool flag on therapist records. No subscription tier logic. No session-type routing. Simpler.

**Stack:** Existing lead matching engine + new preset assessment service entry + therapist `nri_pool_certified` flag + timezone filter

---

## 1. The Simplification

### What was in v1.0 (REMOVED)

```
Saathi ($49/mo)    → Group sessions only, no individual
Bandham ($99/mo)   → 2 individual + 2 group sessions/month
Kutumbam ($179/mo) → 4 individual + unlimited group + couples
```

Required: subscription billing, monthly session quotas, tier-based session routing, family member sub-accounts, complex booking enforcement.

### What's in v2.0 (KEPT IT SIMPLE)

```
NRI Psychologist  → ₹2,999/session (50 min video)
NRI Psychiatrist  → ₹3,499/session (30 min video)
NRI Therapist     → ₹3,599/session (50 min video)
```

Required: per-session booking (already exists), preset entry points (4 new), NRI pool flag (1 new column), timezone filter (existing scoring extended).

**Net result:** ~70% less code than v1.0. No new subscription system. No quota enforcement. No tier downgrades. Patient pays when they book — same as domestic flow.

---

## 2. Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────┐
│  NRI LANDING PAGE (landing_nri_teletherapy_v2.html)      │
│                                                          │
│  Patient sees 3 session type cards:                      │
│  • NRI Psychologist (₹2,999) → bookSession('nri_psy')    │
│  • NRI Psychiatrist (₹3,499) → bookSession('nri_psyc')   │
│  • NRI Therapist    (₹3,599) → bookSession('nri_th')     │
│                                                          │
│  Click → /nri/book?session_type={type}                   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  PRESET ASSESSMENT SERVICE (extended)                    │
│                                                          │
│  Reads ?session_type= from URL                           │
│  Loads preset entry point config:                        │
│  • Pre-fills: provider_type, session_duration, fee       │
│  • Skips: budget step (already in fee)                   │
│  • Asks: language, timezone, primary concern             │
│  • New: NRI-specific concern list                        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LEAD MATCHING ENGINE (existing + new filters)           │
│                                                          │
│  Existing scoring:                                       │
│  • Specialization match                                  │
│  • Language match                                        │
│  • Experience                                            │
│  • Rating                                                │
│  • Availability                                          │
│                                                          │
│  Modified for NRI:                                       │
│  • Location score: 0 (not relevant for video)            │
│  • NEW: timezone overlap +15 points                      │
│  • NEW: nri_pool_certified bonus +10 points              │
│  • NEW: provider_type STRICT filter (matches session_type)│
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  BOOKING + PAYMENT (existing flow, unchanged)            │
│                                                          │
│  • Patient confirms slot                                 │
│  • PhonePe payment (per session, not subscription)       │
│  • Jitsi link generated                                  │
│  • WATI confirmation sent                                │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Preset Entry Points (4 new)

Each preset corresponds to one card on the landing page. URL pattern: `/nri/book?session_type={preset_id}`

### 3A. `nri_psychologist`

```yaml
preset_id: nri_psychologist
display_name: "NRI Psychologist"
provider_type: psychologist          # STRICT filter
session_duration_min: 50
session_fee_inr: 2999
session_fee_usd_approx: 36
session_format: video                # Jitsi
require_nri_pool: true               # Filter: only therapists with nri_pool_certified=true
skip_budget_step: true               # Fee is fixed, no need to ask
required_fields:
  - language_preference              # Hindi, English, Tamil, Telugu, Kannada
  - timezone_region                  # US_EST, US_PST, UK, AU, SG, UAE, OTHER
  - primary_concern                  # NRI-specific list (see 3E)
optional_fields:
  - therapist_gender_preference
  - previous_therapy_experience
```

### 3B. `nri_psychiatrist`

```yaml
preset_id: nri_psychiatrist
display_name: "NRI Psychiatrist"
provider_type: psychiatrist
session_duration_min: 30             # Shorter — medication consult
session_fee_inr: 3499
session_fee_usd_approx: 42
session_format: video
require_nri_pool: true
skip_budget_step: true
required_fields:
  - language_preference
  - timezone_region
  - primary_concern
  - current_medication               # New for psychiatrist preset
  - previous_psychiatric_history
```

### 3C. `nri_therapist`

```yaml
preset_id: nri_therapist
display_name: "NRI Therapist"
provider_type: therapist
session_duration_min: 50
session_fee_inr: 3599
session_fee_usd_approx: 43
session_format: video
require_nri_pool: true
skip_budget_step: true
required_fields:
  - language_preference
  - timezone_region
  - primary_concern
  - therapy_modality_preference      # CBT, DBT, EMDR, Other, No preference
```

### 3D. NRI-Specific Concern List

```
Common concerns offered to NRI patients (multi-select, top 3):

• Career pressure / workplace stress (in foreign country)
• Family guilt / parents in India
• Identity crisis / cultural disconnect
• Loneliness / isolation
• Relationship issues (cross-cultural / long-distance)
• Visa / immigration anxiety
• Children's bicultural upbringing
• Aging parents back in India
• Returning to India dilemma
• Discrimination / racism experiences
• Other (free text)
```

---

## 4. Database Changes (Minimal)

### 4A. Therapists Table — Add NRI Pool Flag

```sql
-- Therapists who opt into the NRI pool
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS nri_pool_certified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nri_pool_certified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nri_timezone_shifts TEXT[] DEFAULT '{}';
    -- e.g., ['shift_a_us_east', 'shift_b_us_west']
    -- Allowed values: shift_a_us_east, shift_b_us_west, shift_c_uk,
    --                 shift_d_au_sg, shift_e_uae

CREATE INDEX IF NOT EXISTS idx_therapists_nri_pool 
  ON therapists(nri_pool_certified) 
  WHERE nri_pool_certified = TRUE;
```

### 4B. Sessions Table — Add Source Tag (Optional)

```sql
-- Track which sessions came from NRI funnel (for analytics)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS source_funnel VARCHAR(30);
    -- 'nri_psychologist' | 'nri_psychiatrist' | 'nri_therapist' | 'domestic'
```

**That's it.** No `nri_subscriptions` table. No `subscription_tier` columns. No quota tracking. No tier downgrade logic.

---

## 5. Lead Matching Score Adjustments (NRI Path Only)

When `preset_id` starts with `nri_`, the matching engine adjusts scoring:

```javascript
// services/lead-matching.service.js
// Existing scoreTherapist() function — add NRI branch

function scoreTherapist(therapist, patientCriteria, presetId) {
  let score = 0;
  
  // ─── EXISTING SCORING (unchanged for domestic) ────────
  
  if (presetId && presetId.startsWith('nri_')) {
    // ─── NRI-SPECIFIC SCORING ─────────────────────────
    
    // STRICT FILTERS (return 0 if fails)
    if (!therapist.nri_pool_certified) return 0;
    if (therapist.provider_type !== presetConfig[presetId].provider_type) return 0;
    if (!therapist.languages.includes(patientCriteria.language_preference)) return 0;
    
    // Timezone overlap (NEW — 15 points max)
    const requiredShift = TIMEZONE_TO_SHIFT[patientCriteria.timezone_region];
    if (therapist.nri_timezone_shifts.includes(requiredShift)) {
      score += 15;
    } else {
      return 0;  // Timezone mismatch = no point matching
    }
    
    // NRI pool bonus (NEW — 10 points)
    score += 10;
    
    // Specialization (existing — 20 points max)
    score += scoreSpecialization(therapist, patientCriteria.primary_concern);
    
    // Rating (existing — 15 points max)
    score += scoreRating(therapist);
    
    // Experience (existing — 10 points max)
    score += scoreExperience(therapist);
    
    // Availability in next 24-48 hrs (existing — 10 points max)
    score += scoreAvailability(therapist);
    
    // Location: NOT scored for NRI (video sessions, location irrelevant)
    
    return score;
    
  } else {
    // Existing domestic scoring path — unchanged
    return scoreDomestic(therapist, patientCriteria);
  }
}

// Timezone region → shift mapping
const TIMEZONE_TO_SHIFT = {
  'US_EST':   'shift_a_us_east',    // IST 3:30-6:30 AM
  'US_PST':   'shift_b_us_west',    // IST 6:30-9:30 AM
  'UK':       'shift_c_uk',         // IST 11:30 PM-2:30 AM
  'AU':       'shift_d_au_sg',      // IST 12:30-3:30 PM
  'SG':       'shift_d_au_sg',      // IST 4:30-7:30 PM
  'UAE':      'shift_e_uae',        // IST 8:30-11:30 PM
  'OTHER':    'shift_a_us_east'     // Default fallback
};
```

---

## 6. API Endpoints

### 6A. Preset Lookup (extended existing endpoint)

```
GET /api/v1/presets/:preset_id

Response (example for nri_psychologist):
{
  "preset_id": "nri_psychologist",
  "display_name": "NRI Psychologist",
  "provider_type": "psychologist",
  "session_duration_min": 50,
  "session_fee_inr": 2999,
  "session_fee_usd_approx": 36,
  "session_format": "video",
  "skip_budget_step": true,
  "required_fields": ["language_preference", "timezone_region", "primary_concern"],
  "optional_fields": ["therapist_gender_preference", "previous_therapy_experience"]
}
```

### 6B. NRI Lead Submission (uses existing endpoint with preset_id)

```
POST /api/v1/leads/submit
Body:
{
  "preset_id": "nri_psychologist",
  "patient_phone": "+919876543210",         // +91 required
  "patient_email": "rahul@example.com",      // optional, for invoice
  "language_preference": "Hindi",
  "timezone_region": "US_EST",
  "primary_concern": ["career_pressure", "family_guilt"],
  "therapist_gender_preference": "any",
  "source": "landing_nri_teletherapy_v2"
}

Response:
{
  "lead_id": "lead_xxx",
  "matched_therapists": [
    { "therapist_id": "th_001", "name": "Dr. Anjali", "match_score": 87, "next_available": "2026-04-18 18:00 EST" },
    { "therapist_id": "th_005", "name": "Dr. Priya", "match_score": 82, "next_available": "2026-04-18 19:30 EST" },
    { "therapist_id": "th_012", "name": "Dr. Suresh", "match_score": 78, "next_available": "2026-04-19 18:00 EST" }
  ],
  "session_fee_inr": 2999,
  "next_step_url": "/nri/select-therapist?lead_id=lead_xxx"
}
```

### 6C. Therapist NRI Pool Opt-In (admin/therapist self-service)

```
PATCH /api/v1/therapists/:therapist_id/nri-pool
Body:
{
  "nri_pool_certified": true,
  "nri_timezone_shifts": ["shift_a_us_east", "shift_b_us_west"]
}

Notes:
- Therapist must have completed NRI sensitization module first
- Subramanya (clinical ops) approves before flag is set true
```

---

## 7. What's NOT in This Patch (Deferred)

These were in v1.0 spec but are now **explicitly out of scope** because per-session pricing eliminates the need:

- ❌ Subscription billing system (no monthly recurring)
- ❌ `nri_subscriptions` table
- ❌ `subscription_tier` columns
- ❌ Session quota tracking ("4 individual sessions used of 4 allowed")
- ❌ Tier downgrade / upgrade flows
- ❌ Family member sub-accounts (Kutumbam's "3 family members" feature)
- ❌ Group session enforcement for Saathi tier
- ❌ Couples session unlock for Kutumbam tier
- ❌ Trial-to-paid conversion logic
- ❌ ₹1 PhonePe authorization for trial start

If/when we revisit subscription bundles, this can be a v3 patch. For now, per-session keeps it simple.

---

## 8. Migration Notes

### For New Deployments
- Apply migrations 4A and 4B
- Deploy preset configs (3A-3D)
- Deploy updated landing page (`landing_nri_teletherapy_v2.html`)
- Therapists opt into NRI pool via admin UI (Subramanya approves)

### If v1.0 Was Already Deployed
- DROP unused tables: `nri_subscriptions` (if created)
- REMOVE unused columns: `subscription_tier` from `leads` and `sessions`
- ARCHIVE any test subscription records
- Update WATI templates: replace tier-based welcome with session-type-based welcome

---

## 9. Therapist Pool Strategy

Given the heavy demand for NRI sessions, the pool needs careful management:

| Provider Type | Min Pool Size | Recommended Pool Size | Notes |
|---------------|--------------|----------------------|-------|
| NRI Psychologist | 8 | 15-20 | Highest demand — most NRI requests are general therapy |
| NRI Psychiatrist | 3 | 5-8 | Lower volume but critical (medication consults) |
| NRI Therapist | 5 | 10-15 | Specialized — CBT/DBT/EMDR practitioners |

**Onboarding path for NRI pool:**
1. Existing MANAS360 therapist completes NRI sensitization module (1 hour)
2. Therapist declares which timezone shifts they can serve
3. Subramanya reviews + approves (24-48 hr SLA)
4. `nri_pool_certified=true` flag set → therapist starts receiving NRI matches

---

**TOTAL CHANGES:**
- 1 new column on `therapists` (+ 2 supporting columns)
- 1 new column on `sessions` (analytics only)
- 3 new preset configs
- 1 new branch in scoring function
- 0 new tables
- 0 new subscription/billing logic

Compare to v1.0: 3 new tables, 9 new columns, full subscription billing system, tier-based session routing. v2.0 is roughly **70% less code** for the same NRI lead matching outcome.
