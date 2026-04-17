# Complete End-to-End Flow: Google Search to Booking
## PATCH-LM-001 (Domestic Presets) vs PATCH-LM-002 (NRI Per-Session)

**Date:** April 16, 2026  
**Status:** Implementation Complete  
**Purpose:** Full user journey documentation from Google search through session booking

---

## 1. Flow Overview

### User Segments
- **Domestic Users:** Search for "find therapist," "psychiatrist," "couples counseling" → Land on preset entry pages
- **NRI Users:** Search for "Indian therapist in US," "expat therapy," "NRI psychiatrist" → Land on NRI landing page

### Entry Points
```
GOOGLE SEARCH
    ├─ Domestic Intent
    │   ├─ Therapist ("find therapist online")
    │   │   └─ landing_seeking_help.html?entry=therapist
    │   ├─ Psychiatrist ("see psychiatrist")
    │   │   └─ landing_premium_therapy.html?entry=psychiatrist
    │   └─ Couples ("couples therapy")
    │       └─ landing_relationships.html?entry=couples
    │
    └─ NRI Intent
        └─ NRI Landing ("Indian therapist US/UK/AU")
            └─ landing_nri_teletherapy_v2.html?session_type=nri_psychologist|nri_psychiatrist|nri_therapist
```

---

## 2. DOMESTIC FLOW: PATCH-LM-001 (Therapist/Psychiatrist/Couples Entry)

### Complete User Journey: Google Search → Booking

#### Stage 1: Google Search & Landing

| User Action | System Response | Data Captured |
|-------------|-----------------|---------------|
| Searches: "find therapist online India" OR "psychiatrist appointment" OR "couples counseling near me" | Google Ads serves landing page | `utm_source=google_ads` `utm_campaign=therapist\|psychiatrist\|couples` `utm_medium=cpc` |
| Lands on page with CTA buttons | Three preset entry options displayed: ✓ Find a Therapist ✓ See a Psychiatrist ✓ Couples Therapy | `landing_page_url` |
| Clicks one CTA (e.g., "Find a Therapist") | Navigates to assessment with preset defaults | `entry_type=therapist` |

#### Stage 2: Preset Assessment Configuration

**For Therapist Entry:**
```
URL: /assessment?entry=therapist
Defaults Injected:
├─ provider_type_filter: [psychologist, counselor, clinical_psychologist]
├─ therapy_modality: individual
├─ budget_default: ₹500-₹2,000
├─ skip_steps: [] (all 10 shown)
├─ welcome_copy: "Let's find the right therapist for you."
└─ specialization_filter: Exclude psychiatry-only providers
```

**For Psychiatrist Entry:**
```
URL: /assessment?entry=psychiatrist
Defaults Injected:
├─ provider_type_filter: [psychiatrist]
├─ therapy_modality: individual
├─ seeking_medication: true
├─ budget_default: ₹1,000-₹3,000
├─ credential_filter: [MD Psychiatry, DPM]
└─ welcome_copy: "Let's find the right psychiatrist for medication review or diagnosis."
```

**For Couples Entry:**
```
URL: /assessment?entry=couples
Defaults Injected:
├─ provider_type_filter: [psychologist, counselor, clinical_psychologist]
├─ therapy_modality: couples
├─ budget_default: ₹1,500-₹3,000
├─ specialization_required: [Relationship Counseling]
├─ concern_list: COUPLES_SPECIFIC
│   ├─ Relationship issues (pre-checked)
│   ├─ Communication problems
│   ├─ Trust / infidelity
│   ├─ Intimacy challenges
│   └─ ... (7 more couple-specific concerns)
└─ welcome_copy: "Let's find the right couples therapist for you and your partner."
```

#### Stage 3: Assessment Completion

User completes 10 steps:

1. **Welcome** (customized per entry type)
2. **Primary Concerns** (select 2-3 from relevant list)
3. **PHQ-9** (9 clinical questions, depression screening)
4. **GAD-7** (7 clinical questions, anxiety screening)
5. **Treatment History** (past therapy? medications? hospitalization?)
6. **Language & Modality** (modality pre-filled, language selected)
7. **Demographics** (age, gender, relationship status)
8. **Budget & Availability** (pre-filled based on entry type)
9. **Contact Info** (phone, email)
10. **Review & Submit**

**Data Sent to Backend:**
```json
{
  "entry_type": "therapist",
  "patient_id": "uuid",
  "responses": {
    "primary_concerns": ["anxiety", "work_stress"],
    "phq_score": 12,
    "gad_score": 8,
    "treatment_history": "No prior therapy",
    "language_preference": "English",
    "therapy_modality": "individual",
    "demographics": {"age": 32, "gender": "M", "relationship_status": "single"},
    "budget_min": 500,
    "budget_max": 2000,
    "available_days": [1, 3, 5],  // Mon, Wed, Fri
    "available_times": [{"start": 1800, "end": 2100}],  // 6-9 PM
    "contact_phone": "+919876543210",
    "contact_email": "user@example.com"
  },
  "source": {
    "landing_page": "landing_seeking_help.html",
    "utm_campaign": "google_ads_therapist",
    "utm_medium": "cpc"
  }
}
```

#### Stage 4: Backend Processing

**Endpoint:** `POST /api/v1/assessments/preset-submit`

```javascript
// Backend logic
const assessment = await submitPresetAssessment(patientId, responses);
// ├─ Stores to patient_assessments table
// ├─ Calculates PHQ-9 score (severity: 0-27)
// ├─ Calculates GAD-7 score (severity: 0-21)
// ├─ Tags entry_type
// ├─ Stores sourceMetadata (utm_campaign, landing_page)
// └─ Returns assessment_id

const matches = await matchPatientToTherapists(assessment, {
  provider_type_filter: ['psychologist', 'counselor'],
  specialization_required: [],
  credential_filter: []
});
// ├─ Hard filter: provider_type must be in allowed list
// ├─ Hard filter: therapy_modality must match
// ├─ Scores each matching provider (0-100 points):
// │   ├─ Specialization match: 0-20 pts
// │   ├─ Language match: 0-20 pts
// │   ├─ Rating (avg ⭐): 0-15 pts
// │   ├─ Years experience: 0-10 pts
// │   ├─ Availability (next 48h): 0-10 pts
// │   └─ Location proximity: 0-15 pts
// └─ Returns sorted list (score DESC)
```

