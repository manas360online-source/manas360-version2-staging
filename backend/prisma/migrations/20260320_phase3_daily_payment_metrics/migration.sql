-- Phase 3 foundation: daily payment metrics rollup table

CREATE TABLE IF NOT EXISTS "daily_payment_metrics" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "totalPayments" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "retryAttemptCount" INTEGER NOT NULL DEFAULT 0,
  "retrySuccessCount" INTEGER NOT NULL DEFAULT 0,
  "revenueMinor" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_payment_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_payment_metrics_date_key" ON "daily_payment_metrics"("date");
CREATE INDEX IF NOT EXISTS "daily_payment_metrics_date_idx" ON "daily_payment_metrics"("date");
