# WhatsApp Templates Quick Reference

## Template Naming Convention

`{event}_{recipient_type}_{optional_detail}`

**Examples:**
- `user_welcome_patient` - Welcome message to patient user
- `booking_reminder_24h` - Booking reminder (sent to both patient & provider)
- `payment_failed_user` - Payment failure message to patient
- `provider_welcome_therapist` - Welcome message to therapist provider

---

## All Templates by Event Type

### Registration & Onboarding

| Event | Template Name | Recipient | Variables |
|-------|---------------|-----------|-----------|
| User registers (patient) | `user_welcome_patient` | Patient | `{{name}}`, `{{appUrl}}`, `{{appName}}` |
| User registers (therapist) | `user_welcome_therapist` | Therapist | `{{name}}`, `{{appUrl}}`, `{{appName}}` |
| User registers (psychiatrist) | `user_welcome_psychiatrist` | Psychiatrist | `{{name}}`, `{{appUrl}}`, `{{appName}}` |
| User registers (psychologist) | `user_welcome_psychologist` | Psychologist | `{{name}}`, `{{appUrl}}`, `{{appName}}` |
| User registers (coach) | `user_welcome_coach` | Coach | `{{name}}`, `{{appUrl}}`, `{{appName}}` |
| User registers (generic) | `user_welcome_generic` | Any user | `{{name}}`, `{{appUrl}}`, `{{appName}}` |
| Provider registers (therapist) | `provider_welcome_therapist` | Therapist | `{{name}}`, `{{specialization}}`, `{{appUrl}}` |
| Provider registers (psychiatrist) | `provider_welcome_psychiatrist` | Psychiatrist | `{{name}}`, `{{specialization}}`, `{{appUrl}}` |
| Provider registers (psychologist) | `provider_welcome_psychologist` | Psychologist | `{{name}}`, `{{specialization}}`, `{{appUrl}}` |
| Provider registers (coach) | `provider_welcome_coach` | Coach | `{{name}}`, `{{specialization}}`, `{{appUrl}}` |

### Authentication

| Event | Template Name | Recipient | Variables |
|-------|---------------|-----------|-----------|
| Login OTP requested | `otp_login` | All users | `{{otp}}`, `{{expiresIn}}`, `{{appName}}` |

### Bookings & Appointments

| Event | Template Name | Recipient | Variables |
|-------|---------------|-----------|-----------|
| Booking confirmed | `booking_confirmed_patient` | Patient | `{{therapistName}}`, `{{appointmentDate}}`, `{{appointmentTime}}`, `{{sessionLink}}`, `{{appUrl}}` |
| Booking confirmed | `booking_confirmed_provider` | Provider | `{{patientName}}`, `{{appointmentDate}}`, `{{appointmentTime}}`, `{{sessionLink}}`, `{{dashboardLink}}` |
| Booking confirmed (generic) | `booking_confirmed_generic` | Fallback | `{{otherPartyName}}`, `{{appointmentDate}}`, `{{appointmentTime}}` |
| 24h reminder | `booking_reminder_24h` | Both | `{{name}}`, `{{otherPartyName}}`, `{{appointmentTime}}`, `{{sessionLink}}` |
| 2h reminder | `booking_reminder_2h` | Both | `{{name}}`, `{{otherPartyName}}`, `{{appointmentTime}}`, `{{sessionLink}}` |

### Payment & Billing

| Event | Template Name | Recipient | Variables |
|-------|---------------|-----------|-----------|
| Payment success | `payment_success` | All users | `{{name}}`, `{{amount}}`, `{{planName}}`, `{{expiryDate}}` |
| Payment failed (patient) | `payment_failed_user` | Patient | `{{name}}`, `{{amount}}`, `{{reason}}`, `{{retryUrl}}`, `{{supportPhone}}` |
| Payment failed (provider) | `payment_failed_provider` | Provider | `{{name}}`, `{{amount}}`, `{{reason}}`, `{{bankingDetailsUrl}}` |
| Refund processed | `refund_processed` | All users | `{{name}}`, `{{amount}}`, `{{expectedDays}}`, `{{transactionId}}` |
| Subscription expires (7d) | `subscription_expiry_7d` | All users | `{{name}}`, `{{expiryDate}}`, `{{renewUrl}}` |
| Subscription expires (1d) | `subscription_expiry_1d` | All users | `{{name}}`, `{{expiryDate}}`, `{{renewUrl}}` |
| Subscription renewed | `subscription_renewed` | All users | `{{name}}`, `{{planName}}`, `{{newExpiryDate}}`, `{{amount}}` |

### Clinical & Session Related

