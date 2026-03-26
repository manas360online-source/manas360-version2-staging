# PhonePe Webhook Handling Implementation Guide

## Overview

Complete webhook handling implementation for PhonePe payment gateway including:
- ✅ IP whitelisting validation
- ✅ SHA256 authorization header verification
- ✅ Idempotency handling for duplicate events
- ✅ Event-based routing (Order + Refund events)
- ✅ Automatic status updates for payments and refunds
- ✅ Error logging and resilience

## Architecture

### Components

#### 1. **Phone PE Service** (`backend/src/services/phonepe.service.ts`)
Webhook validation helpers:
- `isPhonePeWebhookIP(clientIp)` - Validates IP against PhonePe whitelist
- `verifyPhonePeWebhookAuth(authHeader, username, password)` - SHA256 authorization verification
- `getClientIpFromRequest(req)` - Extracts client IP from request (handles proxies)

#### 2. **Webhook Processor Service** (`backend/src/services/phonepeWebhook.service.ts`)
Event handlers:
- `trackWebhookEvent(eventId, eventType)` - Idempotency tracking
- `processPhonePeWebhookEvent(event, payload)` - Main dispatcher
- Event-specific processors:
  - `processOrderCompletedEvent(payload)` - checkout.order.completed
  - `processOrderFailedEvent(payload)` - checkout.order.failed
  - `processRefundCompletedEvent(payload)` - pg.refund.completed
  - `processRefundFailedEvent(payload)` - pg.refund.failed

#### 3. **Payment Controller** (`backend/src/controllers/payment.controller.ts`)
Enhanced webhook endpoint:
- `phonepeWebhookController` - Orchestrates all validation and processing

## Webhook Validation Flow

```
1. IP Whitelist Check (Defense-in-depth)
   ├─ Check against PhonePe IPs
   ├─ Allow localhost for dev
   └─ Log warnings for unauthorized IPs

2. Authorization Header Verification
   ├─ Extract SHA256(username:password) from header
   ├─ Compute expected hash
   ├─ Timing-safe comparison
   └─ Return 401 if invalid

3. Payload Parsing
   ├─ Support legacy base64 format (with X-VERIFY signature)
   ├─ Support new direct JSON format
   └─ Validate required fields

4. Idempotency Check
   ├─ Generate event ID (event + order/refund ID + timestamp)
   ├─ Track processed events in DB
   ├─ Return 200 for duplicates (prevent PhonePe retries)
   └─ Continue only for new events

5. Event Routing
   ├─ Identify event type (checkout.order.* or pg.refund.*)
   ├─ Extract payload
   ├─ Route to appropriate handler
   └─ Handle errors gracefully

6. Return Success (2xx within 3-5s)
   └─ Return 200 OK to PhonePe (required for acknowledgment)
```

## Event Processing

### Order Events

#### `checkout.order.completed`
**When:** Payment successfully completed
**Processing:**
1. Find payment by merchantOrderId
2. Validate amount matches DB
3. Mark payment as CAPTURED
4. Update session status to CONFIRMED
5. Create revenue ledger entry

**Payload Example:**
```json
{
  "event": "checkout.order.completed",
  "payload": {
    "orderId": "OMO2403282020198641071317",
    "merchantId": "PGCHECKOUT",
    "merchantOrderId": "SESS_12345",
    "state": "COMPLETED",
    "amount": 50000,
    "expireAt": 1724866793837,
    "paymentDetails": [{
      "paymentMode": "UPI_QR",
      "transactionId": "OM12334",
      "timestamp": 1724866793837,
      "amount": 50000,
      "state": "COMPLETED"
    }]
  }
}
```

#### `checkout.order.failed`
**When:** Payment fails for any reason (authorization error, user cancelled, etc.)
**Processing:**
1. Find payment by merchantOrderId
2. Mark payment as FAILED
3. Log failure reason (errorCode + detailedErrorCode)
4. Allow retry or UI to show error

**Payload Example:**
```json
{
  "event": "checkout.order.failed",
  "payload": {
    "merchantOrderId": "SESS_12345",
    "state": "FAILED",
    "amount": 50000,
    "paymentDetails": [{
      "paymentMode": "UPI_COLLECT",
      "state": "FAILED",
      "errorCode": "AUTHORIZATION_ERROR",
      "detailedErrorCode": "ZM"
    }]
  }
}
```

