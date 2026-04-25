# MANAS360 — Complete System Architecture Documentation
## Version 1.0 | February 2026

---Approved architecture baseline

# TABLE OF CONTENTS

1. Design Decisions & Assumptions
2. System Flowchart
3. ER Diagram
4. Data Flow Diagrams (Level 0, 1, 2)
5. Sequence Diagrams
6. Relationship Analysis
7. Feature Dependency Mapping
8. Architectural Risks
9. Suggested Improvements

---

# 1. DESIGN DECISIONS (CONFIRMED)

| # | Question | Confirmed Answer |
|---|----------|-----------------|
| 1 | Revenue split | 60/40 — therapist gets 60%, platform keeps 40% |
| 2 | RBAC roles | 5 roles: Admin, Patient, Therapist, Psychiatrist, Coach |
| 3 | Payment flows in MVP | All 5: patient subscription, session booking, lead purchase, therapist plan, à la carte content |
| 4 | Therapist payouts | Razorpay Route — auto-split at payment time (60% to therapist linked account) |
| 5 | Cancellation policy | NO cancellation. No refunds. Therapist calls "no-show" manually. |
| 6 | Lead expiry | Patient has 2-hour acceptance window. No contact / no response = patient loses money. |
| 7 | Claude AI in MVP | AnytimeBuddy chat + crisis detection + mood tracking = LIVE. VentBuddy + session summaries = MVP 2.0 |
| 8 | Session recording | NO video recording. Zero storage. Privacy-first. |
| 9 | Corporate / B2B | Corporate billed directly. Employees use corporate ID for discounted sessions. Group sessions under contract. |

---

# 2. SYSTEM FLOWCHART

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MANAS360 PLATFORM                              │
│                                                                         │
│  ┌─────────────┐     ┌─────────────────────────────────────────────┐   │
│  │             │     │            API LAYER (Express.js)            │   │
│  │  React +    │     │                                             │   │
│  │  Vite +     │────▶│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│  │  Tailwind   │     │  │ Auth     │  │ Session  │  │ Payment  │ │   │
│  │  (SPA)      │◀────│  │ Routes   │  │ Routes   │  │ Routes   │ │   │
│  │             │     │  └────┬─────┘  └────┬─────┘  └────┬─────┘ │   │
│  └─────────────┘     │       │             │             │       │   │
│                      │  ┌────▼─────────────▼─────────────▼─────┐ │   │
│  ┌─────────────┐     │  │         MIDDLEWARE CHAIN              │ │   │
│  │ Mobile App  │     │  │  JWT ▸ RBAC ▸ RateLimit ▸ Validate   │ │   │
│  │ (Future)    │────▶│  └────┬─────────────┬─────────────┬─────┘ │   │
│  └─────────────┘     │       │             │             │       │   │
│                      │  ┌────▼─────┐  ┌────▼─────┐  ┌───▼──────┐│   │
│                      │  │Controllers│  │Services  │  │  Models  ││   │
│                      │  │(HTTP I/O) │  │(Business)│  │(DB/ORM)  ││   │
│                      │  └──────────┘  └────┬─────┘  └──────────┘│   │
│                      └─────────────────────┼─────────────────────┘   │
│                                            │                         │
│  ┌─────────────────────────────────────────┼───────────────────────┐ │
│  │                    DATA LAYER           │                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────▼──┐  ┌─────────────┐ │ │
│  │  │PostgreSQL│  │  Redis   │  │   AWS S3   │  │ Job Queue   │ │ │
│  │  │(Primary) │  │ (Cache/  │  │(Documents, │  │(Bull/Redis) │ │ │
│  │  │          │  │  Session)│  │ Certs, PDF)│  │             │ │ │
│  │  └──────────┘  └──────────┘  └────────────┘  └─────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                  EXTERNAL SERVICES                               │ │
│  │                                                                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │ Razorpay │  │  Agora   │  │  Claude  │  │  Twilio  │       │ │
│  │  │ Payments │  │  Video   │  │  AI API  │  │ SMS/WA   │       │ │
│  │  │ + Route  │  │  SDK     │  │          │  │          │       │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │ │
│  │                                                                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │ │
│  │  │ Bhashini │  │  Bunny   │  │ AWS SES  │                      │ │
│  │  │ Translate│  │  Stream  │  │  Email   │                      │ │
│  │  └──────────┘  └──────────┘  └──────────┘                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Request Flow

```
Client Request
     │
     ▼
┌─────────────┐
│   Nginx     │  (Reverse proxy, SSL termination, static files)
│   :443      │
└──────┬──────┘
       │
       ├─── /api/*  ──────▶  Express server.ts (:3001)
       │                          │
       │                     ┌────▼────┐
       │                     │ Router  │─── auth.routes.ts
       │                     │ Index   │─── patient.routes.ts
       │                     │         │─── therapist.routes.ts
       │                     │         │─── session.routes.ts
       │                     │         │─── payment.routes.ts
       │                     │         │─── subscription.routes.ts
       │                     │         │─── lead.routes.ts
       │                     │         │─── content.routes.ts
       │                     │         │─── ai.routes.ts
       │                     │         │─── admin.routes.ts
       │                     │         │─── corporate.routes.ts
       │                     │         │─── webhook.routes.ts
       │                     └─────────┘
       │
       └─── /*  ──────────▶  React SPA (index.html)
                              Vite build → /dist/
```

## 2.3 User Journey Flowchart

```
                        ┌──────────────┐
                        │  Landing Page │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │   Register   │
                        └──────┬───────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
              ┌─────▼────┐ ┌──▼───────┐ ┌▼──────────┐
              │ Patient   │ │ Provider │ │ Corporate │
              │ Signup    │ │ Signup   │ │ Admin     │
              └─────┬─────┘ └──┬───────┘ └┬──────────┘
                    │          │          │
              ┌─────▼────┐    │    ┌─────▼─────────┐
              │ Free     │    │    │ Org Setup +   │
              │Assessment│    │    │ Employee IDs  │
              │ (PHQ-9)  │    │    └─────┬─────────┘
              └─────┬────┘    │          │
                    │         │    ┌─────▼─────────┐
              ┌─────▼────┐   │    │ Employees use │
              │ AI Match │   │    │ patient flow  │
              │ Results  │   │    │ + corp discount│
              └─────┬────┘   │    └───────────────┘
                    │        │
              ┌─────▼────┐   │
              │ Subscribe │   │
              │ ₹299/mo  │   │
              └─────┬────┘   │
                    │        │
              ┌─────▼───────────────────────────┐
              │         THERAPY HUB             │
              │                                 │
              │  ┌─────────┐  ┌──────────────┐ │
              │  │ Book    │  │ Premium      │ │
              │  │ Session │  │ Features     │ │
              │  │ ₹1500+  │  │              │ │
              │  └────┬────┘  │ • Sound Trk  │ │
              │       │       │ • Sleep Prg  │ │
              │  ┌────▼────┐  │ • AI Buddy  │ │
              │  │ Agora   │  │ • Digital Pet│ │
              │  │ Video   │  │ • Mood Track │ │
              │  │ Session │  └──────────────┘ │
              │  └────┬────┘                   │
              │       │                        │
              │  ┌────▼────┐                   │
              │  │ Session │                   │
              │  │Complete │                   │
              │  └────┬────┘                   │
              │       │                        │
              │  ┌────▼────────────┐           │
              │  │ Next Session /  │           │
              │  │ Continue Care   │           │
              │  └─────────────────┘           │
              └─────────────────────────────────┘


PROVIDER FLOW (Therapist / Psychiatrist / Coach):

              ┌──────────────┐
              │ Provider     │
              │ Signup       │
              └──────┬───────┘
                     │
              ┌──────▼───────┐
              │ Credential   │
              │ Verification │
              │ (RCI/NMC)    │
              │ 48h review   │
              └──────┬───────┘
                     │
              ┌──────▼───────┐
              │ Choose Lead  │
              │ Plan         │
              │ Free/Basic/  │
              │ Premium      │
              └──────┬───────┘
                     │
              ┌──────▼───────────────────────┐
              │     PROVIDER DASHBOARD       │
              │                              │
              │  ┌──────────┐ ┌───────────┐ │
              │  │ View     │ │ Manage    │ │
              │  │ Leads    │ │ Sessions  │ │
              │  │ (Buy ₹X) │ │ Calendar  │ │
              │  └────┬─────┘ └─────┬─────┘ │
              │       │             │        │
              │  ┌────▼─────┐ ┌────▼──────┐ │
              │  │ Contact  │ │ Join      │ │
              │  │ Patient  │ │ Agora     │ │
              │  │ (2h win) │ │ Video     │ │
              │  └──────────┘ └───────────┘ │
              │                              │
              │  ┌──────────┐ ┌───────────┐ │
              │  │ Earnings │ │ Training  │ │
              │  │ Dashboard│ │ & Certs   │ │
              │  └──────────┘ └───────────┘ │
              └──────────────────────────────┘
```

---

# 3. ER DIAGRAM

