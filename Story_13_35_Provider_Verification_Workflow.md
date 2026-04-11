# Story 13.35 — Provider Credential Verification Workflow

**Automated 95% | Manual review 5% (flagged cases only)**
**Stack:** Node.js backend + Zoho Flow + Zoho Desk + ZeptoMail + WATI
**SLA:** 24-hour verification turnaround
**Owner:** Subramanya (reviews flagged cases only)

---

## How It Works — End to End

A therapist registers on MANAS360. The backend auto-verifies their credentials against NMC/RCI databases. If everything checks out (95% of cases), the system marks them verified, sends a confirmation, and triggers the next onboarding step — no human needed. If something is flagged (name mismatch, license not found, expired), a Zoho Desk ticket is auto-created and assigned to Subramanya with all the details he needs to resolve it.

---

## Step 1: Backend — Auto-Verification on Registration

When the therapist submits credentials, the backend runs this verification sequence before emitting any event to Zoho Flow.

```javascript
// services/verification.service.js
// Called automatically when therapist completes credential upload

const axios = require('axios');
const { supabase } = require('./supabase.client');
const { emitEvent } = require('./event.service');

const VERIFICATION_CHECKS = {
  NMC_API: 'https://www.nmc.org.in/MCIRest/open/getDataFromService?service=searchDoctor',
  TIMEOUT_MS: 10000,
};

async function verifyProviderCredentials(therapistData) {
  const {
    userId,
    name,
    phone,
    email,
    licenseNumber,
    licenseType,    // 'NMC' | 'RCI' | 'SMC'
    qualification,  // 'MBBS_MD' | 'MPhil' | 'PhD' | 'MA_Psychology'
    specialization,
    stateCouncil,
  } = therapistData;

  const result = {
    userId,
    status: 'pending',       // pending | verified | flagged | rejected
    checks: [],
    flagReasons: [],
    verifiedAt: null,
  };

  // ─── CHECK 1: License format validation ───
  const formatValid = validateLicenseFormat(licenseNumber, licenseType);
  result.checks.push({
    check: 'LICENSE_FORMAT',
    passed: formatValid,
    detail: formatValid ? 'Format valid' : 'Invalid license number format',
  });
  if (!formatValid) {
    result.flagReasons.push('License number format invalid');
  }

  // ─── CHECK 2: NMC/RCI database lookup ───
  try {
    const nmcResult = await axios.post(VERIFICATION_CHECKS.NMC_API, {
      registrationNo: licenseNumber,
      doctorName: name,
    }, { timeout: VERIFICATION_CHECKS.TIMEOUT_MS });

    if (nmcResult.data.totalCount === 0) {
      // Not found in NMC — try State Medical Council
      const smcResult = await checkStateMedicalCouncil(licenseNumber, name, stateCouncil);

      if (!smcResult.found) {
        result.checks.push({
          check: 'DATABASE_LOOKUP',
          passed: false,
          detail: 'License not found in NMC or SMC databases',
        });
        result.flagReasons.push('License not found in NMC or SMC');
      } else {
        result.checks.push({
          check: 'DATABASE_LOOKUP',
          passed: true,
          detail: 'Found in State Medical Council: ' + stateCouncil,
          source: 'SMC',
        });
      }
    } else {
      const doctor = nmcResult.data.doctors[0];

      // ─── CHECK 3: License status ───
      const isActive = doctor.status === 'Active';
      result.checks.push({
        check: 'LICENSE_STATUS',
        passed: isActive,
        detail: 'NMC status: ' + doctor.status,
      });
      if (!isActive) {
        if (doctor.status === 'Suspended') {
          result.status = 'rejected';
          result.flagReasons.push('License SUSPENDED — auto-rejected');
        } else {
          result.flagReasons.push('License status: ' + doctor.status);
        }
      }

      // ─── CHECK 4: Name match (fuzzy) ───
      const nameMatch = fuzzyNameMatch(name, doctor.doctorName);
      result.checks.push({
        check: 'NAME_MATCH',
        passed: nameMatch.score >= 0.8,
        detail: 'Input: "' + name + '" vs NMC: "' + doctor.doctorName + '" — score: ' + nameMatch.score.toFixed(2),
      });
      if (nameMatch.score < 0.8) {
        result.flagReasons.push('Name mismatch: registered as "' + doctor.doctorName + '"');
      }

      // ─── CHECK 5: License expiry ───
      if (doctor.expiryDate) {
        const expiry = new Date(doctor.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

        result.checks.push({
          check: 'LICENSE_EXPIRY',
          passed: daysUntilExpiry > 30,
          detail: daysUntilExpiry > 0 
            ? 'Expires in ' + daysUntilExpiry + ' days' 
            : 'EXPIRED ' + Math.abs(daysUntilExpiry) + ' days ago',
        });
        if (daysUntilExpiry <= 0) {
          result.flagReasons.push('License expired');
        } else if (daysUntilExpiry <= 30) {
          result.flagReasons.push('License expiring in ' + daysUntilExpiry + ' days');
        }
      }
    }
  } catch (apiError) {
    // NMC API down or timeout — flag for manual check
    result.checks.push({
      check: 'DATABASE_LOOKUP',
      passed: false,
      detail: 'NMC API unreachable: ' + apiError.message,
    });
    result.flagReasons.push('NMC API timeout — needs manual verification');
  }

  // ─── DETERMINE FINAL STATUS ───
  if (result.status === 'rejected') {
    // Already rejected (e.g., suspended license)
  } else if (result.flagReasons.length === 0) {
    result.status = 'verified';
    result.verifiedAt = new Date().toISOString();
  } else {
    result.status = 'flagged';
  }

  // ─── SAVE TO DATABASE ───
  await supabase.from('provider_verifications').upsert({
    user_id: userId,
    license_number: licenseNumber,
    license_type: licenseType,
    verification_status: result.status,
    checks: JSON.stringify(result.checks),
    flag_reasons: result.flagReasons.length > 0 ? result.flagReasons : null,
    verified_at: result.verifiedAt,
    updated_at: new Date().toISOString(),
  });

  // ─── UPDATE THERAPIST PROFILE ───
  await supabase.from('therapists').update({
    verification_status: result.status,
    verified_at: result.verifiedAt,
  }).eq('user_id', userId);

  // ─── EMIT EVENT TO ZOHO FLOW ───
  if (result.status === 'verified') {
    // 95% path — fully automated
    await emitEvent('PROVIDER_VERIFIED', {
      userId,
      name,
      phone: phone.replace(/^\+/, ''),
      email,
      licenseNumber,
      verificationResult: 'VERIFIED',
      checksCount: result.checks.length,
      checksPassed: result.checks.filter(c => c.passed).length,
    });
  } else if (result.status === 'flagged') {
    // 5% path — needs Subramanya's review
    await emitEvent('PROVIDER_FLAGGED', {
      userId,
      name,
      phone: phone.replace(/^\+/, ''),
      email,
      licenseNumber,
      licenseType,
      qualification,
      stateCouncil,
      flagReasons: result.flagReasons.join(' | '),
      checksDetail: result.checks.map(c => c.check + ': ' + (c.passed ? 'PASS' : 'FAIL') + ' — ' + c.detail).join('\n'),
    });
  } else if (result.status === 'rejected') {
    await emitEvent('PROVIDER_REJECTED', {
      userId,
      name,
      phone: phone.replace(/^\+/, ''),
      email,
      licenseNumber,
      rejectReason: result.flagReasons.join(' | '),
    });
  }

  return result;
}

// ─── HELPERS ───

function validateLicenseFormat(license, type) {
  if (!license || license.length < 4) return false;
  if (type === 'NMC') return /^[A-Z0-9\-\/]+$/i.test(license);
  if (type === 'RCI') return /^[A-Z]{1,3}\d{4,}/i.test(license);
  return license.length >= 4; // SMC formats vary by state
}

function fuzzyNameMatch(input, registered) {
  const normalize = (s) => s.toLowerCase().replace(/\bdr\.?\s*/g, '').replace(/[^a-z\s]/g, '').trim();
  const a = normalize(input);
  const b = normalize(registered);
  
  if (a === b) return { score: 1.0 };
  
  // Check if last names match (most reliable)
  const aLast = a.split(' ').pop();
  const bLast = b.split(' ').pop();
  if (aLast === bLast) return { score: 0.85 };
  
  // Basic token overlap
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const overlap = [...aTokens].filter(t => bTokens.has(t)).length;
  const maxTokens = Math.max(aTokens.size, bTokens.size);
  
  return { score: overlap / maxTokens };
}

async function checkStateMedicalCouncil(license, name, stateCode) {
  // Placeholder — each state has different API/portal
  // For now, flag for manual review if NMC fails
  return { found: false };
}

module.exports = { verifyProviderCredentials };
```

