# WhatsApp Automation via Watti & Zoho Flow

## Overview

This guide explains how MANAS360 uses **Watti** as the WhatsApp Business API mediator and **Zoho Flow** for intelligent message orchestration.

**Architecture Flow:**
```
MANAS360 Backend 
  ↓ (event + phone number)
Zoho Flow Webhook
  ↓ (template name + variables)
Zoho Flow Logic (conditions, lookups)
  ↓ (enriched payload)
Watti WhatsApp Business API
  ↓ (sends message)
User Phone (WhatsApp)
```

---

## User Types & Template Categories

MANAS360 has 6 primary user types, each with tailored WhatsApp templates:

### 1. **Patient** (User receiving care)
   - Registering → `user_welcome_patient`
   - Booking appointment → `booking_confirmed_patient`
   - 24h before appointment → `booking_reminder_24h`
   - After session → `session_followup`
   - Payment made → `payment_success` / `payment_failed_user`
   - Subscription expiring → `subscription_expiry_7d`, `subscription_expiry_1d`
   - Clinical results ready → `clinical_results_ready`

### 2. **Therapist** (Provider)
   - Registering → `provider_welcome_therapist`
   - Booking received → `booking_confirmed_provider`
   - Payment received → `payment_success` / `payment_failed_provider`
   - Subscription expiring → `subscription_expiry_7d`, `subscription_expiry_1d`

### 3. **Psychiatrist** (Provider)
   - Same as Therapist templates but branded as `provider_welcome_psychiatrist`, etc.

### 4. **Psychologist** (Provider)
   - Same as Therapist templates but branded as `provider_welcome_psychologist`, etc.

### 5. **Coach** (Provider)
   - Same as Therapist templates but branded as `provider_welcome_coach`, etc.

### 6. **Generic User** (Fallback)
   - Used if user type cannot be determined
   - Generic templates: `user_welcome_generic`, `booking_confirmed_generic`, etc.

---

## Template Definitions & Variables

### User Welcome Templates

**Template:** `user_welcome_patient`  
**Event:** User registration (phone-verified)  
**Variables:**
- `{{name}}` - User's display name
- `{{appName}}` - "MANAS360"
- `{{appUrl}}` - "https://manas360.com" or app link

**Message Example:**
```
Hi {{name}}! 👋

Welcome to MANAS360 — Your trusted mental health platform.

You're all set! Explore therapists, book sessions, and start your wellness journey.

Visit: {{appUrl}}

Need help? Reply HELP
```

---

**Template:** `provider_welcome_therapist`  
**Event:** Therapist registration (onboarding complete)  
**Variables:**
- `{{name}}` - Provider's name
- `{{specialization}}` - e.g., "PTSD Counseling"
- `{{appUrl}}` - Provider dashboard link

**Message Example:**
```
Hi {{name}},

Welcome to MANAS360's provider network! 🎯

Your profile is live. Specialization: {{specialization}}

You can now:
✓ View patient bookings
✓ Manage availability
✓ Check earnings

Dashboard: {{appUrl}}
```

---

### OTP / Authentication Templates

**Template:** `otp_login`  
**Event:** User requests OTP for phone-based login  
**Variables:**
- `{{otp}}` - 6-digit OTP code
- `{{expiresIn}}` - "5 minutes"
- `{{appName}}` - "MANAS360"

**Message Example:**
```
Your MANAS360 login code: {{otp}}

⏱️ Valid for {{expiresIn}}

Never share this code!
```

---

**Template:** `user_otp_login` (Shared for all user types)  
Same as `otp_login`

---

### Booking / Appointment Templates

**Template:** `booking_confirmed_patient`  
**Event:** Patient books an appointment  
**Variables:**
- `{{therapistName}}` - Provider's name
- `{{appointmentDate}}` - e.g., "Apr 5, 2026"
- `{{appointmentTime}}` - e.g., "3:00 PM IST"
- `{{sessionLink}}` - Video call or meeting URL
- `{{appUrl}}` - Link to appointment details

**Message Example:**
```
✅ Your appointment is confirmed!

Therapist: {{therapistName}}
📅 {{appointmentDate}} at {{appointmentTime}}

📞 Join call: {{sessionLink}}

View details: {{appUrl}}

⏰ We'll remind you 24 hours before!
```

---

**Template:** `booking_confirmed_provider`  
**Event:** Provider receives a booking  
**Variables:**
- `{{patientName}}` - (May be anonymized depending on privacy policy)
- `{{appointmentDate}}`, `{{appointmentTime}}`
- `{{sessionLink}}`, `{{dashboardLink}}`

