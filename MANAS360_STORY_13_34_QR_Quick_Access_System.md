# STORY 13.34: QR Code Quick Access System
## 5 High-Impact QR Implementations — Ranked by Frequency × Monetization

**Depends On:** Admin QR Generator (already built), Story 13.5v3.0 (WhatsApp), Story 13.30-B (MyDigitalClinic)  
**Reuses:** `qr_codes`, `qr_scans`, `qr_conversions` tables (QR_CODE_TRACKING_SYSTEM.md)

---

## STACK RANK — WHY THESE 5

| Rank | QR Use Case | Frequency | Monetization | Combined |
|:---:|---|:---:|:---:|:---:|
| **1** | **Instant Free Screening** | 5.0 | 5.0 | **10.0** |
| **2** | **Provider Profile / Business Card** | 5.0 | 4.5 | **9.5** |
| **3** | **Patient Check-In at Clinic** | 4.5 | 4.5 | **9.0** |
| **4** | **Session Join Link (Jitsi)** | 4.5 | 4.0 | **8.5** |
| **5** | **Corporate EAP Standee** | 4.0 | 4.5 | **8.5** |

**Scoring rationale:**
- **Frequency 5** = used daily by many users (every patient, every session)
- **Frequency 3** = used weekly or by subset of users
- **Frequency 1** = rare / one-time use
- **Monetization 5** = directly drives session bookings / subscriptions
- **Monetization 3** = drives engagement that leads to revenue
- **Monetization 1** = utility only, no revenue link

---

## SHARED INFRASTRUCTURE

### URL Structure (All QR Types)

All QR codes point to a single tracking endpoint that logs the scan and redirects to the destination. This reuses the existing `qr_codes` + `qr_scans` tables from the admin QR generator.

```
Base URL: https://manas360.com/q/{qr_type}/{unique_id}

Examples:
  /q/screen/std-kle-dharwad-001      → Free screening (standee at KLE University)
  /q/screen/fb-invisible-trap-003    → Free screening (Facebook post #3)
  /q/provider/dr-sindhuja-blr        → Provider profile (Dr. Sindhuja's business card)
  /q/checkin/clinic-chandu-blr-001   → Patient check-in (Chandu's clinic in Bengaluru)
  /q/join/ses-abc123-20260405        → Session join (Jitsi link for session abc123)
  /q/eap/tcs-blr-campus-002         → Corporate EAP (TCS Bengaluru standee #2)
```

### Database Schema (Extends Existing QR Tables)

```sql
-- Extends existing qr_codes table with QR type classification
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS qr_type VARCHAR(30);
  -- Values: 'screening', 'provider_profile', 'patient_checkin', 
  --         'session_join', 'corporate_eap'

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS destination_url TEXT;
  -- Where to redirect after scan is logged

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS owner_id UUID;
  -- For provider/clinic QRs: the therapist's user_id
  -- For corporate: the corporate_id  
  -- For screening: NULL (public)

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS is_dynamic BOOLEAN DEFAULT true;
  -- Dynamic = destination can change without reprinting
  -- Static = destination baked into URL

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
  -- For session join QRs: expires after session time + 1 hour
  -- For others: NULL (permanent)

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
  -- Denormalized counter for quick dashboard reads

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP;

-- QR conversion events (extends existing qr_conversions)
ALTER TABLE qr_conversions ADD COLUMN IF NOT EXISTS conversion_type VARCHAR(50);
  -- 'registration', 'assessment_completed', 'session_booked', 
  -- 'subscription_purchased', 'checkin_completed'

ALTER TABLE qr_conversions ADD COLUMN IF NOT EXISTS attributed_revenue DECIMAL(10,2) DEFAULT 0;
```

### Tracking Endpoint (Extends Existing)

