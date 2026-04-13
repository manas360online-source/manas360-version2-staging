# MANAS360 — Lead Matching Engine: NRI Region-Locked Preset Patch

**Patch ID:** PATCH-LM-002  
**Applies to:** Patient-Therapist Matching & Lead Generation System (Story v1.0 + PATCH-LM-001)  
**Depends on:** PATCH-LM-001 (Preset Entry Points)  
**Date:** April 2026  

---

## 1. Problem Statement

NRI patients arrive from the `landing_nri_teletherapy.html` page with a **pre-selected subscription tier** (Saathi / Bandham / Kutumbam) and **timezone context** that domestic patients don't have. The current matching engine scores on specialization, language, location, experience, availability, and rating — but has no concept of:

1. **Timezone-compatible availability** — an NRI in US EST wanting a 7 PM session needs a therapist willing to work at 4:30 AM IST
2. **NRI-certified therapist pool** — therapists who have opted in to odd-hour shifts and been briefed on NRI-specific issues (diaspora identity, cross-cultural relationships, immigration stress, family guilt dynamics)
3. **Region-locked matching** — an NRI should only match with therapists in the NRI pool, never with the general domestic pool (different pay rates, different session economics)
4. **Session type routing** — Saathi subscribers get group sessions only; Bandham/Kutumbam get individual + group; Kutumbam gets couples/family sessions

**What this patch adds:** Two new preset entry points (`nri_individual` and `nri_group`) plus a new timezone-aware filter layer, NRI pool flag on therapist records, and subscription-tier-based session routing.

---

## 2. Architecture: How the Patch Connects

