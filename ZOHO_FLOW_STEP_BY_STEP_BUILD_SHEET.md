# MANAS360 Zoho Flow Step-by-Step Build Sheet

This guide is for a beginner setting up Zoho Flow from scratch. It explains:
- what to click in Zoho Flow,
- what fields to add,
- what each branch should do,
- and how to test each automation.

## 1) What you are building

You are building one master Zoho Flow router that receives an event from your app, checks the event name, and sends the flow into the correct branch.

Recommended flow name:
- `MANAS360 - Event Router`

Recommended event names:
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

## 2) Where to connect your app to Zoho Flow

Your backend already supports sending events to Zoho Flow through a webhook.

Backend location:
- `backend/src/services/zohoDesk.service.ts`
- Helper: `triggerZohoFlow(event, payload)`

Your app should send data like this:

```json
{
  "event": "USER_REGISTERED",
  "data": {
    "userId": "u_123",
    "name": "Chandu",
    "phone": "919999999999",
    "email": "test@gmail.com",
    "role": "patient"
  },
  "timestamp": "2026-04-04T10:00:00.000Z",
  "source": "MANAS360"
}
```

Important backend environment variable:
- `ZOHO_FLOW_WEBHOOK_URL`

If Zoho Flow later needs to call your backend, the app already exposes:
- `POST /api/webhooks/zoho-flow`

That endpoint checks:
- `x-zoho-flow-secret`

## 3) Zoho Flow basics for beginners

In Zoho Flow, the flow is usually built in this order:
1. Trigger
2. Conditions / Decision
3. Action
4. End

Think of it like this:
- Trigger = “something happened”
- Condition = “which event is this?”
- Action = “what do we do?”

## 4) How to create the master flow

### Step 1: Create the flow
1. Open Zoho Flow.
2. Click **Create Flow**.
3. Choose **Webhook** as the trigger app.
4. Select **Incoming Webhook**.
5. Name it `MANAS360 - Event Router`.
6. Copy the webhook URL.
7. Paste that URL into your backend environment as `ZOHO_FLOW_WEBHOOK_URL`.

### Step 2: Define the webhook fields
When Zoho Flow asks for request fields, add these fields.

Top-level fields:
- `event`
- `timestamp`
- `source`

Nested `data` fields:
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

If Zoho Flow only allows simple keys, flatten them like this:
- `event`
- `timestamp`
- `source`
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

### Step 3: Add a decision block
After the webhook trigger, add a **Decision** or **Switch** block.

In Zoho Flow, this is usually done by clicking **+** after the trigger and choosing:
- **Decision**
- or **Condition**
- or **Branch based on field value**

Use the field:
- `event`

Create one branch for each important event.

## 5) Master routing structure

Your flow should look like this:

```text
Incoming Webhook Trigger
  -> Decision on event
      -> USER_REGISTERED
      -> THERAPIST_APPROVED
      -> SESSION_BOOKED
      -> SESSION_REMINDER
      -> CRISIS_ALERT
      -> PAYMENT_SUCCESS
      -> PAYMENT_FAILED
      -> TICKET_CREATED
      -> THERAPIST_ONBOARDING
      -> SUBSCRIPTION_RENEWAL
      -> FOLLOW_UP_REMINDERS
      -> Default / Unknown event
```

## 6) P0 flows: create these first

These are the most important flows.

---

## 6.1 `USER_REGISTERED` → Notifications

### Trigger
- Incoming Webhook
- Event = `USER_REGISTERED`

### Condition block
- If `event` equals `USER_REGISTERED`

### Action blocks
1. Send WhatsApp welcome message.
2. Add the user to a Zoho Campaigns list.
3. Notify admin or onboarding team.

### Where to click in Zoho Flow
- After the decision block, click **+**.
- Select the WhatsApp or messaging app available in your Zoho account.
- If no WhatsApp app is available, use a **Webhook** or your provider integration.
- Add **Zoho Campaigns** action if available.