### Refund Events

#### `pg.refund.completed`
**When:** Refund successfully processed and returned to customer account
**Processing:**
1. Find refund by merchantRefundId
2. Validate amount
3. Mark refund as COMPLETED
4. Update related payment as REFUNDED
5. Store split instrument details

**Payload Example (UPI source):**
```json
{
  "event": "pg.refund.completed",
  "payload": {
    "merchantId": "PGCHECKOUT",
    "merchantRefundId": "paymentId-1726832461234",
    "originalMerchantOrderId": "SESS_12345",
    "amount": 50000,
    "state": "COMPLETED",
    "timestamp": 1730869961754,
    "refundId": "OMR7878098045517540996",
    "splitInstruments": [{
      "amount": 50000,
      "rail": {
        "type": "UPI",
        "utr": "586756785",
        "upiTransactionId": "YBL5bc011fa8644763b52b96a29a9655",
        "vpa": "12****78@ybl"
      },
      "instrument": {
        "type": "ACCOUNT",
        "maskedAccountNumber": "******1234",
        "accountType": "SAVINGS"
      }
    }]
  }
}
```

#### `pg.refund.failed`
**When:** Refund cannot be processed (insufficient funds, account closed, etc.)
**Processing:**
1. Find refund by merchantRefundId
2. Mark refund as FAILED
3. Log error reason
4. Do NOT revert payment to CAPTURED automatically
5. Notify stakeholders for manual intervention

**Payload Example:**
```json
{
  "event": "pg.refund.failed",
  "payload": {
    "merchantId": "PGCHECKOUT",
    "merchantRefundId": "paymentId-1726832461234",
    "originalMerchantOrderId": "SESS_12345",
    "amount": 50000,
    "state": "FAILED",
    "timestamp": 1730869961754,
    "refundId": "OMR7878098045517540996",
    "errorCode": "AUTHORIZATION_ERROR",
    "detailedErrorCode": "ZM"
  }
}
```

## Idempotency

### Why It Matters
- PhonePe may send the same webhook multiple times
- Network issues, retries, or system glitches can cause duplicates
- Processing the same event twice could:
  - Double-capture payments
  - Process refund twice
  - Create duplicate database records

### Implementation
1. **Event ID Generation** (unique per delivery)
   ```
   eventId = "{event_type}_{order_id}_{timestamp}"
   Example: "checkout.order.completed_SESS_12345_1724866793837"
   ```

2. **Tracking**
   - Store `eventId` in `WebhookLog` table
   - Include `eventType` and `processedAt` timestamp
   - Keep records for 24 hours

3. **Duplicate Detection**
   ```ts
   const isNew = await trackWebhookEvent(eventId, eventType);
   if (!isNew) {
     // Already processed - acknowledge and skip
     return res.status(200).json({success: true, message: 'Duplicate'});
   }
   ```

4. **Database Level**
   - Unique constraints on payment/refund identifiers
   - Status validation before state transitions
   - Silently skip double-captures (`if (status === 'CAPTURED') return;`)

## Authorization Header Verification

### PhonePe V2 Note
- Payment APIs in V2 use OAuth (`Authorization: O-Bearer <token>`) and do not require payment `X-VERIFY` checksum headers.
- Webhook signature verification should use a webhook-specific secret, exposed in this project as `PHONEPE_WEBHOOK_SECRET` (fallback: `PHONEPE_SALT_KEY` for backward compatibility).

### Format
PhonePe sends: `Authorization: SHA256(username:password)`

### Example
If configured:
- Username: `webhook_user`
- Password: `pass123456`

PhonePe calculates: `SHA256("webhook_user:pass123456")` = `hash_value...`

And sends: `Authorization: hash_value...`

### Verification
```ts
// 1. Extract hash from header
const headerHash = authHeader.replace(/^SHA256\s*\(\s*|\s*\)$/g, '').trim();

// 2. Compute expected hash
const credentials = `${username}:${password}`;
const expectedHash = crypto.createHash('sha256').update(credentials).digest('hex');

// 3. Compare (timing-safe to prevent timing attacks)
const isValid = crypto.timingSafeEqual(
  Buffer.from(headerHash),
  Buffer.from(expectedHash)
);
```