```
┌──────────────────────────────────────────────────────────────┐
│              NRI LANDING PAGE                                │
│                                                              │
│  landing_nri_teletherapy.html                                │
│  ├─ "Start Free Trial" → Saathi ($49)                       │
│  ├─ "Start Free Trial" → Bandham ($99)                      │
│  └─ "Start Free Trial" → Kutumbam ($179)                    │
└──────┬───────────────┬───────────────┬───────────────────────┘
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
│  SAATHI     │ │  BANDHAM     │ │   KUTUMBAM       │
│  (group     │ │  (individual │ │   (individual +   │
│   only)     │ │  + group)    │ │   group + couples)│
└──────┬──────┘ └──────┬───────┘ └────────┬──────────┘
       │               │                  │
       ▼               ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│           NRI PRESET DEFAULTS INJECTED                       │
│                                                              │
│  • nri_pool = true (hard filter)                             │
│  • timezone_region locked (US_EST / US_PST / UK / AU / SG)   │
│  • subscription_tier → determines session types allowed      │
│  • language preference pre-selected from signup              │
│  • NRI-specific concern list shown                           │
│  • Budget pre-filled from subscription (not user-set)        │
│  • provider_type filter: therapist (not psychiatrist*)       │
│  * Kutumbam quarterly psychiatrist handled separately        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         NRI ASSESSMENT (Shortened — 3 min)                   │
│                                                              │
│  Step 1: Welcome (NRI-context copy)                          │
│  Step 2: NRI-specific concern list (pre-filled from tier)    │
│  Step 3: PHQ-9 (kept — clinical requirement)                 │
│  Step 4: GAD-7 (kept — clinical requirement)                 │
│  Step 5: Treatment history (kept — 3 questions)              │
│  Step 6: Language (pre-filled) + Timezone confirmation       │
│  Step 7: Demographics (kept, +country of residence)          │
│  Step 8: SKIPPED — budget is subscription-determined         │
│  Step 9: Contact info (kept, +timezone, +country code)       │
│  Step 10: Results (same engine + NRI filters)                │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  match_patient_to_therapists() + NRI FILTERS                 │
│                                                              │
│  HARD FILTERS (applied before scoring):                      │
│  • nri_pool = true                                           │
│  • timezone_shift OVERLAPS patient_timezone_window            │
│  • provider_type IN allowed types for tier                   │
│  • session_type matches (group / individual / couples)       │
│                                                              │
│  SCORING (same 0-100 + NRI bonus factors):                   │
│  • Specialization match (35 pts)                             │
│  • Language match (20 pts)                                   │
│  • Timezone overlap quality (15 pts) ← NEW                  │
│  • NRI experience bonus (10 pts) ← NEW                      │
│  • Experience (10 pts)                                       │
│  • Rating (10 pts)                                           │
│                                                              │
│  OUTPUT → matched NRI-pool therapists only                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Two NRI Preset Entry Points — Defaults

### 3A. NRI Individual (`entry=nri_individual`)

**Trigger:** Bandham or Kutumbam subscriber completes payment → routed to assessment

| Field | Default Value | Visible to User? |
|-------|--------------|-------------------|
| `entry_type` | `nri_individual` | No (injected) |
| `nri_pool` | `true` | No (hard filter) |
| `provider_type` | `therapist` | No (locked — psychiatrist handled separately for Kutumbam) |
| `therapy_modality` | `individual` | No (locked) |
| `timezone_region` | Detected from browser or selected during signup | Yes (Step 6, editable) |
| `timezone_shift_required` | Computed from `timezone_region` | Backend only |
| `primary_concerns` | Empty — NRI-specific list shown | Yes (Step 2) |
| `subscription_tier` | `bandham` or `kutumbam` | No (injected from payment) |
| `budget_min` / `budget_max` | Not applicable — subscription pricing | Hidden |
| `country_of_residence` | Detected or selected | Yes (Step 7) |
| `preferred_languages` | Pre-filled from signup form | Yes (Step 6, editable) |

**Assessment flow changes:**

- **Step 1 (Welcome):** *"Welcome home. Let's find an Indian therapist who speaks your language, understands your journey, and works on your schedule — no matter where you are."*
- **Step 2 (Primary Concern):** NRI-specific concern list (see Section 4 below)
- **Step 6:** Language pre-filled + timezone confirmation widget showing "Your evening → Therapist's IST time"
- **Step 7:** Adds `country_of_residence` field (dropdown: US, UK, Australia, Singapore, UAE, Canada, Other)
- **Step 8 (Budget):** SKIPPED entirely — NRI pricing is subscription-based, not per-session user choice
- **Step 9:** Phone field accepts international format; timezone shown as confirmation

---

### 3B. NRI Group (`entry=nri_group`)

**Trigger:** Saathi subscriber, or any NRI subscriber selecting a group session slot

| Field | Default Value | Visible to User? |
|-------|--------------|-------------------|
| `entry_type` | `nri_group` | No (injected) |
| `nri_pool` | `true` | No (hard filter) |
| `provider_type` | `therapist` | No (locked) |
| `therapy_modality` | `group` | No (locked) |
| `session_type` | `group_anonymous` | No (injected) |
| `timezone_region` | Detected / selected | Yes (Step 6) |
| `primary_concerns` | Empty — NRI group topic list shown | Yes (Step 2) |
| `subscription_tier` | `saathi`, `bandham`, or `kutumbam` | No (injected) |
| `anonymous_attendance` | `true` | No (default, user can opt out) |

**Assessment flow changes:**

- **Step 1 (Welcome):** *"Join a group of NRIs who get it. Camera-off, alias-only, therapist-led. Pick a topic that resonates."*
- **Step 2:** Shows **group topic list** instead of individual concern list:
  - ☐ Anxiety & Overthinking
  - ☐ Parenting Across Cultures
  - ☐ Relationship Bridges (Long Distance / Cross-Cultural)
  - ☐ Work Stress & Burnout Abroad
  - ☐ Identity & Belonging ("Where is home?")
  - ☐ Family Guilt & Expectations
  - ☐ Grief & Loss (Away from Family)
  - ☐ Career Transitions & Imposter Syndrome
  - ☐ New Immigrant Adjustment
  - ☐ Caregiver Stress (Elderly Parents in India)
- **Steps 3-4 (PHQ-9/GAD-7):** Kept — used for severity routing (high severity → flagged for individual session upsell)
- **Steps 5-7:** Shortened — group doesn't need deep treatment history
- **Step 8:** SKIPPED
- **Matching engine:** Matches to **group session slots** rather than individual therapists. Filter: `WHERE session_type = 'group' AND nri_pool = true AND topic IN (patient_selected_topics) AND timezone_shift OVERLAPS patient_timezone`

---

## 4. NRI-Specific Concern List

Replaces the domestic concern list when `entry_type` starts with `nri_`:

```javascript
const NRI_CONCERNS = [
  { id: 'diaspora_identity',    label: 'Identity & Belonging — "Where is home?"',     category: 'nri_core' },
  { id: 'family_guilt',         label: 'Family Guilt & Expectations from India',       category: 'nri_core' },
  { id: 'relationship_bridges', label: 'Relationship Bridges — Long Distance / Cross-Cultural', category: 'nri_core' },
  { id: 'career_abroad',        label: 'Career Pressure & Imposter Syndrome Abroad',   category: 'nri_core' },
  { id: 'immigration_stress',   label: 'Visa / Immigration / Green Card Anxiety',      category: 'nri_core' },
  { id: 'parenting_crosscult',  label: 'Parenting Across Cultures (Raising Kids Abroad)', category: 'nri_core' },
  { id: 'elderly_care_remote',  label: 'Elderly Parent Care — Remote Caregiver Stress', category: 'nri_core' },
  { id: 'new_immigrant',        label: 'New Immigrant Adjustment & Loneliness',        category: 'nri_core' },
  { id: 'grief_away',           label: 'Grief & Loss — Being Away When It Happened',   category: 'nri_core' },
  // Standard concerns still available
  { id: 'anxiety',              label: 'Anxiety & Panic',                               category: 'general' },
  { id: 'depression',           label: 'Depression & Low Mood',                         category: 'general' },
  { id: 'relationship_issues',  label: 'Relationship / Marital Issues',                 category: 'general' },
  { id: 'work_stress',          label: 'Work Stress & Burnout',                         category: 'general' },
  { id: 'sleep_issues',         label: 'Sleep Problems',                                category: 'general' },
  { id: 'self_esteem',          label: 'Self-Esteem & Confidence',                      category: 'general' },
  { id: 'other',                label: 'Other (describe)',                               category: 'general' }
];
```

---

## 5. Therapist NRI Pool — Certification & Opt-In Model

### 5A. NRI Pool Flag

Therapists are NOT auto-enrolled. They opt in by:

1. Indicating willingness to work specific timezone shifts
2. Completing a brief NRI-sensitization module (diaspora issues, cultural context)
3. Being approved by Subramanya (Clinical Ops)

```
NRI Pool Therapist Requirements:
├─ Active MANAS360 therapist (verified credentials)
├─ Opted in to ≥1 NRI timezone shift (see Section 6)
├─ Completed NRI sensitization module (1 hour, online)
│   ├─ Diaspora identity dynamics
│   ├─ Cross-cultural relationship patterns
│   ├─ Immigration & visa stress
│   ├─ Remote caregiving for elderly parents
│   └─ Assessment quiz (80% pass required)
├─ Minimum 2 years clinical experience
├─ Fluent in ≥1 Indian language + English
└─ Approved by Clinical Ops (Subramanya)
```

### 5B. Therapist Shift Enrollment

Each NRI-pool therapist selects which timezone shifts they'll serve:

| Shift | IST Hours | Serves | Pay Rate | Min Commitment |
|-------|-----------|--------|----------|----------------|
| A: Afternoon | 12:00-5:00 PM | Australia AEST evening | ₹700/session (standard) | 4 hrs/week |
| B: Evening Stretch | 4:30-10:30 PM | UK + Singapore evening | ₹700-875/session (+0-25%) | 4 hrs/week |
| C: Night Owl | 3:00-7:00 AM | US East Coast evening | ₹1,200-1,500/session (+75-100%) | 3 hrs/week |
| D: Dawn Patrol | 6:00-10:00 AM | US West Coast evening | ₹1,050/session (+50%) | 3 hrs/week |

A therapist can enroll in multiple shifts. The matching engine uses shift enrollment as a hard filter.

---

## 6. Timezone Matching — New Filter Layer

### 6A. Patient Timezone Window

When an NRI subscriber signs up, their timezone region is captured. The system computes their preferred session window:

```javascript
const TIMEZONE_WINDOWS = {
  US_EST:  { patient_local: '18:00-21:00', ist_equivalent: '03:30-06:30', shift: 'C' },
  US_PST:  { patient_local: '18:00-21:00', ist_equivalent: '06:30-09:30', shift: 'D' },
  UK_GMT:  { patient_local: '18:00-21:00', ist_equivalent: '23:30-02:30', shift: 'B' },
  AU_AEST: { patient_local: '18:00-21:00', ist_equivalent: '12:30-15:30', shift: 'A' },
  SG_SGT:  { patient_local: '19:00-22:00', ist_equivalent: '16:30-19:30', shift: 'B' },
  UAE_GST: { patient_local: '19:00-22:00', ist_equivalent: '20:30-23:30', shift: 'B' },
  // Morning sessions (weekend option)
  US_EST_AM:  { patient_local: '08:00-10:00', ist_equivalent: '17:30-19:30', shift: 'B' },
  US_PST_AM:  { patient_local: '08:00-10:00', ist_equivalent: '20:30-22:30', shift: 'B' },
};
```

### 6B. Matching Engine Filter Addition

```python
# PATCH to existing matching function (extends PATCH-LM-001 filters)
# File: matching_algorithm.py