### Fields you must map
- `name`
- `phone`
- `email`
- `role`
- `userId`

### Suggested message
- "Welcome to MANAS360, {name}. Your account is created successfully."

### Test payload
```json
{
  "event": "USER_REGISTERED",
  "timestamp": "2026-04-04T10:00:00.000Z",
  "source": "MANAS360",
  "data": {
    "userId": "u_1001",
    "name": "Chandu",
    "phone": "919999999999",
    "email": "test@gmail.com",
    "role": "patient"
  }
}
```

### Beginner click-by-click setup for `USER_REGISTERED` with WATI

Use this when you are building the first branch manually.

#### A. Add the first branch
1. Open your Zoho Flow named `MANAS360 - Event Router`.
2. Click the `+` after the webhook trigger.
3. Select **Decision**.
4. Choose the field `event`.
5. Set the condition to **equals**.
6. Enter `USER_REGISTERED`.
7. Save the branch.

#### B. Add the WhatsApp step using WATI
1. In the `USER_REGISTERED` branch, click `+` below the Decision block.
2. Search for **Webhook** or **Custom API / Webhook action**.
3. Choose the action that lets you send an HTTP request.
4. Set the method to `POST`.
5. Add the WATI message-sending endpoint from your WATI account.
6. Add headers required by WATI, usually:
   - `Authorization`
   - `Content-Type: application/json`
7. Map the body fields from Zoho Flow into the WATI request body.

If your Zoho account has a native WhatsApp connector, you can use that instead of a webhook. The logic stays the same.

#### C. Map the message fields
Use these fields from `data`:
- `name`
- `phone`
- `email`
- `role`
- `userId`

Suggested WhatsApp message template:
```text
Welcome to MANAS360, {{name}}.
Your account has been created successfully.
We will guide you through the next steps shortly.
```

#### D. Add Zoho Campaigns action
1. Click `+` after the WhatsApp step.
2. Choose **Zoho Campaigns**.
3. Select **Add Contact** or **Add Subscriber**.
4. Map:
   - Contact name = `name`
   - Email = `email`
   - Phone = `phone`
   - Tag / list = `USER_REGISTERED`

#### E. Add admin notification
1. Click `+` after Zoho Campaigns.
2. Add an **Email** action or a **Zoho Cliq** notification.
3. Send a short internal message:
   - New user registered
   - Name
   - Phone
   - Role

#### F. Test the branch
1. Click **Test** on the webhook trigger.
2. Paste the sample JSON payload from above.
3. Confirm the `USER_REGISTERED` branch runs.
4. Confirm the WhatsApp action gets the `name` and `phone` fields.
5. Confirm the Campaigns contact is created.
6. Confirm the admin notification is sent.

#### G. What success looks like
- Zoho Flow receives the webhook.
- Decision matches `USER_REGISTERED`.
- WATI sends the welcome WhatsApp.
- Zoho Campaigns stores the contact.
- Admin gets a notification.

#### H. Common beginner mistakes
- Using `user_registered` instead of `USER_REGISTERED`.
- Forgetting to publish the flow after saving.
- Not mapping `phone` correctly in the WATI request body.
- Using the wrong WhatsApp API endpoint.
- Skipping the test payload step.

---

## 6.2 `THERAPIST_APPROVED` → Notifications

### Trigger
- Incoming Webhook
- Event = `THERAPIST_APPROVED`

### Condition block
- If `event` equals `THERAPIST_APPROVED`

### Action blocks
1. Send onboarding message.
2. Send login details.
3. Notify admin.
4. Optionally create a Zoho Desk ticket if documents are missing.

### Fields to map
- `therapistId`
- `therapistName`
- `phone`
- `email`
- `approvedBy`
- `approvalStatus`

### Suggested message
- "Congratulations {therapistName}, your MANAS360 profile is approved."