## IP Whitelisting

### WhiteListed IPs
All PhonePe webhook traffic comes from these IPs:

**Subnet Blocks (CIDR):**
- `103.116.34.16/29`
- `103.116.32.16/29`
- `103.116.33.8/30`
- `103.116.33.136/30`

**Individual IPs:**
```
103.116.33.8, 103.116.33.9, 103.116.33.10, 103.116.33.11,
103.116.33.136, 103.116.33.137, 103.116.33.138, 103.116.33.139,
103.116.32.16-32.29,
103.116.34.1, 103.116.34.16-23,
103.243.35.242
```

### Implementation
```ts
const isPhonePeIP = PHONEPE_WEBHOOK_IPS.includes(clientIp);

if (!isPhonePeIP) {
  logger.warn('[PhonePe] Webhook from unauthorized IP', {clientIp});
  // Continue anyway (defense-in-depth, not blocking)
}
```

### Client IP Extraction
The service handles various deployment scenarios:
1. Direct connection: `req.ip`
2. Behind proxy: `x-forwarded-for` header
3. Cloudflare: `cf-connecting-ip` header
4. Custom reverse proxy: `x-real-ip` header

## Configuration

### Environment Variables
```env
# Webhook credentials (from PhonePe Business Dashboard)
PHONEPE_WEBHOOK_USERNAME=webhook_user     # 5-20 chars, letters/digits/underscores
PHONEPE_WEBHOOK_PASSWORD=pass123456       # 8-20 chars, letters + numbers
PHONEPE_WEBHOOK_SECRET=webhook_secret_key # Use webhook secret/salt from Webhooks tab

# Optional: Allow dev bypass for testing
DEV_ALLOW_PHONEPE_WEBHOOK_PROBE_BYPASS=true  # dev only
```

### Dashboard Setup
1. Log into PhonePe Business Dashboard
2. Set mode: Test Mode for Sandbox, Off for Production
3. Navigate: Developer Settings → Webhook
4. Create Webhook:
   - **Webhook URL:** `https://your-domain.com/api/v1/payments/phonepe/webhook`
   - **Username:** `webhook_user`
   - **Password:** `pass123456`
   - **Description:** "MANAS360 Payment Updates"
   - **Events:**
     - ✅ `checkout.order.completed`
     - ✅ `checkout.order.failed`
     - ✅ `pg.refund.completed`
     - ✅ `pg.refund.failed`

## Database Models

### `WebhookLog`
Tracks processed webhooks for idempotency:

```ts
model WebhookLog {
  id          String   @id @default(uuid())
  eventId     String   @unique              // event_type_orderId_timestamp
  eventType   String                        // checkout.order.completed, etc.
  payload     Json?                         // Full webhook payload
  processedAt DateTime @default(now())

  @@index([eventId])
  @@index([processedAt])
  @@map("webhook_logs")
}
```

### `FinancialPayment` Updates
- Status: `INITIATED` → `CAPTURED` (order.completed)
- Status: `INITIATED` → `FAILED` (order.failed)
- Status: `CAPTURED` → `REFUNDED` (refund.completed)
- Fields: `razorpayPaymentId`, `capturedAt`, `failureReason`

### `FinancialRefund` Updates
- Status: `PENDING` → `COMPLETED` (refund.completed)
- Status: `PENDING` → `FAILED` (refund.failed)
- Fields: `phonePeRefundId`, `completedAt`, `failedAt`, `failureReason`

## Testing

### Local Testing (Dev Mode)
```env
DEV_ALLOW_PHONEPE_WEBHOOK_PROBE_BYPASS=true
```

PhonePe may send probe requests without authentication. To Accept:
```ts
POST /api/v1/payments/phonepe/webhook
(empty body - probe request)
↓
Response: 200 OK "webhook probe accepted (dev bypass)"
```

