-- Add merchantTransactionId to financial_payments for PhonePe transaction tracking.
-- Safe to run multiple times.

ALTER TABLE "financial_payments"
  ADD COLUMN IF NOT EXISTS "merchantTransactionId" TEXT;

-- Backfill existing rows so we can enforce NOT NULL + UNIQUE.
UPDATE "financial_payments"
SET "merchantTransactionId" = 'legacy_' || "id"
WHERE "merchantTransactionId" IS NULL;

ALTER TABLE "financial_payments"
  ALTER COLUMN "merchantTransactionId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "financial_payments_merchantTransactionId_key"
  ON "financial_payments"("merchantTransactionId");

CREATE INDEX IF NOT EXISTS "financial_payments_merchantTransactionId_idx"
  ON "financial_payments"("merchantTransactionId");