**Message Example:**
```
📣 New booking received!

Patient: {{patientName}}
📅 {{appointmentDate}} at {{appointmentTime}}

Confirm availability: {{dashboardLink}}

Session link will be shared 15 min before start.
```

---

**Template:** `booking_reminder_24h`  
**Event:** 24 hours before appointment (sent to both patient & provider)  
**Variables:**
- `{{name}}` - Recipient name
- `{{appointmentTime}}`
- `{{otherPartyName}}` - Therapist/Patient name
- `{{sessionLink}}`

**Message Example:**
```
⏰ Reminder: Your session is tomorrow!

With: {{otherPartyName}}
🕐 {{appointmentTime}}

Join: {{sessionLink}}

See you soon! 💙
```

---

**Template:** `booking_reminder_2h`  
**Event:** 2 hours before appointment  
**Variables:**
Same as `booking_reminder_24h`

**Message Example:**
```
🔔 Your session starts in 2 hours!

With: {{otherPartyName}} at {{appointmentTime}}

Session link: {{sessionLink}}

Get ready! 💬
```

---

### Billing & Payment Templates

**Template:** `payment_success`  
**Event:** Payment processed successfully  
**Variables:**
- `{{name}}` - User name
- `{{amount}}` - e.g., "₹499"
- `{{planName}}` - e.g., "6-Month Therapy Plan"
- `{{expiryDate}}` - e.g., "Oct 4, 2026"

**Message Example:**
```
✅ Payment received!

Amount: {{amount}}
Plan: {{planName}}
Valid until: {{expiryDate}}

Thank you for your subscription! 💳

Your account is active. Start booking sessions!
```

---

**Template:** `payment_failed_user`  
**Event:** Payment failed (for patients)  
**Variables:**
- `{{name}}`
- `{{amount}}`
- `{{reason}}` - e.g., "Declined by bank"
- `{{retryUrl}}` - Link to retry payment
- `{{supportPhone}}` - Customer support number

**Message Example:**
```
⚠️ Payment failed

Amount: {{amount}}
Reason: {{reason}}

Please retry: {{retryUrl}}

Or contact support: {{supportPhone}}
```

---

**Template:** `payment_failed_provider`  
**Event:** Provider payout failed  
**Variables:**
- `{{name}}`
- `{{amount}}`
- `{{reason}}`
- `{{bankingDetailsUrl}}`

**Message Example:**
```
⚠️ Payout failed

Amount: {{amount}}
Reason: {{reason}}

Update your banking details: {{bankingDetailsUrl}}

Or contact: support@manas360.com
```

---

### Subscription & Renewal Templates

**Template:** `subscription_expiry_7d`  
**Event:** Subscription expiring in 7 days  
**Variables:**
- `{{name}}`
- `{{expiryDate}}` - e.g., "Apr 11, 2026"
- `{{renewUrl}}` - Link to renew

**Message Example:**
```
📢 Your subscription expires in 7 days!

📅 Expires on: {{expiryDate}}

Renew now to avoid interruption: {{renewUrl}}

Questions? Reply HELP
```

---

**Template:** `subscription_expiry_1d`  
**Event:** Subscription expiring in 1 day  
**Variables:**
Same as `subscription_expiry_7d`

**Message Example:**
```
⏰ Last chance! Your subscription expires TOMORROW.

📅 {{expiryDate}}

Renew immediately: {{renewUrl}}

Don't lose access to your therapist!
```

---

**Template:** `subscription_renewed`  
**Event:** Subscription auto-renewed or manually renewed  
**Variables:**
- `{{name}}`
- `{{planName}}`
- `{{newExpiryDate}}`
- `{{amount}}`

**Message Example:**
```
✅ Subscription renewed!

Plan: {{planName}}
Amount: {{amount}}
Valid until: {{newExpiryDate}}

Thank you! Continue your wellness journey. 💪
```

---

### Refund & Clinical Templates

**Template:** `refund_processed`  
**Event:** Refund issued  
**Variables:**
- `{{name}}`
- `{{amount}}`
- `{{expectedDays}}` - e.g., "5-7 business days"
- `{{transactionId}}`

**Message Example:**
```
💰 Refund initiated!

Amount: {{amount}}
Transaction ID: {{transactionId}}

Expected in your account: {{expectedDays}}

Need help? Reply HELP
```

---

**Template:** `clinical_results_ready`  
**Event:** Assessment/Clinician results available  
**Variables:**
- `{{name}}`
- `{{assessmentName}}` - e.g., "PHQ-9 Assessment"
- `{{resultsUrl}}`

