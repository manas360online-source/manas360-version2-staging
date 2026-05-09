-- Fix index naming drift on invoice_events table

-- Drop index with old name if it exists
DROP INDEX IF EXISTS "invoice_events_invoice_id_idx";

-- Create index with expected name if it doesn't exist
CREATE INDEX IF NOT EXISTS "idx_invoice_events_invoice_id" ON "invoice_events"("invoice_id");

-- Also handle idempotency key index with consistent naming
DROP INDEX IF EXISTS "invoice_events_idempotency_key_idx";
CREATE INDEX IF NOT EXISTS "idx_invoice_events_idempotency_key" ON "invoice_events"("idempotency_key");
