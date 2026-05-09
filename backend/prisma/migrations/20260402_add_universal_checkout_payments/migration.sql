-- Add universal checkout payments persistence used by shared provider/patient checkout flow.
-- Idempotent guards are used so environments that already have the table don't fail.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UniversalCheckoutStatus') THEN
    CREATE TYPE "UniversalCheckoutStatus" AS ENUM (
      'INITIATED',
      'PENDING_PAYMENT',
      'COMPLETED',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "universal_checkout_payments" (
  "id" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "planId" VARCHAR(255) NOT NULL,
  "baseAmountMinor" BIGINT NOT NULL DEFAULT 0,
  "gstMinor" BIGINT NOT NULL DEFAULT 0,
  "totalAmountMinor" BIGINT NOT NULL DEFAULT 0,
  "walletUsedMinor" BIGINT NOT NULL DEFAULT 0,
  "finalAmountMinor" BIGINT NOT NULL DEFAULT 0,
  "status" "UniversalCheckoutStatus" NOT NULL DEFAULT 'INITIATED',
  "idempotencyKey" TEXT NOT NULL,
  "phonepeTransactionId" TEXT,
  "planDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "universal_checkout_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "universal_checkout_payments_idempotencyKey_key"
  ON "universal_checkout_payments"("idempotencyKey");

CREATE UNIQUE INDEX IF NOT EXISTS "universal_checkout_payments_phonepeTransactionId_key"
  ON "universal_checkout_payments"("phonepeTransactionId");

CREATE INDEX IF NOT EXISTS "universal_checkout_payments_type_planId_idx"
  ON "universal_checkout_payments"("type", "planId");

CREATE INDEX IF NOT EXISTS "universal_checkout_payments_status_createdAt_idx"
  ON "universal_checkout_payments"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "universal_checkout_payments_phonepeTransactionId_idx"
  ON "universal_checkout_payments"("phonepeTransactionId");

CREATE INDEX IF NOT EXISTS "universal_checkout_payments_idempotencyKey_idx"
  ON "universal_checkout_payments"("idempotencyKey");