#### Stage 5: Results Display

User sees **top 5-10 matched providers** with:

```
Provider Card:
├─ Name & Avatar
├─ Credentials (M.A. Counseling, B.A. Psychology)
├─ Specializations (Anxiety, Work Stress, Relationships)
├─ Rating: ⭐ 4.8 (234 reviews)
├─ Languages: English, Hindi, Marathi
├─ Available Slots:
│   ├─ Today 6:00 PM
│   ├─ Tomorrow 7:00 PM
│   └─ Thu 5:30 PM
├─ Session Fee: ₹{dynamic per provider}
└─ [BOOK] button
```

**Matching Score:** 45-100 points  
**Display:** Score optional (admin feature toggle)

#### Stage 6: Provider Selection

User clicks "BOOK" on 1-3 providers → Calendar widget opens

```
Calendar Widget:
├─ Shows provider's available slots
├─ Time in IST (Indian Standard Time)
├─ Duration (45 min or 60 min)
├─ Session type: Video (Jitsi)
├─ User selects one slot
└─ Proceeds to payment
```

**Data Captured:**
```
selected_provider_ids: ["th_001", "th_005", "th_012"]
selected_slot_datetime: "2026-04-18T18:00:00+05:30"  // IST
```

#### Stage 7: Payment Confirmation

**Payment Screen Shows:**
```
╔════════════════════════════╗
║   BOOKING SUMMARY          ║
╠════════════════════════════╣
║ Therapist: Dr. Priya M.    ║
║ Specialization: Anxiety    ║
║ Date & Time: Thu 6:00 PM   ║
║ Duration: 50 minutes       ║
║ Session Type: Video (Jitsi)║
║                            ║
║ Fee: ₹1,299                ║
║ (varies per provider)       ║
╠════════════════════════════╣
║ [PAY VIA PHONPE]           ║
╚════════════════════════════╝
```

**Backend Process:**
```
POST /api/v1/patient/appointments/smart-match
├─ Input: selected_provider_ids, slot_datetime, assessment_id
├─ Calculate amountMinor = max(provider_consultation_fees)
├─ Create appointment_requests record (status: PAYMENT_PENDING)
├─ Initiate PhonePe payment via initiatePhonePePayment()
│   ├─ transactionId: "SMREQ_1744512000000_ABC123"
│   ├─ amountInPaise: 129900 (₹1,299)
│   ├─ callbackUrl: "https://api.manas360.com/v1/payments/phonepe/webhook"
│   └─ redirectUrl: "https://manas360.com/#/payment/status?transactionId=SMREQ_xxx"
└─ Return PhonePe redirect URL to frontend
```

#### Stage 8: PhonePe Payment

1. Frontend redirects to PhonePe
2. User completes UPI payment (Google Pay, PhonePe, Paytm, etc.)
3. PhonePe sends webhook to backend
4. Backend verifies payment status via PhonePe API

#### Stage 9: Post-Payment Success

**Webhook Received:**
```javascript
POST /api/v1/payments/phonepe/webhook
├─ Verify transaction status
├─ If SUCCESS:
│   ├─ Update appointment_requests.status = COMPLETED
│   ├─ Create therapy_sessions record
│   ├─ Generate Jitsi room URL
│   ├─ Send WATI SMS confirmation
│   ├─ Send email with receipt
│   └─ Schedule reminders (24h, 1h before)
└─ If FAILED:
    ├─ Mark as PAYMENT_FAILED
    └─ Return to payment screen
```

#### Stage 10: Confirmation & Reminders

**SMS Sent (WATI):**
```
"Hi Rahul, Your therapy session booked! 
Dr. Priya M., Thu 6:00 PM IST. 
Link: jitsi.manas360.com/sess_xxx"
```

**Email Sent:**
```
Subject: Therapy Session Confirmed ✅

Dr. Priya M.
Thu, Apr 18, 2026 | 6:00 PM - 6:50 PM IST
50 minutes | Video Session

Click to join: [Jitsi Link]

Receipt: ₹1,299 (via PhonePe)
```

**Calendar:**
- Event added to patient's calendar (IST time)
- Reminder notifications scheduled

---

## 3. NRI FLOW: PATCH-LM-002 (Psychologist/Psychiatrist/Therapist Per-Session)

**Important:** NRI therapists are **LOCATED IN INDIA** (IST timezone). They work **dedicated shifts** to serve patients in different timezones (US_EST, US_PST, UK, AU, SG, UAE). When an NRI patient books, they're connecting with an Indian provider during that provider's shift window.

### Complete User Journey: Google Search → Booking

#### Stage 1: Google Search & Landing

| User Action | System Response | Data Captured |
|-------------|-----------------|---------------|
| Searches from US/UK/AU/SG/UAE: "Indian therapist" OR "Indian psychiatrist" OR "Indian counselor online" (from abroad) | Google Ads serves NRI landing page | `utm_source=google_ads` `utm_campaign=nri_teletherapy` `utm_medium=cpc` |
| Lands on landing_nri_teletherapy_v2.html | Sees 3 session type cards with fixed prices | `landing_page=nri_teletherapy_v2` |
| Sees Cards: 📍 Indian Psychologist ₹2,999/session 🏥 Indian Psychiatrist ₹3,499/session 👨‍⚕️ Indian Therapist ₹3,599/session | Description: "50-min video session with Indian provider, book during available shifts" | `session_type` visible |
| Clicks "Indian Psychologist ₹2,999" card | Navigates to NRI preset assessment | `entry_type=nri_psychologist` |

#### Stage 2: NRI Preset Configuration