**Message Example:**
```
📋 Your {{assessmentName}} results are ready!

View results: {{resultsUrl}}

Discuss with your therapist during your next session.

Questions? Contact your clinician.
```

---

**Template:** `treatment_plan_updated`  
**Event:** Treatment plan modified by therapist  
**Variables:**
- `{{name}}`
- `{{therapistName}}`
- `{{planUrl}}`

**Message Example:**
```
📝 Your treatment plan has been updated!

Updated by: {{therapistName}}

View new plan: {{planUrl}}

Review & discuss during your next session.
```

---

### Session Follow-up Template

**Template:** `session_followup`  
**Event:** After a session is completed  
**Variables:**
- `{{name}}`
- `{{therapistName}}`
- `{{sessionDate}}`
- `{{feedbackUrl}}` - Link to feedback form
- `{{nextSessionDate}}` - (if scheduled)

**Message Example:**
```
Thank you for your session today! 💙

Therapist: {{therapistName}}
Date: {{sessionDate}}

We'd love your feedback: {{feedbackUrl}}

Next session: {{nextSessionDate}}

Take care!
```

---

## Zoho Flow Setup Guide

### Step 1: Create Zoho Flow Webhook Integration

1. Go to **Zoho Flow** → Create New Flow
2. **Trigger:** Webhook
3. **Webhook URL:** Copy from MANAS360 backend logs or configure in `.env`:
   ```
   ZOHO_FLOW_WEBHOOK_URL=https://flow.zoho.in/[YOUR_ORG_ID]/flow/webhook/incoming?zapikey=[YOUR_KEY]&isdebug=false
   ```

### Step 2: Define Zoho Flow Logic for Each Event

**Example Flow: User Registration → Send Welcome WhatsApp**

```
TRIGGER: Incoming webhook (MANAS360 webhook)
  ↓
CHECK: Event = "user.registration" OR "user.welcome"
  ↓
EXTRACT: 
  - phoneNumber (from webhook data)
  - userType (from user role: 'patient', 'therapist', etc.)
  - userName (from webhook data)
  ↓
IF userType == 'patient':
  templateName = 'user_welcome_patient'
ELSE IF userType == 'therapist':
  templateName = 'provider_welcome_therapist'
... (etc.)
  ↓
BUILD MESSAGE (Optional - Zoho can enrich):
  variables = {
    name: userName,
    appUrl: 'https://manas360.com',
    appName: 'MANAS360'
  }
  ↓
CALL WATTI API:
  POST /api/contacts/sendTemplateMessage
  Headers: Authorization: Bearer [WATTI_API_KEY]
  Body: {
    to: phoneNumber,
    templateName: templateName,
    variables: variables
  }
  ↓
LOG: Message sent successfully
```

### Step 3: Watti API Integration in Zoho Flow

In Zoho Flow, use the "HTTP Request" action to call Watti:

```json
{
  "method": "POST",
  "url": "https://api.watti.io/api/contacts/sendTemplateMessage",
  "headers": {
    "Authorization": "Bearer {{watti_api_token}}",
    "Content-Type": "application/json"
  },
  "body": {
    "to": "{{phoneNumber}}",
    "templateName": "{{templateName}}",
    "variables": "{{variables}}"
  }
}
```

---

## Backend Event Emission

### Example: Send Welcome WhatsApp on User Registration

**File:** `backend/src/services/auth.service.ts`

```typescript
import { sendWhatsAppMessage } from './whatsapp.service';

export const registerWithPhone = async (input: RegisterPhoneInput, meta: RequestMeta) => {
  // ... existing registration logic ...
  
  const newUser = await db.user.create({ ... });
  
  // Send welcome WhatsApp
  if (newUser.phone) {
    try {
      const userType = String(newUser.role || 'patient').toLowerCase() as WhatsAppUserType;
      await sendWhatsAppMessage({
        phoneNumber: newUser.phone,
        templateType: 'user_welcome',
        userType: userType,
        templateVariables: {
          name: newUser.displayName || newUser.phone,
          appUrl: 'https://manas360.com',
        },
      });
    } catch (err) {
      logger.warn('[Auth] Failed sending welcome WhatsApp', { error: String(err) });
    }
  }
  
  // ... rest of logic ...
};
```

---

## Watti Setup Steps

### 1. Create Watti Account
- Go to https://watti.io
- Sign up and connect your WhatsApp Business Account
- Get your **Watti API Token**

