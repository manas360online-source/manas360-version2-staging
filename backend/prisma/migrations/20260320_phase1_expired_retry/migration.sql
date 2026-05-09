-- Phase 1 hardening: add EXPIRED status and retry scheduling fields for financial payments

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'FinancialPaymentStatus' AND e.enumlabel = 'EXPIRED'
  ) THEN
    ALTER TYPE "FinancialPaymentStatus" ADD VALUE 'EXPIRED';
  END IF;
END $$;

ALTER TABLE "financial_payments"
  ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "financial_payments_status_nextRetryAt_idx"
  ON "financial_payments"("status", "nextRetryAt");