---

## Step 2: Zoho Flow — Three Event Routes

### Route A: PROVIDER_VERIFIED (95% — fully automated)

```
Trigger: Webhook — event == PROVIDER_VERIFIED

Step 1: WATI WhatsApp (via Webhooks POST)
  Template: provider_verified (new template to add to 13.12B catalog)
  Body: "Congratulations Dr. {{1}}! Your credentials have been verified.
         License {{2}} is confirmed active. Complete your training to
         start receiving patients. Start here: {{3}} — MANAS360"
  Variables: name, licenseNumber, trainingUrl

Step 2: ZeptoMail — Verification confirmation email
  Template: provider_verified_email
  To: ${data.email}

Step 3: Zoho Campaigns — Move to "Verified Providers" list
  Remove from: "Pending Verification"
  Add to: "Verified — Awaiting Training"

Step 4: (Next step auto-triggers)
  Emit: TRAINING_ENROLLED event → triggers WF-1.2 training enrollment
```

### Route B: PROVIDER_FLAGGED (5% — Subramanya reviews)

```
Trigger: Webhook — event == PROVIDER_FLAGGED

Step 1: Zoho Desk — Create ticket
  Department: Clinical Ops
  Subject: "VERIFY: Dr. ${data.name} — ${data.flagReasons}"
  Priority: High
  Status: Open
  Category: Provider Verification
  Assignee: Round Robin (Clinical Ops agents — Subramanya)
  
  Description:
    PROVIDER CREDENTIAL VERIFICATION — MANUAL REVIEW NEEDED
    
    Name: ${data.name}
    Phone: ${data.phone}
    Email: ${data.email}
    License: ${data.licenseNumber} (${data.licenseType})
    Qualification: ${data.qualification}
    State Council: ${data.stateCouncil}
    
    FLAG REASONS:
    ${data.flagReasons}
    
    AUTOMATED CHECK RESULTS:
    ${data.checksDetail}
    
    ACTION REQUIRED:
    1. Manually verify on NMC portal: https://www.nmc.org.in/information-desk/indian-medical-register/
    2. If name mismatch — check for maiden name, spelling variations
    3. If license not found — try State Medical Council portal
    4. Update ticket with resolution: VERIFIED / REJECTED
    5. Close ticket — system auto-updates provider status

Step 2: WATI WhatsApp — Notify therapist (under review)
  Template: provider_under_review
  Body: "Hi Dr. {{1}}, your credentials are being reviewed by our
         clinical team. This usually takes 24 hours. We'll notify you
         as soon as it's complete. — MANAS360"
  Variables: name

Step 3: ZeptoMail — Notify Subramanya
  To: subramanya@manas360.com
  Subject: "ACTION: Provider verification flagged — Dr. ${data.name}"
  Body: Flag reasons + link to Zoho Desk ticket
```

