-- Phase 2.1 invoice core: lifecycle state machine, events, and idempotency registry.

-- 1) Add strict lifecycle enum used by new invoice transition logic.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'FAILED', 'REFUNDED');
  END IF;
END $$;

-- 1.5) Bootstrap invoices table for environments where legacy invoice migration did not create it.
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "paymentId" TEXT,
  "paymentTransactionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "amount_minor" BIGINT,
  "invoiceYear" INTEGER NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  "companyName" TEXT NOT NULL DEFAULT 'MANAS360',
  "companyGstin" TEXT,
  "companyAddress" JSONB,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "customerGstin" TEXT,
  "billingAddress" JSONB,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "items" JSONB NOT NULL,
  "subtotalMinor" BIGINT NOT NULL,
  "gstRate" INTEGER NOT NULL DEFAULT 18,
  "cgstMinor" BIGINT NOT NULL,
  "sgstMinor" BIGINT NOT NULL,
  "gstAmountMinor" BIGINT NOT NULL,
  "totalMinor" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "lifecycle_status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "pdfPath" TEXT,
  "pdf_url" TEXT,
  "htmlPath" TEXT,
  "emailedTo" TEXT,
  "emailedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "refunded_at" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "deliveryError" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "version" INTEGER NOT NULL DEFAULT 1,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isPaidOut" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_userId_fkey') THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_payments')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_paymentId_fkey') THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_paymentId_key" ON "invoices"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_paymentTransactionId_key" ON "invoices"("paymentTransactionId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- 2) Extend existing invoices table with phase 2 lifecycle fields.
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "amount_minor" BIGINT,
  ADD COLUMN IF NOT EXISTS "lifecycle_status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "pdf_url" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Make metadata non-null JSON with a safe default for audit/event payload enrichment.
UPDATE "invoices"
SET "metadata" = '{}'::jsonb
WHERE "metadata" IS NULL;

ALTER TABLE "invoices"
  ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "metadata" SET NOT NULL;

-- 3) Create invoice event timeline table.
CREATE TABLE IF NOT EXISTS "invoice_events" (
  "id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "before_state" JSONB,
  "after_state" JSONB,
  "actor_user_id" TEXT,
  "idempotency_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_events_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "invoice_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "invoice_events_invoice_id_idx" ON "invoice_events"("invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_events_idempotency_key_idx" ON "invoice_events"("idempotency_key");

-- 4) Create idempotency key registry for financial endpoints.
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idempotency_keys_endpoint_actor_id_idx" ON "idempotency_keys"("endpoint", "actor_id");

-- 5) Add PostgreSQL partial unique index for payment-scoped invoice uniqueness.
-- Kept in addition to existing legacy uniqueness during migration phase.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoice_payment_unique"
ON "invoices"("paymentId")
WHERE "paymentId" IS NOT NULL;

-- 6) Backfill lifecycle state from legacy invoice status where possible.
UPDATE "invoices"
SET "lifecycle_status" = CASE
  WHEN UPPER(COALESCE("status", '')) = 'PAID' THEN 'PAID'::"InvoiceStatus"
  WHEN UPPER(COALESCE("status", '')) = 'FAILED' THEN 'FAILED'::"InvoiceStatus"
  WHEN UPPER(COALESCE("status", '')) = 'REFUNDED' THEN 'REFUNDED'::"InvoiceStatus"
  WHEN UPPER(COALESCE("status", '')) IN ('GENERATED', 'ISSUED', 'SENT') THEN 'ISSUED'::"InvoiceStatus"
  ELSE 'DRAFT'::"InvoiceStatus"
END;