**URL:** `/nri/book?entry=nri_psychologist`

**Defaults Injected:**
```
Provider Type: psychologist (LOCKED - cannot change)
Session Fee: ₹2,999 (LOCKED - displayed, cannot negotiate)
Duration: 50 minutes
Session Format: Video (Jitsi)
Budget Step: SKIPPED (fee is fixed)
Timezone Widget: SHOWN (new for NRI)
Concerns List: NRI-SPECIFIC (new for NRI)
Language Selector: REQUIRED (new for NRI)
```

**NRI Assessment Structure (Simplified from 10 steps):**
```
Step 1: Welcome
├─ Copy: "Let's find the perfect NRI therapist for you"
└─ Emphasis: "Timezone-aware scheduling, ₹2,999 fixed price"

Step 2: Timezone Selection (NEW)
├─ Question: "Which timezone are you in?" (Where is the patient located?)
├─ Browser Auto-Detect: Intl.DateTimeFormat().resolvedOptions().timeZone
│   └─ Maps to NRI shift (e.g., America/New_York → US_EST)
├─ Manual Options (Patient's current location):
│   ├─ ☐ US_EST (Eastern Time) → Indian therapists work 9:30 PM - 6:30 AM IST
│   ├─ ☐ US_PST (Pacific Time) → Indian therapists work 12:30 AM - 9:30 AM IST
│   ├─ ☐ UK (GMT/BST) → Indian therapists work 11:30 PM - 2:30 AM IST
│   ├─ ☐ AU (AEST/AEDT) → Indian therapists work 12:30 PM - 3:30 PM IST
│   ├─ ☐ SG (SGT) → Indian therapists work 4:30 PM - 7:30 PM IST
│   ├─ ☐ UAE (GST) → Indian therapists work 8:30 PM - 11:30 PM IST
│   └─ ☐ OTHER (Fallback to US_EST)
└─ User confirms their current timezone (where they are NOW)

Step 3: Primary Concerns (NRI LIST - NEW)
├─ Question: "What are your main concerns? (Select up to 3)"
├─ NRI-Specific Options:
│   ├─ ☐ Career pressure / workplace stress (in foreign country)
│   ├─ ☐ Family guilt / parents in India
│   ├─ ☐ Identity crisis / cultural disconnect
│   ├─ ☐ Loneliness / isolation
│   ├─ ☐ Relationship issues (cross-cultural / long-distance)
│   ├─ ☐ Visa / immigration anxiety
│   ├─ ☐ Children's bicultural upbringing
│   ├─ ☐ Aging parents back in India
│   ├─ ☐ Returning to India dilemma
│   ├─ ☐ Discrimination / racism experiences
│   └─ ☐ Other (free text)
└─ User selects 2-3 (if not logged in, saves to localStorage)

Step 4: Language Preference (NEW - REQUIRED)
├─ Question: "What's your preferred language?"
├─ Options:
│   ├─ Hindi
│   ├─ English
│   ├─ Tamil
│   ├─ Telugu
│   ├─ Kannada
│   └─ Malayalam
└─ Used to filter therapists (hard filter in matching)

Step 5: PHQ-9
├─ 9 clinical depression screening questions
└─ Calculates PHQ score (0-27)

Step 6: GAD-7
├─ 7 clinical anxiety screening questions
└─ Calculates GAD score (0-21)

Step 7: Contact Info
├─ Phone (required, +91 or +1)
└─ Email (optional, for invoice)
```

**Data Sent to Backend:**
```json
{
  "entry_type": "nri_psychologist",
  "patient_id": "uuid-or-null",  // Can be unauthenticated
  "responses": {
    "timezone_region": "US_EST",
    "primary_concerns": ["career_pressure", "family_guilt"],
    "language_preference": "hindi",
    "phq_score": 14,
    "gad_score": 10,
    "contact_phone": "+14155552671",
    "contact_email": "rahul@gmail.com"
  },
  "source": {
    "landing_page": "landing_nri_teletherapy_v2.html",
    "utm_campaign": "google_ads_nri",
    "utm_medium": "cpc"
  }
}
```

#### Stage 3: NRI Matching Engine

**Endpoint:** `POST /api/v1/assessments/preset-submit` (with `entry_type=nri_psychologist`)

**Key Concept:** All NRI therapists are located in India (IST timezone). They have opted into specific **shift windows** to serve patients in different timezones. The matching algorithm finds therapists whose shift aligns with the patient's timezone.

**Example:**
```
Dr. Anjali Sharma (Located in Mumbai, India)
├─ Works Shift A (US_EST): 9:30 PM - 6:30 AM IST every day
│  └─ This is 9:30 AM - 6:30 PM EST (patient's perspective)
├─ Works Shift B (US_PST): 12:30 AM - 9:30 AM IST every day
│  └─ This is 9:30 PM - 6:30 AM PST (patient's perspective)
└─ Languages: Hindi, English, Tamil

When patient in US_EST searches:
├─ System looks for: nri_pool_certified + psychologist + shift_a_us_east + hindi
└─ Dr. Anjali matches! She works that exact shift for US_EST patients
```

**Hard Filters Applied (ALL must match):**

```javascript
STRICT FILTER 1: NRI Pool Certified
  therapist.nri_pool_certified = true
  └─ Only Indian therapists who opted into NRI pool

STRICT FILTER 2: Provider Type Exact Match
  therapist.provider_type = 'psychologist'  // Matches entry_type
  └─ For nri_psychiatrist: provider_type = 'psychiatrist'
  └─ For nri_therapist: provider_type = 'therapist'

STRICT FILTER 3: Shift Match (Therapist MUST work this timezone's shift)
  therapist.nri_timezone_shifts CONTAINS TIMEZONE_TO_SHIFT[patient_timezone]
  └─ Patient timezone: US_EST
  └─ Maps to shift: 'shift_a_us_east'
  └─ Therapist.nri_timezone_shifts must include 'shift_a_us_east'
  └─ This means therapist works 9:30 PM - 6:30 AM IST (for US_EST availability)
  └─ If no match: RETURN 0 (exclude completely - therapist not available in patient's timezone)

STRICT FILTER 4: Language Match
  therapist.languages CONTAINS patient.language_preference
  └─ Patient language: 'hindi'
  └─ Therapist.languages must include 'hindi'
  └─ If no match: RETURN 0 (exclude completely)
```

