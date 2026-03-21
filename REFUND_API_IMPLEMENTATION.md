# PhonePe Refund APIs Implementation

## Overview

Successfully implemented complete refund functionality for the PhonePe payment gateway integration. This includes service functions, database models, API controllers, and routes.

## Implementation Summary

### 1. Service Functions (`backend/src/services/phonepe.service.ts`)

#### `initiatePhonePeRefund(input)`
Initiates a refund request with PhonePe.

**Parameters:**
- `merchantRefundId` (string): Unique refund identifier
- `originalMerchantOrderId` (string): Original payment order ID
- `amountInPaise` (number): Refund amount in paise

**Returns:**
```ts
{
  refundId: string;
  amount: number;
  state: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  responseData: any;
}
```

**Error Handling:**
- Throws `AppError` with 502 status if PhonePe API fails
- Includes detailed error messages from upstream

#### `checkPhonePeRefundStatus(merchantRefundId)`
Checks the status of a refund request with PhonePe.

**Parameters:**
- `merchantRefundId` (string): The refund ID to check

**Returns:**
- Full PhonePe response data with `state`, `errorCode`, `splitInstruments`, etc.
- `null` if API call fails (logged as error)

### 2. Database Model (`backend/prisma/schema.prisma`)

#### `FinancialRefund` Table
Tracks refund requests and their status.

**Fields:**
- `id` (UUID): Primary key
- `paymentId` (UUID, optional): Related payment ID
- `merchantRefundId` (string, unique): Merchant's refund identifier
- `originalMerchantOrderId` (string): Original payment order ID
- `phonePeRefundId` (string, unique, optional): PhonePe's refund ID
- `status` (enum): PENDING | CONFIRMED | COMPLETED | FAILED | CANCELLED
- `amountMinor` (BigInt): Refund amount in paise
- `currency` (string): ISO currency code (default: INR)
- `reason` (string, optional): Refund reason
- `responseData` (JSON, optional): Latest response from PhonePe
- `retrievedAt` (DateTime, optional): When status was last verified
- `completedAt` (DateTime, optional): When refund completed
- `failedAt` (DateTime, optional): When refund failed
- `failureReason` (string, optional): Why refund failed
- `retryCount` (int, default: 0): Number of retry attempts
- `nextRetryAt` (DateTime, optional): Next retry timestamp
- `createdAt` (DateTime): Record creation
- `updatedAt` (DateTime): Last update

**Indexes:**
- `(paymentId, status)` - Fast lookup by payment and status
- `(status, nextRetryAt)` - For reconciliation job queries
- `merchantRefundId` - Unique constraint + index
- `originalMerchantOrderId` - For cross-reference
- `createdAt` - For time-based queries

**Relationships:**
- `payment`: Optional relation back to `FinancialPayment`

#### `FinancialRefundStatus` Enum
```ts
PENDING      // Refund request submitted, awaiting confirmation
CONFIRMED    // PhonePe confirmed receipt, processing
COMPLETED    // Refund successfully processed
FAILED       // Refund failed or rejected
CANCELLED    // Refund cancelled by system
```

### 3. API Controllers (`backend/src/controllers/payment.controller.ts`)

#### `initiateRefundController(req, res)`
**Endpoint:** `POST /api/v1/payments/refund`
**Authentication:** Required (patient role)
**Rate Limit:** Yes

**Request Body:**
```json
{
  "paymentId": "uuid-of-payment",
  "reason": "Customer requested" // optional, defaults to this
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "refund-uuid",
    "paymentId": "payment-uuid",
    "merchantRefundId": "paymentId-timestamp",
    "originalMerchantOrderId": "phonepe-order-id",
    "phonePeRefundId": "refund-id-from-phonepe",
    "status": "PENDING",
    "amountMinor": 50000,
    "currency": "INR",
    "reason": "Customer requested",
    "createdAt": "2026-03-21T10:30:00Z",
    "updatedAt": "2026-03-21T10:30:00Z"
  },
  "message": "Refund initiated successfully"
}
```

