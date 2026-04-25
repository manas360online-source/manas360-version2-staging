# MANAS360 — Wellness Retreat: Plan of Intent System

**Story ID:** RETREAT-POI-001  
**Date:** April 2026  

---

## 1. Concept

Retreats are NOT self-serve bookings. They are admin-curated, manually planned experiences. The system collects **Plan of Intent** (POI) from users, creates a Zoho Desk ticket, and the retreat admin builds a custom plan — then communicates it to the user for approval and payment.

**Why manual?** Each retreat is unique — venue availability changes weekly, therapist scheduling is dynamic, group sizes affect pricing, and the emotional context shared in the intent form requires human judgment to curate properly.

---

## 2. Theme ↔ Location Mapping

| Theme | Emotional Core | Primary Location | Why This Terrain |
|-------|---------------|-----------------|------------------|
| **📵 Digital Detox** | Burnout, overstimulation | Sakaleshpura | Zero cell coverage zones, coffee estates, river streams — forced disconnection |
| **🐌 Slow Living** | Anxiety, rushing, disconnection | Coorg (Kodagu) | Misty mornings, spice plantations, Kodava village culture — time perception shifts |
| **🌿 Eco Living** | Purpose deficit, climate grief | Sakaleshpura | Certified organic farms, solar homesteads, regenerative farming — meaning through action |
| **🏡 Village Life** | Depression, identity loss, rootlessness | Magod / Sirsi | Paddy fields, fireflies, Malnad homestays, Jog Falls — reconnection to origin |
| **🙏 Saattvik Divine** | Grief, loss, existential pain | Murdeshwar | 123-ft Shiva statue, ocean aarti, temple silence — surrender and acceptance |
| **🌊 Ocean Reset** | Anxiety, PTSD, body-held trauma | Malpe / Udupi | Beach breathwork, St. Mary's Island, fishing village — somatic release via ocean |

---

## 3. Plan of Intent (POI) Data Flow

```
User fills intent form on landing_retreats.html
            │
            ▼
POST /api/v1/retreat/intent
            │
            ▼
┌──────────────────────────────────────────┐
│ Backend saves to Supabase:               │
│   retreat_intents table                  │
│   Status: RECEIVED                       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Zoho Flow Webhook fires:                 │
│   1. Creates Zoho Desk ticket            │
│      Department: Retreats                │
│      Priority: Normal                    │
│      Assigned: Retreat Admin              │
│   2. WhatsApp confirmation to user       │
│      Template: T-RETREAT-01              │
│      "Namaste {name}! Your retreat       │
│       intent for {theme} is received.    │
│       Our team will reach you in 48hrs." │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ ADMIN MANUAL WORK (Zoho Desk):           │
│                                          │
│   1. Read user's intent + emotional      │
│      context from the "what's on your    │
│      mind" field                         │
│   2. Check venue availability for dates  │
│   3. Assign therapist from MANAS360 pool │
│   4. Build itinerary (meals, activities) │
│   5. Calculate pricing (venue + therapist│
│      + transport + MANAS360 margin)      │
│   6. Create Plan PDF                     │
│      → ZeptoMail sends to user           │
│   7. WhatsApp plan summary               │
│      Template: T-RETREAT-02              │
│   8. Update ticket: PLAN_SENT            │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ USER REVIEWS PLAN:                       │
│                                          │
│   Option A: Approves → Admin sends       │
│     PhonePe payment link                 │
│     → Payment confirmed                  │
│     → Status: CONFIRMED                  │
│     → WhatsApp: T-RETREAT-03             │
│       (confirmation + packing list)      │
│                                          │
│   Option B: Requests changes → Admin     │
│     revises plan → sends updated PDF     │
│     → Loop back to review                │
│                                          │
│   Option C: Declines → Status: DECLINED  │
│     → Admin closes ticket                │
│     → Optional: follow-up in 30 days     │
└──────────────────────────────────────────┘
```

---

## 4. Database Schema

```sql
CREATE TABLE retreat_intents (
  intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User info
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  
  -- Intent details
  theme VARCHAR(50) NOT NULL,
  -- 'digital_detox','slow_living','eco_living','village_life','saattvik_divine','ocean_reset','not_sure'
  preferred_dates TEXT,
  group_size VARCHAR(20),
  -- 'solo','couple','small_group','team','custom'
  budget_range VARCHAR(20),
  -- 'economy','comfort','premium','luxury'
  personal_note TEXT,           -- "what's on your mind" field
  
  -- Source tracking
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),
  landing_page VARCHAR(255),
  
  -- Admin workflow
  status VARCHAR(30) DEFAULT 'RECEIVED',
  -- RECEIVED → PLAN_BUILDING → PLAN_SENT → APPROVED → CONFIRMED → COMPLETED → DECLINED
  zoho_ticket_id VARCHAR(50),
  assigned_admin VARCHAR(100),
  assigned_therapist_id UUID,
  
  -- Plan details (filled by admin)
  venue_name VARCHAR(255),
  venue_location VARCHAR(255),
  plan_start_date DATE,
  plan_end_date DATE,
  plan_total_amount INT,         -- INR
  plan_pdf_url TEXT,
  
  -- Payment
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING → LINK_SENT → PAID → REFUNDED
  payment_link_url TEXT,
  payment_transaction_id VARCHAR(100),
  payment_amount INT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  plan_sent_at TIMESTAMP,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  
  -- Consent
  consent_contact BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_retreat_status ON retreat_intents(status);
CREATE INDEX idx_retreat_theme ON retreat_intents(theme);
```

