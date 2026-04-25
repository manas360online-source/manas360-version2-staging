# NRI Flow Clarification: How the System Actually Works

**Date:** April 16, 2026  
**Purpose:** Crystal clear explanation of NRI therapist locations and shift-based booking

---

## ❌ WRONG Understanding (What It's NOT)

```
❌ INCORRECT:
Patient in US searching for "Indian therapist"
    ↓
System finds Indian therapists who are LIVING IN US/UK/AU
    ↓
Books directly with them
    ↓
No timezone complexity - they're already in patient's timezone
```

---

## ✅ CORRECT Understanding (What It IS)

```
✅ CORRECT:
Patient in US (US_EST timezone) searching for "Indian therapist"
    ↓
System finds therapists LOCATED IN INDIA (working from India)
    ↓
BUT they work DEDICATED SHIFT WINDOWS to serve different timezones
    ↓
Patient can ONLY book during the shift when therapist works
    ↓
Both see same video call time, but in different actual times
```

---

## Concrete Example: How It Works

### Therapist Side (India, IST timezone)

```
Dr. Anjali Sharma (Therapist)
├─ Location: Mumbai, India
├─ Works these shifts for NRI patients:
│   ├─ Shift A (US_EST): 9:30 PM - 6:30 AM IST every day
│   └─ Shift B (UK): 11:30 PM - 2:30 AM IST every day
│
└─ Her Calendar (IST):
    ├─ Today 12:00 AM IST: OPEN (Shift A - US_EST patients)
    ├─ Today 2:00 AM IST: OPEN (Shift A - US_EST patients)
    ├─ Today 3:30 AM IST: BOOKED (US_EST patient)
    ├─ Today 6:00 AM IST: SHIFT ENDS (Shift A)
    ├─ Today 6:00 AM - 9:30 PM IST: UNAVAILABLE (no shift)
    ├─ Today 9:30 PM IST: SHIFT STARTS (Shift A again)
    └─ Today 11:30 PM IST: Session starts with another US_EST patient
```

### Patient Side (USA, EST timezone)

```
Rahul (Patient)
├─ Location: New York, USA (US_EST timezone)
├─ Cannot book at ANY time
├─ Can ONLY book when Dr. Anjali's shift is active
│   └─ Her Shift A (US_EST): 9:30 AM - 6:30 PM EST (patient perspective)
│
└─ His Calendar (EST):
    ├─ Today 9:30 AM EST: SHIFT OPENS
    ├─ Today 12:00 PM EST: OPEN (Dr. Anjali available)
    ├─ Today 5:00 PM EST: BOOKED (Session with Dr. Anjali)
    │   └─ Same call: Dr. Anjali sees 3:30 AM IST (tomorrow)
    ├─ Today 6:30 PM EST: SHIFT CLOSES
    ├─ Today 6:30 PM - 9:30 AM EST (next day): UNAVAILABLE
    └─ Cannot book evening/night sessions (outside her shift)
```

### Same Session - Two Different Times

```
VIDEO CALL STARTS
├─ Dr. Anjali's Perspective:
│   └─ Time: Tomorrow 3:30 AM IST
│   └─ She's in her scheduled shift (working early morning)
│
└─ Rahul's Perspective:
    └─ Time: Today 5:00 PM EST
    └─ He's in the afternoon (convenient US time)

Both connect at exact same moment, but timestamps differ by 10.5 hours!
```

---

## Why This Design?

### Problem Being Solved

```
Scenario A: Old Approach (Wrong)
├─ Hire Indian therapists living in US/UK/AU
├─ Problem: High cost, visa complications, they're not in India
└─ Result: Not sustainable

Scenario B: New Approach (PATCH-LM-002)
├─ Keep all therapists in India (lower cost, easier hiring)
├─ Have them work specific shifts for different markets
├─ Patient in US books during 9:30 AM-6:30 PM EST
├─ Therapist in India works during 9:30 PM-6:30 AM IST
├─ System handles timezone conversion transparently
└─ Result: Sustainable, scalable, cost-effective
```

---

## NRI Pool Management

### How Therapists Opt In