## 3.1 Complete Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                                │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐         ┌─────────────────────────────┐
│          users              │         │          roles              │
├─────────────────────────────┤         ├─────────────────────────────┤
│ PK  id            UUID      │    ┌───▶│ PK  id          SERIAL     │
│     email         VARCHAR   │    │    │     name        VARCHAR    │
│     phone         VARCHAR   │    │    │     description  TEXT       │
│     password_hash VARCHAR   │    │    │     is_active    BOOLEAN   │
│     full_name     VARCHAR   │    │    │     created_at   TIMESTAMP │
│ FK  role_id       INT  ─────┼────┘    └──────────┬──────────────────┘
│ FK  org_id        UUID (NUL)│                    │
│     email_verified BOOLEAN  │                    │ 1
│     phone_verified BOOLEAN  │                    │ ║
│     avatar_url    VARCHAR   │                    │ ∞
│     preferred_lang VARCHAR  │         ┌──────────▼──────────────────┐
│     is_active     BOOLEAN   │         │     role_permissions        │
│     last_login    TIMESTAMP │         ├─────────────────────────────┤
│     created_at    TIMESTAMP │         │ PK  id          SERIAL     │
│     updated_at    TIMESTAMP │         │ FK  role_id     INT        │
└──────────┬──────────────────┘         │ FK  permission_id INT      │
           │                            └──────────┬──────────────────┘
           │ 1                                     │
           │ ║                                     │ ∞
           │ ∞                                     │ 1
┌──────────▼──────────────────┐         ┌──────────▼──────────────────┐
│      user_profiles          │         │       permissions           │
├─────────────────────────────┤         ├─────────────────────────────┤
│ PK  id            UUID      │         │ PK  id          SERIAL     │
│ FK  user_id       UUID (UQ) │         │     resource    VARCHAR    │
│     date_of_birth DATE      │         │     action      VARCHAR    │
│     gender        VARCHAR   │         │     description  TEXT       │
│     city          VARCHAR   │         └─────────────────────────────┘
│     state         VARCHAR   │
│     emergency_contact JSON  │
│     medical_history JSON    │
└─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                      PROVIDER ENTITIES                                │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│      providers              │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  user_id       UUID (UQ) │──────────────────────┐
│     provider_type ENUM      │  (therapist,         │
│     license_number VARCHAR  │   psychiatrist,      │
│     license_body  VARCHAR   │   coach)             │
│     license_verified BOOL   │                      │
│     verification_date TSTZ  │                      │
│     specializations JSONB   │                      │
│     approaches    JSONB     │                      │
│     languages     VARCHAR[] │                      │
│     session_rate  INT       │                      │
│     bio           TEXT      │                      │
│     years_experience INT    │                      │
│     max_patients_week INT   │                      │
│     is_accepting  BOOLEAN   │                      │
│ FK  lead_plan_id  UUID      │───┐                  │
│     razorpay_route_id VARCHAR│   │                  │
│     bank_account  JSONB     │   │                  │
│     rating_avg    DECIMAL   │   │                  │
│     total_sessions INT      │   │                  │
│     created_at    TIMESTAMP │   │                  │
└──────────┬──────────────────┘   │                  │
           │                      │                  │
           │ 1                    │                  │
           │ ║                    │                  │
           │ ∞                    │                  │
┌──────────▼──────────────────┐   │                  │
│   provider_availability     │   │                  │
├─────────────────────────────┤   │                  │
│ PK  id            UUID      │   │                  │
│ FK  provider_id   UUID      │   │                  │
│     day_of_week   INT (0-6) │   │                  │
│     start_time    TIME      │   │                  │
│     end_time      TIME      │   │                  │
│     is_active     BOOLEAN   │   │                  │
└─────────────────────────────┘   │                  │
                                  │                  │
                                  │                  │
┌──────────────────────────────────────────────────────────────────────┐
│                     SUBSCRIPTION & PAYMENT                           │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐   │
│       plans                 │◀──┘
├─────────────────────────────┤
│ PK  id            UUID      │
│     name          VARCHAR   │
│     slug          VARCHAR   │  (free, basic_patient, premium_patient,
│     target_role   ENUM      │   free_provider, basic_provider,
│     price_monthly INT       │   premium_provider)
│     price_yearly  INT       │
│     features      JSONB     │
│     lead_limit    INT (NUL) │
│     is_active     BOOLEAN   │
│     razorpay_plan_id VARCHAR│
│     created_at    TIMESTAMP │
└──────────┬──────────────────┘
           │ 1
           │ ║
           │ ∞
┌──────────▼──────────────────┐
│     subscriptions           │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  user_id       UUID      │
│ FK  plan_id       UUID      │
│     status        ENUM      │  (active, past_due, cancelled, trial, expired)
│     razorpay_sub_id VARCHAR │
│     current_period_start TSTZ│
│     current_period_end  TSTZ │
│     trial_ends_at TIMESTAMP │
│     cancelled_at  TIMESTAMP │
│     created_at    TIMESTAMP │
│     updated_at    TIMESTAMP │
└─────────────────────────────┘

┌─────────────────────────────┐
│       payments              │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  user_id       UUID      │
│     payment_type  ENUM      │  (subscription, session, lead_purchase,
│                             │   provider_plan, content_purchase)
│     amount        INT       │  (in paise)
│     currency      VARCHAR   │  (INR)
│     status        ENUM      │  (created, authorized, captured, failed, refunded)
│     razorpay_order_id  VARCHAR│
│     razorpay_payment_id VARCHAR│
│     razorpay_signature VARCHAR│
│ FK  session_id    UUID (NUL)│
│ FK  lead_id       UUID (NUL)│
│ FK  subscription_id UUID(NUL)│
│ FK  content_id    UUID (NUL)│
│     provider_share INT      │  (paise — 60% auto-routed)
│     platform_share INT      │  (paise — 40% kept)
│     metadata      JSONB     │
│     created_at    TIMESTAMP │
└─────────────────────────────┘

┌─────────────────────────────┐
│      payouts                │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  provider_id   UUID      │
│     amount        INT       │  (paise)
│     status        ENUM      │  (pending, processing, completed, failed)
│     razorpay_transfer_id VARCHAR│
│ FK  payment_id    UUID      │
│     settled_at    TIMESTAMP │
│     created_at    TIMESTAMP │
└─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                  ASSESSMENT & MATCHING                                │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│      assessments            │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  patient_id    UUID      │  (→ users.id)
│     responses     JSONB     │  (PHQ-9 answers + concerns)
│     phq9_score    INT       │
│     gad7_score    INT (NUL) │
│     severity      ENUM      │  (minimal, mild, moderate, mod_severe, severe)
│     concerns      VARCHAR[] │
│     preferred_lang VARCHAR  │
│     preferred_gender VARCHAR│
│     budget_range  INT[]     │  ([min, max] in rupees)
│     is_crisis     BOOLEAN   │
│     created_at    TIMESTAMP │
└──────────┬──────────────────┘
           │ 1
           │ ║
           │ ∞
┌──────────▼──────────────────┐
│        leads                │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  assessment_id UUID      │
│ FK  patient_id    UUID      │
│ FK  provider_id   UUID (NUL)│  (assigned after purchase)
│     match_score   INT       │  (0-100)
│     status        ENUM      │  (available, purchased, contacted,
│                             │   accepted, expired, no_response)
│     price         INT       │  (paise, dynamic by match score)
│     preview_data  JSONB     │  (symptoms, score, lang — no PII)
│     patient_acceptance_deadline TSTZ │  (2 hours from creation)
│     provider_contact_deadline  TSTZ │
│     contact_attempts INT    │  (provider must log ≥1)
│     purchased_at  TIMESTAMP │
│     contacted_at  TIMESTAMP │
│     resolved_at   TIMESTAMP │
│     created_at    TIMESTAMP │
└─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                        SESSIONS                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│       sessions              │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  patient_id    UUID      │
│ FK  provider_id   UUID      │
│ FK  lead_id       UUID (NUL)│
│     session_type  ENUM      │  (individual, couple, group, corporate)
│     status        ENUM      │  (booked, live, completed, no_show)
│     scheduled_at  TIMESTAMP │
│     started_at    TIMESTAMP │
│     ended_at      TIMESTAMP │
│     duration_min  INT       │
│     session_fee   INT       │  (paise)
│     agora_channel VARCHAR   │
│     agora_token   VARCHAR   │
│     notes_patient TEXT (NUL)│  (encrypted)
│     notes_provider TEXT(NUL)│  (encrypted)
│     rating        INT (NUL) │  (1-5, by patient)
│     no_show_by    ENUM(NUL) │  (patient, provider)
│     created_at    TIMESTAMP │
│     updated_at    TIMESTAMP │
└─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                    AI & PREMIUM FEATURES                              │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│    ai_conversations         │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  user_id       UUID      │
│     feature       ENUM      │  (anytime_buddy, crisis_detect, mood_track)
│     messages      JSONB     │  ([{role, content, timestamp}])
│     mood_score    INT (NUL) │
│     is_crisis     BOOLEAN   │
│     tokens_used   INT       │
│     created_at    TIMESTAMP │
│     ended_at      TIMESTAMP │
└─────────────────────────────┘

┌─────────────────────────────┐
│     mood_entries            │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  user_id       UUID      │
│     score         INT       │  (1-10)
│     notes         TEXT      │
│     source        ENUM      │  (manual, ai_detected, session_post)
│     created_at    TIMESTAMP │
└─────────────────────────────┘

┌─────────────────────────────┐
│      content_library        │
├─────────────────────────────┤
│ PK  id            UUID      │
│     title         VARCHAR   │
│     category      ENUM      │  (sound, sleep, meditation, raga)
│     duration_sec  INT       │
│     file_url      VARCHAR   │  (Bunny Stream or S3)
│     thumbnail_url VARCHAR   │
│     is_free       BOOLEAN   │
│     price         INT (NUL) │  (paise, for à la carte)
│     tags          VARCHAR[] │
│     language      VARCHAR   │
│     play_count    INT       │
│     created_at    TIMESTAMP │
└──────────┬──────────────────┘
           │ 1
           │ ║
           │ ∞