def match_patient_to_therapists(patient_assessment, filters=None):
    all_therapists = get_active_therapists()

    # ──── EXISTING PATCH-LM-001 filters ────
    if filters:
        if filters.get('provider_type_filter'):
            all_therapists = [t for t in all_therapists if t['provider_type'] in filters['provider_type_filter']]
        if filters.get('specialization_required'):
            all_therapists = [t for t in all_therapists if set(filters['specialization_required']).issubset(set(t['specializations']))]
        if filters.get('credential_filter'):
            all_therapists = [t for t in all_therapists if any(c in t.get('credentials','') for c in filters['credential_filter'])]
        if filters.get('session_type_filter') == 'couples':
            all_therapists = [t for t in all_therapists if t.get('couples_session_rate') is not None]

    # ──── NEW: NRI Pool + Timezone filters (PATCH-LM-002) ────
    if filters and filters.get('nri_pool'):
        # Hard filter: only NRI-certified therapists
        all_therapists = [
            t for t in all_therapists
            if t.get('nri_pool_certified') == True
        ]

        # Hard filter: therapist must be enrolled in the required shift
        required_shift = filters.get('timezone_shift')
        if required_shift:
            all_therapists = [
                t for t in all_therapists
                if required_shift in t.get('nri_shifts_enrolled', [])
            ]

        # For group sessions: filter to therapists with group session slots
        if filters.get('session_type_filter') == 'group_anonymous':
            all_therapists = [
                t for t in all_therapists
                if t.get('offers_nri_group_sessions') == True
            ]
    # ──── END PATCH-LM-002 ────

    # ... rest of scoring algorithm ...
    # (with NRI bonus scoring — see Section 7)
