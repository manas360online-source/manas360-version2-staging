# Zoho Flow Webhook Standards (Event Routing + Swipe Invoice)

Use this file as the canonical payload reference for backend -> Zoho Flow calls.

## 1) Standard Event Webhook (for Zoho Flow Selection)

Backend sends this payload to Zoho Flow webhook trigger.
Zoho Flow should use `event` + `role` in Decision blocks to route the flow.

```json
{
  "event": "USER_REGISTERED",
  "role": "PATIENT",
  "timestamp": "2026-04-07T10:30:00.000Z",
  "source": "MANAS360",
  "data": {
    "userId": "u_1001",
    "name": "Dr. Priya Sharma",
    "phone": "919636269114",
    "email": "priya@example.com",
    "therapistName": "Dr. Rajesh",
    "date": "10 April 2026",
    "time": "6:00 PM IST",
    "meetingLink": "https://meet.jit.si/...",
    "detailsLink": "https://manas360.com/...",
    "certificateName": "CBT Level 1",
    "amount": "₹699",
    "status": "success",
    "specialization": "Clinical Psychologist",
    "clinicalType": "PHQ9_CRITICAL",
    "assessmentScore": "14",
    "severity": "MODERATE",
    "licenseNumber": "RCI-12345",
    "expiryDate": "30 April 2026",
    "payoutAmount": "₹2,500",
    "contractLink": "https://sign.zoho.com/...",
    "reason": "therapist unavailable",
    "sessionId": "sess_7a3f",
    "districtName": "Rangareddy"
  }
}
```

### Required Rules

- `event`: Required, uppercase snake case (example: `PAYMENT_SUCCESS`, `SESSION_BOOKED`)
- `role`: Required, one of `PATIENT | THERAPIST | PSYCHIATRIST | COACH | ASHA | ADMIN`
- `timestamp`: Required, ISO 8601 UTC
- `source`: Required, always `MANAS360`
- `data.userId`, `data.name`, `data.phone`, `data.email`: Always required
- `data.phone`: WATI format `91xxxxxxxxxx` (no `+`, no spaces)

## 2) Swipe Invoice Webhook Payload (Backend -> Zoho Flow)

Use this payload when payment is successful and invoice must be generated in Swipe.

```json
{
  "event": "PAYMENT_SUCCESS",
  "role": "PATIENT",
  "timestamp": "2026-04-10T18:30:00.000Z",
  "source": "MANAS360",
  "data": {
    "userId": "u_1001",
    "name": "Patient Name",
    "phone": "919988776655",
    "email": "patient@email.com",
    "transactionId": "T240325123456",
    "amountPaid": 699,
    "paymentMode": "PhonePe",
    "swipeItemId": "THERAPY_699_V3",
    "quantity": 1,
    "serviceCategory": "Clinical",
    "notes": "PhonePe Ref: T240325123456"
  }
}
```

## 3) Zoho Flow Setup (Webhook Selection + Swipe Branch)

1. Create Flow -> Trigger -> `Webhook`.
2. Copy the generated webhook URL and store in backend env as `ZOHO_FLOW_WEBHOOK_URL`.
3. Add `Decision` block for event routing:
   - Branch A: `event == "PAYMENT_SUCCESS"` -> Swipe invoice path
   - Branch B: other events (`USER_REGISTERED`, `SESSION_BOOKED`, etc.) -> existing notification paths
4. In Swipe branch, add `Invoke URL` action to call Swipe API.
5. Map incoming Zoho payload fields to Swipe API fields.

## 4) Swipe API Mapping (in Zoho Flow Invoke URL)

- Swipe `customer_id` <- `${data.phone}`
- Swipe `name` <- `${data.name}`
- Swipe `item_id` <- `${data.swipeItemId}`
- Swipe `quantity` <- `${data.quantity}`
- Swipe `notes` <- `${data.notes}`

## 5) Swipe Invoke URL Example

Method: `POST`

URL:

```text
https://api.getswipe.in/invoice/v1/create
```

Headers:

```json
{
  "Authorization": "Bearer ${SWIPE_SECRET_KEY}",
  "Content-Type": "application/json"
}
```

Body:

```json
{
  "customer_id": "${data.phone}",
  "name": "${data.name}",
  "item_id": "${data.swipeItemId}",
  "quantity": ${data.quantity},
  "notes": "${data.notes}"
}
```

## 6) Backend Trigger Conditions

Trigger Zoho Flow only when all are true:

- PhonePe signature verified
- payment status is success/captured
- idempotency check passed (avoid duplicate invoice)

## 7) Recommended Retry and Error Handling

- Backend retries Zoho Flow webhook: 3 attempts with exponential backoff
- Zoho Flow should log Swipe response payload
- On failure, store `ZOHO_FLOW_ERROR` in invoice metadata and expose in admin error endpoint

## 8) Required Sequence: Payment Success -> Swipe First -> User Confirmation After Invoice

This is the exact orchestration you asked for.

### Flow Order

1. Payment success event comes from backend to Zoho Flow (`event=PAYMENT_SUCCESS`).
2. Zoho Flow first calls Swipe `create invoice` API.
3. Zoho Flow checks Swipe response status:
  - If success: send confirmation to user with invoice details/link.
  - If failed: do not send invoice confirmation; send failure/fallback alert internally (admin/support) and retry.

### Zoho Flow Blocks (Exact)

1. `Webhook Trigger` (receives backend payload)
2. `Decision` -> `event == PAYMENT_SUCCESS`
3. `Invoke URL` -> Swipe invoice create API
4. `Decision` -> Swipe response success?
5. `Yes branch`:
  - `Set Variables` (invoice number, invoice URL, amount)
  - `Send WhatsApp/SMS/Email` to user with invoice
6. `No branch`:
  - `Retry / Delay` (if configured)
  - `Notify Admin` (support channel)
  - Optional: call backend failure webhook

## 9) User Confirmation Payload After Swipe Success

If you use a second webhook from Zoho Flow to your backend (recommended), send:

```json
{
  "event": "INVOICE_CREATED",
  "role": "PATIENT",
  "timestamp": "2026-04-10T18:31:15.000Z",
  "source": "MANAS360",
  "data": {
   "userId": "u_1001",
   "name": "Patient Name",
   "phone": "919988776655",
   "email": "patient@email.com",
   "transactionId": "T240325123456",
   "swipeInvoiceId": "swp_inv_001",
   "invoiceNumber": "INV-2026-000451",
   "invoiceUrl": "https://app.getswipe.in/invoice/...",
   "amount": "₹699",
   "status": "success"
  }
}
```

Use this to update DB status from `SWIPE_PENDING` -> `ISSUED` and store invoice link.

## 10) Message Template After Swipe Success

Use this for user confirmation (WhatsApp/Email/SMS):

```text
Hi ${data.name}, your payment of ${data.amount} is successful.
Your invoice ${data.invoiceNumber} is ready.
Download: ${data.invoiceUrl}
Reference: ${data.transactionId}
```

## 11) Critical Rule

Do not send final invoice confirmation to user at payment success alone.
Send it only after Swipe confirms invoice creation.