┌──────────▼──────────────────┐
│   content_purchases         │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  user_id       UUID      │
│ FK  content_id    UUID      │
│ FK  payment_id    UUID      │
│     created_at    TIMESTAMP │
│     UNIQUE(user_id, content_id)│
└─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                     CORPORATE / B2B                                   │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│      organizations          │
├─────────────────────────────┤
│ PK  id            UUID      │
│     name          VARCHAR   │
│     domain        VARCHAR   │  (for email validation)
│     contract_type ENUM      │  (per_employee, bulk, unlimited)
│     session_discount_pct INT│  (e.g., 30 = 30% off)
│     group_sessions_included INT│
│     max_employees INT       │
│     billing_email VARCHAR   │
│     billing_cycle ENUM      │  (monthly, quarterly, annual)
│     contract_start DATE     │
│     contract_end   DATE     │
│     is_active     BOOLEAN   │
│     created_at    TIMESTAMP │
└──────────┬──────────────────┘
           │ 1
           │ ║
           │ ∞
┌──────────▼──────────────────┐
│    org_employees            │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  org_id        UUID      │
│ FK  user_id       UUID      │
│     employee_id   VARCHAR   │  (corporate ID used at registration)
│     is_active     BOOLEAN   │
│     joined_at     TIMESTAMP │
└─────────────────────────────┘

┌─────────────────────────────┐
│    org_invoices             │
├─────────────────────────────┤
│ PK  id            UUID      │
│ FK  org_id        UUID      │
│     period_start  DATE      │
│     period_end    DATE      │
│     total_sessions INT      │
│     total_amount  INT       │  (paise)
│     status        ENUM      │  (draft, sent, paid, overdue)
│     razorpay_invoice_id VARCHAR│
│     paid_at       TIMESTAMP │
│     created_at    TIMESTAMP │
└─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                      SYSTEM TABLES                                   │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐    ┌─────────────────────────────┐
│      notifications          │    │       audit_logs            │
├─────────────────────────────┤    ├─────────────────────────────┤
│ PK  id            UUID      │    │ PK  id            UUID      │
│ FK  user_id       UUID      │    │ FK  user_id       UUID(NUL) │
│     channel       ENUM      │    │     action        VARCHAR   │
│     (email,sms,whatsapp,push)│   │     entity_type   VARCHAR   │
│     type          VARCHAR   │    │     entity_id     UUID      │
│     title         VARCHAR   │    │     old_value     JSONB     │
│     body          TEXT      │    │     new_value     JSONB     │
│     metadata      JSONB     │    │     ip_address    INET      │
│     sent_at       TIMESTAMP │    │     user_agent    TEXT      │
│     read_at       TIMESTAMP │    │     created_at    TIMESTAMP │
│     created_at    TIMESTAMP │    └─────────────────────────────┘
└─────────────────────────────┘
```

## 3.2 Entity Relationship Summary

```
users ──────── 1:1 ──── user_profiles
users ──────── M:1 ──── roles
users ──────── 1:1 ──── providers          (if role = therapist/psychiatrist/coach)
users ──────── 1:M ──── subscriptions
users ──────── 1:M ──── payments
users ──────── 1:M ──── assessments        (as patient)
users ──────── 1:M ──── sessions           (as patient OR provider)
users ──────── 1:M ──── ai_conversations
users ──────── 1:M ──── mood_entries
users ──────── 1:M ──── content_purchases
users ──────── 1:M ──── notifications
users ──────── M:1 ──── organizations      (optional, via org_employees)

roles ──────── M:M ──── permissions        (via role_permissions)

providers ──── 1:M ──── provider_availability
providers ──── M:1 ──── plans              (lead plan)
providers ──── 1:M ──── leads              (purchased leads)
providers ──── 1:M ──── sessions           (as provider)
providers ──── 1:M ──── payouts

plans ─────── 1:M ──── subscriptions

assessments ── 1:M ──── leads

leads ─────── M:1 ──── sessions            (lead can result in session)

sessions ───── 1:1 ──── payments           (session payment)

content_library ── 1:M ── content_purchases

organizations ─ 1:M ── org_employees
organizations ─ 1:M ── org_invoices
```

---

# 4. DATA FLOW DIAGRAMS

## 4.1 DFD Level 0 — Context Diagram

```
                ┌──────────────┐
                │   Patient    │
                └──────┬───────┘
                       │
          Registration,│Assessment,
          Booking,     │Payment,
          Chat         │Mood Data
                       │
                       ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────┐
│   Provider   │──│                 │──│   Razorpay   │
│  (Therapist/ │  │                 │  │  (Payments)  │
│  Psychiatrist│  │    MANAS360     │  └──────────────┘
│  Coach)      │  │    PLATFORM     │
└──────────────┘  │                 │  ┌──────────────┐
                  │                 │──│  Agora       │
┌──────────────┐  │                 │  │  (Video)     │
│  Corporate   │──│                 │  └──────────────┘
│  Admin       │  │                 │
└──────────────┘  │                 │  ┌──────────────┐
                  │                 │──│  Claude AI   │
┌──────────────┐  │                 │  │  (Chat/Mood) │
│  Platform    │──│                 │  └──────────────┘
│  Admin       │  │                 │
└──────────────┘  │                 │  ┌──────────────┐
                  │                 │──│  Twilio      │
                  │                 │  │  (SMS/WA)    │
                  └─────────────────┘  └──────────────┘
```

## 4.2 DFD Level 1 — Major Processes

```
┌───────────────────────────────────────────────────────────────────────┐
│                        MANAS360 (DECOMPOSED)                          │
│                                                                       │
│                                                                       │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐      │
│   │  1.0    │     │  2.0    │     │  3.0    │     │  4.0    │      │
│   │  AUTH   │     │ ASSESS- │     │ MATCHING│     │ LEAD    │      │
│   │ & USER  │────▶│  MENT   │────▶│ ENGINE  │────▶│ MARKET- │      │
│   │ MGMT   │     │         │     │         │     │  PLACE  │      │
│   └────┬────┘     └─────────┘     └─────────┘     └────┬────┘      │
│        │                                                │           │
│        │          ┌─────────┐                          │           │
│        │          │  5.0    │                          │           │
│        └─────────▶│ SESSION │◀─────────────────────────┘           │
│                   │ MGMT    │                                       │
│                   └────┬────┘                                       │
│                        │                                            │
│   ┌─────────┐     ┌───▼─────┐     ┌─────────┐     ┌─────────┐    │
│   │  6.0    │     │  7.0    │     │  8.0    │     │  9.0    │    │
│   │SUBSCR-  │     │ PAYMENT │     │ AI      │     │ CONTENT │    │
│   │ IPTION  │────▶│ & PAYOUT│     │ SERVICE │     │ LIBRARY │    │
│   │ MGMT    │     │         │     │ (Claude)│     │ (Sound/ │    │
│   └─────────┘     └─────────┘     └─────────┘     │  Sleep) │    │
│                                                     └─────────┘    │
│   ┌─────────┐     ┌─────────┐                                     │
│   │ 10.0   │     │ 11.0   │                                     │
│   │NOTIFI- │     │ ADMIN  │                                     │
│   │ CATION │     │ & CORP │                                     │
│   └─────────┘     └─────────┘                                     │
└───────────────────────────────────────────────────────────────────────┘

DATA STORES:
  D1 = users, user_profiles, roles, permissions
  D2 = assessments
  D3 = leads
  D4 = providers, provider_availability
  D5 = sessions
  D6 = subscriptions, plans
  D7 = payments, payouts
  D8 = ai_conversations, mood_entries
  D9 = content_library, content_purchases
  D10 = notifications, audit_logs
  D11 = organizations, org_employees, org_invoices