```
Dr. Anjali wants to serve NRI patients:

1. Complete NRI Sensitization Module (1 hour training)
   ├─ Understand cultural nuances
   ├─ Communication across timezones
   └─ NRI patient expectations

2. Declare Available Shifts
   ├─ "I can work 9:30 PM - 6:30 AM IST for US_EST patients"
   ├─ "I can also work 11:30 PM - 2:30 AM IST for UK patients"
   └─ [Submit for approval]

3. Subramanya (Clinical Ops) Reviews (24-48 hrs)
   ├─ Checks credentials
   ├─ Verifies training completion
   └─ Approves or requests changes

4. Flag Set in System
   └─ nri_pool_certified = true
   └─ nri_timezone_shifts = ['shift_a_us_east', 'shift_c_uk']
   └─ Dr. Anjali now appears in NRI search results

5. Can Now Accept NRI Bookings
   ├─ US_EST patients see her availability 9:30 AM-6:30 PM EST
   ├─ UK patients see her availability 11:30 AM-2:30 AM GMT
   └─ Indian patients CANNOT see her (domestic flow is separate)
```

---

## Booking Workflow

### Step 1: Patient Searches

```
User in New York, US searching on Google:
"therapist India" OR "Indian psychologist online" OR "therapy with Indian doctor"

↓ Gets NRI Landing Page with 3 cards ↓

📍 Indian Psychologist - ₹2,999/session
🏥 Indian Psychiatrist - ₹3,499/session
👨‍⚕️ Indian Therapist - ₹3,599/session
```

### Step 2: Timezone Selection

```
Patient clicks "Indian Psychologist"

↓ Assessment loads ↓

Question: "Which timezone are you in?"

Browser auto-detects: America/New_York
↓ Maps to: US_EST
↓ Shows explanation:
   "Indian therapists work 9:30 AM - 6:30 PM EST daily"

Patient confirms or changes timezone

(If selected US_EST, system now searches for therapists
 with shift_a_us_east in their nri_timezone_shifts array)
```

### Step 3: Matching Finds Qualified Therapists

```
HARD FILTERS (ALL must match):

✓ nri_pool_certified = true
  └─ Therapist is trained and approved for NRI patients

✓ provider_type = 'psychologist'
  └─ Matches the session type patient selected

✓ 'shift_a_us_east' IN nri_timezone_shifts
  └─ Therapist works during US_EST hours
  └─ This is critical! Without this match, patient can never book

✓ languages CONTAINS 'hindi' (or patient's language)
  └─ Can communicate in patient's preferred language

Results: 3-5 therapists, all in India, all working US_EST shift
```

### Step 4: Availability Shown in Patient's Timezone

```
Dr. Anjali Available Slots:
├─ Today 12:00 PM EST (Dr. Anjali: 2:00 AM IST tomorrow)
├─ Today 5:00 PM EST (Dr. Anjali: 3:30 AM IST tomorrow)  ← Patient selects this
├─ Tomorrow 4:30 PM EST (Dr. Anjali: 2:00 AM IST day after)

All times shown in PATIENT'S timezone (EST)
System converts to IST for backend storage
Both see the exact same video call moment
```

### Step 5: Payment

```
Amount: ₹2,999 (FIXED, no negotiation)
Payment Gateway: PhonePe
Currency: INR

Display shows clearly:
├─ "Indian Psychologist (Located in India)"
├─ "Your Session Time: Today 5:00 PM EST"
├─ "Therapist's Time: Tomorrow 3:30 AM IST"
└─ "₹2,999 (Fixed per-session)"
```

### Step 6: Session Happens

```
Patient's Perspective (US_EST):
├─ Calendar shows: Today 5:00 PM EST
├─ Reminder: 1 hour before (4:00 PM EST)
├─ Clicks Jitsi link at 5:00 PM EST
└─ Session with Dr. Anjali

Therapist's Perspective (IST):
├─ Calendar shows: Tomorrow 3:30 AM IST
├─ Reminder: 1 hour before (2:30 AM IST)
├─ Joins Jitsi at 3:30 AM IST
└─ Session with Rahul

Same exact moment, different timestamps!
```

---

## Key Differences: Domestic vs NRI

| Aspect | Domestic Flow | NRI Flow |
|--------|---------------|----------|
| **Therapist Location** | Various (could be anywhere) | **INDIA** (IST timezone) |
| **Therapist Availability** | Any time (flexible scheduling) | **Specific shifts only** (e.g., 9:30 PM-6:30 AM IST for US_EST) |
| **Booking Constraint** | Can book any time therapist is free | **Can ONLY book during their shift window** |
| **Session Time Shown To:** | Therapist's timezone (IST) | **Patient's timezone** (EST/UK/AU) |
| **Timezone Conversion** | Not needed (usually same country) | **Automatic, transparent to patient** |
| **Price** | Variable (₹500-₹3,000 per provider) | **Fixed (₹2,999/₹3,499/₹3,599)** |
| **Language Requirement** | Optional matching | **REQUIRED** - therapist must speak patient's language |