**Error Responses:**
- `422`: Payment not captured, invalid paymentId, or refund already initiated
- `403`: Unauthorized (payment doesn't belong to user)
- `404`: Payment not found
- `502`: PhonePe API failed

**Business Logic:**
1. Verifies user is authenticated (patient)
2. Validates payment exists and belongs to patient
3. Ensures payment status is CAPTURED
4. Checks for existing refund (prevents duplicates)
5. Generates unique `merchantRefundId` (paymentId-timestamp)
6. Calls PhonePe refund endpoint
7. Creates/updates refund record in DB
8. Returns refund details

#### `getRefundStatusController(req, res)`
**Endpoint:** `GET /api/v1/payments/refund/:refundId/status`
**Authentication:** Required (patient role)
**Rate Limit:** No

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "refund-uuid",
    "paymentId": "payment-uuid",
    "merchantRefundId": "paymentId-timestamp",
    "status": "COMPLETED",
    "amountMinor": 50000,
    "currency": "INR",
    "completedAt": "2026-03-21T10:35:00Z",
    "responseData": {
      "success": true,
      "code": "SUCCESS",
      "message": "refund successful",
      "data": {
        "state": "COMPLETED",
        "refundId": "phonepe-refund-id",
        "amount": 50000
      }
    }
  },
  "message": "Refund status retrieved"
}
```

**Error Responses:**
- `422`: Missing refundId
- `403`: Unauthorized (refund doesn't belong to user)
- `404`: Refund not found
- `502`: PhonePe status API failed

**Business Logic:**
1. Verifies user is authenticated (patient)
2. Validates refund exists and belongs to patient
3. If status is PENDING, fetches latest from PhonePe
4. Maps PhonePe states to local states (COMPLETED, CONFIRMED, FAILED, PENDING)
5. Updates DB with latest status and timestamps
6. Returns updated/current refund details

### 4. API Routes (`backend/src/routes/payment.routes.ts`)

```ts
// Existing routes remain unchanged
router.post('/sessions', requireAuth, requireRole('patient'), paymentRateLimiter, ...);
router.post('/sessions/:id/complete', requireAuth, requireRole('therapist'), paymentRateLimiter, ...);
router.post('/phonepe/webhook', asyncHandler(phonepeWebhookController));
router.get('/phonepe/status/:transactionId', requireAuth, asyncHandler(getPhonePeStatusController));

// NEW: Refund routes
router.post('/refund', requireAuth, requireRole('patient'), paymentRateLimiter, asyncHandler(initiateRefundController));
router.get('/refund/:refundId/status', requireAuth, requireRole('patient'), asyncHandler(getRefundStatusController));
```

## Database Migration

To apply these changes to your database, create and run a migration. The SQL would be:

```sql
-- Create enum for refund status
CREATE TYPE "FinancialRefundStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Create refunds table
CREATE TABLE "financial_refunds" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT,
  "merchantRefundId" TEXT NOT NULL,
  "originalMerchantOrderId" TEXT NOT NULL,
  "phonePeRefundId" TEXT,
  "status" "FinancialRefundStatus" NOT NULL DEFAULT 'PENDING',
  "amountMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "reason" TEXT,
  "responseData" JSONB,
  "retrievedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX "financial_refunds_merchantRefundId_key" ON "financial_refunds"("merchantRefundId");
CREATE UNIQUE INDEX "financial_refunds_phonePeRefundId_key" ON "financial_refunds"("phonePeRefundId");
CREATE INDEX "financial_refunds_paymentId_status_idx" ON "financial_refunds"("paymentId", "status");
CREATE INDEX "financial_refunds_status_nextRetryAt_idx" ON "financial_refunds"("status", "nextRetryAt");
CREATE INDEX "financial_refunds_originalMerchantOrderId_idx" ON "financial_refunds"("originalMerchantOrderId");
CREATE INDEX "financial_refunds_createdAt_idx" ON "financial_refunds"("createdAt");