```

## 4.3 DFD Level 2 — Payment & Payout (Process 7.0 Expanded)

This is the most complex module with 5 payment types + auto-split + webhooks.

```
┌───────────────────────────────────────────────────────────────────────┐
│                 PROCESS 7.0: PAYMENT & PAYOUT (EXPANDED)              │
│                                                                       │
│                                                                       │
│  FROM 5.0 ──────┐       FROM 6.0 ──────┐       FROM 4.0 ──────┐    │
│  (Session)      │       (Subscription)  │       (Lead Purchase) │    │
│                 ▼                       ▼                       ▼    │
│          ┌──────────┐           ┌──────────┐           ┌──────────┐ │
│          │ 7.1      │           │ 7.2      │           │ 7.3      │ │
│          │ Create   │           │ Create   │           │ Create   │ │
│          │ Session  │           │ Sub      │           │ Lead     │ │
│          │ Order    │           │ Order    │           │ Order    │ │
│          └────┬─────┘           └────┬─────┘           └────┬─────┘ │
│               │                      │                      │       │
│               └──────────┬───────────┴──────────┬───────────┘       │
│                          │                      │                    │
│                          ▼                      │                    │
│                   ┌──────────┐                  │                    │
│                   │ 7.4      │                  │                    │
│                   │ Razorpay │◀── FROM 9.0 ─────┘                   │
│                   │ Checkout │    (Content à la carte)               │
│                   └────┬─────┘                                       │
│                        │                                             │
│              ┌─────────┼──────────┐                                  │
│              │         │          │                                   │
│              ▼         ▼          ▼                                   │
│         [SUCCESS]  [FAILURE]  [WEBHOOK]                              │
│              │         │          │                                   │
│              ▼         │          ▼                                   │
│       ┌──────────┐    │   ┌──────────┐                              │
│       │ 7.5      │    │   │ 7.6      │                              │
│       │ Verify   │    │   │ Webhook  │                              │
│       │ Signature│    │   │ Handler  │                              │
│       └────┬─────┘    │   │ (idempo- │                              │
│            │          │   │  tent)   │                              │
│            ▼          │   └────┬─────┘                              │
│       ┌──────────┐    │        │                                     │
│       │ 7.7      │    │        │                                     │
│       │ Record   │◀───┘        │                                     │
│       │ Payment  │◀────────────┘                                     │
│       │ in D7    │                                                   │
│       └────┬─────┘                                                   │
│            │                                                         │
│            ├── If session payment ──▶ ┌──────────┐                  │
│            │                          │ 7.8      │                  │
│            │                          │ Razorpay │                  │
│            │                          │ Route    │                  │
│            │                          │ Transfer │                  │
│            │                          │ 60% ──▶ Therapist          │
│            │                          │ 40% ──▶ Platform           │
│            │                          └────┬─────┘                  │
│            │                               │                        │
│            │                               ▼                        │
│            │                         ┌──────────┐                   │
│            │                         │ 7.9      │                   │
│            │                         │ Record   │                   │
│            │                         │ Payout   │                   │
│            │                         │ in D7    │                   │
│            │                         └──────────┘                   │
│            │                                                         │
│            ├── If subscription ──────▶ Activate/Renew in D6         │
│            ├── If lead purchase ─────▶ Unlock lead in D3            │
│            ├── If content purchase ──▶ Grant access in D9           │
│            │                                                         │
│            ▼                                                         │
│       ┌──────────┐                                                   │
│       │ 7.10     │                                                   │
│       │ Trigger  │──▶ TO 10.0 (Send receipt, confirmation)          │
│       │ Notifs   │                                                   │
│       └──────────┘                                                   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

# 5. SEQUENCE DIAGRAMS

## 5.1 User Registration

```
Patient          React SPA           Express API         PostgreSQL       Twilio/SES
  │                  │                    │                   │               │
  │  Fill form       │                    │                   │               │
  │─────────────────▶│                    │                   │               │
  │                  │  POST /api/auth/   │                   │               │
  │                  │  register          │                   │               │
  │                  │───────────────────▶│                   │               │
  │                  │                    │  Validate input   │               │
  │                  │                    │  Hash password    │               │
  │                  │                    │  BEGIN TRANSACTION│               │
  │                  │                    │──────────────────▶│               │
  │                  │                    │  INSERT users     │               │
  │                  │                    │  INSERT user_profiles              │
  │                  │                    │  INSERT default   │               │
  │                  │                    │  subscription(free)│              │
  │                  │                    │◀──────────────────│               │
  │                  │                    │  COMMIT           │               │
  │                  │                    │                   │               │
  │                  │                    │  Generate OTP     │               │
  │                  │                    │  Store in Redis   │               │
  │                  │                    │  (5 min TTL)      │               │
  │                  │                    │──────────────────────────────────▶│
  │                  │                    │                   │  Send OTP SMS │
  │                  │  201 + temp_token  │                   │               │
  │                  │◀──────────────────│                   │               │
  │  Show OTP input  │                    │                   │               │
  │◀─────────────────│                    │                   │               │
  │                  │                    │                   │               │
  │  Enter OTP       │                    │                   │               │
  │─────────────────▶│                    │                   │               │
  │                  │  POST /api/auth/   │                   │               │
  │                  │  verify-otp        │                   │               │
  │                  │───────────────────▶│                   │               │
  │                  │                    │  Check Redis OTP  │               │
  │                  │                    │  Mark phone_verified = true       │
  │                  │                    │  Generate JWT     │               │
  │                  │                    │  (access + refresh)│              │
  │                  │  200 + JWT tokens  │                   │               │
  │                  │◀──────────────────│                   │               │
  │  Redirect to     │                    │                   │               │
  │  Dashboard       │                    │                   │               │
  │◀─────────────────│                    │                   │               │
```

## 5.2 Login

```
User             React SPA           Express API         PostgreSQL         Redis
  │                  │                    │                   │               │
  │  Email + Pass    │                    │                   │               │
  │─────────────────▶│                    │                   │               │
  │                  │  POST /api/auth/   │                   │               │
  │                  │  login             │                   │               │
  │                  │───────────────────▶│                   │               │
  │                  │                    │  SELECT user      │               │
  │                  │                    │  WHERE email      │               │
  │                  │                    │──────────────────▶│               │
  │                  │                    │◀──────────────────│               │
  │                  │                    │  bcrypt.compare() │               │
  │                  │                    │                   │               │
  │                  │                    │  If MATCH:        │               │
  │                  │                    │   Generate JWT    │               │
  │                  │                    │   (role, user_id, │               │
  │                  │                    │    org_id, plan)  │               │
  │                  │                    │   Store session ──────────────────▶│
  │                  │                    │   Update last_login               │
  │                  │                    │   Log audit_event │               │
  │                  │                    │                   │               │
  │                  │  200 + {           │                   │               │
  │                  │   access_token,    │                   │               │
  │                  │   refresh_token,   │                   │               │
  │                  │   user: {role,     │                   │               │
  │                  │    permissions}    │                   │               │
  │                  │  }                 │                   │               │
  │                  │◀──────────────────│                   │               │
  │                  │                    │                   │               │
  │                  │  Store tokens in   │                   │               │
  │                  │  httpOnly cookie   │                   │               │
  │                  │  Route by role:    │                   │               │
  │                  │   patient → /dashboard                 │               │
  │                  │   therapist → /provider/dashboard      │               │
  │                  │   admin → /admin                       │               │
  │  Dashboard       │                    │                   │               │
  │◀─────────────────│                    │                   │               │
```

## 5.3 Session Booking

```
Patient          React SPA           Express API       PostgreSQL    Razorpay     Agora
  │                  │                    │                │            │           │
  │  Select therapist│                    │                │            │           │
  │  + time slot     │                    │                │            │           │
  │─────────────────▶│                    │                │            │           │
  │                  │  POST /api/        │                │            │           │
  │                  │  sessions/book     │                │            │           │
  │                  │───────────────────▶│                │            │           │
  │                  │                    │  Check provider│            │           │
  │                  │                    │  availability  │            │           │
  │                  │                    │───────────────▶│            │           │
  │                  │                    │◀──────────────│            │           │
  │                  │                    │                │            │           │
  │                  │                    │  Check org_id? │            │           │
  │                  │                    │  Apply corp    │            │           │
  │                  │                    │  discount if   │            │           │
  │                  │                    │  applicable    │            │           │
  │                  │                    │                │            │           │
  │                  │                    │  Calculate fee:│            │           │
  │                  │                    │  session_rate  │            │           │
  │                  │                    │  - corp_discount│           │           │
  │                  │                    │                │            │           │
  │                  │                    │  Create Razorpay order ───▶│           │
  │                  │                    │  with Route:   │            │           │
  │                  │                    │   60% → provider│           │           │
  │                  │                    │   40% → platform│           │           │
  │                  │                    │◀───────────────────────────│           │
  │                  │                    │                │            │           │
  │                  │                    │  INSERT session│            │           │
  │                  │                    │  status=booked │            │           │
  │                  │                    │───────────────▶│            │           │
  │                  │                    │                │            │           │
  │                  │  { order_id,       │                │            │           │
  │                  │    amount, key }   │                │            │           │
  │                  │◀──────────────────│                │            │           │
  │                  │                    │                │            │           │
  │  Razorpay        │                    │                │            │           │
  │  Checkout Modal  │                    │                │            │           │
  │─── UPI/Card ────────────────────────────────────────────▶│         │           │
  │                  │                    │                │  Payment   │           │
  │◀─── success ────────────────────────────────────────────│          │           │
  │                  │                    │                │            │           │
  │                  │  POST /api/        │                │            │           │
  │                  │  payments/verify   │                │            │           │
  │                  │  {order_id,        │                │            │           │
  │                  │   payment_id,      │                │            │           │
  │                  │   signature}       │                │            │           │
  │                  │───────────────────▶│                │            │           │
  │                  │                    │  Verify HMAC   │            │           │
  │                  │                    │  signature     │            │           │
  │                  │                    │                │            │           │
  │                  │                    │  INSERT payment│            │           │
  │                  │                    │  status=captured│           │           │
  │                  │                    │───────────────▶│            │           │
  │                  │                    │                │            │           │
  │                  │                    │  Generate Agora │           │           │
  │                  │                    │  channel + token│────────────────────▶│
  │                  │                    │◀────────────────────────────────────│
  │                  │                    │                │            │           │
  │                  │                    │  UPDATE session│            │           │
  │                  │                    │  agora_channel, │            │          │
  │                  │                    │  agora_token   │            │           │
  │                  │                    │───────────────▶│            │           │
  │                  │                    │                │            │           │
  │                  │                    │  Queue: send   │            │           │
  │                  │                    │  notifications │            │           │
  │                  │                    │  to patient +  │            │           │
  │                  │                    │  provider      │            │           │
  │                  │                    │                │            │           │
  │                  │  200 { session_id, │                │            │           │
  │                  │    scheduled_at,   │                │            │           │
  │                  │    confirmation }  │                │            │           │
  │                  │◀──────────────────│                │            │           │
  │  Booking         │                    │                │            │           │
  │  Confirmed       │                    │                │            │           │
  │◀─────────────────│                    │                │            │           │
```

