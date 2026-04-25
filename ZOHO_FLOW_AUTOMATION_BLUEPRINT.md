# Zoho Flow Automation Blueprint for MANAS360

## Goal
Create one master Zoho Flow automation that receives events from the app, routes them by `event`, and performs the correct action chain for notifications, Desk, Sign, SMS/WhatsApp, campaigns, and reminders.

## What already exists in the app

### Outbound event trigger helper
The backend already has a generic helper that posts to a Zoho Flow webhook:
- `backend/src/services/zohoDesk.service.ts`
- Helper: `triggerZohoFlow(event, payload)`
- Payload format:
  - `event`
  - `data`
  - `timestamp`

### Inbound Zoho Flow callback endpoint
The backend also has a generic Zoho Flow receiver:
- Route file: `backend/src/routes/webhook.routes.ts`
- Mounted under: `POST /api/webhooks/zoho-flow`
- Required header: `x-zoho-flow-secret`
- Shared handler: `zohoFlowEventHandler`

### Current app events already visible in code
These event-like strings already exist in the backend today:
- `payment_success_automation`
- `contract_signed_automation`
- `therapist_verification_updated`
- `payout_processed`
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILED`
- `CRISIS_ALERT`
- `SESSION_REMINDER_24H`
- `SESSION_REMINDER_1H`

## Recommended naming rule
Use one canonical event name in Zoho Flow and in the app payload.

Recommended canonical event keys:
- `USER_REGISTERED`
- `THERAPIST_APPROVED`
- `SESSION_BOOKED`
- `SESSION_REMINDER`
- `CRISIS_ALERT`
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILED`
- `TICKET_CREATED`
- `THERAPIST_ONBOARDING`
- `SUBSCRIPTION_RENEWAL`
- `FOLLOW_UP_REMINDERS`

If the backend still emits older names like `payment_success_automation`, map them to the canonical names inside Zoho Flow using a Decision block.

## One master flow architecture
Create a single Zoho Flow called:
- `MANAS360 - Event Router`

Use this pattern:
1. Incoming Webhook trigger
2. Parse JSON payload
3. Decision block on `event`
4. Branch to the correct action set
5. End with a success response

If Zoho Flow limits branching complexity, keep the same webhook contract and split into three flows:
- `MANAS360 - P0 Notifications`
- `MANAS360 - P1 Recovery`
- `MANAS360 - P2 Scheduled`

## Webhook contract to send from the app

Send this JSON body from the backend to Zoho Flow:

```json
{
  "event": "USER_REGISTERED",
  "data": {
    "userId": "...",
    "name": "...",
    "phone": "...",
    "email": "...",
    "role": "patient"
  },
  "timestamp": "2026-04-04T10:00:00.000Z",
  "source": "MANAS360"
}
```

Suggested fields to include in `data`:
- `userId`
- `name`
- `phone`
- `email`
- `role`
- `therapistId`
- `therapistName`
- `sessionId`
- `sessionDateTime`
- `amount`
- `currency`
- `ticketId`
- `severity`
- `message`
- `channel`
- `metadata`

## Environment variables to configure in the backend

- `ZOHO_FLOW_WEBHOOK_URL` = your Zoho Flow incoming webhook URL
- `ZOHO_FLOW_WEBHOOK_SECRET` = shared secret for inbound Zoho Flow callbacks
- `ZOHO_DESK_ORG_ID` = Zoho Desk org ID
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_DESK_BASE_URL` (optional)
- `ZOHO_ACCOUNTS_URL` (optional)

## Exact Zoho Flow setup steps

### 1) Create the master flow
1. Open Zoho Flow.
2. Click **Create Flow**.
3. Select **Webhook** as the trigger.
4. Choose **Incoming Webhook**.
5. Name it `MANAS360 - Event Router`.
6. Copy the webhook URL and save it as `ZOHO_FLOW_WEBHOOK_URL` in the backend environment.

### 2) Define webhook fields
Create fields in the webhook trigger for:
- `event`
- `source`
- `timestamp`
- `data.userId`
- `data.name`
- `data.phone`
- `data.email`
- `data.role`
- `data.therapistId`
- `data.therapistName`
- `data.sessionId`
- `data.sessionDateTime`
- `data.amount`
- `data.currency`
- `data.ticketId`
- `data.severity`
- `data.message`
- `data.channel`
- `data.metadata`

### 3) Add a Decision / Switch step
Route by `event`.

Example branches:
- `USER_REGISTERED`
- `THERAPIST_APPROVED`
- `SESSION_BOOKED`
- `SESSION_REMINDER`
- `CRISIS_ALERT`
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILED`
- `TICKET_CREATED`
- `THERAPIST_ONBOARDING`
- `SUBSCRIPTION_RENEWAL`
- `FOLLOW_UP_REMINDERS`