| Event | Template Name | Recipient | Variables |
|-------|---------------|-----------|-----------|
| Session follow-up | `session_followup` | Patient & Provider | `{{name}}`, `{{therapistName}}`, `{{sessionDate}}`, `{{feedbackUrl}}`, `{{nextSessionDate}}` |
| Results ready | `clinical_results_ready` | Patient | `{{name}}`, `{{assessmentName}}`, `{{resultsUrl}}` |
| Treatment plan updated | `treatment_plan_updated` | Patient | `{{name}}`, `{{therapistName}}`, `{{planUrl}}` |
| Report uploaded | `report_uploaded_patient` | Patient | `{{name}}`, `{{reportName}}`, `{{reportUrl}}`, `{{therapistName}}` |
| Prescription issued | `prescription_issued_patient` | Patient | `{{name}}`, `{{therapistName}}`, `{{prescriptionUrl}}`, `{{instructions}}` |
| Therapist shared notes | `therapist_note_shared_patient` | Patient | `{{name}}`, `{{therapistName}}`, `{{noteTitle}}`, `{{noteUrl}}` |
| Therapist sent message | `therapist_message_patient` | Patient | `{{name}}`, `{{therapistName}}`, `{{message}}`, `{{messageUrl}}` |
| Clinical notes updated | `clinical_notes_updated_patient` | Patient | `{{name}}`, `{{therapistName}}`, `{{notesSummary}}`, `{{notesUrl}}` |

---

## Variable Reference

### Common Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{name}}` | "John Doe" | User or provider name |
| `{{appName}}` | "MANAS360" | Application name |
| `{{appUrl}}` | "https://manas360.com" | App or dashboard link |
| `{{supportPhone}}` | "+919876543210" | Customer support number |

### User/Person Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{therapistName}}` | "Dr. Sharma" | Therapist/provider name from patient's view |
| `{{patientName}}` | "Ananya" | Patient name from provider's view |
| `{{otherPartyName}}` | "Dr. Sharma" or "Ananya" | Generic reference (swap based on context) |

### Appointment Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{appointmentDate}}` | "Apr 5, 2026" | Date of appointment |
| `{{appointmentTime}}` | "3:00 PM IST" | Time of appointment |
| `{{sessionLink}}` | "https://meet.manas360.com/session/abc123" | Video call or meeting URL |
| `{{nextSessionDate}}` | "Apr 12, 2026" | Next scheduled appointment |

### Billing Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{amount}}` | "₹499" | Payment or refund amount |
| `{{planName}}` | "6-Month Therapy Plan" | Subscription plan name |
| `{{expiryDate}}` | "Oct 4, 2026" | Subscription expiration date |
| `{{newExpiryDate}}` | "Oct 4, 2026" | New expiration after renewal |
| `{{reason}}` | "Declined by bank" | Why payment failed |
| `{{transactionId}}` | "TXN_20260404_12345" | Reference ID for payment/refund |
| `{{expectedDays}}` | "5-7 business days" | Timeline for refund arrival |
| `{{retryUrl}}` | "https://manas360.com/retry-payment" | Link to retry payment |
| `{{renewUrl}}` | "https://manas360.com/renew-subscription" | Link to renew subscription |
| `{{bankingDetailsUrl}}` | "https://dashboard.manas360.com/banking" | Link to update bank details |
| `{{dashboardLink}}` | "https://provider-dashboard.manas360.com" | Provider dashboard |

### Clinical Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{assessmentName}}` | "PHQ-9 Assessment" | Name of clinical assessment |
| `{{resultsUrl}}` | "https://manas360.com/results/abc123" | Link to view results |
| `{{planUrl}}` | "https://manas360.com/treatment-plan/xyz789" | Link to view treatment plan |
| `{{feedbackUrl}}` | "https://manas360.com/feedback/session/abc123" | Link to submit feedback |

### Timing Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{expiresIn}}` | "5 minutes" | OTP validity duration |
| `{{sessionDate}}` | "Apr 4, 2026" | Date of completed session |

### Provider-Specific Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{specialization}}` | "PTSD Counseling" | Provider's specialization |
| `{{providerDashboardUrl}}` | "https://provider-dashboard.manas360.com" | Link to provider dashboard |

### Clinical Document & Communication Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{reportName}}` | "PHQ-9 Assessment Report" | Name of uploaded report |
| `{{reportUrl}}` | "https://manas360.com/reports/abc123" | Link to view report |
| `{{prescriptionUrl}}` | "https://manas360.com/prescriptions/xyz789" | Link to view prescription |
| `{{instructions}}` | "Take 1 tablet daily with food" | Prescription instructions |
| `{{noteTitle}}` | "Progress Notes - Apr 04, 2026" | Title of shared notes |
| `{{noteUrl}}` | "https://manas360.com/notes/note456" | Link to view notes |
| `{{message}}` | "Keep up the great progress!" | Direct message text |
| `{{messageUrl}}` | "https://manas360.com/messages/msg789" | Link to view full message |
| `{{notesSummary}}` | "Session focused on anxiety management techniques" | Brief summary of notes |
| `{{notesUrl}}` | "https://manas360.com/clinical-notes/cli123" | Link to view clinical notes |

---

## User Type Mapping

### How to Determine User Type for WhatsApp Template Selection