## 5.4 Therapist Accepting Lead (Purchasing)

```
Therapist        React SPA           Express API       PostgreSQL    Razorpay     Twilio
  │                  │                    │                │            │           │
  │  View lead queue │                    │                │            │           │
  │─────────────────▶│                    │                │            │           │
  │                  │  GET /api/leads/   │                │            │           │
  │                  │  available         │                │            │           │
  │                  │───────────────────▶│                │            │           │
  │                  │                    │  SELECT leads  │            │           │
  │                  │                    │  WHERE status= │            │           │
  │                  │                    │  'available'   │            │           │
  │                  │                    │  AND match_score│            │           │
  │                  │                    │  AND provider  │            │           │
  │                  │                    │  specializations│           │           │
  │                  │                    │───────────────▶│            │           │
  │                  │                    │◀──────────────│            │           │
  │                  │  [lead previews]   │                │            │           │
  │                  │  (symptoms, score, │                │            │           │
  │                  │   lang — NO PII)   │                │            │           │
  │                  │◀──────────────────│                │            │           │
  │  Lead cards      │                    │                │            │           │
  │◀─────────────────│                    │                │            │           │
  │                  │                    │                │            │           │
  │  Click "Buy Lead"│                    │                │            │           │
  │  (₹300-500)     │                    │                │            │           │
  │─────────────────▶│                    │                │            │           │
  │                  │  POST /api/leads/  │                │            │           │
  │                  │  purchase          │                │            │           │
  │                  │───────────────────▶│                │            │           │
  │                  │                    │  Check therapist│           │           │
  │                  │                    │  lead_plan limit│           │           │
  │                  │                    │  Check lead     │           │           │
  │                  │                    │  still available│           │           │
  │                  │                    │  Check patient  │           │           │
  │                  │                    │  2h window valid│           │           │
  │                  │                    │                │            │           │
  │                  │                    │  Create order  ────────────▶│          │
  │                  │                    │◀───────────────────────────│           │
  │                  │  { order_id }      │                │            │           │
  │                  │◀──────────────────│                │            │           │
  │                  │                    │                │            │           │
  │  Pay via         │                    │                │            │           │
  │  Razorpay        │                    │                │            │           │
  │─── UPI ──────────────────────────────────────────────▶│            │           │
  │◀── success ──────────────────────────────────────────│            │           │
  │                  │                    │                │            │           │
  │                  │  POST /api/leads/  │                │            │           │
  │                  │  confirm           │                │            │           │
  │                  │───────────────────▶│                │            │           │
  │                  │                    │  Verify payment│            │           │
  │                  │                    │                │            │           │
  │                  │                    │  BEGIN TXN:    │            │           │
  │                  │                    │  UPDATE lead   │            │           │
  │                  │                    │   status=purchased          │           │
  │                  │                    │   provider_id=X│            │           │
  │                  │                    │  INSERT payment│            │           │
  │                  │                    │  COMMIT        │            │           │
  │                  │                    │───────────────▶│            │           │
  │                  │                    │                │            │           │
  │                  │                    │  Notify patient via SMS ──────────────▶│
  │                  │                    │  "Therapist will contact you"          │
  │                  │                    │                │            │           │
  │                  │  200 { patient     │                │            │           │
  │                  │   contact info,    │                │            │           │
  │                  │   full assessment }│                │            │           │
  │                  │◀──────────────────│                │            │           │
  │  Patient details │                    │                │            │           │
  │  unlocked        │                    │                │            │           │
  │◀─────────────────│                    │                │            │           │
```

## 5.5 Subscription Purchase

```
Patient          React SPA           Express API       PostgreSQL    Razorpay
  │                  │                    │                │            │
  │  Select plan     │                    │                │            │
  │  (₹299/mo)      │                    │                │            │
  │─────────────────▶│                    │                │            │
  │                  │  POST /api/        │                │            │
  │                  │  subscriptions/    │                │            │
  │                  │  create            │                │            │
  │                  │  {plan_id}         │                │            │
  │                  │───────────────────▶│                │            │
  │                  │                    │  Fetch plan    │            │
  │                  │                    │───────────────▶│            │
  │                  │                    │◀──────────────│            │
  │                  │                    │                │            │
  │                  │                    │  razorpay      │            │
  │                  │                    │  .subscriptions│            │
  │                  │                    │  .create() ───────────────▶│
  │                  │                    │◀──────────────────────────│
  │                  │                    │                │            │
  │                  │                    │  INSERT        │            │
  │                  │                    │  subscription  │            │
  │                  │                    │  status=created│            │
  │                  │                    │───────────────▶│            │
  │                  │                    │                │            │
  │                  │  { sub_id,         │                │            │
  │                  │    short_url }     │                │            │
  │                  │◀──────────────────│                │            │
  │                  │                    │                │            │
  │  Razorpay        │                    │                │  WEBHOOK   │
  │  payment page    │                    │                │            │
  │─── Pay ─────────────────────────────────────────────▶│            │
  │◀── redirect ────────────────────────────────────────│            │
  │                  │                    │                │            │
  │                  │                    │                │  WEBHOOK:  │
  │                  │                    │◀── subscription.activated ──│
  │                  │                    │                │            │
  │                  │                    │  Verify webhook│            │
  │                  │                    │  signature     │            │
  │                  │                    │                │            │
  │                  │                    │  UPDATE sub    │            │
  │                  │                    │  status=active │            │
  │                  │                    │  period_start  │            │
  │                  │                    │  period_end    │            │
  │                  │                    │───────────────▶│            │
  │                  │                    │                │            │
  │                  │                    │  INSERT payment│            │
  │                  │                    │  type=subscr.  │            │
  │                  │                    │───────────────▶│            │
  │                  │                    │                │            │
  │                  │                    │  Queue: welcome│            │
  │                  │                    │  email + SMS   │            │
  │                  │                    │                │            │
  │                  │                    │                │            │
  │  (On next login  │                    │                │            │
  │   JWT refreshed  │                    │                │            │
  │   with plan info)│                    │                │            │
```

## 5.6 Payment Webhook Handling

```
Razorpay              Express API              PostgreSQL            Redis
  │                        │                       │                   │
  │  POST /api/webhooks/   │                       │                   │
  │  razorpay              │                       │                   │
  │  {event, payload,      │                       │                   │
  │   x-razorpay-signature}│                       │                   │
  │───────────────────────▶│                       │                   │
  │                        │                       │                   │
  │                        │  1. Verify HMAC-SHA256│                   │
  │                        │     signature using   │                   │
  │                        │     webhook_secret    │                   │
  │                        │                       │                   │
  │                        │  2. Idempotency check│                   │
  │                        │     GET event_id ─────────────────────────▶│
  │                        │     from Redis        │                   │
  │                        │◀──────────────────────────────────────────│
  │                        │     If exists → return │                  │
  │                        │     200 (skip)        │                   │
  │                        │                       │                   │
  │                        │  3. SET event_id ──────────────────────────▶│
  │                        │     TTL=48h           │                   │
  │                        │                       │                   │
  │                        │  4. Route by event:   │                   │
  │                        │                       │                   │
  │                        │  ┌─ payment.captured ─────────────────┐   │
  │                        │  │  SELECT payment    │               │   │
  │                        │  │  by order_id       │               │   │
  │                        │  │──────────────────▶│               │   │
  │                        │  │  UPDATE status=    │               │   │
  │                        │  │  captured          │               │   │
  │                        │  │──────────────────▶│               │   │
  │                        │  │                    │               │   │
  │                        │  │  If session payment:               │   │
  │                        │  │  → Razorpay Route auto-splits     │   │
  │                        │  │  → INSERT payout record           │   │
  │                        │  │  → UPDATE session status          │   │
  │                        │  │                    │               │   │
  │                        │  │  If lead purchase: │               │   │
  │                        │  │  → UPDATE lead status=purchased   │   │
  │                        │  │  → Reveal patient PII             │   │
  │                        │  └────────────────────────────────────┘   │
  │                        │                       │                   │
  │                        │  ┌─ subscription.activated ───────────┐   │
  │                        │  │  UPDATE subscription               │   │
  │                        │  │  status=active                     │   │
  │                        │  │  INSERT payment                    │   │
  │                        │  └────────────────────────────────────┘   │
  │                        │                       │                   │
  │                        │  ┌─ subscription.charged ─────────────┐   │
  │                        │  │  Renewal payment — same as above   │   │
  │                        │  └────────────────────────────────────┘   │
  │                        │                       │                   │
  │                        │  ┌─ payment.failed ──────────────────┐    │
  │                        │  │  UPDATE payment status=failed     │    │
  │                        │  │  Queue: retry notification        │    │
  │                        │  │  If subscription: mark past_due   │    │
  │                        │  └────────────────────────────────────┘   │
  │                        │                       │                   │
  │                        │  5. Queue notification│                   │
  │                        │     (email/SMS)       │                   │
  │                        │                       │                   │
  │  200 OK                │                       │                   │
  │◀───────────────────────│                       │                   │
```

## 5.7 Admin User Management