```javascript
// routes/qr.js — extends existing tracking endpoint

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const { getDeviceType, getDeviceOS } = require('../lib/ua-parser');

/**
 * Universal QR scan handler
 * GET /q/:qr_type/:unique_id
 * 
 * 1. Log the scan
 * 2. Increment counter
 * 3. Redirect to destination
 */
router.get('/q/:qr_type/:unique_id', async (req, res) => {
  const { qr_type, unique_id } = req.params;
  const fullQrId = `${qr_type}_${unique_id}`;

  try {
    const qrCode = await prisma.qrCode.findFirst({
      where: { qrCodeUniqueId: fullQrId, qrType: qr_type },
    });

    if (!qrCode) {
      return res.redirect('https://manas360.com/404?ref=qr');
    }

    // Check expiry (for session join QRs)
    if (qrCode.expiresAt && new Date() > new Date(qrCode.expiresAt)) {
      return res.redirect('https://manas360.com/expired?ref=qr');
    }

    // Log scan (async — don't block redirect)
    const sessionId = req.query.sid || uuidv4();
    prisma.qrScan.create({
      data: {
        qrCodeId: qrCode.id,
        scanTimestamp: new Date(),
        deviceType: getDeviceType(req.headers['user-agent']),
        deviceOs: getDeviceOS(req.headers['user-agent']),
        ipAddress: req.ip,
        sessionId,
        userAgent: req.headers['user-agent'],
      },
    }).catch(err => console.error('QR scan log failed:', err));

    // Increment counter (async)
    prisma.qrCode.update({
      where: { id: qrCode.id },
      data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
    }).catch(() => {});

    // Redirect to destination
    const separator = qrCode.destinationUrl.includes('?') ? '&' : '?';
    const destUrl = `${qrCode.destinationUrl}${separator}qr=${fullQrId}&sid=${sessionId}`;
    res.redirect(302, destUrl);

  } catch (err) {
    console.error('QR tracking error:', err);
    res.redirect('https://manas360.com');
  }
});

module.exports = router;
```

### Admin QR Generator API (Extends Existing)

```javascript
// routes/admin/qr.js

/**
 * POST /api/admin/qr/generate
 * Body: { qr_type, unique_id, destination_url, owner_id?, expires_at?, campaign_id? }
 * Returns: { qr_code_id, tracking_url, qr_image_base64 }
 */
router.post('/generate', requireAuth, requireRole('admin', 'therapist'), async (req, res) => {
  const { qr_type, unique_id, destination_url, owner_id, expires_at, campaign_id } = req.body;
  
  const fullQrId = `${qr_type}_${unique_id}`;
  const trackingUrl = `https://manas360.com/q/${qr_type}/${unique_id}`;

  const qrCode = await prisma.qrCode.create({
    data: {
      campaignId: campaign_id || null,
      qrCodeUniqueId: fullQrId,
      qrType: qr_type,
      trackingUrl,
      destinationUrl: destination_url,
      ownerId: owner_id || null,
      isDynamic: true,
      expiresAt: expires_at ? new Date(expires_at) : null,
    },
  });

  // Generate QR image (using qrcode library)
  const QRCode = require('qrcode');
  const qrImageBase64 = await QRCode.toDataURL(trackingUrl, {
    width: 512, margin: 2, color: { dark: '#032467', light: '#FFFFFF' },
  });

  res.json({
    qr_code_id: qrCode.id,
    tracking_url: trackingUrl,
    qr_image_base64: qrImageBase64,
    qr_unique_id: fullQrId,
  });
});
```

---

## QR #1: INSTANT FREE SCREENING

**Rank: 1 — Score 10/10 (Frequency 5 + Monetization 5)**

### Why #1

This is the top of the entire patient acquisition funnel. Every marketing channel — standees, social media, bus ads, pharmacy counters, college notice boards, newspaper ads, ASHA cards, corporate standees — points here. One scan → 2-min PHQ-9 → severity result → therapist matching → session booking → revenue. Every downstream ₹699 session traces back to this QR.

### URL Pattern

```
https://manas360.com/q/screen/{source_id}

Source ID format: {channel}-{location/campaign}-{sequence}

Examples:
  /q/screen/std-kle-dharwad-001       Standee at KLE University Dharwad
  /q/screen/std-pharmacy-jayanagar    Standee at Jayanagar pharmacy
  /q/screen/fb-invisible-trap-003     Facebook "Invisible Trap" post #3
  /q/screen/li-depression-post-002    LinkedIn depression post
  /q/screen/asha-priya-blr-001        ASHA worker Priya's personal card
  /q/screen/bus-bmtc-route-500        BMTC bus route 500 ad
  /q/screen/news-kp-apr2026           Kannada Prabha newspaper ad
  /q/screen/eap-tcs-blr-campus        TCS Bengaluru campus standee
  /q/screen/yt-shorts-depression      YouTube Shorts video CTA