-- Add relationship to financial_payments
ALTER TABLE "financial_payments" ADD COLUMN "refunds" TEXT[] DEFAULT '{}';
```

## Optional: Refund Reconciliation Job

To automatically poll pending refunds, add to `backend/src/cron/`:

```ts
// refundReconciliation.ts
import { CronJob } from 'cron';
import { prisma } from '../config/db';
import { checkPhonePeRefundStatus } from '../services/phonepe.service';
import { logger } from '../utils/logger';

export const startRefundReconciliation = () => {
  const job = new CronJob('*/30 * * * * *', async () => {
    try {
      const pendingRefunds = await prisma.financialRefund.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { nextRetryAt: { lte: new Date() } },
            { nextRetryAt: null },
          ],
        },
        take: 10,
      });

      for (const refund of pendingRefunds) {
        try {
          const statusData = await checkPhonePeRefundStatus(refund.merchantRefundId);
          
          if (statusData?.data?.state) {
            const newStatus = statusData.data.state === 'COMPLETED' ? 'COMPLETED' :
                             statusData.data.state === 'CONFIRMED' ? 'CONFIRMED' :
                             statusData.data.state === 'FAILED' ? 'FAILED' :
                             'PENDING';

            await prisma.financialRefund.update({
              where: { id: refund.id },
              data: {
                status: newStatus,
                responseData: statusData,
                ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
                ...(newStatus === 'FAILED' && { failedAt: new Date() }),
                ...(newStatus === 'PENDING' && { 
                  retryCount: refund.retryCount + 1,
                  nextRetryAt: new Date(Date.now() + 60000) // Retry in 1 minute
                }),
              },
            });
          }
        } catch (error) {
          logger.error('[RefundReconciliation] Failed to check refund status', { 
            refundId: refund.id, 
            error 
          });
        }
      }
    } catch (error) {
      logger.error('[RefundReconciliation] Job failed', { error });
    }
  });

  job.start();
  logger.info('[RefundReconciliation] Started (every 30 seconds)');
};
```

## Files Modified

1. **backend/src/services/phonepe.service.ts**
   - Added `initiatePhonePeRefund()` function
   - Added `checkPhonePeRefundStatus()` function

2. **backend/src/controllers/payment.controller.ts**
   - Added prisma import
   - Updated imports to include refund functions
   - Added `initiateRefundController()` function
   - Added `getRefundStatusController()` function

3. **backend/src/routes/payment.routes.ts**
   - Updated imports to include refund controllers
   - Added 2 new routes for refund endpoints

4. **backend/prisma/schema.prisma**
   - Added `FinancialRefund` model
   - Added `FinancialRefundStatus` enum
   - Added refund relationship to `FinancialPayment` model
   - Updated `FinancialPayment` to include refunds relationship

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] `npm run typecheck` passes
- [ ] POST /api/v1/payments/refund initiates refund for captured payment
- [ ] GET /api/v1/payments/refund/:id/status returns refund status
- [ ] Unauthorized users cannot initiate refunds for others' payments
- [ ] Only captured payments can be refunded
- [ ] Duplicate refund attempts are prevented
- [ ] PhonePe API errors are properly handled
- [ ] Refund reconciliation job updates DB with latest states
- [ ] Webhook for refund confirmations (optional, for future)

## API Usage Examples

### Initiate a Refund
```bash
curl -X POST http://localhost:3001/api/v1/payments/refund \
  -H "Authorization: Bearer {patient-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Not satisfied with service"
  }'
```

### Check Refund Status
```bash
curl -X GET http://localhost:3001/api/v1/payments/refund/550e8400-e29b-41d4-a716-446655440001/status \
  -H "Authorization: Bearer {patient-token}"
```

## Status: ✅ Complete

All refund APIs are now implemented and ready for:
1. Database migration
2. UAT testing
3. PhonePe sandbox testing
4. Production deployment

TypeScript compilation: ✅ No errors
