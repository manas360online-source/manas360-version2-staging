-- Add plan versioning and price locking flags for subscription records.

ALTER TABLE "patient_subscriptions"
  ADD COLUMN IF NOT EXISTS "planVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "priceLocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "provider_subscriptions"
  ADD COLUMN IF NOT EXISTS "planVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "priceLocked" BOOLEAN NOT NULL DEFAULT false;