```

---

## 7. NRI Bonus Scoring — Modified Weights

For NRI entries, the scoring factors are re-weighted to prioritize timezone fit and NRI experience:

| Factor | Domestic Weight | NRI Weight | Rationale |
|--------|----------------|------------|-----------|
| Specialization match | 40 pts | 35 pts | Still dominant, slightly reduced |
| Language match | 20 pts | 20 pts | Unchanged — critical for NRI |
| Location proximity | 15 pts | 0 pts | Irrelevant — all sessions virtual |
| **Timezone overlap quality** | 0 pts | **15 pts** | **NEW** — perfect shift match = 15, adjacent = 8, poor = 0 |
| **NRI experience bonus** | 0 pts | **10 pts** | **NEW** — therapist has treated ≥10 NRI patients: +10, ≥5: +6, ≥1: +3 |
| Experience (years) | 10 pts | 10 pts | Unchanged |
| Rating | 5 pts | 10 pts | Increased — NRI patients rely more on ratings (can't ask local friends) |
| **Total** | **100 pts** | **100 pts** | |

```python
# NRI-specific scoring addition
def calculate_nri_bonus_scores(therapist, patient_assessment, filters):
    scores = {}

    # Timezone overlap quality (15 pts)
    required_shift = filters.get('timezone_shift')
    enrolled_shifts = therapist.get('nri_shifts_enrolled', [])
    if required_shift in enrolled_shifts:
        # Check how many hours overlap with patient's preferred window
        overlap_hours = calculate_shift_overlap(
            therapist_shift=required_shift,
            patient_window=filters.get('patient_timezone_window')
        )
        if overlap_hours >= 3:
            scores['timezone_overlap'] = 15
        elif overlap_hours >= 2:
            scores['timezone_overlap'] = 10
        elif overlap_hours >= 1:
            scores['timezone_overlap'] = 5
        else:
            scores['timezone_overlap'] = 0
    else:
        scores['timezone_overlap'] = 0

    # NRI experience bonus (10 pts)
    nri_patients_served = therapist.get('nri_patients_served', 0)
    if nri_patients_served >= 10:
        scores['nri_experience'] = 10
    elif nri_patients_served >= 5:
        scores['nri_experience'] = 6
    elif nri_patients_served >= 1:
        scores['nri_experience'] = 3
    else:
        scores['nri_experience'] = 0

    return scores
```

---

## 8. API Patch — NRI Preset Defaults

Extends the `PRESET_DEFAULTS` object from PATCH-LM-001:

```javascript
// file: assessment.preset.service.js
// PATCH-LM-002 additions to PRESET_DEFAULTS