```

### Destination

```
https://manas360.com/screen?qr={source_id}&sid={session_id}&lang=auto

Landing page behavior:
1. Auto-detect language from browser (or show language selector)
2. Show: "2-minute mental wellness check. Free. Private. No signup needed."
3. PHQ-9 or GAD-7 assessment (9 or 7 questions)
4. Result: severity + top 3 therapist matches
5. CTA: "Book your first session — ₹699" (or "Start 21-day free trial")
6. If not ready to book: capture phone (OTP) for follow-up via WhatsApp
```

### Conversion Tracking

```javascript
// After screening completion, backend fires:
await prisma.qrConversion.create({
  data: {
    qrCodeId: qrCodeFromSession,
    scanId: originalScanId,
    sessionId: sid,
    conversionTimestamp: new Date(),
    conversionType: 'assessment_completed',
    attributedRevenue: 0, // no revenue yet — just completed screening
  },
});

// After session booked:
await prisma.qrConversion.create({
  data: {
    qrCodeId: qrCodeFromSession,
    scanId: originalScanId,
    sessionId: sid,
    conversionTimestamp: new Date(),
    conversionType: 'session_booked',
    attributedRevenue: 699, // or actual session amount
  },
});
```

### Admin Dashboard Widget

```
SCREENING QR ANALYTICS (Admin Dashboard)

Total scans (all sources):  12,450
Unique users:                9,800
Assessments completed:       4,200 (42.8% completion rate)
Sessions booked:               630 (6.4% scan-to-booking)
Revenue attributed:        ₹4,40,370

TOP SOURCES:
  1. std-kle-dharwad-001       2,100 scans → 280 assessments → 42 bookings (₹29,358)
  2. fb-invisible-trap-003     1,800 scans → 340 assessments → 55 bookings (₹38,445)
  3. asha-priya-blr-001          450 scans → 200 assessments → 38 bookings (₹26,562)
  4. bus-bmtc-route-500          900 scans →  90 assessments → 10 bookings (₹6,990)
```

### Physical Deployment Plan

| Location | QR Source ID Format | Quantity | Print Format |
|---|---|---|---|
| Pharmacy counters (Bengaluru) | std-pharmacy-{area} | 50 | A5 standee |
| College notice boards | std-{college}-{city} | 25 | A4 poster |
| ASHA worker cards | asha-{name}-{district} | 100 | Laminated card |
| Corporate standees | eap-{company}-{campus} | 20 | A3 standee |
| Bus/auto ads | bus-{service}-{route} | 30 | Sticker |
| Social media posts | {platform}-{campaign}-{seq} | Unlimited | Digital |
| Newspaper ads | news-{publication}-{date} | Per campaign | Print ad |

---

## QR #2: PROVIDER PROFILE / BUSINESS CARD

**Rank: 2 — Score 9.5/10 (Frequency 5 + Monetization 4.5)**

### Why #2

Every therapist on the platform becomes a walking acquisition channel. Their business card, office wall, social media bio, WhatsApp status — all carry a QR that links to their verified MANAS360 profile. Patients scan → see credentials, languages, availability, ratings → book a session. This drives bookings from the therapist's own network AND pulls their existing offline patients onto MyDigitalClinic.

### URL Pattern

```
https://manas360.com/q/provider/{provider_slug}

Provider slug format: {first_name}-{last_initial}-{city_code}

Examples:
  /q/provider/sindhuja-l-blr         Dr. Sindhuja L, Bengaluru
  /q/provider/subramanyam-h-blr      Mr. Subramanyam Hegde, Bengaluru
  /q/provider/raghavendra-m-hub      Mr. Raghavendra M, Hubli
```

### Destination

```
https://manas360.com/provider/{provider_id}?qr=provider_{slug}&sid={session_id}

