-- Financial core cutover (net-new objects only)
-- NOTE: base CBT/user/session structures are created in 20260226_init.

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FinancialSessionStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialPaymentStatus" AS ENUM ('INITIATED', 'PENDING_CAPTURE', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIAL_REFUNDED');

-- CreateEnum
CREATE TYPE "WalletTxnType" AS ENUM ('CREDIT_PENDING', 'RELEASE', 'DEBIT_PAYOUT', 'REVERSAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletTxnStatus" AS ENUM ('POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('SESSION', 'SUBSCRIPTION', 'CONTENT');

-- CreateEnum
CREATE TYPE "SubscriptionDomain" AS ENUM ('PATIENT', 'PROVIDER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'PREMIUM', 'LEAD_PLAN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('RAZORPAY');

-- CreateEnum
CREATE TYPE "WebhookProcessStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'SKIPPED_DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "FinancialAuditActorType" AS ENUM ('SYSTEM', 'ADMIN', 'WEBHOOK', 'CRON');

-- CreateTable
CREATE TABLE "therapy_sessions" (
    "id" TEXT NOT NULL,
    "bookingReferenceId" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "therapistProfileId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "noteEncryptedContent" TEXT,
    "noteIv" TEXT,
    "noteAuthTag" TEXT,
    "noteUpdatedAt" TIMESTAMP(3),
    "noteUpdatedByTherapistId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "FinancialSessionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "expectedAmountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "idempotencyKey" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_payments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerGateway" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "status" "FinancialPaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "therapistShareMinor" BIGINT NOT NULL DEFAULT 0,
    "platformShareMinor" BIGINT NOT NULL DEFAULT 0,
    "captureIdempotencyKey" TEXT,
    "capturedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_wallets" (
    "providerId" TEXT NOT NULL,
    "pendingBalanceMinor" BIGINT NOT NULL DEFAULT 0,
    "availableBalanceMinor" BIGINT NOT NULL DEFAULT 0,
    "lifetimeEarningsMinor" BIGINT NOT NULL DEFAULT 0,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenReason" TEXT,
    "frozenAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_wallets_pkey" PRIMARY KEY ("providerId")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "walletTxnType" "WalletTxnType" NOT NULL,
    "status" "WalletTxnStatus" NOT NULL DEFAULT 'POSTED',
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "balanceBeforeMinor" BIGINT NOT NULL,
    "balanceAfterMinor" BIGINT NOT NULL,
    "sessionId" TEXT,
    "paymentId" TEXT,
    "payoutRequestId" TEXT,
    "revenueLedgerId" TEXT,
    "referenceKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "minWithdrawalRuleMinor" BIGINT NOT NULL DEFAULT 10000,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "approvedByAdminId" TEXT,
    "rejectedByAdminId" TEXT,
    "rejectionReason" TEXT,
    "bankReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" "SubscriptionDomain" NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PAST_DUE',
    "providerGateway" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "razorpaySubscriptionId" TEXT NOT NULL,
    "razorpayPlanId" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billedAt" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_ledger" (
    "id" TEXT NOT NULL,
    "type" "RevenueType" NOT NULL,
    "grossAmountMinor" BIGINT NOT NULL,
    "platformCommissionMinor" BIGINT NOT NULL,
    "providerShareMinor" BIGINT NOT NULL,
    "taxAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "referenceId" TEXT NOT NULL,
    "paymentId" TEXT,
    "sessionId" TEXT,
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL DEFAULT 'RAZORPAY',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "isSignatureValid" BOOLEAN NOT NULL,
    "processStatus" "WebhookProcessStatus" NOT NULL DEFAULT 'RECEIVED',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "sessionId" TEXT,
    "subscriptionId" TEXT,
    "rawPayload" JSONB NOT NULL,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_audit_logs" (
    "id" TEXT NOT NULL,
    "actorType" "FinancialAuditActorType" NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapy_sessions_bookingReferenceId_key" ON "therapy_sessions"("bookingReferenceId");
CREATE INDEX "therapy_sessions_therapistProfileId_dateTime_idx" ON "therapy_sessions"("therapistProfileId", "dateTime");
CREATE INDEX "therapy_sessions_patientProfileId_dateTime_idx" ON "therapy_sessions"("patientProfileId", "dateTime");

CREATE UNIQUE INDEX "financial_sessions_idempotencyKey_key" ON "financial_sessions"("idempotencyKey");
CREATE UNIQUE INDEX "financial_sessions_razorpayOrderId_key" ON "financial_sessions"("razorpayOrderId");
CREATE INDEX "financial_sessions_patientId_status_idx" ON "financial_sessions"("patientId", "status");
CREATE INDEX "financial_sessions_providerId_status_idx" ON "financial_sessions"("providerId", "status");
CREATE INDEX "financial_sessions_createdAt_idx" ON "financial_sessions"("createdAt");

CREATE UNIQUE INDEX "financial_payments_razorpayOrderId_key" ON "financial_payments"("razorpayOrderId");
CREATE UNIQUE INDEX "financial_payments_razorpayPaymentId_key" ON "financial_payments"("razorpayPaymentId");
CREATE UNIQUE INDEX "financial_payments_captureIdempotencyKey_key" ON "financial_payments"("captureIdempotencyKey");
CREATE INDEX "financial_payments_sessionId_status_idx" ON "financial_payments"("sessionId", "status");
CREATE INDEX "financial_payments_providerId_status_idx" ON "financial_payments"("providerId", "status");
CREATE INDEX "financial_payments_razorpayOrderId_idx" ON "financial_payments"("razorpayOrderId");
CREATE INDEX "financial_payments_createdAt_idx" ON "financial_payments"("createdAt");

CREATE INDEX "provider_wallets_isFrozen_idx" ON "provider_wallets"("isFrozen");
CREATE INDEX "provider_wallets_updatedAt_idx" ON "provider_wallets"("updatedAt");

CREATE UNIQUE INDEX "wallet_transactions_referenceKey_key" ON "wallet_transactions"("referenceKey");
CREATE INDEX "wallet_transactions_providerId_createdAt_idx" ON "wallet_transactions"("providerId", "createdAt" DESC);
CREATE INDEX "wallet_transactions_walletTxnType_createdAt_idx" ON "wallet_transactions"("walletTxnType", "createdAt" DESC);
CREATE INDEX "wallet_transactions_sessionId_idx" ON "wallet_transactions"("sessionId");
CREATE INDEX "wallet_transactions_paymentId_idx" ON "wallet_transactions"("paymentId");
CREATE INDEX "wallet_transactions_payoutRequestId_idx" ON "wallet_transactions"("payoutRequestId");

CREATE UNIQUE INDEX "payout_requests_bankReference_key" ON "payout_requests"("bankReference");
CREATE UNIQUE INDEX "payout_requests_idempotencyKey_key" ON "payout_requests"("idempotencyKey");
CREATE INDEX "payout_requests_providerId_status_requestedAt_idx" ON "payout_requests"("providerId", "status", "requestedAt" DESC);
CREATE INDEX "payout_requests_status_requestedAt_idx" ON "payout_requests"("status", "requestedAt" DESC);

CREATE UNIQUE INDEX "marketplace_subscriptions_razorpaySubscriptionId_key" ON "marketplace_subscriptions"("razorpaySubscriptionId");
CREATE INDEX "marketplace_subscriptions_userId_domain_status_idx" ON "marketplace_subscriptions"("userId", "domain", "status");
CREATE INDEX "marketplace_subscriptions_status_nextBillingDate_idx" ON "marketplace_subscriptions"("status", "nextBillingDate");
CREATE INDEX "marketplace_subscriptions_createdAt_idx" ON "marketplace_subscriptions"("createdAt");

CREATE UNIQUE INDEX "subscription_invoices_razorpayPaymentId_key" ON "subscription_invoices"("razorpayPaymentId");
CREATE INDEX "subscription_invoices_subscriptionId_billedAt_idx" ON "subscription_invoices"("subscriptionId", "billedAt" DESC);

CREATE INDEX "revenue_ledger_type_createdAt_idx" ON "revenue_ledger"("type", "createdAt" DESC);
CREATE INDEX "revenue_ledger_referenceId_createdAt_idx" ON "revenue_ledger"("referenceId", "createdAt" DESC);
CREATE INDEX "revenue_ledger_sessionId_idx" ON "revenue_ledger"("sessionId");
CREATE INDEX "revenue_ledger_subscriptionId_idx" ON "revenue_ledger"("subscriptionId");

CREATE INDEX "webhook_logs_eventType_processStatus_idx" ON "webhook_logs"("eventType", "processStatus");
CREATE INDEX "webhook_logs_firstSeenAt_idx" ON "webhook_logs"("firstSeenAt");
CREATE UNIQUE INDEX "webhook_logs_provider_eventId_key" ON "webhook_logs"("provider", "eventId");

CREATE INDEX "financial_audit_logs_entityType_entityId_createdAt_idx" ON "financial_audit_logs"("entityType", "entityId", "createdAt" DESC);
CREATE INDEX "financial_audit_logs_actorType_createdAt_idx" ON "financial_audit_logs"("actorType", "createdAt" DESC);
CREATE INDEX "financial_audit_logs_traceId_idx" ON "financial_audit_logs"("traceId");

-- AddForeignKey
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_therapistProfileId_fkey" FOREIGN KEY ("therapistProfileId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "financial_sessions" ADD CONSTRAINT "financial_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_sessions" ADD CONSTRAINT "financial_sessions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "financial_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_wallets"("providerId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "provider_wallets" ADD CONSTRAINT "provider_wallets_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_wallets"("providerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "financial_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "payout_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_revenueLedgerId_fkey" FOREIGN KEY ("revenueLedgerId") REFERENCES "revenue_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_wallets"("providerId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "marketplace_subscriptions" ADD CONSTRAINT "marketplace_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "marketplace_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "revenue_ledger" ADD CONSTRAINT "revenue_ledger_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revenue_ledger" ADD CONSTRAINT "revenue_ledger_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "financial_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revenue_ledger" ADD CONSTRAINT "revenue_ledger_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "marketplace_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_audit_logs" ADD CONSTRAINT "financial_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