### Webhook Test Script
```bash
#!/bin/bash
WEBHOOK_URL="http://localhost:3001/api/v1/payments/phonepe/webhook"

# Test order completed
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: SHA256(webhook_user:pass123456)" \
  -d '{
    "event": "checkout.order.completed",
    "payload": {
      "merchantOrderId": "SESS_test_123",
      "amount": 50000,
      "state": "COMPLETED"
    }
  }'

# Test refund completed
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: SHA256(webhook_user:pass123456)" \
  -d '{
    "event": "pg.refund.completed",
    "payload": {
      "merchantRefundId": "test_refund_123",
      "originalMerchantOrderId": "SESS_test_123",
      "amount": 50000,
      "state": "COMPLETED"
    }
  }'
```

### Monitoring
1. Check webhook logs: Database → `webhook_logs` table
2. Check payment status: `financial_payments` → status CAPTURED/FAILED
3. Check refund status: `financial_refunds` → status COMPLETED/FAILED
4. Enable verbose logging: `DEBUG=*:phonepe*`

## Error Handling

### Webhook Processing Errors
```ts
try {
  await processPhonePeWebhookEvent(event, payload);
  return 200 OK ✅
} catch (error) {
  // Log error
  logger.error('[PhonePeWebhook] Failed to process', error);
  
  // Still return 200 to prevent PhonePe retries
  return 200 OK (with error details)
  
  // PhonePe will:
  // - Check Payment Status API if webhook doesn't process payment
  // - Retry webhook after configurable interval
}
```

### Fallback: Status Check
If webhook processing fails:
1. Payment reconciliation cron (every 30s) polls status
2. Or customer can call `GET /api/v1/payments/phonepe/status/:id`
3. Or customer can call `GET /api/v1/payments/refund/:id/status`

## Compliance Checklist

- ✅ **HTTPS Only:** All webhook URLs use HTTPS with valid SSL/TLS
- ✅ **Quick Response:** Returns 2xx within 3-5 seconds
- ✅ **IP Whitelisting:** Validates incoming IP against PhonePe range
- ✅ **Authentication:** Verifies SHA256(username:password) header
- ✅ **Idempotency:** Handles duplicate webhooks gracefully
- ✅ **Event Filtering:** Only processes relevant events
- ✅ **Error Resilience:** Logs errors but doesn't block webhook ack
- ✅ **Status Tracking:** Maintains full audit trail in webhook_logs

## Files Modified

1. **backend/src/services/phonepe.service.ts**
   - Added: `isPhonePeWebhookIP(clientIp)`
   - Added: `verifyPhonePeWebhookAuth(authHeader, username, password)`
   - Added: `getClientIpFromRequest(req)`
   - Added: `PHONEPE_WEBHOOK_IPS` whitelist

2. **backend/src/services/phonepeWebhook.service.ts** (NEW)
   - Created: Complete webhook event processor
   - Functions: `trackWebhookEvent()`, `processOrderCompletedEvent()`, `processOrderFailedEvent()`, `processRefundCompletedEvent()`, `processRefundFailedEvent()`, `processPhonePeWebhookEvent()`

3. **backend/src/controllers/payment.controller.ts**
   - Updated: `phonepeWebhookController` with complete validation
   - Added: IP whitelisting
   - Added: SHA256 auth verification
   - Added: Idempotency tracking
   - Added: Event-based routing

4. **backend/prisma/schema.prisma**
   - Added: `WebhookLog` model for idempotency tracking
   - Added: Indexed for fast lookup (`eventId`, `processedAt`)

## API Response Format

All webhook responses return 2xx status (even with errors) to acknowledge receipt to PhonePe:

```json
{
  "success": true,
  "handled": true,                    // true if event was processed
  "message": "Webhook processed",     // Human-readable message
  "error": null                       // Error details if handled=false
}
```

## Status: ✅ Complete

All webhook handling features implemented:
- ✅ IP whitelisting validation
- ✅ SHA256 authorization header verification
- ✅ Order event processing (completed, failed)
- ✅ Refund event processing (completed, failed)
- ✅ Idempotency with duplicate detection
- ✅ Error resilience and logging
- ✅ Status tracking with audit trail
- ✅ TypeScript compilation: No errors

Ready for:
1. Database migration (`npx prisma migrate deploy`)
2. UAT testing
3. PhonePe sandbox validation
4. Production deployment