const PRESET_DEFAULTS = {
  // ... existing entries from PATCH-LM-001 (therapist, psychiatrist, couples) ...

  nri_individual: {
    provider_type_filter: ['psychologist', 'counselor', 'clinical_psychologist'],
    therapy_modality: 'individual',
    nri_pool: true,
    welcome_copy: "Welcome home. Let's find an Indian therapist who speaks your language, understands your journey, and works on your schedule.",
    budget_default: null,  // Subscription-based — no user budget selection
    skip_steps: [8],       // Skip budget step
    prefill: {},
    concern_list_override: 'NRI_CONCERNS',
    additional_fields: {
      country_of_residence: { type: 'dropdown', required: true, step: 7 },
      timezone_region: { type: 'timezone_picker', required: true, step: 6 },
      anonymous_preference: { type: 'boolean', default: false, step: 6 }
    },
    // Timezone shift is computed from timezone_region, not user-selected
    compute_timezone_shift: true
  },

  nri_group: {
    provider_type_filter: ['psychologist', 'counselor', 'clinical_psychologist'],
    therapy_modality: 'group',
    session_type: 'group_anonymous',
    nri_pool: true,
    welcome_copy: "Join a group of NRIs who get it. Camera-off, alias-only, therapist-led. Pick a topic that resonates.",
    budget_default: null,
    skip_steps: [8],
    prefill: {
      anonymous_attendance: true
    },
    concern_list_override: 'NRI_GROUP_TOPICS',
    additional_fields: {
      country_of_residence: { type: 'dropdown', required: true, step: 7 },
      timezone_region: { type: 'timezone_picker', required: true, step: 6 }
    },
    compute_timezone_shift: true
  },

  nri_couples: {
    provider_type_filter: ['psychologist', 'counselor', 'clinical_psychologist'],
    therapy_modality: 'couples',
    session_type: 'couples_session',
    nri_pool: true,
    welcome_copy: "Relationship therapy for couples bridging continents. We match you with a therapist who understands cross-cultural dynamics.",
    budget_default: null,
    skip_steps: [8],
    prefill: {
      primary_concerns: ['relationship_bridges']
    },
    specialization_required: ['Relationship Counseling'],
    concern_list_override: 'NRI_COUPLES_CONCERNS',
    additional_fields: {
      country_of_residence: { type: 'dropdown', required: true, step: 7 },
      timezone_region: { type: 'timezone_picker', required: true, step: 6 },
      partner_location: { type: 'dropdown', options: ['same_country', 'india', 'other'], required: true, step: 7 }
    },
    compute_timezone_shift: true
  }
};
```

**Backend `presetAssessmentSubmit` extension:**

```javascript
async function presetAssessmentSubmit(entryType, patientId, responses, source) {
  const defaults = PRESET_DEFAULTS[entryType];
  if (!defaults) throw new Error(`Invalid entry_type: ${entryType}`);

  // 1. Merge defaults (same as PATCH-LM-001)
  const enrichedResponses = {
    ...responses,
    therapy_modality: responses.therapy_modality || defaults.therapy_modality,
    primary_concerns: [
      ...(defaults.prefill.primary_concerns || []),
      ...(responses.primary_concerns || [])
    ],
  };

  // Budget: only set if NOT null (NRI entries skip this)
  if (defaults.budget_default) {
    enrichedResponses.budget_min = responses.budget_min || defaults.budget_default.min;
    enrichedResponses.budget_max = responses.budget_max || defaults.budget_default.max;
  }

  if (defaults.seeking_medication) {
    enrichedResponses.seeking_medication = true;
  }

  // ──── NEW: NRI-specific enrichment (PATCH-LM-002) ────
  if (defaults.nri_pool) {
    enrichedResponses.nri_pool = true;
    enrichedResponses.country_of_residence = responses.country_of_residence;
    enrichedResponses.timezone_region = responses.timezone_region;
    enrichedResponses.subscription_tier = source.subscription_tier;

    // Compute timezone shift from region
    if (defaults.compute_timezone_shift) {
      enrichedResponses.timezone_shift = computeTimezoneShift(responses.timezone_region);
    }

    // Anonymous attendance for group sessions
    if (defaults.prefill.anonymous_attendance) {
      enrichedResponses.anonymous_attendance = true;
    }
  }
  // ──── END PATCH-LM-002 ────

  // 2. Save assessment
  const assessment = await submitAssessment(patientId, enrichedResponses);

  // 3. Tag source
  await tagAssessmentSource(assessment.assessment_id, {
    entry_type: entryType,
    landing_page: source.landing_page,
    utm_campaign: source.utm_campaign,
    utm_medium: source.utm_medium,
    subscription_tier: source.subscription_tier  // NEW
  });

  // 4. Call matching engine with NRI filters
  const matchFilters = {
    provider_type_filter: defaults.provider_type_filter,
    specialization_required: defaults.specialization_required || [],
    credential_filter: defaults.credential_filter || [],
    session_type_filter: defaults.session_type || null,
    // NRI additions
    nri_pool: defaults.nri_pool || false,
    timezone_shift: enrichedResponses.timezone_shift || null,
    patient_timezone_window: TIMEZONE_WINDOWS[enrichedResponses.timezone_region] || null
  };

  const matches = await matchPatientToTherapists(assessment, matchFilters);

  return {
    assessment_id: assessment.assessment_id,
    entry_type: entryType,
    subscription_tier: source.subscription_tier,
    timezone_region: enrichedResponses.timezone_region,
    matched_therapists: matches
  };
}


