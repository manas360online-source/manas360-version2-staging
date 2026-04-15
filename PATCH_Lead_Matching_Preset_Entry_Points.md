# MANAS360 — Lead Matching Engine: Preset Entry Point Patch

**Patch ID:** PATCH-LM-001  
**Applies to:** Patient-Therapist Matching & Lead Generation System (Story v1.0)  
**Date:** April 2026  

---

## 1. Problem Statement

The current Lead Matching system has a single entry point — a 10-step, 5-7 minute assessment. When a user arrives from a Google Ads landing page that already signals strong intent (e.g., "psychiatrist near me," "couples therapy online," "find a therapist"), forcing them through the full assessment creates unnecessary friction and drop-off.

**What this patch adds:** Three new *preset entry points* that pre-fill the provider-type filter and skip redundant steps, while still routing into the exact same matching algorithm (`match_patient_to_therapists()`).

---

## 2. Architecture: How the Patch Connects

```
┌──────────────────────────────────────────────────────┐
│              GOOGLE ADS LANDING PAGES                │
│                                                      │
│  landing_seeking_help.html    → "Find a Therapist"   │
│  landing_premium_therapy.html → "See a Psychiatrist" │
│  landing_relationships.html   → "Couples Therapy"    │
└────────┬──────────────┬───────────────┬──────────────┘
         │              │               │
         ▼              ▼               ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
│ ENTRY POINT │ │ ENTRY POINT  │ │   ENTRY POINT    │
│  therapist  │ │ psychiatrist │ │ couples_therapy   │
│   _only     │ │    _only     │ │      _only        │
└──────┬──────┘ └──────┬───────┘ └────────┬──────────┘
       │               │                  │
       ▼               ▼                  ▼
┌──────────────────────────────────────────────────────┐
│           PRESET DEFAULTS INJECTED                   │
│                                                      │
│  • provider_type filter locked                       │
│  • therapy_modality pre-selected                     │
│  • relevant specialization categories pre-checked    │
│  • Steps 2, 6.2 auto-filled (hidden from user)      │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│         SHORTENED ASSESSMENT (3-4 min)               │
│                                                      │
│  Step 1: Welcome (shortened — context-aware)         │
│  Step 2: SKIPPED — primary concern pre-filled        │
│  Step 3: PHQ-9 (kept — clinical requirement)         │
│  Step 4: GAD-7 (kept — clinical requirement)         │
│  Step 5: Treatment history (kept — 3 questions)      │
│  Step 6: Language only (modality pre-filled)         │
│  Step 7: Demographics (kept)                         │
│  Step 8: Budget & Availability (kept)                │
│  Step 9: Contact info (kept)                         │
│  Step 10: Results (same engine)                      │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  SAME match_patient_to_therapists() FUNCTION         │
│  • Same 0-100 scoring                                │
│  • Same 6-factor algorithm                           │
│  • Additional filter: provider_type (hard filter)    │
│  • Same lead marketplace, same dashboards            │
└──────────────────────────────────────────────────────┘
```

---

## 3. Three Preset Entry Points — Defaults

### 3A. Therapist Only (`entry=therapist`)

**Trigger:** CTA buttons on `landing_seeking_help.html` → "Find a Therapist"

| Field | Default Value | Visible to User? |
|-------|--------------|-------------------|
| `provider_type` | `therapist` | No (locked) |
| `therapy_modality` | `individual` | No (pre-filled, editable in Step 6) |
| `primary_concerns` | Empty — user must select | Yes (Step 2 shown normally) |
| `specialization_filter` | Excludes psychiatry-only providers | Backend only |

**Assessment flow:** Full 10 steps shown, but Step 6 question 2 ("What therapy modality interests you?") defaults to "Individual therapy (1-on-1)" pre-selected. The matching engine applies a hard filter: `WHERE provider_type IN ('psychologist', 'counselor', 'clinical_psychologist')`.

**Why Step 2 is NOT skipped here:** A user clicking "Find a Therapist" hasn't told us *what for* yet. They need the concern-selection step.

---

### 3B. Psychiatrist Only (`entry=psychiatrist`)

**Trigger:** CTA buttons on `landing_premium_therapy.html` → "See a Psychiatrist"

| Field | Default Value | Visible to User? |
|-------|--------------|-------------------|
| `provider_type` | `psychiatrist` | No (locked) |
| `therapy_modality` | `individual` | No (locked) |
| `primary_concerns` | Empty — user must select | Yes |
| `seeking_medication` | `true` | No (injected) |
| `specialization_filter` | Psychiatrists only (MD Psychiatry / DPM) | Backend only |