---

## 5. WATI WhatsApp Templates (3 new)

**T-RETREAT-01: Intent Received**
```
Namaste {{name}} 🙏🌿

Your wellness retreat intent has been received!

🏔️ Theme: {{theme_display}}
📅 Dates: {{preferred_dates}}
👥 Group: {{group_size}}

Our retreat team will personally review your preferences and contact you within 48 hours with a custom plan.

No payment needed yet — this is just the start of a conversation.

— MANAS360 Retreat Team
```

**T-RETREAT-02: Plan Sent**
```
Hi {{name}} 🌿

Your custom retreat plan is ready!

📍 {{venue_name}}, {{venue_location}}
📅 {{start_date}} to {{end_date}}
💰 ₹{{total_amount}} per person (all-inclusive)

📄 Full plan: {{plan_pdf_url}}

Reply to this message to:
✅ Approve the plan
✏️ Request changes
❌ Not for me right now

— {{admin_name}}, MANAS360 Retreats
```

**T-RETREAT-03: Booking Confirmed**
```
🎉 Your retreat is confirmed, {{name}}!

📍 {{venue_name}}
📅 {{start_date}} — {{end_date}}
🧠 Therapist: {{therapist_name}}

WHAT TO PACK:
- Comfortable clothes for walking
- Journal + pen
- Any medications
- Open mind 🌿

Your therapist will call you 48 hours before the retreat for a pre-arrival check-in.

See you in the hills (or by the sea) 🏔️🌊

— MANAS360 Retreat Team
```

---

## 6. Zoho Flow Triggers (3 new)

| Event | Webhook | Action |
|-------|---------|--------|
| `RETREAT_INTENT_RECEIVED` | POST to Zoho Flow | Create Zoho Desk ticket (Dept: Retreats) + Send T-RETREAT-01 via Heyo Phone |
| `RETREAT_PLAN_SENT` | POST to Zoho Flow | Send plan PDF via ZeptoMail + Send T-RETREAT-02 via Heyo Phone |
| `RETREAT_CONFIRMED` | POST to Zoho Flow | Send T-RETREAT-03 via Heyo Phone + Add to Zoho Campaigns "Retreat Alumni" list |

---

## 7. Admin's Manual Process (Inside Zoho Desk)

When a ticket arrives in the Retreats department:

1. **Read the intent** — especially the "what's on your mind" field. This is the emotional compass for the entire plan.
2. **Call the user** — 5-minute discovery call to clarify dates, dietary needs, mobility, and emotional state.
3. **Contact venue partner** — check availability for the mapped location. MANAS360 maintains a shortlist of 2-3 vetted venues per location.
4. **Assign therapist** — match a MANAS360 therapist who specializes in the theme's emotional core (e.g., grief specialist for Saattvik Divine).
5. **Build itinerary** — day-by-day schedule with meals, therapy sessions, activities, free time.
6. **Price it** — venue cost + therapist fee + transport + MANAS360 margin (typically 20-25%).
7. **Generate plan PDF** — use a template, export from Canva or a simple HTML-to-PDF tool.
8. **Send plan** — update Zoho Desk ticket status to PLAN_SENT → triggers Zoho Flow → user gets WhatsApp + email.
9. **Follow up** — if no response in 72 hours, admin sends a gentle WhatsApp nudge.
10. **On approval** — generate PhonePe payment link via GetSwipe, send to user. On payment confirmation, update to CONFIRMED.

---

## 8. Feasibility Assessment

| Question | Answer |
|----------|--------|
| Can this work at MVP? | **Yes** — the entire backend is a form → Zoho Desk ticket → manual admin workflow. No booking engine needed. |
| What tech is needed? | Landing page (done), one API endpoint, 3 Zoho Flow webhooks, 3 WATI templates. |
| What's the admin load? | ~30 min per intent (call + plan building + communication). At 5 intents/week, that's 2.5 hrs/week — manageable for Mahan or a part-time coordinator. |
| Payment? | PhonePe link generated manually via GetSwipe. No automated payment flow needed. |
| Scalability concern? | At 20+ intents/week, admin will need a retreat coordinator. But that's a good problem — proves demand before hiring. |
| Cost to build? | Near zero — the landing page is built, Zoho Desk is already live, Zoho Flow is already configured. Just add 3 templates + 1 endpoint. |