// Helper: Compute shift from timezone region
function computeTimezoneShift(timezoneRegion) {
  const REGION_TO_SHIFT = {
    'US_EST':  'C',   // Night Owl (IST 3-7 AM)
    'US_PST':  'D',   // Dawn Patrol (IST 6-10 AM)
    'UK_GMT':  'B',   // Evening Stretch (IST 4:30-10:30 PM)
    'AU_AEST': 'A',   // Afternoon (IST 12-5 PM)
    'SG_SGT':  'B',   // Evening Stretch
    'UAE_GST': 'B',   // Evening Stretch
    'CA_EST':  'C',   // Same as US EST
    'CA_PST':  'D',   // Same as US PST
  };
  return REGION_TO_SHIFT[timezoneRegion] || 'B';  // Default to Evening Stretch
}
```

---

## 9. Database Patch — New Columns & Tables

```sql
-- ═══════════════════════════════════════════════════════════
-- PATCH-LM-002: NRI Lead Matching Database Changes
-- Depends on: PATCH-LM-001 tables already in place
-- ═══════════════════════════════════════════════════════════

-- ──── Therapist table: NRI pool fields ────
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS nri_pool_certified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nri_certification_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nri_shifts_enrolled TEXT[] DEFAULT '{}',
    -- Array of shift codes: ['A', 'B', 'C', 'D']
  ADD COLUMN IF NOT EXISTS nri_patients_served INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nri_session_rate_override JSONB,
    -- {"shift_C": 1500, "shift_D": 1050, "shift_A": 700, "shift_B": 875}
  ADD COLUMN IF NOT EXISTS offers_nri_group_sessions BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nri_sensitization_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nri_sensitization_date TIMESTAMP;

-- ──── Assessments table: NRI fields ────
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS nri_pool BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS timezone_region VARCHAR(20),
    -- 'US_EST', 'US_PST', 'UK_GMT', 'AU_AEST', 'SG_SGT', 'UAE_GST'
  ADD COLUMN IF NOT EXISTS timezone_shift CHAR(1),
    -- 'A', 'B', 'C', 'D'
  ADD COLUMN IF NOT EXISTS country_of_residence VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20),
    -- 'saathi', 'bandham', 'kutumbam'
  ADD COLUMN IF NOT EXISTS anonymous_attendance BOOLEAN DEFAULT FALSE;

-- ──── Assessment sources: NRI tracking ────
ALTER TABLE assessment_sources
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20),
  ADD COLUMN IF NOT EXISTS timezone_region VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country_of_residence VARCHAR(50);

-- ──── NRI Group Sessions table ────
CREATE TABLE IF NOT EXISTS nri_group_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(therapist_id),
  topic VARCHAR(50) NOT NULL,
    -- Maps to NRI_GROUP_TOPICS concern IDs
  timezone_shift CHAR(1) NOT NULL,
    -- Which shift this group session falls in
  scheduled_ist_time TIME NOT NULL,
  scheduled_day_of_week INT NOT NULL,
    -- 0=Sunday, 1=Monday, ... 6=Saturday
  max_participants INT DEFAULT 8,
  current_participants INT DEFAULT 0,
  session_status VARCHAR(20) DEFAULT 'scheduled',
    -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  recurrence VARCHAR(20) DEFAULT 'weekly',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ──── NRI Group Session Enrollment (anonymous) ────
CREATE TABLE IF NOT EXISTS nri_group_enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES nri_group_sessions(session_id),
  patient_id UUID REFERENCES patients(patient_id),
  alias_name VARCHAR(50),
    -- Auto-generated: 'Participant 1', 'Participant 2', etc.
  camera_preference VARCHAR(10) DEFAULT 'off',
    -- 'off' (default), 'on'
  enrolled_at TIMESTAMP DEFAULT NOW(),
  attended BOOLEAN DEFAULT FALSE,
  UNIQUE(session_id, patient_id)
);

