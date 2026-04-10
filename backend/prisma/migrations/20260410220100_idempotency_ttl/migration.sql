-- Add TTL column to idempotency_keys
ALTER TABLE "idempotency_keys" ADD COLUMN "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days');

-- Create index for cleanup queries
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");
