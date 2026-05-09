-- Align subscriptions with Prisma schema and seed expectations.
ALTER TABLE "patient_subscriptions"
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "provider_subscriptions"
ADD COLUMN IF NOT EXISTS "metadata" JSONB;