Profile page shows:
1. Provider photo + name + "Government Verified ✓" badge
2. Qualifications (NMC/RCI verified)
3. Languages spoken
4. Specializations
5. Session types available (video/audio/in-person)
6. Session rate (₹699 / ₹999 / etc.)
7. Availability calendar (next 7 days)
8. Patient ratings and reviews
9. CTA: "Book a Session" → PhonePe payment flow
10. CTA: "Take Free Screening First" → assessment → auto-matched back to this provider
```

### Auto-Generation on Provider Activation

```javascript
// When therapist status = 'active' (WF-1.2c completes), auto-generate their QR

async function generateProviderQR(therapistId) {
  const therapist = await prisma.user.findUnique({ where: { id: therapistId } });
  
  const slug = `${therapist.firstName.toLowerCase()}-${therapist.lastName[0].toLowerCase()}-${therapist.cityCode}`;
  
  const qr = await prisma.qrCode.create({
    data: {
      qrCodeUniqueId: `provider_${slug}`,
      qrType: 'provider_profile',
      trackingUrl: `https://manas360.com/q/provider/${slug}`,
      destinationUrl: `https://manas360.com/provider/${therapistId}`,
      ownerId: therapistId,
      isDynamic: true,
    },
  });

  // Generate downloadable QR images in multiple formats
  const QRCode = require('qrcode');
  const formats = {
    business_card: { width: 256, margin: 1 },   // Small for business cards
    office_standee: { width: 512, margin: 2 },   // Medium for office display
    social_media: { width: 1024, margin: 3 },    // Large for social posts
  };

  const images = {};
  for (const [format, opts] of Object.entries(formats)) {
    images[format] = await QRCode.toDataURL(qr.trackingUrl, {
      ...opts, color: { dark: '#032467', light: '#FFFFFF' },
    });
  }

  // Store QR images in S3
  for (const [format, base64] of Object.entries(images)) {
    const buffer = Buffer.from(base64.split(',')[1], 'base64');
    await uploadToS3(`qr/providers/${therapistId}/${format}.png`, buffer, 'image/png');
  }

  // Send QR pack to therapist
  // (Zoho Flow WF-1.2c sends WhatsApp + email with download links)
  return { qrCodeId: qr.id, slug, images };
}
```

### Provider Dashboard Widget

```
YOUR QR CODE (Provider Dashboard)

Profile QR scans this month:    87
  → Profile views:              87 (100% — QR always lands on profile)
  → Sessions booked via QR:     12 (13.8% conversion)
  → Revenue from QR bookings:   ₹8,388

[Download QR for Business Card]  [Download QR for Office]  [Download QR for Social Media]

Share your profile:
  📎 Copy link: manas360.com/q/provider/sindhuja-l-blr
  📱 WhatsApp: [Share button]
  💼 LinkedIn: [Share button]
```

---

## QR #3: PATIENT CHECK-IN AT CLINIC

**Rank: 3 — Score 9.0/10 (Frequency 4.5 + Monetization 4.5)**

### Why #3

For MyDigitalClinic therapists with physical offices. A printed QR standee at reception. Every patient arriving for an in-person session scans it to check in. Used multiple times per day, every working day. Drives MyDigitalClinic stickiness — the therapist can't run their day without it. Logs arrival timestamps, pre-loads session notes, and notifies the therapist. Positions the upgrade path to MANAS360 Provider Network ("you're already digital — now reach more patients").

### URL Pattern

```
https://manas360.com/q/checkin/{clinic_slug}

Clinic slug format: {therapist_first}-{city_code}-{clinic_seq}

Examples:
  /q/checkin/chandu-blr-001       Chandu's clinic in Bengaluru
  /q/checkin/sindhuja-blr-001     Dr. Sindhuja's practice
```

### Destination

```
https://app.manas360.com/checkin?clinic={clinic_id}&qr=checkin_{slug}&sid={session_id}

Check-in page behavior:
1. Patient enters phone number (already registered in MyDigitalClinic)
2. OTP verification (reuses existing auth — no new login flow)
3. System matches phone to today's scheduled session
4. Shows: "Welcome, {name}. Your session with {therapist} is at {time}."
5. Status updated: session.status = 'checked_in', checked_in_at = now
6. Therapist notified (in-app + Heyo WhatsApp): "{name} has arrived"
7. Note template pre-loaded for the therapist based on session type
8. If no session found: "No session scheduled today. Would you like to book one?"
   → Direct to provider's booking calendar
