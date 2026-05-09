-- Phase 2b hardening: lock timeout metadata + standardized reason codes + transaction reference

ALTER TABLE "patient_subscriptions"
  ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);

ALTER TABLE "provider_subscriptions"
  ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);

ALTER TABLE "subscription_history"
  ADD COLUMN IF NOT EXISTS "transactionId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'SubscriptionChangeReason'
  ) THEN
    CREATE TYPE "SubscriptionChangeReason" AS ENUM (
      'PAYMENT_SUCCESS',
      'AUTO_RENEWAL',
      'MANUAL_UPGRADE',
      'MANUAL_DOWNGRADE',
      'MANUAL_CANCEL',
      'PAYMENT_REACTIVATION',
      'AUTO_RENEW_ENABLED',
      'AUTO_RENEW_DISABLED',
      'PROVIDER_PLAN_ACTIVATED',
      'PROVIDER_MANUAL_CANCEL',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscription_history' AND column_name = 'reason' AND data_type = 'text'
  ) THEN
    ALTER TABLE "subscription_history"
      ALTER COLUMN "reason"
      TYPE "SubscriptionChangeReason"
      USING (
        CASE
          WHEN "reason" IN (
            'PAYMENT_SUCCESS',
            'AUTO_RENEWAL',
            'MANUAL_UPGRADE',
            'MANUAL_DOWNGRADE',
            'MANUAL_CANCEL',
            'PAYMENT_REACTIVATION',
            'AUTO_RENEW_ENABLED',
            'AUTO_RENEW_DISABLED',
            'PROVIDER_PLAN_ACTIVATED',
            'PROVIDER_MANUAL_CANCEL',
            'OTHER'
          ) THEN "reason"::"SubscriptionChangeReason"
          ELSE 'OTHER'::"SubscriptionChangeReason"
        END
      );
  END IF;
END $$;