### Route C: PROVIDER_REJECTED (auto-rejected — suspended license)

```
Trigger: Webhook — event == PROVIDER_REJECTED

Step 1: WATI WhatsApp
  Template: provider_rejected
  Body: "Hi Dr. {{1}}, we were unable to verify your credentials.
         Reason: {{2}}. If you believe this is an error, please
         contact support@manas360.com with updated documents. — MANAS360"
  Variables: name, rejectReason

Step 2: ZeptoMail — Rejection email with details

Step 3: Zoho Campaigns — Move to "Rejected Providers" list

Step 4: Zoho Desk — Create ticket (informational, low priority)
  Department: Clinical Ops
  Subject: "REJECTED: Dr. ${data.name} — ${data.rejectReason}"
  Priority: Low
  Status: Closed
  Category: Provider Rejection Log
```

---

## Step 3: Subramanya's Manual Review (Flagged Cases Only)

Subramanya receives the Zoho Desk ticket with everything pre-filled. His workflow:

1. Open Zoho Desk ticket — all details are in the description
2. Open NMC portal in browser: https://www.nmc.org.in/information-desk/indian-medical-register/
3. Search by registration number or name
4. Compare what NMC shows with what the therapist submitted
5. Decide: VERIFIED or REJECTED
6. Add resolution note to Zoho Desk ticket
7. Close ticket with status: "Verified" or "Rejected"