### Test payload
```json
{
  "event": "THERAPIST_APPROVED",
  "timestamp": "2026-04-04T10:05:00.000Z",
  "source": "MANAS360",
  "data": {
    "therapistId": "t_1001",
    "therapistName": "Dr. Meera Rao",
    "phone": "919999991111",
    "email": "meera@example.com",
    "approvedBy": "admin_01",
    "approvalStatus": "approved"
  }
}
```

### Beginner click-by-click setup for `THERAPIST_APPROVED` with WATI + Zoho Desk

Use this branch when an admin approves a therapist.

#### A. Add the branch
1. In the same `MANAS360 - Event Router` flow, click `+` on the Decision block.
2. Add a new branch.
3. Choose the field `event`.
4. Set the condition to **equals**.
5. Enter `THERAPIST_APPROVED`.
6. Save the branch.

#### B. Send onboarding WhatsApp
1. Click `+` under the `THERAPIST_APPROVED` branch.
2. Choose **Webhook** or **WhatsApp / Messaging**.
3. If using WATI, set request method to `POST`.
4. Paste your WATI endpoint.
5. Add the WATI auth headers.
6. Map therapist fields into the message body.

#### C. Map fields
Use these fields:
- `therapistId`
- `therapistName`
- `phone`
- `email`
- `approvedBy`
- `approvalStatus`

Suggested onboarding message:
```text
Congratulations {{therapistName}}, your MANAS360 profile is approved.
Your account is ready for onboarding.
Please complete the next setup steps.
```

#### D. Send login details
1. Click `+` after the WhatsApp step.
2. Add an **Email** action.
3. Send the login/setup message to the therapist email.
4. Include the portal URL, username, and first-login steps.

#### E. Notify admin
1. Click `+` after the email step.
2. Add **Zoho Cliq** or **Email** for admin notification.
3. Message should include:
   - Therapist name
   - Approval status
   - Approved by

#### F. Optional Zoho Desk ticket
1. If onboarding docs are missing, add a **Decision** block.
2. If `approvalStatus` is not fully complete, create a Zoho Desk ticket.
3. Set ticket priority to Medium or High.

#### G. Test the branch
1. Click **Test** on the webhook trigger.
2. Paste the `THERAPIST_APPROVED` sample payload.
3. Confirm the WhatsApp action runs.
4. Confirm the email action runs.
5. Confirm the admin notification runs.

---

## 6.3 `SESSION_BOOKED` → Confirmation

### Trigger
- Incoming Webhook
- Event = `SESSION_BOOKED`

### Condition block
- If `event` equals `SESSION_BOOKED`

### Action blocks
1. Send confirmation to patient.
2. Send calendar details.
3. Notify therapist.
4. Optionally add to reminder schedule.

### Fields to map
- `sessionId`
- `patientName`
- `patientPhone`
- `therapistName`
- `therapistPhone`
- `sessionDateTime`
- `meetingLink`
- `location`

### Suggested message
- "Your session is confirmed for {sessionDateTime}."

### Test payload
```json
{
  "event": "SESSION_BOOKED",
  "timestamp": "2026-04-04T10:10:00.000Z",
  "source": "MANAS360",
  "data": {
    "sessionId": "sess_2001",
    "patientName": "Chandu",
    "patientPhone": "919999999999",
    "therapistName": "Dr. Meera Rao",
    "therapistPhone": "919999991111",
    "sessionDateTime": "2026-04-05T16:00:00+05:30",
    "meetingLink": "https://meet.manas360.com/session/sess_2001",
    "location": "Zoom"
  }
}
```

### Beginner click-by-click setup for `SESSION_BOOKED` with WATI + calendar details

Use this branch when a patient books a session.

#### A. Add the branch
1. Add another branch from the same Decision block.
2. Choose the field `event`.
3. Set the condition to **equals**.
4. Enter `SESSION_BOOKED`.
5. Save.

#### B. Send patient confirmation
1. Click `+` under the `SESSION_BOOKED` branch.
2. Choose **Webhook** or WhatsApp connector.
3. If using WATI, set `POST` and add auth headers.
4. Map the confirmation message using session fields.