```
Admin            React SPA           Express API       PostgreSQL
  │                  │                    │                │
  │  /admin/users    │                    │                │
  │─────────────────▶│                    │                │
  │                  │  GET /api/admin/   │                │
  │                  │  users?page=1&     │                │
  │                  │  role=therapist&   │                │
  │                  │  status=pending    │                │
  │                  │───────────────────▶│                │
  │                  │                    │  RBAC check:   │
  │                  │                    │  role=admin?   │
  │                  │                    │  permission=   │
  │                  │                    │  users.read?   │
  │                  │                    │                │
  │                  │                    │  SELECT users  │
  │                  │                    │  JOIN providers│
  │                  │                    │  JOIN subs     │
  │                  │                    │  OFFSET/LIMIT  │
  │                  │                    │───────────────▶│
  │                  │                    │◀──────────────│
  │                  │  {users[], total,  │                │
  │                  │   page, pages}     │                │
  │                  │◀──────────────────│                │
  │  User table      │                    │                │
  │◀─────────────────│                    │                │
  │                  │                    │                │
  │  Click "Verify"  │                    │                │
  │  on Dr. Anjali   │                    │                │
  │─────────────────▶│                    │                │
  │                  │  PATCH /api/admin/ │                │
  │                  │  providers/{id}/   │                │
  │                  │  verify            │                │
  │                  │───────────────────▶│                │
  │                  │                    │  RBAC check:   │
  │                  │                    │  providers.     │
  │                  │                    │  verify?        │
  │                  │                    │                │
  │                  │                    │  UPDATE provider│
  │                  │                    │  license_verified│
  │                  │                    │  = true         │
  │                  │                    │  verification_  │
  │                  │                    │  date = NOW()   │
  │                  │                    │───────────────▶│
  │                  │                    │                │
  │                  │                    │  INSERT audit_ │
  │                  │                    │  log (admin_id,│
  │                  │                    │  action=verify)│
  │                  │                    │───────────────▶│
  │                  │                    │                │
  │                  │                    │  Queue: send   │
  │                  │                    │  verification  │
  │                  │                    │  email to Dr.  │
  │                  │                    │                │
  │                  │  200 {verified:    │                │
  │                  │   true}            │                │
  │                  │◀──────────────────│                │
  │  Status updated  │                    │                │
  │◀─────────────────│                    │                │
```

---

# 6. RELATIONSHIP ANALYSIS

## 6.1 User → Role Mapping

```
┌──────────────────────────────────────────────────────────────────┐
│                        ROLE HIERARCHY                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      ADMIN                                 │ │
│  │  Full platform access. Verify providers. View analytics.   │ │
│  │  Manage subscriptions. Corporate setup. System config.     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│          ┌────────────────┼────────────────┐                    │
│          ▼                ▼                ▼                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  THERAPIST   │ │ PSYCHIATRIST │ │   COACH      │           │
│  │              │ │              │ │              │           │
│  │ • Sessions   │ │ • Sessions   │ │ • Sessions   │           │
│  │ • Buy leads  │ │ • Buy leads  │ │ • Buy leads  │           │
│  │ • CBT tools  │ │ • CBT tools  │ │ • Lifestyle  │           │
│  │ • Notes      │ │ • Prescribe  │ │   coaching   │           │
│  │              │ │ • Medication │ │ • Wellness   │           │
│  │ • RCI license│ │ • NMC license│ │ • Cert req'd │           │
│  │ • ₹1K-3K/ses│ │ • ₹2K-5K/ses│ │ • ₹500-1.5K  │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      PATIENT                               │ │
│  │  Book sessions. Take assessments. Access premium content.  │ │
│  │  Use AnytimeBuddy. Track mood. View own data only.        │ │
│  │                                                            │ │
│  │  Sub-variant: CORPORATE PATIENT                           │ │
│  │  Same as patient + org_id + employee_id + discount rate   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 6.2 Role → Permission Mapping

```
PERMISSION FORMAT: resource.action

┌─────────────────────────┬───────┬─────┬──────┬──────┬───────┐
│ Permission              │ Admin │ Pat │ Ther │ Psyc │ Coach │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ users.read_all          │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
│ users.read_own          │  ✅   │  ✅  │  ✅   │  ✅   │  ✅   │
│ users.update_own        │  ✅   │  ✅  │  ✅   │  ✅   │  ✅   │
│ users.delete            │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
│ users.verify_provider   │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ assessments.create      │  ❌   │  ✅  │  ❌   │  ❌   │  ❌   │
│ assessments.read_own    │  ❌   │  ✅  │  ❌   │  ❌   │  ❌   │
│ assessments.read_all    │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ leads.view_available    │  ❌   │  ❌  │  ✅   │  ✅   │  ✅   │
│ leads.purchase          │  ❌   │  ❌  │  ✅   │  ✅   │  ✅   │
│ leads.view_all          │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ sessions.book           │  ❌   │  ✅  │  ❌   │  ❌   │  ❌   │
│ sessions.join           │  ❌   │  ✅  │  ✅   │  ✅   │  ✅   │
│ sessions.mark_noshow    │  ❌   │  ❌  │  ✅   │  ✅   │  ✅   │
│ sessions.mark_complete  │  ❌   │  ❌  │  ✅   │  ✅   │  ✅   │
│ sessions.view_all       │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ prescriptions.create    │  ❌   │  ❌  │  ❌   │  ✅   │  ❌   │
│ prescriptions.read_own  │  ❌   │  ✅  │  ✅   │  ✅   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ subscriptions.manage    │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
│ subscriptions.own       │  ❌   │  ✅  │  ✅   │  ✅   │  ✅   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ content.browse          │  ✅   │  ✅  │  ✅   │  ✅   │  ✅   │
│ content.purchase        │  ❌   │  ✅  │  ❌   │  ❌   │  ❌   │
│ content.manage          │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ ai.anytime_buddy        │  ❌   │  ✅  │  ❌   │  ❌   │  ❌   │
│ ai.crisis_detect        │  ✅   │  ✅  │  ✅   │  ✅   │  ❌   │
│ ai.mood_track           │  ❌   │  ✅  │  ❌   │  ❌   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ analytics.platform      │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
│ analytics.own_practice  │  ❌   │  ❌  │  ✅   │  ✅   │  ✅   │
│ analytics.own_progress  │  ❌   │  ✅  │  ❌   │  ❌   │  ❌   │
├─────────────────────────┼───────┼─────┼──────┼──────┼───────┤
│ corporate.manage        │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
│ corporate.view_own_org  │  ❌   │  ✅* │  ❌   │  ❌   │  ❌   │
│ payouts.view_own        │  ❌   │  ❌  │  ✅   │  ✅   │  ✅   │
│ payouts.manage          │  ✅   │  ❌  │  ❌   │  ❌   │  ❌   │
└─────────────────────────┴───────┴─────┴──────┴──────┴───────┘

* Only if patient has org_id (corporate employee)
```

## 6.3 Subscription → Feature Access

```
PATIENT PLANS:
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│ Feature          │ Free         │ Basic ₹299   │ Premium ₹999 │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ Assessment       │ 1 free       │ Unlimited    │ Unlimited    │
│ Sound (stream)   │ 3 tracks/day │ Unlimited    │ Unlimited    │
│ Sound (download) │ ❌            │ ❌            │ ✅            │
│ Sleep programs   │ 1 free       │ 5/month      │ Unlimited    │
│ AnytimeBuddy     │ ❌            │ ₹150/call    │ Unlimited    │
│ Mood tracking    │ Basic        │ Full         │ Full + AI    │
│ Digital pets     │ 1 starter    │ 3 pets       │ All pets     │
│ Content à la carte│ ₹30/track   │ ₹30/track    │ Included     │
│ Priority matching│ ❌            │ ❌            │ ✅            │
│ Session discount │ 0%           │ 0%           │ 10%          │
│ Group sessions   │ ❌            │ ❌            │ ✅            │
└──────────────────┴──────────────┴──────────────┴──────────────┘

PROVIDER PLANS:
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│ Feature          │ Free         │ Basic ₹499   │ Premium ₹999 │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ Leads/week       │ 1            │ 3            │ 7            │
│ Profile boost    │ ❌            │ ❌            │ ✅            │
│ Analytics        │ Basic        │ Full         │ Full + Export│
│ Training/Certs   │ 1 free       │ All          │ All + Badge  │
│ Auto-matching    │ ❌            │ ❌            │ ✅            │
│ Priority support │ ❌            │ ❌            │ ✅            │
└──────────────────┴──────────────┴──────────────┴──────────────┘
```

## 6.4 Session → Patient & Provider Relationship

```
┌───────────┐      BOOKS       ┌───────────┐
│  Patient  │─────────────────▶│  Session  │
│           │                  │           │
│  user_id  │◀─── rated_by ───│  rating   │
│  org_id?  │                  │  status   │
└───────────┘                  │  fee      │
                               │  agora_ch │
┌───────────┐    CONDUCTS     │           │
│  Provider │─────────────────▶│           │
│           │                  │           │
│  user_id  │◀── no_show_by ──│  no_show  │
│  type     │◀── 60% of fee ──│  payout   │
│  rate     │                  └───────────┘
└───────────┘

Session State Machine:
  booked ───────▶ live ────────▶ completed
    │                               │
    └──────▶ no_show ◀──────────────┘ (therapist marks)
             (no refund)

Rules:
  • Patient CANNOT cancel (confirmed design decision)
  • Therapist marks no_show manually
  • No refunds on any session
  • 60/40 split happens via Razorpay Route at payment capture
  • Agora token generated at booking, valid for 24h
  • Corporate patients get org discount applied at booking