-- ──── NRI Subscription Tracking ────
CREATE TABLE IF NOT EXISTS nri_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(patient_id),
  tier VARCHAR(20) NOT NULL,
    -- 'saathi', 'bandham', 'kutumbam'
  price_usd DECIMAL(10,2) NOT NULL,
  timezone_region VARCHAR(20) NOT NULL,
  country_of_residence VARCHAR(50),
  individual_sessions_remaining INT DEFAULT 0,
  group_sessions_remaining INT DEFAULT 0,
    -- -1 = unlimited (Kutumbam)
  couples_sessions_remaining INT DEFAULT 0,
  trial_started_at TIMESTAMP,
  trial_ends_at TIMESTAMP,
  subscription_started_at TIMESTAMP,
  subscription_status VARCHAR(20) DEFAULT 'trial',
    -- 'trial', 'active', 'paused', 'cancelled', 'expired'
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ──── Indexes ────
CREATE INDEX idx_therapists_nri_pool ON therapists(nri_pool_certified) WHERE nri_pool_certified = TRUE;
CREATE INDEX idx_therapists_nri_shifts ON therapists USING GIN(nri_shifts_enrolled);
CREATE INDEX idx_assessments_nri ON assessments(nri_pool, timezone_region) WHERE nri_pool = TRUE;
CREATE INDEX idx_nri_group_sessions_shift ON nri_group_sessions(timezone_shift, scheduled_day_of_week);
CREATE INDEX idx_nri_subscriptions_patient ON nri_subscriptions(patient_id, subscription_status);
CREATE INDEX idx_nri_subscriptions_tier ON nri_subscriptions(tier);
```

---

## 10. Frontend Patch — NRI Landing Page CTA Wiring

```html
<!-- landing_nri_teletherapy.html — CTA buttons -->

<!-- Saathi ($49) → Group only -->
<button onclick="startNRITrial('saathi')"
  class="plan-cta cta-outline">Start Free Trial →</button>

<!-- Bandham ($99) → Individual + Group -->
<button onclick="startNRITrial('bandham')"
  class="plan-cta cta-primary">Start Free Trial →</button>

<!-- Kutumbam ($179) → Individual + Group + Couples -->
<button onclick="startNRITrial('kutumbam')"
  class="plan-cta cta-gold">Start Free Trial →</button>
```

```javascript
function startNRITrial(tier) {
  // 1. Detect timezone (browser)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const region = mapBrowserTimezoneToRegion(tz);

  // 2. Route to assessment with NRI preset
  const entryType = (tier === 'saathi') ? 'nri_group' : 'nri_individual';
  const params = new URLSearchParams({
    entry: entryType,
    tier: tier,
    tz_region: region,
    utm_source: 'landing_nri_teletherapy'
  });

  window.location.href = `/assessment?${params.toString()}`;
}

function mapBrowserTimezoneToRegion(tz) {
  const mapping = {
    'America/New_York': 'US_EST', 'America/Chicago': 'US_EST',
    'America/Denver': 'US_PST', 'America/Los_Angeles': 'US_PST',
    'America/Toronto': 'CA_EST', 'America/Vancouver': 'CA_PST',
    'Europe/London': 'UK_GMT',
    'Australia/Sydney': 'AU_AEST', 'Australia/Melbourne': 'AU_AEST',
    'Asia/Singapore': 'SG_SGT',
    'Asia/Dubai': 'UAE_GST',
  };
  return mapping[tz] || 'US_EST';  // Default to US EST if unknown
}
```

**V5 Landing Page tile wiring (one-line change):**

```html
<!-- BEFORE (line 1671 in V5): -->
<div class="nri-tile" onclick="alert('NRI Journey: Find a Janmabhoomi Connection')">