```

### Backend: Check-In Service

```javascript
// services/mdc/CheckInService.js

class CheckInService {

  async checkIn(clinicId, phone) {
    // Find patient by phone in this clinic
    const patient = await prisma.mdcPatient.findFirst({
      where: { clinicId, phone: encrypt(phone) },
    });
    if (!patient) return { status: 'not_found', message: 'No patient record found' };

    // Find today's session
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const session = await prisma.mdcSession.findFirst({
      where: {
        clinicId,
        patientId: patient.id,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: 'scheduled',
      },
      include: { patient: true },
    });

    if (!session) {
      return { status: 'no_session', patientName: patient.firstName, clinicId };
    }

    // Update session status
    await prisma.mdcSession.update({
      where: { id: session.id },
      data: { status: 'checked_in', startedAt: new Date() },
    });

    // Audit log
    await prisma.mdcAuditLog.create({
      data: {
        clinicId, userId: patient.id,
        action: 'patient_checked_in', entityType: 'session', entityId: session.id,
      },
    });

    // Notify therapist (fires webhook → Zoho Flow sends WhatsApp)
    await webhookService.fire('patient_checked_in', {
      session_id: session.id,
      patient_name: patient.firstName,
      therapist_phone: session.therapistPhone,
      scheduled_at: session.scheduledAt,
    });

    return {
      status: 'checked_in',
      patientName: patient.firstName,
      sessionTime: session.scheduledAt,
      sessionType: session.sessionType,
      noteTemplate: session.noteTemplate,
    };
  }
}
```

### Physical Deployment

```
STANDEE SPEC:
  Size: A5 table standee (portrait)
  Material: Acrylic with printed insert
  
  Design:
  ┌──────────────────────────────────┐
  │                                  │
  │     🏥 MyDigitalClinic           │
  │                                  │
  │    ┌────────────────────┐        │
  │    │                    │        │
  │    │    [QR CODE]       │        │
  │    │    512 × 512       │        │
  │    │                    │        │
  │    └────────────────────┘        │
  │                                  │
  │    Scan to check in              │
  │    for your session              │
  │                                  │
  │    Powered by MANAS360           │
  └──────────────────────────────────┘
  
  Quantity: 1 per therapist office
```

---

## QR #4: SESSION JOIN LINK (JITSI)

**Rank: 4 — Score 8.5/10 (Frequency 4.5 + Monetization 4.0)**

### Why #4

For video/audio therapy sessions via Jitsi. Instead of sending a URL that patients fumble to open, the confirmation WhatsApp and email include a QR code that opens the Jitsi room directly. Patient scans from their phone → Jitsi opens → therapy starts. Eliminates "I can't find the link" dropoff (estimated 5-8% of scheduled sessions). Each saved session = ₹699 recovered revenue.

### URL Pattern

```
https://manas360.com/q/join/{session_short_id}

Session short ID: first 8 chars of session UUID + date
  /q/join/abc12345-20260405
```

### Key Difference: Expiring QR

```javascript
// Generated when session is booked
// Expires: session time + 60 minutes (can't be reused)

const sessionQR = await prisma.qrCode.create({
  data: {
    qrCodeUniqueId: `join_${session.id.substring(0, 8)}-${dateStr}`,
    qrType: 'session_join',
    trackingUrl: `https://manas360.com/q/join/${session.id.substring(0, 8)}-${dateStr}`,
    destinationUrl: `https://meet.manas360.com/manas360-${session.id}-${dateStr}`,
    ownerId: session.therapistUserId,
    isDynamic: false,  // static — points directly to Jitsi room
    expiresAt: new Date(session.scheduledAt.getTime() + 60 * 60 * 1000), // +1 hour
  },
});
```

### Delivery

QR image is embedded in:
1. Session confirmation email (ZeptoMail) — inline image
2. WhatsApp reminder (Heyo) — sent as image in service window after user taps "Confirm" (Story 13.5v3.0)
3. Patient's "My Sessions" page in the app — tappable QR

---

## QR #5: CORPORATE EAP STANDEE

**Rank: 5 — Score 8.5/10 (Frequency 4.0 + Monetization 4.5)**

### Why #5

Companies using MANAS360 Corporate EAP place QR standees in breakrooms, restrooms, HR offices, cafeterias. Employees scan → land on an anonymous screening page branded for their company. No one sees them approaching HR. The QR encodes the `corporate_id`, so usage analytics flow to the right HR dashboard. Each employee who books a session generates ₹500-1,000/session revenue from the corporate contract.

### URL Pattern

```
https://manas360.com/q/eap/{company_slug}-{location}

