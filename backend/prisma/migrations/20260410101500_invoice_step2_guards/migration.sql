-- Step 2 guardrails for invoice/idempotency data integrity and performance.

-- Ensure endpoint-scoped idempotency uniqueness at DB layer.
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_id_endpoint_key"
ON "idempotency_keys" ("id", "endpoint");

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_endpoint_actor_request_hash_key"
ON "idempotency_keys" ("endpoint", "actor_id", "request_hash");

-- Enforce positive/zero invoice amount when present.
ALTER TABLE "invoices"
  DROP CONSTRAINT IF EXISTS "invoices_amount_minor_non_negative";

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_amount_minor_non_negative"
  CHECK ("amount_minor" IS NULL OR "amount_minor" >= 0);

-- Explicit indexes for high-volume joins and inspector timelines.
CREATE INDEX IF NOT EXISTS "idx_invoice_payment_id" ON "invoices"("paymentId");
CREATE INDEX IF NOT EXISTS "idx_invoice_events_invoice_id" ON "invoice_events"("invoice_id");

-- Explicitly keep lifecycle status required.
ALTER TABLE "invoices"
  ALTER COLUMN "lifecycle_status" SET NOT NULL;