**Assessment flow changes:**

- **Step 1 (Welcome):** Modified copy — *"Let's find the right psychiatrist for you. This assessment helps us match you with a licensed psychiatrist for medication review or diagnosis."*
- **Step 5 Q2 (medication question):** Moved earlier and made prominent since psychiatry patients are more likely to have existing medications.
- **Budget step:** Default range shifted to ₹1,000-₹3,000 (psychiatrist rates are higher).
- **Matching engine:** Hard filter `WHERE provider_type = 'psychiatrist' AND credentials LIKE '%MD Psych%' OR credentials LIKE '%DPM%'`.

---

### 3C. Couples Therapy Only (`entry=couples`)

**Trigger:** CTA buttons on `landing_relationships.html` → "Book Couples Session"

| Field | Default Value | Visible to User? |
|-------|--------------|-------------------|
| `provider_type` | `therapist` | No (locked) |
| `therapy_modality` | `couples` | No (locked) |
| `primary_concerns` | `['relationship_issues']` | No (pre-filled, but user can add more in Step 2) |
| `specialization_filter` | Must include "Relationship Counseling" | Backend only |
| `session_type` | `couples_session` | No (injected) |

**Assessment flow changes:**

- **Step 1 (Welcome):** Modified copy — *"Let's find the right couples therapist for you and your partner. This assessment takes 3 minutes."*
- **Step 2 (Primary Concern):** Pre-checks "Relationship issues" and shows a *couples-specific* concern list instead of the general list:
  - ☑ Relationship issues (pre-checked, locked)
  - ☐ Communication problems
  - ☐ Trust / infidelity
  - ☐ Intimacy challenges
  - ☐ Pre-marital counseling
  - ☐ Separation / divorce
  - ☐ Parenting disagreements
  - ☐ Family conflicts
  - ☐ Other: ___
- **Step 3-4 (PHQ-9 / GAD-7):** Still shown — one partner completes it. The other partner's screening happens during intake.
- **Step 7 (Demographics):** Adds partner's age/gender as optional fields.
- **Budget step:** Default range shifted to ₹1,500-₹3,000 (couples rates are higher). Label changed to "per couples session."
- **Matching engine:** Hard filter `WHERE 'Relationship Counseling' = ANY(specializations) AND couples_session_rate IS NOT NULL`.

---

## 4. API Patch — New Endpoint

The existing `POST /api/v1/assessment/submit` is unchanged. The patch adds a **wrapper endpoint** that injects defaults before calling the same function.

```javascript
// NEW ENDPOINT — Preset Assessment Entry
POST /api/v1/assessment/preset-submit

// Request Body
{
  "entry_type": "psychiatrist" | "therapist" | "couples",
  "patient_id": "uuid",
  "responses": {
    // Same structure as existing assessment responses
    // BUT: some fields arrive pre-filled from frontend
  },
  "source": {
    "landing_page": "landing_premium_therapy.html",
    "utm_campaign": "google_ads_psychiatrist",
    "utm_medium": "cpc"
  }
}
```

**Backend logic (Node.js patch):**