```

## 6.5 Payment → Subscription Activation Logic

```
┌─────────────────────────────────────────────────────────────────┐
│              PAYMENT → ACTIVATION STATE MACHINE                 │
│                                                                 │
│                                                                 │
│  SUBSCRIPTION FLOW:                                            │
│                                                                 │
│  razorpay.subscriptions.create()                               │
│       │                                                         │
│       ▼                                                         │
│  subscription.status = 'created'                               │
│       │                                                         │
│       │── webhook: subscription.authenticated                  │
│       ▼                                                         │
│  subscription.status = 'authenticated'                         │
│       │                                                         │
│       │── webhook: subscription.activated                      │
│       ▼                                                         │
│  subscription.status = 'active'  ◀──┐                          │
│  → Grant feature access             │                          │
│  → Update JWT claims on next login   │                         │
│       │                              │                          │
│       │── webhook: subscription.charged (monthly renewal)      │
│       │   → INSERT new payment       │                          │
│       │   → Extend period_end        │                          │
│       │   → Keep status = 'active' ──┘                          │
│       │                                                         │
│       │── webhook: subscription.pending (payment retry)        │
│       ▼                                                         │
│  subscription.status = 'past_due'                              │
│  → 3-day grace period (features still active)                  │
│  → Send payment failure notification                           │
│       │                                                         │
│       │── retry succeeds → back to 'active'                    │
│       │── retry fails after 3 attempts                         │
│       ▼                                                         │
│  subscription.status = 'cancelled'                             │
│  → Revoke premium features                                     │
│  → Downgrade to free tier                                      │
│  → Keep data (don't delete)                                    │
│                                                                 │
│                                                                 │
│  SESSION PAYMENT FLOW:                                         │
│                                                                 │
│  razorpay.orders.create({transfers: [{account: provider_route_id,│
│                                       amount: 60%}]})          │
│       │                                                         │
│       ▼                                                         │
│  payment.status = 'created'                                    │
│       │                                                         │
│       │── Razorpay checkout success                            │
│       ▼                                                         │
│  payment.status = 'authorized'                                 │
│       │                                                         │
│       │── Auto-capture (Razorpay setting)                      │
│       ▼                                                         │
│  payment.status = 'captured'                                   │
│  → Razorpay Route auto-transfers 60% to provider              │
│  → INSERT payout record (status=completed)                     │
│  → UPDATE session (confirmed)                                  │
│  → Generate Agora tokens                                       │
│  → Send confirmation notifications                             │
│                                                                 │
│       │── payment.failed webhook                               │
│       ▼                                                         │
│  payment.status = 'failed'                                     │
│  → Session remains unconfirmed                                 │
│  → Notify patient to retry                                     │
│  → Auto-expire after 30 min                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

# 7. FEATURE DEPENDENCY MAPPING

```
┌─────────────────────────────────────────────────────────────────┐
│              FEATURE DEPENDENCY GRAPH                            │
│                                                                 │
│  ┌──────────┐                                                  │
│  │ Auth +   │                                                  │
│  │ RBAC     │◀──── EVERYTHING DEPENDS ON THIS                  │
│  └────┬─────┘                                                  │
│       │                                                         │
│  ┌────▼─────┐     ┌──────────┐                                │
│  │ User     │────▶│ Provider │                                │
│  │ Profile  │     │ Profile  │                                │
│  └────┬─────┘     └────┬─────┘                                │
│       │                │                                        │
│       ▼                ▼                                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │Assessment│───▶│ Matching │───▶│  Lead    │                 │
│  │ (PHQ-9)  │    │ Engine   │    │ Market   │                 │
│  └────┬─────┘    └──────────┘    └────┬─────┘                 │
│       │                               │                        │
│       │         ┌─────────────────────┘                        │
│       ▼         ▼                                              │
│  ┌──────────────────┐     ┌──────────┐                        │
│  │ Subscription     │────▶│ Payment  │                        │
│  │ (Razorpay)       │     │ (Razorpay│                        │
│  └────┬─────────────┘     │  Route)  │                        │
│       │                   └────┬─────┘                        │
│       │                        │                               │
│       ▼                        ▼                               │
│  ┌──────────┐           ┌──────────┐                          │
│  │ Feature  │           │ Session  │                          │
│  │ Gating   │           │ Booking  │                          │
│  └────┬─────┘           └────┬─────┘                          │
│       │                      │                                 │
│       ▼                      ▼                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                │
│  │ Content  │    │ Agora    │    │ Notif-   │                │
│  │ Library  │    │ Video    │    │ ications │                │
│  │ (Sound/  │    │ Session  │    │ (Twilio/ │                │
│  │  Sleep)  │    └──────────┘    │  SES)    │                │
│  └──────────┘                    └──────────┘                │
│                                                                │
│  ┌──────────┐    ┌──────────┐                                │
│  │ Claude   │    │Corporate │                                │
│  │ AI Chat  │    │ Billing  │                                │
│  │(Anytime  │    │(Orgs +   │                                │
│  │ Buddy)   │    │ Invoices)│                                │
│  └──────────┘    └──────────┘                                │
│                                                                │
│  BUILD ORDER (critical path):                                  │
│  1. Auth + RBAC                                                │
│  2. User + Provider profiles                                   │
│  3. Assessment + Matching                                      │
│  4. Subscription + Payment (Razorpay)                          │
│  5. Session booking + Agora                                    │
│  6. Lead marketplace                                           │
│  7. Notifications (Twilio/SES)                                 │
│  8. Content library + à la carte                               │
│  9. Claude AI (AnytimeBuddy)                                   │
│  10. Corporate billing                                         │
│  11. Admin analytics                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

# 8. ARCHITECTURAL RISKS

## 8.1 Security Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| S1 | JWT token theft → session hijack | HIGH | httpOnly cookies, short-lived access tokens (15min), refresh token rotation, Redis token blacklist |
| S2 | Razorpay webhook spoofing | CRITICAL | HMAC-SHA256 signature verification on EVERY webhook. Reject if signature mismatch. Never trust payload without verification. |
| S3 | PII exposure in lead previews | HIGH | Preview data in `leads.preview_data` must NEVER contain name, phone, email. Strict JSONB validation at write time. |
| S4 | Provider accessing other patients' data | HIGH | Row-level security in queries. Every DB query must filter by `provider_id` from JWT. Never trust client-supplied IDs for authorization. |
| S5 | DPDPA non-compliance (data residency) | HIGH | AWS Mumbai region (ap-south-1) only. No S3 replication to non-India regions. Bunny Stream Singapore is a risk — document in privacy policy. |
| S6 | Assessment data in transit | MEDIUM | TLS 1.3 enforced. PHQ-9 scores encrypted at rest in PostgreSQL (pgcrypto). |
| S7 | Agora token reuse | MEDIUM | Tokens expire after 24h. One-time use channel names (UUID). Server-generated only — never client-side. |

## 8.2 Scalability Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| C1 | Matching algorithm slow at scale | MEDIUM | Cache provider specialization matrix in Redis. Pre-compute match scores on assessment submit (background job). Limit to top 20 matches. |
| C2 | Claude API latency spikes | HIGH | 10-second timeout. Queue-based architecture for non-real-time features. Fallback: pre-written responses for common scenarios. Token budget per user per day. |
| C3 | Webhook flood from Razorpay | MEDIUM | Idempotency via Redis (event_id dedup, 48h TTL). Bull queue for webhook processing — don't process inline. Return 200 immediately, process async. |
| C4 | PostgreSQL connection exhaustion | MEDIUM | Connection pooling (pgBouncer or pg pool). Max 20 connections per service. Read replicas for analytics queries. |
| C5 | Notification queue backlog | LOW | Separate Bull queues for email vs SMS vs WhatsApp. Priority queue for crisis notifications. Dead letter queue for failed sends. |

## 8.3 Data Integrity Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| D1 | Double payment on session | CRITICAL | Razorpay order_id is idempotent — same order can only be paid once. Server-side check: if `payments` row exists with `captured` status for this session_id, reject. |
| D2 | Lead purchased by two therapists | CRITICAL | PostgreSQL advisory lock on lead_id during purchase. `SELECT ... FOR UPDATE` on the lead row. Check status='available' inside transaction. |
| D3 | Subscription state mismatch (webhook arrives late) | HIGH | Webhook is source of truth for subscription status, NOT client-side callback. Reconciliation job runs every 6h: fetch all active subscriptions from Razorpay API, compare with DB, fix mismatches. |
| D4 | Orphaned sessions (payment fails after booking) | MEDIUM | Session created with status='pending_payment'. Background job: expire pending sessions older than 30 minutes. Release provider time slot. |
| D5 | Assessment submitted but leads not generated | MEDIUM | Wrap in DB transaction: INSERT assessment + INSERT leads (batch) in single transaction. If matching fails, assessment still saved but flagged for manual review. |

## 8.4 Race Conditions

| # | Race Condition | Impact | Solution |
|---|----------------|--------|----------|
| R1 | Two therapists buying same lead simultaneously | One gets charged, other gets nothing | `SELECT ... FOR UPDATE` + check `status='available'` inside serialized transaction. Loser gets 402 "lead no longer available". |
| R2 | Patient books same slot with two therapists | Double booking | Unique constraint on `sessions(provider_id, scheduled_at)`. Second insert fails with constraint violation → return 409. |
| R3 | Webhook arrives before client callback | Payment recorded twice | Idempotency key in Redis. Both webhook handler and verify endpoint check if payment already recorded. First one wins. |
| R4 | Subscription renewal webhook while user is mid-checkout for upgrade | Plan confusion | Lock user subscription row during any mutation. Webhook handler queues if lock held. |

## 8.5 Payment Fraud Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| F1 | Forged payment success callback | Free sessions | NEVER trust client-side success. Always verify via Razorpay API (server-to-server) + webhook confirmation. Only activate after `payment.captured` webhook with valid signature. |
| F2 | Lead price manipulation | Therapist pays less | Lead price calculated server-side from match score. Client sends only `lead_id`, never price. Server looks up price from DB. |
| F3 | Subscription downgrade while retaining features | Feature leakage | Feature gating checks subscription status on EVERY API request (middleware). Redis cache with 5-min TTL. Webhook updates cache immediately on cancel/downgrade. |
| F4 | Razorpay Route manipulation | Platform doesn't get 40% | Route configuration is set at order creation (server-side). Client has zero control over split ratios. Verify via Razorpay dashboard reconciliation. |
| F5 | Refund abuse via chargebacks | Revenue loss | No-refund policy is a business rule but chargebacks are out of your control. Maintain detailed audit logs + Razorpay receipts for dispute evidence. |

---

# 9. SUGGESTED IMPROVEMENTS

## 9.1 Modular Boundaries

```
Current: Monolith (Express.js)
Recommended: Modular monolith with clear domain boundaries

backend/src/
├── modules/
│   ├── auth/           ← Auth domain (isolated)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   └── auth.validator.ts
│   ├── patient/        ← Patient domain
│   ├── provider/       ← Provider domain (therapist/psychiatrist/coach)
│   ├── session/        ← Session domain
│   ├── payment/        ← Payment domain
│   ├── lead/           ← Lead marketplace domain
│   ├── subscription/   ← Subscription domain
│   ├── content/        ← Content library domain
│   ├── ai/             ← Claude AI domain
│   ├── corporate/      ← Corporate/B2B domain
│   ├── notification/   ← Notification domain
│   └── admin/          ← Admin domain

Benefit: Each module can become a microservice later without refactoring.
Simply extract the module folder into its own Express app.
```

## 9.2 Event-Driven Opportunities

```
Events that should be published (not called directly):

PAYMENT_CAPTURED
├── → SubscriptionService.activate()
├── → NotificationService.sendReceipt()
├── → AnalyticsService.trackRevenue()
└── → AuditService.log()

SESSION_COMPLETED
├── → NotificationService.sendSummary()
├── → MoodService.promptPostSessionCheckin()
├── → AnalyticsService.trackSession()
└── → LeadService.markConverted()

LEAD_PURCHASED
├── → NotificationService.notifyPatient()
├── → LeadService.startContactWindow()
├── → AnalyticsService.trackLeadSale()
└── → ProviderService.decrementLeadQuota()

CRISIS_DETECTED (from Claude AI)
├── → NotificationService.alertCrisisTeam()
├── → SessionService.offerEmergencySlot()
├── → AuditService.logCrisisEvent()
└── → AdminService.flagForReview()

Implementation: Use Node.js EventEmitter for MVP.
Migrate to Redis Pub/Sub or RabbitMQ when scaling.
```

## 9.3 Microservice Split Candidates (Post-MVP)

```
SPLIT PRIORITY:

1. NOTIFICATION SERVICE (first to extract)
   Reason: Highest I/O, independent logic, multiple channels
   Stack: Separate Express app + Bull queue + Redis
   Benefit: Won't block main API during Twilio/SES calls

2. AI SERVICE (second to extract)
   Reason: Unpredictable latency (Claude API), token budgets, different scaling needs
   Stack: Separate Express/FastAPI + rate limiter + token tracking
   Benefit: Can scale independently, add circuit breaker

3. PAYMENT SERVICE (third to extract)
   Reason: PCI compliance isolation, webhook handling
   Stack: Separate Express app + webhook queue
   Benefit: Security boundary, easier audit

Keep as monolith:
- Auth (core to everything)
- Session management (tightly coupled to payment + video)
- Lead marketplace (tightly coupled to assessment + payment)
- Admin (reads from all domains)
```

## 9.4 Background Jobs Needed

```
┌─────────────────────────────┬───────────────┬──────────────────────┐
│ Job                         │ Schedule      │ Queue Priority       │
├─────────────────────────────┼───────────────┼──────────────────────┤
│ Session reminder (24h)      │ Cron: hourly  │ HIGH                 │
│ Session reminder (1h)       │ Cron: q15min  │ HIGH                 │
│ Lead expiry check (2h win)  │ Cron: q5min   │ CRITICAL             │
│ Subscription renewal check  │ Cron: daily   │ HIGH                 │
│ Subscription reconciliation │ Cron: q6h     │ MEDIUM               │
│ Pending payment expiry      │ Cron: q15min  │ HIGH                 │
│ Payout settlement report    │ Cron: weekly  │ LOW                  │
│ Corporate invoice generate  │ Cron: monthly │ MEDIUM               │
│ Analytics rollup            │ Cron: daily   │ LOW                  │
│ Inactive user re-engagement │ Cron: weekly  │ LOW                  │
│ Provider rating recalc      │ Cron: daily   │ LOW                  │
│ Crisis alert processing     │ Event-driven  │ CRITICAL (real-time) │
│ Email/SMS send              │ Event-driven  │ HIGH                 │
│ Webhook processing          │ Event-driven  │ CRITICAL             │
└─────────────────────────────┴───────────────┴──────────────────────┘

Stack: Bull (backed by Redis) with named queues:
- bull:critical (webhooks, crisis, lead expiry)
- bull:high (notifications, reminders, payments)
- bull:medium (subscriptions, corporate)
- bull:low (analytics, reports, re-engagement)
```

## 9.5 Caching Strategy

```
┌─────────────────────────┬────────────┬─────────┬──────────────────┐
│ Data                    │ Cache In   │ TTL     │ Invalidation     │
├─────────────────────────┼────────────┼─────────┼──────────────────┤
│ User session (JWT)      │ Redis      │ 15 min  │ On logout/revoke │
│ Refresh token           │ Redis      │ 7 days  │ On rotation      │
│ User subscription tier  │ Redis      │ 5 min   │ On webhook event │
│ Provider availability   │ Redis      │ 10 min  │ On schedule edit │
│ Provider match matrix   │ Redis      │ 1 hour  │ On profile edit  │
│ Assessment results      │ Redis      │ 30 min  │ On new assessment│
│ Content library catalog │ Redis      │ 1 hour  │ On admin edit    │
│ Feature access matrix   │ In-memory  │ App boot│ On plan change   │
│ Role permissions        │ In-memory  │ App boot│ On admin edit    │
│ Razorpay webhook dedup  │ Redis      │ 48 hours│ Auto-expire      │
│ OTP codes               │ Redis      │ 5 min   │ On verify/expire │
│ Rate limit counters     │ Redis      │ Per rule│ Auto-expire      │
│ API response (GET lists)│ Redis      │ 2 min   │ On mutation      │
└─────────────────────────┴────────────┴─────────┴──────────────────┘

Pattern: Cache-aside (read-through)
1. Check Redis
2. If miss → query PostgreSQL → write to Redis → return
3. On write → invalidate Redis key → write PostgreSQL
```

---

# APPENDIX A: DATABASE INDEX STRATEGY

```sql
-- Performance-critical indexes

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_org ON users(org_id) WHERE org_id IS NOT NULL;

-- Providers
CREATE INDEX idx_providers_type ON providers(provider_type);
CREATE INDEX idx_providers_verified ON providers(license_verified) WHERE license_verified = true;
CREATE INDEX idx_providers_accepting ON providers(is_accepting) WHERE is_accepting = true;
CREATE INDEX idx_providers_specializations ON providers USING GIN(specializations);
CREATE INDEX idx_providers_languages ON providers USING GIN(languages);

-- Sessions
CREATE INDEX idx_sessions_patient ON sessions(patient_id);
CREATE INDEX idx_sessions_provider ON sessions(provider_id);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE UNIQUE INDEX idx_sessions_no_double_book 
  ON sessions(provider_id, scheduled_at) WHERE status != 'no_show';

-- Leads
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_provider ON leads(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_leads_patient_deadline ON leads(patient_acceptance_deadline) 
  WHERE status = 'available';
CREATE INDEX idx_leads_match_score ON leads(match_score DESC);

-- Payments
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(payment_type);

-- Subscriptions
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Assessments
CREATE INDEX idx_assessments_patient ON assessments(patient_id);
CREATE INDEX idx_assessments_severity ON assessments(severity);
CREATE INDEX idx_assessments_crisis ON assessments(is_crisis) WHERE is_crisis = true;

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) 
  WHERE read_at IS NULL;

-- Audit
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

# APPENDIX B: ENV VARIABLES REFERENCE

```bash
# backend/.env

# Server
NODE_ENV=production
PORT=3001
API_URL=https://api.manas360.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/manas360
DB_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<64-char-random>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
RAZORPAY_ROUTE_ENABLED=true

# Agora
AGORA_APP_ID=xxx
AGORA_APP_CERTIFICATE=xxx
AGORA_TOKEN_EXPIRY=86400

# Claude AI
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=4096
CLAUDE_DAILY_TOKEN_BUDGET=100000

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+91xxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+91xxx

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=manas360-documents
AWS_SES_FROM=noreply@manas360.com

# Bhashini
BHASHINI_API_KEY=xxx
BHASHINI_USER_ID=xxx

# Bunny Stream
BUNNY_LIBRARY_ID=xxx
BUNNY_API_KEY=xxx
BUNNY_CDN_HOSTNAME=xxx.b-cdn.net

# CORS
CORS_ORIGIN=https://manas360.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

*MANAS360 · System Architecture v1.0 · From Episodic to Transformational*
*Document generated: February 2026*
*Total entities: 17 tables · 5 roles · 5 payment flows · 8 external services*