**Scoring Algorithm (NRI-Specific, max 80 points):**

```
For each therapist passing all 4 hard filters:

Score = 0

1. Shift Availability: +15 points
   └─ Therapist has this exact shift in their schedule
   └─ Means patient can reliably book during this shift window

2. NRI Pool Bonus: +10 points
   └─ Therapist is certified and trained for NRI patients

3. Specialization Match: +20 points
   └─ Patient concerns map to therapist specializations
   └─ Career stress → Business/Work therapist
   └─ Family issues → Family Systems specialist
   └─ Cultural identity → Multicultural/Cross-cultural specialist

4. Rating: +15 points
   └─ Based on average rating (⭐ 4.5-5.0 = max 15 pts)

5. Years of Experience: +10 points
   └─ 5+ years = 10 pts, 3-5 years = 8 pts, 1-3 years = 5 pts

6. Availability in next 24-48 hours (during their shift): +10 points
   └─ Has open slots in their shift window within 24-48h

7. Location Scoring: 0 points
   └─ All therapists are in India, location irrelevant
   └─ Shift is what matters, not physical location

Total Score: 0-80 points (max)
```

**Example Matching Output:**
```
Patient: Rahul (located in New York, US_EST timezone)
Patient Language: Hindi
Patient Concerns: Career pressure, Family guilt

FILTERED CANDIDATES (Indian therapists with shift_a_us_east, nri_pool_certified, psychologist, hindi):

Dr. Anjali P. (Mumbai, India)
├─ nri_pool_certified: ✅ true
├─ provider_type: ✅ psychologist
├─ nri_timezone_shifts: ✅ [shift_a_us_east, shift_b_us_west] (works both US shifts)
├─ languages: ✅ [hindi, english, tamil]
└─ PASS ALL FILTERS ✅

Dr. Ramesh J. (Delhi, India) - FILTERED OUT
└─ languages: ❌ [english, telugu] - NO HINDI SPEAKER

Dr. Suresh K. (Bangalore, India) - FILTERED OUT
└─ nri_timezone_shifts: ❌ [shift_e_uae] - ONLY WORKS UAE SHIFT, NOT US_EST

SCORING (candidates passing all filters):

Dr. Anjali P. (Only available 9:30 PM - 6:30 AM IST / 9:30 AM - 6:30 PM EST):
├─ Shift availability: +15
├─ NRI pool bonus: +10
├─ Specialization (career + family): +20
├─ Rating (⭐4.9): +15
├─ Experience (8 years): +10
├─ Availability (has slots today 5:00 PM EST = 3:30 AM IST IST, within shift): +8
└─ TOTAL: 78 pts ✅

Dr. Priya M. (Only available 9:30 PM - 6:30 AM IST):
├─ Shift availability: +15
├─ NRI pool bonus: +10
├─ Specialization (anxiety focus): +18
├─ Rating (⭐4.7): +14
├─ Experience (5 years): +10
├─ Availability (slots tomorrow 4:30 PM EST = 2:00 AM IST, within shift): +5
└─ TOTAL: 72 pts ✅
```

#### Stage 4: Results Display

User sees **top 3-5 Indian therapists** matched for their timezone:

```
╔═══════════════════════════════════════════╗
║     INDIAN THERAPIST MATCHES              ║
║   Your Location: US_EST (New York)        ║
║   Available Shifts: 9:30 AM - 6:30 PM EST║
╚═══════════════════════════════════════════╝

[1] Dr. Anjali P. ⭐ 4.9 (156 reviews)
├─ Location: Mumbai, India
├─ Specialization: Career Counseling, Family Issues
├─ Languages: Hindi, English, Tamil ✅ (Speaks Your Language)
├─ Works US_EST Shift: 9:30 PM - 6:30 AM IST daily
│  └─ (Your timezone: 9:30 AM - 6:30 PM EST)
├─ Available Sessions Today (EST timezone):
│   ├─ 12:00 PM EST (2:00 AM IST tomorrow)
│   ├─ 5:00 PM EST (3:30 AM IST tomorrow)
│   └─ 6:00 PM EST (4:30 AM IST tomorrow)
├─ Match Score: 78/80
└─ [SELECT] button

[2] Dr. Priya M. ⭐ 4.7 (203 reviews)
├─ Location: Delhi, India
├─ Specialization: Anxiety, Relationships
├─ Languages: Hindi, English, Kannada ✅ (Speaks Your Language)
├─ Works US_EST Shift: 9:30 PM - 6:30 AM IST daily
│  └─ (Your timezone: 9:30 AM - 6:30 PM EST)
├─ Available Sessions Tomorrow (EST timezone):
│   ├─ 4:30 PM EST (2:00 AM IST day after)
│   └─ 5:30 PM EST (3:00 AM IST day after)
├─ Match Score: 72/80
└─ [SELECT] button

[3] Dr. Vikram S. ⭐ 4.5 (98 reviews)
├─ Location: Bangalore, India
├─ Specialization: Cultural Identity, Immigration
├─ Languages: English, Hindi, Telugu ✅ (Speaks Your Language)
├─ Works US_EST Shift: 9:30 PM - 6:30 AM IST daily
│  └─ (Your timezone: 9:30 AM - 6:30 PM EST)
├─ Available Sessions in 2 Days (EST timezone):
│   ├─ 3:00 PM EST (12:30 AM IST)
│   └─ 4:30 PM EST (2:00 AM IST)
├─ Match Score: 64/80
└─ [SELECT] button
```