### 2. Create Templates in Watti

For each template listed above, register it in Watti:

**Example: `user_welcome_patient`**
```
Template Name: user_welcome_patient
Language: English
Category: MARKETING
Message Body:

Hi {{1}}! 👋

Welcome to MANAS360 — Your trusted mental health platform.

You're all set! Explore therapists, book sessions, and start your wellness journey.

Visit: {{2}}

Need help? Reply HELP
```

**Parameters:** `{{1}}` = name, `{{2}}` = appUrl

### 3. Get Watti API Key

- In Watti Dashboard → Settings → API Keys
- Copy the **Bearer Token** / **API Key**
- Add to `.env`:

```ini
WATTI_API_TOKEN=your_watti_api_token_here
WATTI_API_URL=https://api.watti.io
```

### 4. Link Watti to Zoho Flow

- In Zoho Flow, add HTTP Request action
- Use Watti API endpoint (see above)
- Reference `{{watti_api_token}}` from environment

---

## Backend `.env` Configuration

```ini
# Zoho Flow Webhook (for outgoing events)
ZOHO_FLOW_WEBHOOK_URL=https://flow.zoho.in/[ORG_ID]/flow/webhook/incoming?zapikey=[KEY]&isdebug=false

# Watti Configuration (for Zoho Flow to call Watti)
WATTI_API_TOKEN=your_token_here
WATTI_API_URL=https://api.watti.io

# WhatsApp Configuration
WHATSAPP_PROVIDER=watti
WHATSAPP_ENABLE=true
```

---

## Event Emission Pattern

### When to Send WhatsApp Messages

**Automatic (Backend triggers):**
1. ✅ User registration → `user_welcome`
2. ✅ Provider registration → `provider_welcome`
3. ✅ Phone OTP requested → `user_otp_login`
4. ✅ Booking confirmed → `booking_confirmed`
5. ✅ Session completed → `session_followup`

**Scheduled (Cron jobs):**
1. ⏰ 24h before appointment → `booking_reminder_24h`
2. ⏰ 2h before appointment → `booking_reminder_2h`
3. ⏰ 7 days before expiry → `subscription_expiry_7d`
4. ⏰ 1 day before expiry → `subscription_expiry_1d`

**Reactive (Payment processing):**
1. 💳 Payment success → `payment_success`
2. 💳 Payment failed → `payment_failed_user` / `payment_failed_provider`
3. 💳 Refund processed → `refund_processed`
4. 💳 Subscription renewed → `subscription_renewed`

**Clinical events:**
1. 📋 Results ready → `clinical_results_ready`
2. 📝 Plan updated → `treatment_plan_updated`

---

## Testing WhatsApp Messages Locally

### Mock Zoho Flow Endpoint

```bash
# Start a local server to capture events
node -e "const http = require('http');
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    console.log('WEBHOOK EVENT:', JSON.parse(body));
    res.end(JSON.stringify({ok: true}));
  });
});
server.listen(18081, () => console.log('Webhook listener on :18081'));
"

# Update .env
export ZOHO_FLOW_WEBHOOK_URL=http://127.0.0.1:18081

# Trigger an event (e.g., user registration)
# Check console for captured WhatsApp event payload
```

---

## Separate Templates by User Type? 

**Answer: YES, recommended.**

- **Patients** receive simplified, supportive messaging
- **Providers** receive business-focused, scheduling messages
- **Fallback** templates are generic for edge cases

Each template is registered separately in Watti to allow:
- Different branding/tone per user type
- Localization (separate templates per language)
- A/B testing different copy per segment
- Compliance with role-specific messaging policies

---

## Summary

| Component | Purpose | Service |
|-----------|---------|---------|
| **MANAS360 Backend** | Generate events, emit to Zoho | Node/Express |
| **Zoho Flow** | Orchestrate logic, enrich data, call Watti | Zoho |
| **Watti** | Send WhatsApp messages | Watti API |
| **WhatsApp** | Deliver messages to users | WhatsApp Business |

**Flow:** Trigger (registration) → MANAS360 emits → Zoho Flow → Watti → WhatsApp ✅

---

## Next Steps

1. ✅ Create WhatsApp templates in Watti (see examples above)
2. ✅ Set up Zoho Flow webhook logic for each event type
3. ✅ Configure backend event emitters (updateauth.service, auth service, etc.)
4. ✅ Add cron jobs for scheduled reminders (booking, subscription)
5. ✅ Test end-to-end: register user → check WhatsApp inbox

For questions or additional templates, refer to this guide!