```typescript
enum UserRole {
  PATIENT = 'PATIENT',
  THERAPIST = 'THERAPIST',
  PSYCHIATRIST = 'PSYCHIATRIST',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  COACH = 'COACH',
  ADMIN = 'ADMIN',
  // ... others
}

type WhatsAppUserType = 'patient' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach' | 'user';

function mapRoleToWhatsAppUserType(role: UserRole): WhatsAppUserType {
  const mapping: Record<UserRole, WhatsAppUserType> = {
    'PATIENT': 'patient',
    'THERAPIST': 'therapist',
    'PSYCHIATRIST': 'psychiatrist',
    'PSYCHOLOGIST': 'psychologist',
    'COACH': 'coach',
    'ADMIN': 'user', // fallback
    // ...others: 'user'
  };
  return mapping[role] || 'user';
}
```

---

## Watti Template Registration Example

### How to Register Template in Watti Dashboard

**Template ID:** `user_welcome_patient`

```
Template Name:        user_welcome_patient
Category:             MARKETING or UTILITY
Language:             English (en)
Header (Optional):    None
Body:
Hi {{1}}! 👋

Welcome to MANAS360 — Your trusted mental health platform.

You're all set! Explore therapists, book sessions, and start your wellness journey.

Visit: {{2}}

Need help? Reply HELP

Footer (Optional):    MANAS360: Your Mental Health Partner

Buttons:
- [EXPLORE NOW] → {{2}}
- [GET HELP] → https://manas360.com/help
```

**Variables:**
- `{{1}}` = `{{name}}`
- `{{2}}` = `{{appUrl}}`

---

## Zoho Flow: Mapping Backend → Watti

### Step-by-Step Mapping for `sendWhatsAppMessage()`

**Backend Call:**
```typescript
await sendWhatsAppMessage({
  phoneNumber: '+919876543210',
  templateType: 'user_welcome',
  userType: 'patient',
  templateVariables: {
    name: 'John Doe',
    appUrl: 'https://manas360.com',
  },
});
```

**Zoho Flow Webhook Payload:**
```json
{
  "event": "whatsapp_message_send",
  "timestamp": "2026-04-04T15:30:00.000Z",
  "source": "MANAS360",
  "data": {
    "phoneNumber": "+919876543210",
    "templateName": "user_welcome_patient",
    "templateType": "user_welcome",
    "userType": "patient",
    "variables": {
      "name": "John Doe",
      "appUrl": "https://manas360.com"
    },
    "language": "en"
  }
}
```

**Zoho Flow Logic:**
```
RECEIVE webhook → EXTRACT data
  ℹ templateName: user_welcome_patient
  ℹ phoneNumber: +919876543210
  ℹ variables: { name, appUrl }

CALL WATTI API:
  to: "+919876543210"
  templateName: "user_welcome_patient"
  variables: {
    "1": "John Doe",         // {{1}} in Watti
    "2": "https://manas360.com"  // {{2}} in Watti
  }

RESPONSE: { success: true }
```

---

## Message Frequency & Limits

| Message Type | Max Per Day | Max Per Month | Notes |
|--------------|------------|---------------|-------|
| Transactional (OTP, booking conf) | Unlimited | Unlimited | Send immediately |
| Reminders (24h, 2h before) | 1-2 | ~60 | Scheduled, stagger by 1h |
| Billing notices (payment fail) | 3 | 10 | Retry logic, backoff |
| Subscription expiry (7d, 1d) | 2 | 60 | Scheduled, well-spaced |
| Marketing/engagement | 1 | 10 | Respect user preferences |

---

## Testing Checklist

- [ ] Watti API token configured in `.env`
- [ ] Zoho Flow webhook URL configured
- [ ] All templates registered in Watti Dashboard
- [ ] Backend service imports `sendWhatsAppMessage`
- [ ] User registration triggers welcome message
- [ ] Provider registration triggers provider-specific message
- [ ] Booking confirmed sends correct recipient-type message
- [ ] Can see webhook events in Zoho Flow logs
- [ ] Watti API calls logged in Zoho Flow
- [ ] Messages arrive in user's WhatsApp inbox
- [ ] Variables are substituted correctly
- [ ] Special characters (emojis, symbols) render properly

---

## FAQ

**Q: Why separate templates for patient vs. therapist?**  
A: Different roles need different messaging. Patients often need supportive tone with action buttons. Therapists/providers need business-focused content (availability, earnings, etc.).

**Q: Can we use the same template for all user types?**  
A: Yes, but limits personalization and compliance features. Generic fallback is provided.

**Q: How do we handle multi-language?**  
A: Create separate template per language in Watti (e.g., `user_welcome_patient_en`, `user_welcome_patient_hi`). Pass `language: 'hi'` to `sendWhatsAppMessage()`.

**Q: What if user hasn't verified phone number?**  
A: Don't send WhatsApp. Check `user.phoneVerified` before calling `sendWhatsAppMessage()`.

**Q: Can Zoho Flow enrich variables before calling Watti?**  
A: Yes! Use Zoho Flow actions (Data > Search records) to fetch additional user/therapist details before sending.

**Q: How do we test without Watti production account?**  
A: Use mock webhook endpoint locally. Capture payload and verify structure matches Watti API docs.

---

**Last Updated:** 4 April 2026  
**Author:** MANAS360 Engineering  
**Version:** 1.0