**All therapists:**
- ✅ Located in India (IST timezone)
- ✅ Work dedicated shift for US_EST patients
- ✅ Speak your preferred language
- ✅ All times shown in YOUR timezone (EST) with IST conversion
- ✅ Can ONLY book during their shift hours (9:30 AM - 6:30 PM EST)

#### Stage 5: Provider Selection

User clicks "SELECT" on up to 3 therapists and confirms:

```
Selected Therapists:
1. Dr. Anjali P. - Today 5:00 PM EST
2. Dr. Priya M. - Tomorrow 4:30 PM EST

[PROCEED TO PAYMENT]
```

#### Stage 6: Payment Screen (NRI-Specific)

**Payment Display:**
```
╔════════════════════════════════════════╗
║      🔒 NRI BOOKING SUMMARY            ║
╠════════════════════════════════════════╣
║ Session Type: NRI Psychologist         ║
║ Therapist: Dr. Anjali P.               ║
║ Duration: 50 minutes                   ║
║ Your Timezone: US_EST                  ║
║ Session Time: Today 5:00 PM EST        ║
║ (Therapist's time: Tomorrow 3:30 AM)   ║
║                                        ║
║ ┌─────────────────────────────────┐   ║
║ │ 💰 FIXED PRICE: ₹2,999          │   ║
║ │ (Per-session, not subscription)  │   ║
║ └─────────────────────────────────┘   ║
║                                        ║
║ 📌 NRI Terms:                          ║
║ Fixed per-session price is applied     ║
║ for this consultation flow.            ║
║ No monthly subscriptions required.     ║
║                                        ║
╠════════════════════════════════════════╣
║    [PROCEED TO PAYMENT VIA PHONPE]    ║
╚════════════════════════════════════════╝
```
**Payment Display:**
```
╔════════════════════════════════════════╗
║      🔒 INDIAN THERAPY BOOKING         ║
╠════════════════════════════════════════╣
║ Session Type: Indian Psychologist      ║
║ Therapist: Dr. Anjali P. (India)       ║
║ Location: Mumbai, India                ║
║ Duration: 50 minutes (Video via Jitsi) ║
║                                        ║
║ YOUR TIMEZONE: US_EST (New York)       ║
║ Your Session Time: Today 5:00 PM EST   ║
║ Therapist's Time: Tomorrow 3:30 AM IST ║
║                                        ║
║ ┌─────────────────────────────────┐   ║
║ │ 💰 FIXED PRICE: ₹2,999          │   ║
║ │ (Per-session, not subscription)  │   ║
║ └─────────────────────────────────┘   ║
║                                        ║
║ 📌 Indian Therapist Terms:             ║
║ • Therapist located in India (IST)     ║
║ • Session at your timezone (EST)       ║
║ • Fixed per-session price             ║
║ • No monthly subscriptions required    ║
║                                        ║
╠════════════════════════════════════════╣
║    [PROCEED TO PAYMENT VIA PHONPE]    ║
╚════════════════════════════════════════╝
```

**Backend Process:**

```javascript
POST /api/v1/patient/appointments/smart-match
├─ Input: 
│   ├─ patient_id (or guest)
│   ├─ selected_provider_ids: ["th_001", "th_005"]
│   ├─ selected_slots: [{provider_id, slot_datetime}]
│   ├─ preset_entry_type: "nri_psychologist"
│   ├─ timezone_region: "US_EST"
│   └─ source_funnel: "nri_psychologist"
│
├─ Calculate Payment Amount:
│   ├─ Call resolveSessionQuoteMinor('psychologist', 'nri_psychologist')
│   ├─ getPricingConfig() from admin → session_pricing table
│   ├─ Lookup: WHERE provider_type = 'nri_psychologist'
│   ├─ Return: 2999 * 100 = 299900 paise (₹2,999)
│   └─ amountMinor = 299900 (FIXED, no negotiation)
│
├─ Create Appointment Request:
│   ├─ appointment_requests.status = PAYMENT_PENDING
│   ├─ appointment_requests.source_funnel = 'nri_psychologist'
│   ├─ appointment_requests.preset_entry_type = 'nri_psychologist'
│   ├─ appointment_requests.timezone_region = 'US_EST'
│   └─ appointment_requests.amount_minor = 299900
│
├─ Initiate PhonePe Payment:
│   ├─ transactionId: SMREQ_{timestamp}_{random}
│   ├─ amountInPaise: 299900
│   ├─ callbackUrl: PhonePe webhook endpoint
│   └─ redirectUrl: payment/status?transactionId=...
│
└─ Return PhonePe redirect to frontend
```

#### Stage 7: PhonePe Payment

1. Frontend redirects to PhonePe
2. User completes UPI payment
3. PhonePe sends webhook
4. Backend verifies payment

#### Stage 8: Post-Payment Success

**Webhook Processing:**

```javascript
POST /api/v1/payments/phonepe/webhook
├─ Verify payment status via PhonePe API
├─ If SUCCESS:
│   ├─ Update appointment_requests.status = COMPLETED
│   ├─ Fetch appointment details
│   ├─ Create therapy_sessions record:
│   │   ├─ therapy_sessions.provider_id = selected_provider_id
│   │   ├─ therapy_sessions.patient_id = patient_id
│   │   ├─ therapy_sessions.scheduled_at = slot_datetime (EST)
│   │   ├─ therapy_sessions.source_funnel = 'nri_psychologist'
│   │   ├─ therapy_sessions.timezone_region = 'US_EST'
│   │   └─ therapy_sessions.amount_minor = 299900
│   │
│   ├─ Generate Jitsi Room:
│   │   ├─ jitsi_room_url = generateJitsiRoom(session_id)
│   │   └─ Store in therapy_sessions.jitsi_url
│   │
│   ├─ Send WATI SMS (in patient's language - HINDI):
│   │   ├─ To: +14155552671
│   │   ├─ Message: "नमस्ते Rahul! आपकी थेरेपी सेशन बुक हुई।
│   │   │   डॉ. अंजली P., आज 5:00 PM EST (भारतीय समय 3:30 AM कल)
│   │   │   Jitsi: jitsi.manas360.com/sess_xxx"
│   │   └─ Via WATI API
│   │
│   ├─ Send Email:
│   │   ├─ To: rahul@gmail.com
│   │   ├─ Subject: "Your NRI Therapy Session Confirmed ✅"
│   │   ├─ Body:
│   │   │   Dr. Anjali P. (NRI Psychologist)
│   │   │   Today, 5:00 PM EST | 50 minutes
│   │   │   Join: [Jitsi Link]
│   │   │   Receipt: ₹2,999 (Fixed NRI Rate)
│   │   └─ Include PDF receipt
│   │
│   ├─ Schedule Reminders:
│   │   ├─ 24-hour reminder: Tomorrow 5:00 PM EST
│   │   ├─ 1-hour reminder: Today 4:00 PM EST
│   │   └─ Both in patient's timezone
│   │
│   └─ Update Analytics:
│       ├─ source_funnel = 'nri_psychologist'
│       ├─ timezone_region = 'US_EST'
│       ├─ preset_entry_type = 'nri_psychologist'
│       └─ For NRI tracking dashboard
│
└─ If FAILED:
    ├─ Mark appointment_requests.status = PAYMENT_FAILED
    └─ Return to payment screen with error
```