#### C. Map fields
Use these fields:
- `sessionId`
- `patientName`
- `patientPhone`
- `therapistName`
- `therapistPhone`
- `sessionDateTime`
- `meetingLink`
- `location`

Suggested confirmation message:
```text
Hello {{patientName}}, your session is confirmed for {{sessionDateTime}}.
Meeting link: {{meetingLink}}
Therapist: {{therapistName}}
```

#### D. Send therapist notification
1. Click `+` after the patient confirmation step.
2. Add another **WhatsApp** or **Email** action.
3. Send the therapist the session time and patient name.

#### E. Add calendar details
1. Add a **Google Calendar** or **Zoho Calendar** action if available.
2. Create an event using `sessionDateTime` and `meetingLink`.
3. Add patient and therapist as attendees if supported.

#### F. Test the branch
1. Test the webhook with the `SESSION_BOOKED` payload.
2. Confirm patient confirmation is sent.
3. Confirm therapist alert is sent.
4. Confirm calendar event is created.

---

## 6.4 `SESSION_REMINDER` → Scheduled reminder

### Trigger
Use one of these:
- **Scheduled trigger** in Zoho Flow
- or a webhook from your backend cron job

### Condition block
- If `reminderType` = `24h`
- If `reminderType` = `1h`
- If `reminderType` = `10min`

### Action blocks
1. Send reminder to patient.
2. Send reminder to therapist.
3. Optionally log reminder sent.

### Fields to map
- `sessionId`
- `reminderType`
- `patientPhone`
- `therapistPhone`
- `sessionDateTime`

### Suggested reminder text
- `24h`: "Reminder: your session is tomorrow at {sessionDateTime}."
- `1h`: "Your session starts in 1 hour."
- `10min`: "Your session starts in 10 minutes."

### Test payload
```json
{
  "event": "SESSION_REMINDER",
  "timestamp": "2026-04-04T10:15:00.000Z",
  "source": "MANAS360",
  "data": {
    "sessionId": "sess_2001",
    "reminderType": "24h",
    "patientPhone": "919999999999",
    "therapistPhone": "919999991111",
    "sessionDateTime": "2026-04-05T16:00:00+05:30"
  }
}
```

---

## 6.5 `CRISIS_ALERT` → Emergency flow

### Trigger
- Incoming Webhook
- Event = `CRISIS_ALERT`

### Condition block
- If `event` equals `CRISIS_ALERT`
- If `severity` is `HIGH` or `CRITICAL`, use emergency branch

### Action blocks
1. Send WhatsApp to psychiatrist.
2. Send SMS to emergency contact.
3. Create Zoho Desk ticket with priority = Urgent.
4. Notify admin/compliance.

### Fields to map
- `alertId`
- `userId`
- `userName`
- `severity`
- `message`
- `location`
- `assignedPsychiatrist`

### Suggested message
- "Critical alert for {userName}. Immediate review required."

### Test payload
```json
{
  "event": "CRISIS_ALERT",
  "timestamp": "2026-04-04T10:20:00.000Z",
  "source": "MANAS360",
  "data": {
    "alertId": "alert_5001",
    "userId": "u_1001",
    "userName": "Chandu",
    "severity": "CRITICAL",
    "message": "User reported self-harm thoughts",
    "location": "Bengaluru",
    "assignedPsychiatrist": "Dr. Meera Rao"
  }
}
```

### Beginner click-by-click setup for `CRISIS_ALERT` with WATI + Zoho Desk + SMS

Use this branch for urgent crisis escalation.

#### A. Add the branch
1. Add a new branch from the same Decision block.
2. Choose `event`.
3. Set the condition to **equals**.
4. Enter `CRISIS_ALERT`.
5. Save.

#### B. Add a high-severity check
1. Under the `CRISIS_ALERT` branch, add a second **Decision** or **Condition** block.
2. Check `severity`.
3. If severity is `HIGH` or `CRITICAL`, continue to emergency actions.

