-- Phase 2 hardening: subscription soft lock + audit history

ALTER TABLE "patient_subscriptions"
  ADD COLUMN IF NOT EXISTS "processing" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "provider_subscriptions"
  ADD COLUMN IF NOT EXISTS "processing" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "patient_subscriptions_status_processing_idx"
  ON "patient_subscriptions"("status", "processing");

CREATE INDEX IF NOT EXISTS "provider_subscriptions_status_processing_idx"
  ON "provider_subscriptions"("status", "processing");

CREATE TABLE IF NOT EXISTS "subscription_history" (
  "id" TEXT NOT NULL,
  "subscriptionType" TEXT NOT NULL,
  "subscriptionRefId" TEXT,
  "patientUserId" TEXT,
  "providerId" TEXT,
  "oldPlan" TEXT,
  "newPlan" TEXT,
  "oldStatus" TEXT,
  "newStatus" TEXT,
  "oldPrice" INTEGER,
  "newPrice" INTEGER,
  "paymentId" TEXT,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscription_history_subscriptionType_changedAt_idx"
  ON "subscription_history"("subscriptionType", "changedAt");

CREATE INDEX IF NOT EXISTS "subscription_history_patientUserId_changedAt_idx"
  ON "subscription_history"("patientUserId", "changedAt");

CREATE INDEX IF NOT EXISTS "subscription_history_providerId_changedAt_idx"
  ON "subscription_history"("providerId", "changedAt");