#### Stage 9: Confirmation

**SMS Received (in HINDI):**
```
नमस्ते Rahul! 
आपकी थेरेपी सेशन बुक हुई ✅

🏥 डॉ. अंजली P. (NRI साइकोलॉजिस्ट)
📅 आज, 5:00 PM EST
🕐 भारतीय समय: कल सुबह 3:30 AM
⏱️ 50 मिनट, वीडियो सेशन

💰 Price: ₹2,999 (Fixed)

🔗 Jitsi Link: jitsi.manas360.com/sess_xxx

24 घंटे में reminder भेजेंगे।
```

**SMS Received (in HINDI):**
```
नमस्ते Rahul! 
आपकी थेरेपी सेशन भारतीय थेरेपिस्ट के साथ बुक हुई ✅

👩‍⚕️ डॉ. अंजली P. (मुंबई, भारत)
📍 स्थान: भारत (IST timezone)
📅 आपका समय: आज, 5:00 PM EST
🕐 थेरेपिस्ट का समय: कल सुबह 3:30 AM IST
⏱️ 50 मिनट, वीडियो सेशन

💰 Price: ₹2,999 (Fixed, no subscription)

🔗 Jitsi Link: jitsi.manas360.com/sess_xxx

24 घंटे में reminder भेजेंगे।
```
**Email Received:**
```
Subject: Your NRI Therapy Session Confirmed ✅

Dear Rahul,

Your therapy session has been confirmed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 NRI PSYCHOLOGIST SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Therapist: Dr. Anjali P.
Specialization: Career Counseling, Family Therapy
Rating: ⭐ 4.9 (156 reviews)

Date & Time: Today, April 18, 2026
Session Start: 5:00 PM EST (Your Timezone)
Your Therapist's Time: Tomorrow, 3:30 AM IST
Duration: 50 minutes

Session Type: Video (Jitsi)
Language: Hindi / English

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 PAYMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Amount Paid: ₹2,999 (NRI Fixed Rate)
Payment Gateway: PhonePe
Transaction ID: TXN_2026041816230001
Status: ✅ SUCCESS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 JOIN YOUR SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Click to Join Jitsi Session]
Manual Link: jitsi.manas360.com/sess_abc123

Or copy room ID: sess_abc123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 REMINDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

24-hour reminder: Tomorrow 5:00 PM EST
1-hour reminder: Today 4:00 PM EST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Contact support@manas360.com
```

#### Stage 10: Session Day