#### C. Send emergency WhatsApp
1. Click `+` after the severity condition.
2. Choose **Webhook** or WhatsApp connector.
3. Use WATI if you want direct WhatsApp delivery.
4. Send the alert to the assigned psychiatrist and backup responder.

#### D. Send SMS
1. Add another action step.
2. Choose your SMS connector or a webhook to your SMS provider.
3. Send a short urgent message with the user name, severity, and location.

#### E. Create Zoho Desk ticket
1. Add a **Zoho Desk** action.
2. Choose **Create Ticket**.
3. Set:
   - Subject = `CRISIS_ALERT`
   - Priority = `Urgent`
   - Department = Clinical Services / Emergency
4. Map the crisis details into the ticket description.

#### F. Notify admin/compliance
1. Add an email or Zoho Cliq notification.
2. Include user name, severity, and ticket ID.

#### G. Test the branch
1. Use the crisis sample payload.
2. Confirm the emergency branch is matched.
3. Confirm WhatsApp is sent.
4. Confirm SMS is sent.
5. Confirm the Zoho Desk ticket is created.

---

## 7) P1 flows: create these next

---

## 7.1 `PAYMENT_SUCCESS` → Notifications

### Trigger
- Incoming Webhook
- Event = `PAYMENT_SUCCESS`

### Action blocks
1. Send receipt.
2. Notify user that payment succeeded.
3. Update finance record or CRM entry.
4. Notify finance team if needed.

### Fields to map
- `merchantTransactionId`
- `amount`
- `currency`
- `userId`
- `planId`

### Test payload
```json
{
  "event": "PAYMENT_SUCCESS",
  "timestamp": "2026-04-04T10:25:00.000Z",
  "source": "MANAS360",
  "data": {
    "merchantTransactionId": "MTX_9001",
    "amount": 49900,
    "currency": "INR",
    "userId": "u_1001",
    "planId": "patient-1month"
  }
}
```

---

## 7.2 `PAYMENT_FAILED` → Recovery

### Trigger
- Incoming Webhook
- Event = `PAYMENT_FAILED`

### Action blocks
1. Send retry link to user.
2. Notify finance/support.
3. Mark payment as pending recovery.

### Fields to map
- `merchantTransactionId`
- `reason`
- `amount`
- `retryUrl`
- `userId`

### Test payload
```json
{
  "event": "PAYMENT_FAILED",
  "timestamp": "2026-04-04T10:30:00.000Z",
  "source": "MANAS360",
  "data": {
    "merchantTransactionId": "MTX_9002",
    "reason": "insufficient_funds",
    "amount": 49900,
    "retryUrl": "https://manas360.com/retry/MTX_9002",
    "userId": "u_1001"
  }
}
```

---

## 7.3 `TICKET_CREATED` → Zoho Desk automation

### Trigger
- Zoho Desk ticket created
- or inbound webhook from backend if your app creates tickets first

### Action blocks
1. Read ticket tags.
2. Route by tag.
3. Assign department.
4. Update status/priority.
5. Notify responsible team.

### Example routing rules
- `billing` → finance team
- `crisis` → emergency escalation
- `onboarding` → operations team
- `tech` → technical support

### Fields to map
- `ticketId`
- `subject`
- `tags`
- `priority`
- `department`
- `status`

### Test payload
```json
{
  "event": "TICKET_CREATED",
  "timestamp": "2026-04-04T10:35:00.000Z",
  "source": "ZohoDesk",
  "data": {
    "ticketId": "desk_1001",
    "subject": "Payment issue",
    "tags": ["billing", "urgent"],
    "priority": "High",
    "department": "Finance",
    "status": "Open"
  }
}
```

---

## 7.4 `THERAPIST_ONBOARDING` → Partial automation

### Trigger
- Incoming Webhook
- Event = `THERAPIST_ONBOARDING`

### Action blocks
1. Trigger Zoho Sign.
2. Send training email.
3. Create onboarding task.
4. Notify admin if completion is pending.

### Fields to map
- `therapistId`
- `therapistName`
- `documentId`
- `onboardingStage`