### 4) Add a default branch
Send unknown events to:
- Zoho Desk note, or
- Admin email, or
- a logging webhook

This helps catch typos and missing app events.

## Event-by-event flow design

### 1. `USER_REGISTERED` → Notifications
**Source in app:** signup controller / user creation service

**Zoho Flow steps:**
1. Trigger on `USER_REGISTERED`.
2. Send WhatsApp welcome message.
3. Add the user to the correct Zoho Campaigns list.
4. Optionally create a Zoho Desk ticket if onboarding needs manual review.
5. Send an admin summary notification.

**Suggested payload:**
- `userId`
- `name`
- `phone`
- `email`
- `role`
- `campaignTag`

**Recommended actions:**
- WhatsApp welcome text
- Campaign subscribe
- Admin notification

---

### 2. `THERAPIST_APPROVED` → Notifications
**Source in app:** admin verification controller

**Zoho Flow steps:**
1. Trigger on `THERAPIST_APPROVED`.
2. Send onboarding message to the therapist.
3. Send login details or account activation email.
4. Notify admin / operations team.
5. If onboarding is incomplete, create a Zoho Desk task/ticket.

**Suggested payload:**
- `therapistId`
- `therapistName`
- `email`
- `phone`
- `approvedBy`
- `approvalStatus`

**Recommended actions:**
- WhatsApp or email onboarding message
- Login setup instructions
- Admin audit notification

---

### 3. `SESSION_BOOKED` → Notifications
**Source in app:** session booking controller / booking service

**Zoho Flow steps:**
1. Trigger on `SESSION_BOOKED`.
2. Send confirmation to the patient.
3. Send calendar details.
4. Notify the therapist.
5. Optionally create a reminder schedule entry.

**Suggested payload:**
- `sessionId`
- `patientId`
- `patientName`
- `therapistId`
- `therapistName`
- `sessionDateTime`
- `meetingLink`
- `location`

**Recommended actions:**
- Confirmation email/WhatsApp
- Calendar invite
- Therapist alert

---

### 4. `SESSION_REMINDER` → Scheduled reminders
**Source in app:** scheduled job / cron

**Zoho Flow steps:**
1. Trigger on schedule or from backend cron.
2. Branch by reminder window:
   - `24h`
   - `1h`
   - `10min`
3. Send reminder to patient.
4. Send reminder to therapist.

**Suggested payload:**
- `sessionId`
- `reminderType` (`24h`, `1h`, `10min`)
- `patientPhone`
- `therapistPhone`
- `sessionDateTime`

**Recommended actions:**
- WhatsApp reminder
- Email reminder
- Calendar event reminder

---

### 5. `CRISIS_ALERT` → Emergency flow
**Source in app:** crisis escalation service / GPS alert flow

**Zoho Flow steps:**
1. Trigger on `CRISIS_ALERT`.
2. Send WhatsApp to the psychiatrist or crisis team.
3. Send SMS to backup/emergency number.
4. Create a Zoho Desk ticket with urgent priority.
5. Add a note / tag such as `CRISIS`.
6. Notify admin and compliance.

**Suggested payload:**
- `alertId`
- `userId`
- `userName`
- `severity`
- `message`
- `location`
- `assignedPsychiatrist`

**Recommended actions:**
- Urgent alert
- Desk ticket creation
- Escalation tag
- Audit log entry

---

### 6. `PAYMENT_SUCCESS` → Notifications
**Source in app:** payment webhook / payment controller

**Zoho Flow steps:**
1. Trigger on `PAYMENT_SUCCESS`.
2. Send receipt to the user.
3. Notify the user that payment succeeded.
4. Update billing records or CRM record.
5. Optionally notify finance.

**Suggested payload:**
- `merchantTransactionId`
- `amount`
- `currency`
- `userId`
- `planId`
- `status`

**Recommended actions:**
- Receipt email
- Payment success WhatsApp
- Finance notification

---

### 7. `PAYMENT_FAILED` → Recovery
**Source in app:** payment failure handler / reconciliation job

**Zoho Flow steps:**
1. Trigger on `PAYMENT_FAILED`.
2. Send retry link to the user.
3. Notify finance / support.
4. Create follow-up task if retry is not completed.
5. Mark the subscription/payment state as pending recovery.

**Suggested payload:**
- `merchantTransactionId`
- `reason`
- `amount`
- `retryUrl`
- `userId`

**Recommended actions:**
- Retry message
- Finance alert
- Follow-up task

---

### 8. `TICKET_CREATED` → Zoho Desk automation
**Source in app:** Zoho Desk inbound or support ticket creation

**Zoho Flow steps:**
1. Trigger on ticket creation in Zoho Desk.
2. Read ticket tags / category / priority.
3. Route based on tag:
   - billing → finance
   - crisis → clinical escalation
   - onboarding → operations
   - tech → support