```javascript
// file: assessment.preset.service.js
// This is a PATCH — it wraps the existing matching engine

const PRESET_DEFAULTS = {
  therapist: {
    provider_type_filter: ['psychologist', 'counselor', 'clinical_psychologist'],
    therapy_modality: 'individual',
    welcome_copy: "Let's find the right therapist for you.",
    budget_default: { min: 500, max: 2000 },
    skip_steps: [],                    // No steps skipped
    prefill: {}                        // No concerns pre-filled
  },

  psychiatrist: {
    provider_type_filter: ['psychiatrist'],
    therapy_modality: 'individual',
    seeking_medication: true,
    welcome_copy: "Let's find the right psychiatrist for medication review or diagnosis.",
    budget_default: { min: 1000, max: 3000 },
    skip_steps: [],                    // No steps skipped
    prefill: {},
    credential_filter: ['MD Psychiatry', 'DPM']
  },

  couples: {
    provider_type_filter: ['psychologist', 'counselor', 'clinical_psychologist'],
    therapy_modality: 'couples',
    session_type: 'couples_session',
    welcome_copy: "Let's find the right couples therapist for you and your partner.",
    budget_default: { min: 1500, max: 3000 },
    skip_steps: [],
    prefill: {
      primary_concerns: ['relationship_issues']
    },
    specialization_required: ['Relationship Counseling'],
    concern_list_override: 'COUPLES_CONCERNS'  // Use couples-specific concern list
  }
};


async function presetAssessmentSubmit(entryType, patientId, responses, source) {
  const defaults = PRESET_DEFAULTS[entryType];
  if (!defaults) throw new Error(`Invalid entry_type: ${entryType}`);

  // 1. Merge defaults into responses (defaults don't override user input)
  const enrichedResponses = {
    ...responses,
    therapy_modality: responses.therapy_modality || defaults.therapy_modality,
    primary_concerns: [
      ...(defaults.prefill.primary_concerns || []),
      ...(responses.primary_concerns || [])
    ],
    budget_min: responses.budget_min || defaults.budget_default.min,
    budget_max: responses.budget_max || defaults.budget_default.max,
  };

  if (defaults.seeking_medication) {
    enrichedResponses.seeking_medication = true;
  }

  // 2. Save assessment via EXISTING function (no change to core)
  const assessment = await submitAssessment(patientId, enrichedResponses);

  // 3. Tag the assessment source for analytics
  await tagAssessmentSource(assessment.assessment_id, {
    entry_type: entryType,
    landing_page: source.landing_page,
    utm_campaign: source.utm_campaign,
    utm_medium: source.utm_medium
  });

  // 4. Call EXISTING matching engine with additional hard filter
  const matches = await matchPatientToTherapists(assessment, {
    provider_type_filter: defaults.provider_type_filter,
    specialization_required: defaults.specialization_required || [],
    credential_filter: defaults.credential_filter || [],
    session_type_filter: defaults.session_type || null
  });

  return {
    assessment_id: assessment.assessment_id,
    entry_type: entryType,
    matched_therapists: matches
  };
}
```

---

## 5. Matching Engine Patch — Hard Filter Addition

The existing `match_patient_to_therapists()` function receives an optional `filters` parameter. This is the only change to the core algorithm:

```python
# PATCH to existing matching function
# File: matching_algorithm.py
# Change: Add optional hard filters parameter

def match_patient_to_therapists(patient_assessment, filters=None):
    """
    Main matching function. (EXISTING — patched)
    filters: optional dict with hard pre-filters
      - provider_type_filter: list of allowed provider types
      - specialization_required: list of must-have specializations
      - credential_filter: list of required credentials
      - session_type_filter: 'individual' | 'couples' | None
    """
    all_therapists = get_active_therapists()

    # ──── NEW: Apply hard filters before scoring ────
    if filters:
        if filters.get('provider_type_filter'):
            all_therapists = [
                t for t in all_therapists
                if t['provider_type'] in filters['provider_type_filter']
            ]

        if filters.get('specialization_required'):
            all_therapists = [
                t for t in all_therapists
                if set(filters['specialization_required']).issubset(
                    set(t['specializations'])
                )
            ]

        if filters.get('credential_filter'):
            all_therapists = [
                t for t in all_therapists
                if any(
                    cred in t.get('credentials', '')
                    for cred in filters['credential_filter']
                )
            ]

        if filters.get('session_type_filter') == 'couples':
            all_therapists = [
                t for t in all_therapists
                if t.get('couples_session_rate') is not None
            ]
    # ──── END PATCH ────

    # ... rest of existing algorithm unchanged ...
    # (specialization_match, language_match, availability_match, etc.)
```

---

## 6. Database Patch — New Columns

```sql
-- PATCH: Add to existing assessments table
ALTER TABLE assessments
  ADD COLUMN entry_type VARCHAR(20) DEFAULT 'full',
  -- 'full' | 'therapist' | 'psychiatrist' | 'couples'
  ADD COLUMN therapy_modality VARCHAR(20) DEFAULT 'individual',
  -- 'individual' | 'couples' | 'family' | 'group'
  ADD COLUMN session_type VARCHAR(20) DEFAULT 'individual_session',
  -- 'individual_session' | 'couples_session'
  ADD COLUMN seeking_medication BOOLEAN DEFAULT FALSE;

-- PATCH: Add to existing therapists table (if not already present)
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS provider_type VARCHAR(30),
  -- 'psychiatrist' | 'psychologist' | 'counselor' | 'clinical_psychologist'
  ADD COLUMN IF NOT EXISTS couples_session_rate INT,
  ADD COLUMN IF NOT EXISTS credentials TEXT;

-- PATCH: Analytics tracking for entry points
CREATE TABLE IF NOT EXISTS assessment_sources (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(assessment_id),
  entry_type VARCHAR(20) NOT NULL,
  landing_page VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEX for fast filtering
CREATE INDEX idx_therapists_provider_type ON therapists(provider_type);
CREATE INDEX idx_assessments_entry_type ON assessments(entry_type);
CREATE INDEX idx_sources_entry_type ON assessment_sources(entry_type);
```