### Test payload
```json
{
  "event": "THERAPIST_ONBOARDING",
  "timestamp": "2026-04-04T10:40:00.000Z",
  "source": "MANAS360",
  "data": {
    "therapistId": "t_1001",
    "therapistName": "Dr. Meera Rao",
    "documentId": "sign_001",
    "onboardingStage": "training_pending"
  }
}
```

---

## 8) P2 flows: build later

---

## 8.1 `SUBSCRIPTION_RENEWAL` → Scheduled

### Trigger
- Zoho Flow schedule trigger
- daily or hourly

### Action blocks
1. Find subscriptions near renewal.
2. Send reminder.
3. Notify finance for failures.

### Fields to map
- `subscriptionId`
- `userId`
- `renewalDate`
- `planName`
- `amount`

### Test payload
```json
{
  "event": "SUBSCRIPTION_RENEWAL",
  "timestamp": "2026-04-04T10:45:00.000Z",
  "source": "MANAS360",
  "data": {
    "subscriptionId": "sub_1001",
    "userId": "u_1001",
    "renewalDate": "2026-04-10",
    "planName": "Premium Monthly",
    "amount": 29900
  }
}
```

---

## 8.2 `FOLLOW_UP_REMINDERS` → Scheduled

### Trigger
- Schedule trigger
- or backend cron

### Action blocks
1. Select patients due for follow-up.
2. Send reminder.
3. Notify therapist.

### Fields to map
- `patientId`
- `patientName`
- `therapistName`
- `nextFollowUpDate`
- `followUpReason`

### Test payload
```json
{
  "event": "FOLLOW_UP_REMINDERS",
  "timestamp": "2026-04-04T10:50:00.000Z",
  "source": "MANAS360",
  "data": {
    "patientId": "p_1001",
    "patientName": "Chandu",
    "therapistName": "Dr. Meera Rao",
    "nextFollowUpDate": "2026-04-07",
    "followUpReason": "post-session check-in"
  }
}
```

## 9) Inbound Zoho Flow callback into your app

If Zoho Flow needs to call your backend after completing actions, use:
- `POST /api/webhooks/zoho-flow`

Add this header:
- `x-zoho-flow-secret: your-secret-value`

Example body:

```json
{
  "flowName": "MANAS360 - Event Router",
  "data": {
    "event": "USER_REGISTERED",
    "status": "completed"
  }
}
```

## 10) What to do if Zoho Flow has no WhatsApp/SMS connector

If you do not see a native WhatsApp or SMS connector in your Zoho account:
1. Use the **Webhook** action step.
2. Send the data to your WhatsApp/SMS provider.
3. Or create a Zoho Desk ticket and notify through another channel.

## 11) Beginner troubleshooting

### If the webhook trigger does not fire
- Confirm `ZOHO_FLOW_WEBHOOK_URL` is correct.
- Make sure the flow is activated.
- Confirm the app is posting to the webhook URL.

### If the wrong branch runs
- Check the `event` value.
- Make sure the event names match exactly.
- Use uppercase canonical names.

### If Zoho Desk action fails
- Check Zoho Desk connection and org ID.
- Re-authenticate the connection if needed.

### If WhatsApp/SMS fails
- Check the connector credentials.
- Use a webhook fallback.

## 12) Best implementation order for a beginner
1. Create the webhook trigger.
2. Add the `event` field.
3. Build `USER_REGISTERED` branch.
4. Build `THERAPIST_APPROVED` branch.
5. Build `SESSION_BOOKED` branch.
6. Build `PAYMENT_SUCCESS` branch.
7. Build `CRISIS_ALERT` branch.
8. Add the rest later.

## 13) Final recommendation
Start with only one master flow and 5 P0 branches first:
- `USER_REGISTERED`
- `THERAPIST_APPROVED`
- `SESSION_BOOKED`
- `SESSION_REMINDER`
- `CRISIS_ALERT`

Once those work, add the P1 and P2 flows.