Examples:
  /q/eap/tcs-blr-campus-001        TCS Bengaluru campus, standee #1
  /q/eap/infosys-mys-bldg3         Infosys Mysuru building 3
  /q/eap/wipro-hyd-cafe            Wipro Hyderabad cafeteria
```

### Destination

```
https://manas360.com/eap/{corporate_id}/screen?qr=eap_{slug}&sid={session_id}

Landing page (company-branded):
1. Company logo + "Employee Wellness Program powered by MANAS360"
2. "This screening is 100% anonymous. Your employer cannot see your answers."
3. PHQ-9 / GAD-7 assessment
4. Result + matched therapists (from company's contracted provider pool)
5. "Book a session — covered by your employer's wellness plan"
6. No employee name or ID captured — only corporate_id for billing
```

### Corporate Dashboard (HR View)

```
{COMPANY} EAP DASHBOARD

Active standees:           5 (across 3 campuses)
Total scans this month:    340
Screenings completed:      180 (52.9%)
Sessions booked:            45 (13.2% of scans)
Avg severity (anonymous):  Moderate (PHQ-9 avg 12.3)

BY LOCATION:
  Bengaluru Campus:    180 scans → 95 screenings → 28 sessions
  Hyderabad Office:    100 scans → 55 screenings → 12 sessions
  Mysuru Building 3:    60 scans → 30 screenings →  5 sessions

Peak scan times: 12-2 PM (lunch), 6-7 PM (end of day)
Peak day: Monday (32% of weekly scans)
```

---

## API ENDPOINTS SUMMARY

```
QR MANAGEMENT (Admin)
  POST   /api/admin/qr/generate              → Create QR with type + destination
  GET    /api/admin/qr                        → List all QRs (filter by type, owner)
  PUT    /api/admin/qr/:id                    → Update destination (dynamic QRs)
  DELETE /api/admin/qr/:id                    → Deactivate QR
  GET    /api/admin/qr/:id/analytics          → Scan + conversion stats for one QR
  GET    /api/admin/qr/analytics/by-type      → Aggregate stats by QR type
  GET    /api/admin/qr/analytics/by-source    → Top sources by conversion

QR SCANNING (Public — No Auth)
  GET    /q/:qr_type/:unique_id               → Track scan + redirect

PROVIDER QR (Therapist Dashboard)
  GET    /api/provider/my-qr                  → Get my profile QR (images + stats)
  GET    /api/provider/my-qr/analytics        → My QR scan + booking stats

CLINIC CHECK-IN (Patient — OTP Auth)
  POST   /api/mdc/checkin                     → Check in via phone + OTP
  
SESSION JOIN (Patient — Token Auth)
  GET    /api/sessions/:id/join-qr            → Get session join QR image

CORPORATE EAP QR (HR Dashboard)
  GET    /api/corporate/:id/qr-analytics      → Standee performance by location
```

---

## ACCEPTANCE CRITERIA

- [ ] Universal tracking endpoint logs scan and redirects within 200ms
- [ ] Screening QR → assessment → booking → revenue attribution works end-to-end
- [ ] Provider QR auto-generated on activation with 3 size variants
- [ ] Provider dashboard shows QR scan count + booking conversion rate
- [ ] Patient check-in QR matches phone to today's session, updates status
- [ ] Therapist receives WhatsApp notification on patient check-in
- [ ] Session join QR expires after session time + 1 hour
- [ ] Session join QR embedded in confirmation email and WhatsApp
- [ ] Corporate EAP QR shows company-branded anonymous screening page
- [ ] HR dashboard shows scan/screening/booking analytics by standee location
- [ ] Admin can generate, list, update, and deactivate QRs
- [ ] Admin analytics shows top sources by conversion rate and attributed revenue
- [ ] All QR images use MANAS360 brand navy (#032467) on white
- [ ] Dynamic QR destination can be changed without reprinting the physical QR