---

## 7. Frontend Patch — Landing Page CTA Wiring

Each landing page CTA button passes the `entry` parameter via URL:

```html
<!-- landing_seeking_help.html -->
<a href="/assessment?entry=therapist&utm_source=landing_seeking_help"
   class="cta-btn">Find a Therapist →</a>

<!-- landing_premium_therapy.html -->
<a href="/assessment?entry=psychiatrist&utm_source=landing_premium_therapy"
   class="cta-btn">See a Psychiatrist — ₹999 →</a>

<!-- landing_relationships.html -->
<a href="/assessment?entry=couples&utm_source=landing_relationships"
   class="cta-btn">Book Couples Session →</a>
```

The assessment frontend reads `?entry=` and:

1. Fetches preset defaults from `PRESET_DEFAULTS[entry]`
2. Renders the modified welcome copy
3. Pre-fills/hides relevant steps
4. On submit, calls `POST /api/v1/assessment/preset-submit` instead of the standard endpoint

**For the full/default assessment** (from V5 homepage), everything remains unchanged — `entry=full` or no parameter uses the existing 10-step flow and existing endpoint.

---

## 8. Entry Point Comparison Matrix

| Aspect | Full Assessment | Therapist Only | Psychiatrist Only | Couples Only |
|--------|----------------|----------------|-------------------|--------------|
| **URL param** | (none) | `?entry=therapist` | `?entry=psychiatrist` | `?entry=couples` |
| **Steps shown** | All 10 | All 10 | All 10 | All 10 (modified Step 2) |
| **Welcome copy** | Generic | Therapist-focused | Psychiatrist-focused | Couples-focused |
| **Step 2 concerns** | General list | General list | General list | Couples-specific list |
| **Modality pre-fill** | None | Individual | Individual | Couples |
| **Budget default** | ₹500-₹2,000 | ₹500-₹2,000 | ₹1,000-₹3,000 | ₹1,500-₹3,000 |
| **Provider filter** | All types | Non-psychiatrist | Psychiatrist only | Must have couples spec |
| **Medication flag** | User answers | User answers | `true` (injected) | User answers |
| **Matching engine** | Same | Same + type filter | Same + type + credential filter | Same + specialization filter |
| **Lead marketplace** | Same | Same | Same | Same |
| **Dashboards** | Same | Same | Same | Same |

---

## 9. Analytics Value

The `assessment_sources` table allows tracking:

- **Which entry point converts best** (therapist vs psychiatrist vs couples vs full)
- **Google Ads ROI per landing page** (which page drives highest-value leads)
- **Drop-off comparison** (does the shortened flow reduce abandonment?)
- **Lead quality by entry type** (do preset entries produce higher match scores?)

Query example:
```sql
SELECT
  s.entry_type,
  COUNT(DISTINCT a.assessment_id) AS assessments,
  COUNT(DISTINCT lp.purchase_id) AS leads_purchased,
  ROUND(AVG(l.match_score), 1) AS avg_match_score,
  ROUND(
    COUNT(DISTINCT CASE WHEN lp.session_completed THEN lp.purchase_id END)::decimal /
    NULLIF(COUNT(DISTINCT lp.purchase_id), 0) * 100, 1
  ) AS conversion_pct
FROM assessment_sources s
JOIN assessments a ON s.assessment_id = a.assessment_id
LEFT JOIN leads l ON a.assessment_id = l.assessment_id
LEFT JOIN lead_purchases lp ON l.lead_id = lp.lead_id
GROUP BY s.entry_type
ORDER BY conversion_pct DESC;
```

---

## 10. Key Design Decisions

**Why not skip the PHQ-9/GAD-7?** These are clinical instruments required for proper matching — severity scoring directly affects lead tier and pricing. Removing them would degrade match quality and create liability risk.

**Why not skip Step 2 for Psychiatrist entry?** Even though we know they want a psychiatrist, we still need to know *what for* (anxiety vs bipolar vs ADHD vs medication review). The concern selection feeds directly into specialization matching.

**Why show all 10 steps instead of a 3-step shortcut?** The full assessment produces higher match scores (more data points), which means higher lead prices and better conversion. The patch reduces *friction* (pre-fills, context-aware copy, smarter defaults) without reducing *data quality*.

**Why a wrapper endpoint instead of modifying the existing one?** Zero risk to the existing flow. The original `POST /api/v1/assessment/submit` is untouched. The patch is additive — it can be rolled back by simply removing the wrapper.