<!-- AFTER: -->
<div class="nri-tile" onclick="window.location.href='/nri'">
```

---

## 11. Entry Point Comparison Matrix (Updated with NRI)

| Aspect | Full | Therapist | Psychiatrist | Couples | **NRI Individual** | **NRI Group** | **NRI Couples** |
|--------|------|-----------|-------------|---------|-------------------|---------------|-----------------|
| **URL param** | (none) | `?entry=therapist` | `?entry=psychiatrist` | `?entry=couples` | `?entry=nri_individual` | `?entry=nri_group` | `?entry=nri_couples` |
| **Steps shown** | All 10 | All 10 | All 10 | All 10 | 9 (skip budget) | 9 (skip budget) | 9 (skip budget) |
| **Concern list** | General | General | General | Couples | **NRI-specific** | **NRI group topics** | **NRI couples** |
| **Modality** | None | Individual | Individual | Couples | Individual | Group | Couples |
| **Budget step** | Shown | Shown | Shown | Shown | **SKIPPED** | **SKIPPED** | **SKIPPED** |
| **NRI pool filter** | No | No | No | No | **Yes** | **Yes** | **Yes** |
| **Timezone filter** | No | No | No | No | **Yes (shift)** | **Yes (shift)** | **Yes (shift)** |
| **Anonymity** | No | No | No | No | No | **Yes (default)** | No |
| **Location score** | 15 pts | 15 pts | 15 pts | 15 pts | **0 pts** | **0 pts** | **0 pts** |
| **TZ score** | 0 pts | 0 pts | 0 pts | 0 pts | **15 pts** | **15 pts** | **15 pts** |
| **Lead marketplace** | Same | Same | Same | Same | **NRI pool only** | **NRI pool only** | **NRI pool only** |

---

## 12. Subscription-Tier Session Routing

When a matched NRI patient books a session, the system checks their subscription tier to determine what they can book:

```javascript
const TIER_SESSION_ALLOWANCES = {
  saathi: {
    individual_per_month: 0,
    group_per_month: 2,
    couples_per_month: 0,
    psychiatrist_per_quarter: 0,
    family_screening_per_month: 1,
    gift_sessions_per_month: 0
  },
  bandham: {
    individual_per_month: 2,
    group_per_month: 2,
    couples_per_month: 0,
    psychiatrist_per_quarter: 0,
    family_screening_per_month: 1,
    gift_sessions_per_month: 1
  },
  kutumbam: {
    individual_per_month: 4,      // Usable by NRI or up to 3 family members in India
    group_per_month: -1,          // Unlimited
    couples_per_month: 1,
    psychiatrist_per_quarter: 1,
    family_screening_per_month: 3,
    gift_sessions_per_month: 3,   // Family members in India
    family_members_max: 3
  }
};
```

---

## 13. Zoho Flow Triggers (Notification Only — Per Boundary Rule)

| Event | Zoho Flow Action | Channel |
|-------|-----------------|---------|
| NRI trial started | Send welcome WhatsApp (WATI T-NRI-01) + email (ZeptoMail) | WATI + ZeptoMail |
| NRI assessment completed | Create Zoho Desk ticket for Subramanya (NRI match request) | Zoho Desk |
| NRI therapist matched | Send match confirmation WhatsApp (T-NRI-02) to patient | WATI |
| NRI group session reminder (24h) | Send reminder WhatsApp (T-NRI-03) with Jitsi link + alias | WATI |
| NRI subscription payment due | Send payment reminder WhatsApp (T-NRI-04) | WATI |
| NRI subscription payment failed | Create Zoho Desk ticket + send WhatsApp (T-NRI-05) | Zoho Desk + WATI |
| Therapist NRI certification completed | Update `nri_pool_certified = true` in **backend** (NOT Zoho Flow) | Backend only |

*Note: Per the Zoho Flow boundary rule, all database writes happen in the Node.js backend. Zoho Flow only sends notifications and creates tickets.*

---

## 14. Key Design Decisions

**Why region-lock NRI therapists into a separate pool?** NRI sessions pay 1.5-2x domestic rates. If NRI patients could match with the general pool, therapists would get domestic-rate bookings in NRI time slots, destroying the economic model. The pool also ensures quality — only therapists trained on diaspora issues serve NRI patients.

**Why skip the budget step for NRI?** NRI pricing is subscription-based ($49/$99/$179 per month), not per-session. Showing a "₹500-₹2,000" slider makes no sense when the patient already paid a monthly fee. The subscription tier determines session allowances, not a budget range.

**Why anonymous group attendance as default?** NRI community stigma is the #1 barrier. "What if someone from my association sees me?" Camera-off + alias removes this entirely. Therapist still sees full identity for clinical records.

**Why not auto-enroll all therapists in NRI pool?** Quality control. Not every therapist understands diaspora dynamics (immigration anxiety, bicultural identity, remote caregiving). The sensitization module + Subramanya approval ensures minimum competence. Also, odd-hour shifts require explicit opt-in — you can't force a therapist to work at 4 AM IST.

**Why compute timezone shift from region instead of letting user pick?** Users don't think in IST shifts. They think "I want a session at 7 PM my time." The system translates that into the correct IST shift transparently. The user only confirms their timezone region.

**Why PHQ-9/GAD-7 still required for group sessions?** Two reasons: (a) high-severity patients need to be flagged and offered individual session upsell instead of group, (b) severity data feeds the group session topic curation — a group for mild anxiety operates differently than one with severe depression participants.