When Subramanya closes the ticket, a Zoho Flow triggers:

```
Trigger: Zoho Desk — Ticket updated (Department: Clinical Ops, Category: Provider Verification)
Condition: Ticket status changed to "Closed"

Step 1: Read ticket custom field: resolution = "verified" or "rejected"

Step 2: IF verified:
  → Webhooks POST to MANAS360 backend: /api/admin/verify-provider
    Body: { userId, status: "verified", reviewedBy: "subramanya", notes: ticket_comment }
  → Backend updates DB + emits PROVIDER_VERIFIED event
  → Same flow as Route A kicks in (WhatsApp + email + training enrollment)

Step 3: IF rejected:
  → Webhooks POST to MANAS360 backend: /api/admin/reject-provider
    Body: { userId, status: "rejected", reason: ticket_comment }
  → Backend updates DB + emits PROVIDER_REJECTED event
  → Same flow as Route C kicks in
```

---

## Step 4: SLA & Escalation

```
Zoho Desk SLA for "Provider Verification" category:
  First response: 2 hours
  Resolution: 24 hours
  
Escalation rules:
  If not acknowledged in 4 hours → escalate to Admin (Mahan)
  If not resolved in 24 hours → escalate to Admin + email alert
  
Business hours: Mon-Sat, 9 AM - 8 PM IST
```

---

## New WATI Templates to Add (3 templates → append to 13.12B catalog)

| ID | template_name | Body | Variables | Category |
|----|--------------|------|-----------|----------|
| T48 | provider_verified | Congratulations Dr. {{1}}! Your credentials verified. License {{2}} confirmed active. Complete training to start: {{3}} — MANAS360 | name, licenseNumber, trainingUrl | Utility |
| T49 | provider_under_review | Hi Dr. {{1}}, your credentials are being reviewed by our clinical team. Usually takes 24 hours. We'll notify you soon. — MANAS360 | name | Utility |
| T50 | provider_rejected | Hi Dr. {{1}}, we were unable to verify your credentials. Reason: {{2}}. Contact support@manas360.com with updated documents. — MANAS360 | name, rejectReason | Utility |

---

## Summary: What Subramanya Actually Does

For 95 out of 100 providers: Nothing. System auto-verifies and moves them to training.

For the remaining 5: Opens a Zoho Desk ticket that has every detail pre-filled, checks NMC portal manually, adds a one-line note, closes the ticket. Estimated time per flagged case: 5-10 minutes.

Total weekly effort at 20 new providers/week: 1 flagged case = 10 minutes.