**Timeline (User's EST Timezone):**
```
Today
├─ 5:00 PM EST: Payment Success Email
├─ 5:15 PM EST: SMS Confirmation (Hindi)
│
Tomorrow
├─ 4:00 PM EST (24 hrs before): Reminder Notification
│   "Your session with Dr. Anjali starts in 24 hours at 5:00 PM EST"
│
└─ 4:00 PM EST (1 hr before): Urgent Reminder
    "Your therapy session starts in 1 hour! Click to join: [Link]"

Today 5:00 PM EST (Session Time)
├─ Patient clicks Jitsi link
├─ Waits for Dr. Anjali to join
├─ Jitsi room opens
│   ├─ Video ON
│   ├─ Audio ON
│   ├─ Screen share available
│   ├─ Chat available
│   └─ Recording: Consent-based (if enabled)
│
├─ 5:00-5:50 PM EST: Therapy session
│   └─ 50 minutes of 1-on-1 counseling
│
└─ 5:50 PM EST: Session ends
    ├─ Jitsi room closed
    ├─ Session marked COMPLETED
    └─ Analytics logged (source_funnel = nri_psychologist)
```

**Session Completed Analytics:**
```
therapy_sessions record updated:
├─ status: COMPLETED
├─ session_duration_actual: 50 minutes
├─ jitsi_recording_url: (if enabled)
├─ patient_feedback: (pending)
├─ source_funnel: 'nri_psychologist'
├─ timezone_region: 'US_EST'
├─ amount_charged: 299900 paise (₹2,999)
└─ created_at: 2026-04-18 03:30:00 IST
   (Dr. Anjali's perspective)
```

---

## 4. Key Differences: Domestic vs NRI

| **Aspect** | **Domestic (PATCH-LM-001)** | **NRI (PATCH-LM-002)** |
|-----------|---------------------------|----------------------|
| **Entry Points** | 3 (therapist, psychiatrist, couples) | 3 (nri_psychologist, nri_psychiatrist, nri_therapist) |
| **Fee Model** | Variable per provider | **Fixed per entry type** |
| **Fee Range** | ₹500-₹3,000 | **₹2,999 / ₹3,499 / ₹3,599** |
| **Budget Step** | Required (user selects range) | **Skipped** (fee locked at booking) |
| **Timezone** | Assumed IST (Indian Standard Time) | **User enters explicitly, browser auto-detects** |
| **Provider Filters** | 1-2 filters (type, specialization) | **4 hard filters** (nri_certified, type, timezone, language) |
| **Matching Score** | 0-100 points | **0-80 points** (no location) |
| **Timezone Scoring** | Not scored | **+15 bonus if match** |
| **NRI Pool Bonus** | N/A | **+10 bonus** |
| **Concern List** | General (anxiety, depression, etc.) | **NRI-specific** (visa, parents, cultural identity) |
| **Language** | Detected from preferences | **Required field, must match therapist** |
| **Availability** | IST time slots | **Patient's timezone → IST conversion** |
| **Payment Display** | Variable: "Dr. Priya: ₹1,299" | **Fixed: "₹2,999 (NRI fixed rate)"** |
| **Payment Terms** | Per-session, variable | **Per-session, fixed, no negotiation** |
| **Confirmation SMS** | IST time | **Both EST & IST times, in patient's language** |
| **Analytics Tag** | `entry_type = therapist` | **`source_funnel = nri_psychologist`** |
| **Admin Control** | Pricing via Session Pricing table | **Pricing via Session Pricing table (nri_ prefixed rows)** |

---

## 5. Example User Journeys

### Journey A: Domestic User - "Find a Therapist"

```
🔍 Google Search
"find therapist online India"
    ↓
📱 Lands on landing_seeking_help.html
    ├─ Sees "Find a Therapist →" CTA
    └─ Clicks
    ↓
📋 Assessment Page Opens (/assessment?entry=therapist)
    ├─ Modality: Individual (pre-selected)
    ├─ Budget: ₹500-₹2,000 (pre-filled)
    └─ Completes 10 steps (anxiety, depression, work stress)
    ↓
🎯 Matching Engine
    ├─ Filters: psychologist OR counselor
    ├─ Scores: specialization, language, rating, experience
    └─ Returns top 5 (scores 50-87)
    ↓
👤 Results
    ├─ Selects Dr. Priya (⭐4.8, anxiety specialist)
    ├─ Books Thursday 6:00 PM IST
    └─ Confirms
    ↓
💳 Payment
    ├─ Amount: ₹1,299 (Dr. Priya's rate)
    ├─ PhonePe UPI
    └─ SUCCESS
    ↓
✅ Confirmation
    ├─ SMS: "Session booked! Dr. Priya, Thu 6 PM IST"
    ├─ Jitsi link sent
    └─ Reminder tomorrow
```

### Journey B: NRI User - "NRI Psychiatrist"

```
🔍 Google Search
"Indian psychiatrist in US" (from New York)
    ↓
📱 Lands on landing_nri_teletherapy_v2.html
    ├─ Sees 3 cards with fixed prices
    └─ Clicks "NRI Psychiatrist ₹3,499"
    ↓
📋 NRI Assessment Opens (/nri/book?entry=nri_psychiatrist)
    ├─ Timezone: Browser detects US_EST
    ├─ Concerns: Career stress + family guilt (NRI list)
    ├─ Language: Hindi
    └─ Completes PHQ-9 + GAD-7
    ↓
🎯 NRI Matching Engine
    ├─ Hard Filters:
    │   ├─ nri_pool_certified = true ✓
    │   ├─ provider_type = psychiatrist ✓
    │   ├─ nri_timezone_shifts CONTAINS shift_a_us_east ✓
    │   └─ languages CONTAINS hindi ✓
    ├─ Scores: timezone +15, pool +10, spec +20, rating +15, etc.
    └─ Returns top 3 (scores 64-78)
    ↓
👤 Results (All in US_EST, all speak Hindi)
    ├─ Dr. Ramesh (78 pts) - Available today 5 PM EST
    ├─ Dr. Priya (72 pts) - Available tomorrow 4 PM EST
    └─ Dr. Vikram (64 pts) - Available in 2 days
    ↓
💳 Payment
    ├─ Amount: ₹3,499 (FIXED - NRI psychiatrist rate)
    ├─ Display shows: "₹3,499 (NRI fixed per-session)"
    ├─ PhonePe UPI
    └─ SUCCESS
    ↓
✅ Confirmation
    ├─ SMS (Hindi): "डॉ. राम..." (today 5 PM EST, tomorrow 2:30 AM IST)
    ├─ Email: Both EST and IST times
    ├─ Jitsi link sent
    └─ Reminders in EST timezone
```
```
🔍 Google Search
"Indian psychiatrist" OR "therapy with Indian doctor" (User in New York, US_EST)
  ↓
📱 Lands on landing_nri_teletherapy_v2.html
  ├─ Sees 3 cards: Indian Psychologist/Psychiatrist/Therapist (Fixed prices)
  └─ Clicks "Indian Psychiatrist ₹3,499"
  ↓
📋 NRI Assessment Opens (/nri/book?entry=nri_psychiatrist)
  ├─ Timezone Selection: "Where are you located?" → US_EST (browser auto-detects)
  ├─ Concerns: Career stress + family guilt (NRI-specific list)
  ├─ Language: Hindi
  └─ Completes PHQ-9 + GAD-7
  ↓
🎯 System Finds INDIAN Psychiatrists with US_EST Shift
  ├─ Hard Filters (ALL must match):
  │   ├─ ✓ nri_pool_certified = true (trained for NRI patients)
  │   ├─ ✓ provider_type = psychiatrist
  │   ├─ ✓ nri_timezone_shifts CONTAINS shift_a_us_east
  │   │   └─ Means they work 9:30 PM - 6:30 AM IST (for US_EST availability)
  │   └─ ✓ languages CONTAINS hindi
  ├─ Scores best matches: +15 shift availability, +10 pool bonus, +20 specialization, etc.
  └─ Returns top 3 (scores 64-78)
  ↓
👤 Results (All Indian therapists working US_EST shift, all speak Hindi)
  ├─ Dr. Ramesh (Delhi, India) - Score 78 pts
  │   └─ Works 9:30 PM-6:30 AM IST, Available today 5 PM EST (3:30 AM IST tomorrow)
  ├─ Dr. Priya (Mumbai, India) - Score 72 pts
  │   └─ Works 9:30 PM-6:30 AM IST, Available tomorrow 4 PM EST (2 AM IST day after)
  └─ Dr. Vikram (Bangalore, India) - Score 64 pts
    └─ Works 9:30 PM-6:30 AM IST, Available in 2 days
  ↓
💳 Payment
  ├─ Amount: ₹3,499 (FIXED - Indian psychiatrist rate)
  ├─ Display shows:
  │   ├─ "Indian Psychiatrist (Located in India)"
  │   ├─ "Your time: Today 5:00 PM EST"
  │   ├─ "Therapist's time: Tomorrow 3:30 AM IST"
  │   ├─ "₹3,499 (Fixed per-session, no subscription)"
  │   └─ [PhonePe Payment]
  └─ SUCCESS
  ↓
✅ Confirmation
  ├─ SMS (Hindi): "नमस्ते Rahul! आपकी थेरेपी डॉ. राम (भारत) के साथ बुक हुई। आज 5:00 PM EST (कल 3:30 AM IST)। Jitsi: ..."
  ├─ Email: Shows both timezone conversions
  ├─ Jitsi link sent (join at 5:00 PM EST = 3:30 AM IST tomorrow)
  └─ Reminders sent in EST timezone (patient's local time)
```

---

## 6. Admin Control: NRI Pricing Configuration

**How admins manage NRI pricing dynamically:**

### Step 1: Admin Panel

Admin navigates to:  
`/admin/pricing` → "Session Pricing" section

### Step 2: Add NRI Provider Types

Admin adds rows to session pricing table:

| Provider Type | Duration (min) | Price (₹) | Active |
|---------------|----------------|-----------|--------|
| therapist | 50 | 699 | ✓ |
| psychologist | 50 | 999 | ✓ |
| psychiatrist | 30 | 1499 | ✓ |
| **nri_therapist** | **50** | **3599** | **✓** |
| **nri_psychologist** | **50** | **2999** | **✓** |
| **nri_psychiatrist** | **30** | **3499** | **✓** |

### Step 3: Backend Pricing Lookup

When `resolveSessionQuoteMinor()` is called:

```javascript
const resolveSessionQuoteMinor = async (
  providerType?: string | null,
  presetEntryType?: string | null
): Promise<number> => {
  const pricingConfig = await getPricingConfig();
  const sessionPricing = pricingConfig.sessionPricing || [];

  // If NRI entry type, look up by NRI provider type
  if (isNriPresetEntryType(presetEntryType)) {
    const nriProviderType = NRI_PROVIDER_TYPE_BY_ENTRY[presetEntryType];
    // presetEntryType='nri_psychologist' → nriProviderType='nri_psychologist'
    
    const nriPrice = sessionPricing.find(
      (s) => String(s.providerType).toLowerCase() === 
             String(nriProviderType).toLowerCase()
    );
    
    if (nriPrice && nriPrice.price > 0) {
      return nriPrice.price * 100;  // Convert to paise
    }
  }

  // Fallback to standard pricing
  const price = sessionPricing.find(
    (s) => String(s.providerType).toLowerCase() === 
           String(providerType).toLowerCase()
  );
  if (price && price.price > 0) {
    return price.price * 100;
  }

  // Fallback to default
  return DEFAULT_SESSION_QUOTE.THERAPIST;
};
```

### Step 4: Changes Take Effect Immediately

- No redeploy needed
- Next booking uses new prices
- Existing sessions unaffected (locked pricing at booking time)

---

## 7. Analytics & Reporting

### Domestic Entries (PATCH-LM-001)

**Tracked via:** `assessment_sources.entry_type`

```sql
SELECT
  entry_type,
  COUNT(*) as assessments,
  COUNT(CASE WHEN booked THEN 1 END) as bookings,
  ROUND(100.0 * COUNT(CASE WHEN booked THEN 1 END) / 
        COUNT(*), 1) as booking_rate,
  AVG(match_score) as avg_match_score
FROM assessment_sources
GROUP BY entry_type
ORDER BY booking_rate DESC;

Results:
├─ couples: 45 assessments, 28 bookings (62.2% conversion)
├─ psychiatrist: 120 assessments, 65 bookings (54.2% conversion)
└─ therapist: 450 assessments, 189 bookings (42.0% conversion)
```

### NRI Entries (PATCH-LM-002)

**Tracked via:** `therapy_sessions.source_funnel`, `appointment_requests.timezone_region`

```sql
SELECT
  source_funnel,
  timezone_region,
  COUNT(*) as bookings,
  SUM(amount_minor) / 100 as total_revenue_inr,
  AVG(match_score) as avg_match_score
FROM therapy_sessions
WHERE source_funnel LIKE 'nri_%'
GROUP BY source_funnel, timezone_region
ORDER BY total_revenue_inr DESC;

Results:
├─ nri_psychologist / US_EST: 42 bookings, ₹119,958, score 74.3
├─ nri_psychologist / UK: 18 bookings, ₹53,982, score 71.2
├─ nri_psychiatrist / US_EST: 8 bookings, ₹27,992, score 76.1
└─ nri_therapist / AU: 5 bookings, ₹17,995, score 69.8
```

---

## 8. Summary

**PATCH-LM-001 (Domestic Presets):** Reduces friction for intent-driven searches by pre-filling relevant filters and skipping unnecessary steps. All 3 entry points feed into the same matching algorithm with different hard filters.

**PATCH-LM-002 (NRI Per-Session):** Adds dedicated NRI flow with timezone-aware matching, fixed pricing, and NRI-specific concern list. Uses stricter filters (4 hard criteria) and simplified scoring (0-80 pts, no location).

**Together:** Users can enter at the right point for their needs — intent-specific for domestic, timezone-aware for NRI — and experience faster matching and higher conversion.