---

## Timeline Example: Full Booking Journey

```
THURSDAY, April 18, 2026

12:00 PM EST (Rahul in New York)
├─ Searches Google: "Indian therapist"
├─ Lands on NRI page
└─ Clicks "Indian Psychologist"

12:15 PM EST (Still Rahul's time, next day 10:45 PM IST in India)
├─ Assessment starts
├─ Timezone: Confirms US_EST
├─ Concerns: Career pressure, family guilt
├─ Language: Hindi
└─ Submits

12:20 PM EST
├─ System matches: Finds Dr. Anjali (working her 9:30 PM-6:30 AM IST shift)
├─ Shows results: Top 3 Indian psychologists
└─ Rahul selects: Dr. Anjali

12:25 PM EST (Rahul sees: "Today 5:00 PM EST")
├─ Payment: ₹2,999 via PhonePe
└─ SUCCESS

12:30 PM EST
├─ Confirmation SMS (in Hindi):
│   "नमस्ते Rahul! डॉ. अंजली के साथ सेशन बुक हुई।
│    आज 5:00 PM EST। Jitsi: ..."
└─ Jitsi link sent

12:35 PM EST → ... → 4:00 PM EST (Rahul's calendar)
└─ 1-hour reminder: "Session in 1 hour at 5:00 PM EST"

12:35 AM IST (Friday, April 19) → ... → 2:30 AM IST (Dr. Anjali's calendar)
└─ 1-hour reminder: "Session in 1 hour at 3:30 AM IST"

TODAY 5:00 PM EST = FRIDAY 3:30 AM IST
├─ Rahul clicks Jitsi at 5:00 PM EST
├─ Dr. Anjali joins at 3:30 AM IST
├─ Same video call, exact same moment
└─ 50-minute therapy session

5:50 PM EST = 3:80 AM IST
└─ Session ends (marked COMPLETED)

6:00 PM EST
└─ Rahul gets feedback request SMS

4:00 AM IST
└─ Dr. Anjali sees session marked in her records
```

---

## Admin Control: Pricing

```
Admin navigates to: /admin/pricing → Session Pricing

Adds rows:

| Provider Type | Duration | Price | Active |
|---------------|----------|-------|--------|
| therapist | 50 | 699 | ✓ | (domestic)
| nri_therapist | 50 | 3599 | ✓ | (NRI - Indian therapist) |
| psychologist | 50 | 999 | ✓ | (domestic)
| nri_psychologist | 50 | 2999 | ✓ | (NRI - Indian psychologist) |
| psychiatrist | 30 | 1499 | ✓ | (domestic)
| nri_psychiatrist | 30 | 3499 | ✓ | (NRI - Indian psychiatrist) |

Backend system:
├─ When nri_psychologist session booked
├─ Calls resolveSessionQuoteMinor('psychologist', 'nri_psychologist')
├─ Looks up session_pricing table
├─ Finds: provider_type='nri_psychologist' price=2999
├─ Charges: ₹2,999 (always same, no variation)

Admin can change prices anytime:
├─ Update nri_psychologist price to 3000
├─ Next booking uses ₹3,000
├─ No redeploy needed
```

---

## Summary

### What's True About NRI Flow

✅ Therapists are **located in India**  
✅ They work **specific shifts** (9:30 PM-6:30 AM IST for US, etc.)  
✅ Patients can **only book during those shifts**  
✅ Same video call, **different times** for each party  
✅ **Fixed pricing** (₹2,999/3,499/3,599)  
✅ **Admin controls prices** via Session Pricing table  
✅ **Language requirement** (must match therapist's language)  
✅ **NRI pool certification** (therapists must opt in)  

### What's False (INCORRECT)

❌ Therapists are living abroad (NO - they're in India)  
❌ Every time patient can book (NO - only during shift hours)  
❌ Variable pricing like domestic (NO - fixed rates)  
❌ Any language works (NO - must match therapist's language)  
❌ Location-based matching (NO - shift-based matching)  

---

**This is the key innovation:** By keeping therapists in India but having them work specific shifts, MANAS360 can serve NRI patients globally while maintaining lower costs and sustainable operations. The timezone complexity is handled transparently by the system.