4. Add SLA / blueprint action.
5. Notify the assigned team.

**Suggested payload:**
- `ticketId`
- `subject`
- `tags`
- `priority`
- `department`
- `status`

**Recommended actions:**
- Desk assignment
- Tag-based routing
- SLA escalation

---

### 9. `THERAPIST_ONBOARDING` → Partial automation
**Source in app:** Zoho Sign completion / admin onboarding controller

**Zoho Flow steps:**
1. Trigger when contract is signed or onboarding starts.
2. Send Zoho Sign document if not already sent.
3. Send training emails.
4. Add onboarding task for admin.
5. Mark onboarding stage.

**Suggested payload:**
- `therapistId`
- `therapistName`
- `documentId`
- `onboardingStage`

**Recommended actions:**
- Zoho Sign workflow
- Training email series
- Admin task creation

---

### 10. `SUBSCRIPTION_RENEWAL` → Scheduled
**Source in app:** subscription cron / renewal job

**Zoho Flow steps:**
1. Run daily or hourly schedule.
2. Find subscriptions due for renewal.
3. Send renewal reminders.
4. Notify finance for failed renewals.
5. Update tags/status in CRM or Desk.

**Suggested payload:**
- `subscriptionId`
- `userId`
- `renewalDate`
- `planName`
- `amount`

**Recommended actions:**
- Renewal reminder
- Retry payment link
- Finance alert

---

### 11. `FOLLOW_UP_REMINDERS` → Scheduled follow-up
**Source in app:** cron or care-plan scheduler

**Zoho Flow steps:**
1. Run on schedule.
2. Select patients due for follow-up.
3. Send reminder to patient.
4. Notify therapist if action is required.
5. Log reminder status.

**Suggested payload:**
- `patientId`
- `patientName`
- `therapistName`
- `nextFollowUpDate`
- `followUpReason`

**Recommended actions:**
- WhatsApp reminder
- Email reminder
- Therapist notification

## How the app should connect to Zoho Flow

### Outbound: app → Zoho Flow
1. Set `ZOHO_FLOW_WEBHOOK_URL` in the backend.
2. Keep the payload format as `{ event, data, timestamp }`.
3. Call `triggerZohoFlow(event, payload)` from the right business service.
4. Use canonical event names from this document.

### Inbound: Zoho Flow → app
1. Zoho Flow calls `POST /api/webhooks/zoho-flow`.
2. Send header `x-zoho-flow-secret`.
3. Backend validates the secret before accepting the event.
4. Backend logs or relays the event to internal systems.

## Suggested backend hook points
If some events are not yet emitted, add the trigger at these places:
- `USER_REGISTERED` → signup / auth service
- `THERAPIST_APPROVED` → admin verification controller
- `SESSION_BOOKED` → booking service
- `SESSION_REMINDER` → cron job
- `CRISIS_ALERT` → crisis escalation service
- `PAYMENT_SUCCESS` → payment webhook/controller
- `PAYMENT_FAILED` → payment failure/reconciliation path
- `TICKET_CREATED` → Zoho Desk sync
- `THERAPIST_ONBOARDING` → Zoho Sign completion
- `SUBSCRIPTION_RENEWAL` → subscription cron
- `FOLLOW_UP_REMINDERS` → reminder scheduler

## Production best practices
- Use one canonical event name per business action.
- Add idempotency keys in the payload.
- Log every outbound webhook call and response.
- Keep the Zoho Flow secret separate from the webhook URL.
- Use a default branch for unknown events.
- Test each branch with one sample payload before going live.
- Keep WhatsApp/SMS provider credentials in Zoho Connections or backend secrets, not in the flow steps.
- For scheduled reminders, keep the timing in the app or one master Zoho Flow schedule to avoid duplicate sends.

## Quick start checklist
- [ ] Create Zoho Flow connection
- [ ] Save webhook URL in `ZOHO_FLOW_WEBHOOK_URL`
- [ ] Add webhook fields for all event payloads
- [ ] Build the `MANAS360 - Event Router` flow
- [ ] Add Decision branches for all events
- [ ] Connect Desk / Sign / Campaigns / notification providers
- [ ] Test each branch with sample payloads
- [ ] Add logging and error handling

## Recommended first implementation order
1. `USER_REGISTERED`
2. `THERAPIST_APPROVED`
3. `SESSION_BOOKED`
4. `PAYMENT_SUCCESS`
5. `CRISIS_ALERT`
6. `PAYMENT_FAILED`
7. `SESSION_REMINDER`
8. `TICKET_CREATED`
9. `THERAPIST_ONBOARDING`
10. `SUBSCRIPTION_RENEWAL`
11. `FOLLOW_UP_REMINDERS`

