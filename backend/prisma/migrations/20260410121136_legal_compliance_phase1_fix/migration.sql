/*
  Warnings:

  - The values [REQUESTED,APPROVED,PAID,REJECTED] on the enum `PayoutStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `audit_logs` table. All the data in the column will be lost.
  - The primary key for the `crisis_alerts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `confidence` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `detected_at` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `keywords` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `monitoring_id` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `resolution_note` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `resolved` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `resolved_at` on the `crisis_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayOrderId` on the `financial_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayOrderId` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayPlanId` on the `marketplace_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `razorpaySubscriptionId` on the `marketplace_subscriptions` table. All the data in the column will be lost.
  - The `status` column on the `payout_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `payouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `method` column on the `payouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `razorpayOrderId` on the `session_booking_intents` table. All the data in the column will be lost.
  - You are about to drop the column `balance_after` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `balance_before` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `expired` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `source_id` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_type` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_id` on the `user_wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `game_credits` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `last_transaction_at` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `lifetime_earned` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `lifetime_expired` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `lifetime_spent` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `promo_credits` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `referral_credits` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `total_balance` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `earned_at` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `expired` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `fully_used` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `remaining_balance` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `source_id` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_id` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `wallet_credits` table. All the data in the column will be lost.
  - You are about to drop the `booking_wallet_usage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coaching_suggestions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `daily_game_plays` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `empathy_snapshots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `game_stats_daily` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_monitoring` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_transcripts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_status` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[merchantTransactionId]` on the table `financial_sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[session_id,user_id,guest_email]` on the table `group_therapy_enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantTransactionId]` on the table `leads` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phonepeSubscriptionId]` on the table `marketplace_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantTransactionId]` on the table `session_booking_intents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `user_wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `crisis_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `crisis_alerts` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `group_therapy_enrollments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `group_therapy_invites` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `session_mode` on the `group_therapy_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `group_therapy_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `phonepePlanId` to the `marketplace_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phonepeSubscriptionId` to the `marketplace_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantTransactionId` to the `session_booking_intents` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `user_wallet_transactions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `user_wallets` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `user_wallets` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK', 'UPI');

-- AlterEnum
BEGIN;
CREATE TYPE "PayoutStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "payout_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payout_requests" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'payouts'
    ) THEN
        ALTER TABLE "payouts" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "payouts" ALTER COLUMN "status" TYPE "PayoutStatus_new" USING ("status"::text::"PayoutStatus_new");
    END IF;
END $$;
ALTER TYPE "PayoutStatus" RENAME TO "PayoutStatus_old";
ALTER TYPE "PayoutStatus_new" RENAME TO "PayoutStatus";
DROP TYPE "PayoutStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "booking_wallet_usage" DROP CONSTRAINT "booking_wallet_usage_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_wallet_usage" DROP CONSTRAINT "booking_wallet_usage_user_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_wallet_usage" DROP CONSTRAINT "booking_wallet_usage_wallet_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "coaching_suggestions" DROP CONSTRAINT "coaching_suggestions_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "crisis_alerts" DROP CONSTRAINT "crisis_alerts_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_game_plays" DROP CONSTRAINT "daily_game_plays_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_game_plays" DROP CONSTRAINT "daily_game_plays_user_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_game_plays" DROP CONSTRAINT "daily_game_plays_wallet_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "empathy_snapshots" DROP CONSTRAINT "empathy_snapshots_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "group_therapy_enrollments" DROP CONSTRAINT "group_therapy_enrollments_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "group_therapy_enrollments" DROP CONSTRAINT "group_therapy_enrollments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "group_therapy_invites" DROP CONSTRAINT "group_therapy_invites_invited_by_id_fkey";

-- DropForeignKey
ALTER TABLE "group_therapy_invites" DROP CONSTRAINT "group_therapy_invites_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "lead_assignments" DROP CONSTRAINT "lead_assignments_leadId_fkey";

-- DropForeignKey
ALTER TABLE "lead_assignments" DROP CONSTRAINT "lead_assignments_therapistId_fkey";

-- DropForeignKey
ALTER TABLE "session_analytics" DROP CONSTRAINT "session_analytics_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "session_transcripts" DROP CONSTRAINT "session_transcripts_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "user_wallet_transactions" DROP CONSTRAINT "user_wallet_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_wallet_transactions" DROP CONSTRAINT "user_wallet_transactions_wallet_id_fkey";

-- DropForeignKey
ALTER TABLE "user_wallets" DROP CONSTRAINT "user_wallet_user_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_credits" DROP CONSTRAINT "wallet_credits_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_credits" DROP CONSTRAINT "wallet_credits_user_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "audit_logs_userId_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "idx_audit_logs_details_gin";

-- DropIndex
DROP INDEX IF EXISTS "idx_audit_logs_resource_created_at_desc";

-- DropIndex
DROP INDEX IF EXISTS "idx_audit_logs_user_id_created_at_desc";

-- DropIndex
DROP INDEX IF EXISTS "crisis_alerts_monitoring_idx";

-- DropIndex
DROP INDEX IF EXISTS "financial_sessions_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "financial_sessions_razorpayOrderId_key";

-- DropIndex
DROP INDEX IF EXISTS "group_therapy_enrollments_guest_email_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "group_therapy_enrollments_session_id_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "group_therapy_enrollments_user_id_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "group_therapy_sessions_host_therapist_id_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "group_therapy_sessions_requested_by_id_created_at_idx";

-- DropIndex
DROP INDEX IF EXISTS "group_therapy_sessions_session_mode_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "group_therapy_sessions_status_scheduled_at_idx";

-- DropIndex
DROP INDEX IF EXISTS "leads_issue_idx";

-- DropIndex
DROP INDEX IF EXISTS "leads_razorpayOrderId_key";

-- DropIndex
DROP INDEX IF EXISTS "marketplace_subscriptions_razorpaySubscriptionId_key";

-- DropIndex
DROP INDEX IF EXISTS "marquee_offers_isActive_idx";

-- DropIndex
DROP INDEX IF EXISTS "marquee_offers_sortOrder_idx";

-- DropIndex
DROP INDEX IF EXISTS "patient_assessments_patientId_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "roles_name_idx";

-- DropIndex
DROP INDEX IF EXISTS "screening_attempts_patientId_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "session_booking_intents_razorpayOrderId_key";

-- DropIndex
DROP INDEX IF EXISTS "therapy_sessions_patientProfileId_dateTime_idx";

-- DropIndex
DROP INDEX IF EXISTS "therapy_sessions_therapistProfileId_dateTime_idx";

-- DropIndex
DROP INDEX IF EXISTS "idx_created_at";

-- DropIndex
DROP INDEX IF EXISTS "idx_source";

-- DropIndex
DROP INDEX IF EXISTS "idx_transaction_type";

-- DropIndex
DROP INDEX IF EXISTS "idx_user_transactions";

-- DropIndex
DROP INDEX IF EXISTS "idx_updated_at";

-- DropIndex
DROP INDEX IF EXISTS "idx_user_balance";

-- DropConstraint (index is owned by unique constraint)
ALTER TABLE "user_wallets" DROP CONSTRAINT IF EXISTS "user_wallet_user_id_key";

-- DropIndex
DROP INDEX IF EXISTS "idx_fully_used";

-- DropIndex
DROP INDEX IF EXISTS "idx_wallet_credits_source";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "createdAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "crisis_alerts" DROP CONSTRAINT "crisis_alerts_pkey",
DROP COLUMN "confidence",
DROP COLUMN "detected_at",
DROP COLUMN "keywords",
DROP COLUMN "message",
DROP COLUMN "monitoring_id",
DROP COLUMN "resolution_note",
DROP COLUMN "resolved",
DROP COLUMN "resolved_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "patient_id" TEXT NOT NULL,
ADD COLUMN     "resolution_notes" TEXT,
ADD COLUMN     "responded_by" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "severity" SET DEFAULT 'high',
ADD CONSTRAINT "crisis_alerts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "daily_payment_metrics" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "financial_payments" ALTER COLUMN "providerGateway" SET DEFAULT 'PHONEPE';

-- AlterTable
ALTER TABLE "financial_sessions" DROP COLUMN "razorpayOrderId",
ADD COLUMN     "merchantTransactionId" TEXT;

-- AlterTable
ALTER TABLE "group_categories" ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "session_price" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "group_therapy_enrollments" ADD COLUMN     "enrolled_by_admin_id" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "amount_minor" DROP NOT NULL,
ALTER COLUMN "amount_minor" DROP DEFAULT;

-- AlterTable
ALTER TABLE "group_therapy_invites" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "amount_minor" DROP DEFAULT;

-- AlterTable
ALTER TABLE "group_therapy_sessions" DROP COLUMN "session_mode",
ADD COLUMN     "session_mode" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "duration_minutes" DROP DEFAULT,
ALTER COLUMN "max_members" DROP DEFAULT,
ALTER COLUMN "price_minor" DROP DEFAULT,
ALTER COLUMN "allow_guest_join" SET DEFAULT false,
ALTER COLUMN "requires_admin_gate" SET DEFAULT false,
ALTER COLUMN "requires_payment" SET DEFAULT false;

-- AlterTable (guarded for shadow DB compatibility)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'idempotency_keys'
            AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE "idempotency_keys" ALTER COLUMN "expires_at" DROP DEFAULT;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "razorpayOrderId",
ADD COLUMN     "merchantTransactionId" TEXT;

-- AlterTable
ALTER TABLE "marketplace_subscriptions" DROP COLUMN "razorpayPlanId",
DROP COLUMN "razorpaySubscriptionId",
ADD COLUMN     "phonepePlanId" TEXT NOT NULL,
ADD COLUMN     "phonepeSubscriptionId" TEXT NOT NULL,
ALTER COLUMN "providerGateway" SET DEFAULT 'PHONEPE';

-- AlterTable
ALTER TABLE "payout_requests" ADD COLUMN     "platform_amount" BIGINT,
ADD COLUMN     "therapist_amount" BIGINT,
DROP COLUMN "status",
ADD COLUMN     "status" "PayoutRequestStatus" NOT NULL DEFAULT 'REQUESTED';

-- AlterTable
ALTER TABLE IF EXISTS "payouts" DROP COLUMN "status",
ADD COLUMN     "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "method",
ADD COLUMN     "method" "PayoutMethod" NOT NULL DEFAULT 'BANK';

-- AlterTable
ALTER TABLE IF EXISTS "platform_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "qr_codes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "session_booking_intents" DROP COLUMN "razorpayOrderId",
ADD COLUMN     "merchantTransactionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "therapist_profiles" ADD COLUMN     "commission_override" INTEGER,
ADD COLUMN     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "universal_checkout_payments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_wallet_transactions" DROP COLUMN "balance_after",
DROP COLUMN "balance_before",
DROP COLUMN "created_at",
DROP COLUMN "expired",
DROP COLUMN "expires_at",
DROP COLUMN "metadata",
DROP COLUMN "source",
DROP COLUMN "source_id",
DROP COLUMN "transaction_type",
DROP COLUMN "user_id",
DROP COLUMN "wallet_id",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_wallets" RENAME CONSTRAINT "user_wallet_pkey" TO "user_wallets_pkey";

-- AlterTable
ALTER TABLE "user_wallets"
DROP COLUMN "created_at",
DROP COLUMN "game_credits",
DROP COLUMN "last_transaction_at",
DROP COLUMN "lifetime_earned",
DROP COLUMN "lifetime_expired",
DROP COLUMN "lifetime_spent",
DROP COLUMN "promo_credits",
DROP COLUMN "referral_credits",
DROP COLUMN "total_balance",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastTxnDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "wallet_credits" DROP COLUMN "created_at",
DROP COLUMN "earned_at",
DROP COLUMN "expired",
DROP COLUMN "expires_at",
DROP COLUMN "fully_used",
DROP COLUMN "remaining_balance",
DROP COLUMN "source_id",
DROP COLUMN "transaction_id",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "source" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "booking_wallet_usage";

-- DropTable
DROP TABLE "coaching_suggestions";

-- DropTable
DROP TABLE "daily_game_plays";

-- DropTable
DROP TABLE "empathy_snapshots";

-- DropTable
DROP TABLE "game_stats_daily";

-- DropTable
DROP TABLE "session_analytics";

-- DropTable
DROP TABLE "session_monitoring";

-- DropTable
DROP TABLE "session_transcripts";

-- DropTable
DROP TABLE "system_status";

-- DropEnum
DROP TYPE "GroupTherapyEnrollmentStatus";

-- DropEnum
DROP TYPE "GroupTherapyInviteStatus";

-- DropEnum
DROP TYPE "GroupTherapyMode";

-- DropEnum
DROP TYPE "GroupTherapyStatus";

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_acceptances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVer" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "platform_access" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_otp_requests" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companySize" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_access_pending" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "paymentId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_access_pending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_plan_pending" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "leadsPerWeek" INTEGER NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 21,
    "paymentId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_plan_pending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_lead_bundle_pending" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "bundleKey" TEXT NOT NULL,
    "hotLeads" INTEGER NOT NULL,
    "warmLeads" INTEGER NOT NULL,
    "coldLeads" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "paymentId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "usedHotLeads" INTEGER NOT NULL DEFAULT 0,
    "usedWarmLeads" INTEGER NOT NULL DEFAULT 0,
    "usedColdLeads" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_lead_bundle_pending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_game_play" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sixesHit" INTEGER NOT NULL DEFAULT 0,
    "ballsPlayed" INTEGER NOT NULL DEFAULT 0,
    "didWin" BOOLEAN NOT NULL DEFAULT false,
    "prizeAmount" INTEGER,
    "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_game_play_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_wallet_usages" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountUsed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_wallet_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL,
    "pricing_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_by" TEXT,
    "effective_from" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "pricing_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "companyKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeLimit" INTEGER NOT NULL DEFAULT 300,
    "sessionQuota" INTEGER NOT NULL DEFAULT 200,
    "ssoProvider" TEXT NOT NULL DEFAULT 'Google Workspace',
    "privacyPolicy" TEXT NOT NULL DEFAULT 'Only aggregate analytics are visible to HR. Individual therapy notes, diagnosis, medications, and provider details are never shown.',
    "supportEmail" TEXT NOT NULL DEFAULT 'enterprise-support@manas360.com',
    "supportPhone" TEXT NOT NULL DEFAULT '+91-80-4000-3600',
    "supportSla" TEXT NOT NULL DEFAULT 'Priority support within 4 business hours.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "domain" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_departments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskIndicator" TEXT NOT NULL DEFAULT 'MODERATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "employeeCode" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "location" TEXT,
    "managerName" TEXT,
    "riskBand" TEXT NOT NULL DEFAULT 'LOW',
    "phq9Score" INTEGER NOT NULL DEFAULT 0,
    "gad7Score" INTEGER NOT NULL DEFAULT 0,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "engagementScore" INTEGER NOT NULL DEFAULT 0,
    "preferredService" TEXT NOT NULL DEFAULT 'Stress therapy',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_session_allocations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "allocatedSessions" INTEGER NOT NULL DEFAULT 0,
    "usedSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_session_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_campaigns" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reachCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_demo_requests" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyKey" TEXT,
    "workEmail" TEXT NOT NULL,
    "companySize" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_invoices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "dueDate" DATE,
    "paidDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_monthly_metrics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monthLabel" TEXT NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsAllocated" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "stressScore" INTEGER NOT NULL DEFAULT 0,
    "utilizationRate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_monthly_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_payment_methods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "methodType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_programs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL DEFAULT 4,
    "employeesEnrolled" INTEGER NOT NULL DEFAULT 0,
    "completionRate" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_workshops" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "workshopDate" DATE NOT NULL,
    "attendees" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_pathway_state" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pathway" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "selected_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_pathway_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscription" (
    "id" TEXT NOT NULL,
    "plan_key" VARCHAR(50) NOT NULL,
    "plan_name" VARCHAR(100) NOT NULL,
    "price" INTEGER NOT NULL,
    "billing_cycle" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_addons" (
    "id" TEXT NOT NULL,
    "addon_key" VARCHAR(50) NOT NULL,
    "addon_name" VARCHAR(100) NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_pricing" (
    "id" TEXT NOT NULL,
    "provider_type" VARCHAR(50) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "provider_share" INTEGER NOT NULL,
    "platform_share" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "legal_documents_type_isActive_idx" ON "legal_documents"("type", "isActive");

-- CreateIndex
CREATE INDEX "legal_documents_publishedAt_idx" ON "legal_documents"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_version_key" ON "legal_documents"("type", "version");

-- CreateIndex
CREATE INDEX "user_acceptances_userId_acceptedAt_idx" ON "user_acceptances"("userId", "acceptedAt");

-- CreateIndex
CREATE INDEX "user_acceptances_documentId_acceptedAt_idx" ON "user_acceptances"("documentId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_acceptances_userId_documentId_key" ON "user_acceptances"("userId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_access_providerId_key" ON "platform_access"("providerId");

-- CreateIndex
CREATE INDEX "platform_access_providerId_status_idx" ON "platform_access"("providerId", "status");

-- CreateIndex
CREATE INDEX "platform_access_status_expiryDate_idx" ON "platform_access"("status", "expiryDate");

-- CreateIndex
CREATE INDEX "corporate_otp_requests_phone_status_idx" ON "corporate_otp_requests"("phone", "status");

-- CreateIndex
CREATE INDEX "corporate_otp_requests_phone_status_createdAt_idx" ON "corporate_otp_requests"("phone", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_otp_requests_status_expiresAt_idx" ON "corporate_otp_requests"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "platform_access_pending_providerId_status_idx" ON "platform_access_pending"("providerId", "status");

-- CreateIndex
CREATE INDEX "platform_access_pending_status_activatedAt_idx" ON "platform_access_pending"("status", "activatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_access_pending_providerId_paymentId_key" ON "platform_access_pending"("providerId", "paymentId");

-- CreateIndex
CREATE INDEX "lead_plan_pending_providerId_status_idx" ON "lead_plan_pending"("providerId", "status");

-- CreateIndex
CREATE INDEX "lead_plan_pending_status_activatedAt_idx" ON "lead_plan_pending"("status", "activatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lead_plan_pending_providerId_paymentId_key" ON "lead_plan_pending"("providerId", "paymentId");

-- CreateIndex
CREATE INDEX "marketplace_lead_bundle_pending_providerId_status_idx" ON "marketplace_lead_bundle_pending"("providerId", "status");

-- CreateIndex
CREATE INDEX "marketplace_lead_bundle_pending_status_activatedAt_idx" ON "marketplace_lead_bundle_pending"("status", "activatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_lead_bundle_pending_providerId_paymentId_key" ON "marketplace_lead_bundle_pending"("providerId", "paymentId");

-- CreateIndex
CREATE INDEX "daily_game_play_userId_lastPlayedAt_idx" ON "daily_game_play"("userId", "lastPlayedAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_game_play_userId_date_key" ON "daily_game_play"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "booking_wallet_usages_bookingId_key" ON "booking_wallet_usages"("bookingId");

-- CreateIndex
CREATE INDEX "booking_wallet_usages_walletId_idx" ON "booking_wallet_usages"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_companyKey_key" ON "companies"("companyKey");

-- CreateIndex
CREATE INDEX "companies_createdAt_idx" ON "companies"("createdAt");

-- CreateIndex
CREATE INDEX "company_departments_companyId_createdAt_idx" ON "company_departments"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "company_departments_companyId_name_key" ON "company_departments"("companyId", "name");

-- CreateIndex
CREATE INDEX "company_employees_companyId_createdAt_idx" ON "company_employees"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "company_employees_companyId_departmentId_idx" ON "company_employees"("companyId", "departmentId");

-- CreateIndex
CREATE INDEX "company_employees_departmentId_idx" ON "company_employees"("departmentId");

-- CreateIndex
CREATE INDEX "company_employees_companyId_riskBand_idx" ON "company_employees"("companyId", "riskBand");

-- CreateIndex
CREATE INDEX "company_employees_companyId_preferredService_idx" ON "company_employees"("companyId", "preferredService");

-- CreateIndex
CREATE UNIQUE INDEX "company_employees_companyId_email_key" ON "company_employees"("companyId", "email");

-- CreateIndex
CREATE INDEX "company_session_allocations_companyId_updatedAt_idx" ON "company_session_allocations"("companyId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "company_session_allocations_companyId_departmentId_key" ON "company_session_allocations"("companyId", "departmentId");

-- CreateIndex
CREATE INDEX "corporate_campaigns_companyId_startDate_idx" ON "corporate_campaigns"("companyId", "startDate");

-- CreateIndex
CREATE INDEX "corporate_campaigns_companyId_status_startDate_idx" ON "corporate_campaigns"("companyId", "status", "startDate");

-- CreateIndex
CREATE INDEX "corporate_demo_requests_workEmail_idx" ON "corporate_demo_requests"("workEmail");

-- CreateIndex
CREATE INDEX "corporate_invoices_companyId_status_dueDate_idx" ON "corporate_invoices"("companyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "corporate_invoices_companyId_createdAt_idx" ON "corporate_invoices"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "corporate_invoices_companyId_invoiceCode_key" ON "corporate_invoices"("companyId", "invoiceCode");

-- CreateIndex
CREATE INDEX "corporate_monthly_metrics_companyId_createdAt_idx" ON "corporate_monthly_metrics"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_monthly_metrics_companyId_monthLabel_key" ON "corporate_monthly_metrics"("companyId", "monthLabel");

-- CreateIndex
CREATE INDEX "corporate_payment_methods_companyId_updatedAt_idx" ON "corporate_payment_methods"("companyId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_payment_methods_companyId_isPrimary_updatedAt_idx" ON "corporate_payment_methods"("companyId", "isPrimary", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_payment_methods_companyId_methodType_updatedAt_idx" ON "corporate_payment_methods"("companyId", "methodType", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_programs_companyId_createdAt_idx" ON "corporate_programs"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_programs_companyId_status_createdAt_idx" ON "corporate_programs"("companyId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_reports_companyId_generatedAt_idx" ON "corporate_reports"("companyId", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_reports_companyId_reportType_generatedAt_idx" ON "corporate_reports"("companyId", "reportType", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "corporate_workshops_companyId_workshopDate_idx" ON "corporate_workshops"("companyId", "workshopDate");

-- CreateIndex
CREATE INDEX "corporate_workshops_companyId_status_workshopDate_idx" ON "corporate_workshops"("companyId", "status", "workshopDate");

-- CreateIndex
CREATE UNIQUE INDEX "patient_pathway_state_user_id_key" ON "patient_pathway_state"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscription_plan_key_key" ON "platform_subscription"("plan_key");

-- CreateIndex
CREATE UNIQUE INDEX "product_addons_addon_key_key" ON "product_addons"("addon_key");

-- CreateIndex
CREATE UNIQUE INDEX "session_pricing_provider_type_duration_minutes_key" ON "session_pricing"("provider_type", "duration_minutes");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "crisis_alerts_status_created_at_idx" ON "crisis_alerts"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "financial_sessions_merchantTransactionId_key" ON "financial_sessions"("merchantTransactionId");

-- CreateIndex
CREATE INDEX "financial_sessions_patientId_createdAt_idx" ON "financial_sessions"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "financial_sessions_providerId_createdAt_idx" ON "financial_sessions"("providerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "financial_sessions_status_createdAt_idx" ON "financial_sessions"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "financial_sessions_providerId_idx" ON "financial_sessions"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "group_therapy_enrollments_session_id_user_id_guest_email_key" ON "group_therapy_enrollments"("session_id", "user_id", "guest_email");

-- CreateIndex
CREATE INDEX "group_therapy_invites_patient_user_id_status_idx" ON "group_therapy_invites"("patient_user_id", "status");

-- CreateIndex
CREATE INDEX "group_therapy_invites_session_id_status_idx" ON "group_therapy_invites"("session_id", "status");

-- CreateIndex
CREATE INDEX "invoices_status_createdAt_idx" ON "invoices"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_createdAt_idx" ON "invoices"("tenant_id", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "invoices_userId_createdAt_idx" ON "invoices"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "invoices_paymentTransactionId_idx" ON "invoices"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_merchantTransactionId_key" ON "leads"("merchantTransactionId");

-- CreateIndex
CREATE INDEX "leads_issue_idx" ON "leads"("issue");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_subscriptions_phonepeSubscriptionId_key" ON "marketplace_subscriptions"("phonepeSubscriptionId");

-- CreateIndex
CREATE INDEX "patient_assessments_patientId_createdAt_idx" ON "patient_assessments"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payout_requests_providerId_status_requestedAt_idx" ON "payout_requests"("providerId", "status", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "payout_requests_status_requestedAt_idx" ON "payout_requests"("status", "requestedAt" DESC);

-- CreateIndex (guarded for shadow DB compatibility)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'payouts'
    ) THEN
        CREATE INDEX IF NOT EXISTS "payouts_status_createdAt_idx" ON "payouts"("status", "createdAt" DESC);
    END IF;
END $$;

-- CreateIndex
CREATE INDEX "prescriptions_provider_id_created_at_idx" ON "prescriptions"("provider_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "prescriptions_patient_id_created_at_idx" ON "prescriptions"("patient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "prescriptions_status_created_at_idx" ON "prescriptions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "screening_attempts_patientId_createdAt_idx" ON "screening_attempts"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "session_booking_intents_merchantTransactionId_key" ON "session_booking_intents"("merchantTransactionId");

-- CreateIndex
CREATE INDEX "therapy_sessions_therapistProfileId_dateTime_idx" ON "therapy_sessions"("therapistProfileId", "dateTime" DESC);

-- CreateIndex
CREATE INDEX "therapy_sessions_patientProfileId_dateTime_idx" ON "therapy_sessions"("patientProfileId", "dateTime" DESC);

-- CreateIndex
CREATE INDEX "therapy_sessions_therapistProfileId_status_dateTime_idx" ON "therapy_sessions"("therapistProfileId", "status", "dateTime" DESC);

-- CreateIndex
CREATE INDEX "therapy_sessions_patientProfileId_status_dateTime_idx" ON "therapy_sessions"("patientProfileId", "status", "dateTime" DESC);

-- CreateIndex
CREATE INDEX "therapy_sessions_paymentStatus_createdAt_idx" ON "therapy_sessions"("paymentStatus", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_userId_key" ON "user_wallets"("userId");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- RenameForeignKey
ALTER TABLE "user_wallet_transactions" RENAME CONSTRAINT "user_wallet_transactions_wallet_fkey_new" TO "user_wallet_transactions_walletId_fkey";

-- RenameForeignKey
ALTER TABLE "wallet_credits" RENAME CONSTRAINT "wallet_credits_wallet_fkey_new" TO "wallet_credits_walletId_fkey";

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_acceptances" ADD CONSTRAINT "user_acceptances_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_acceptances" ADD CONSTRAINT "user_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_therapy_invites" ADD CONSTRAINT "group_therapy_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_access" ADD CONSTRAINT "platform_access_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_wallet_usages" ADD CONSTRAINT "booking_wallet_usages_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "user_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_departments" ADD CONSTRAINT "company_departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_employees" ADD CONSTRAINT "company_employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_employees" ADD CONSTRAINT "company_employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "company_departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_session_allocations" ADD CONSTRAINT "company_session_allocations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_session_allocations" ADD CONSTRAINT "company_session_allocations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "company_departments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "corporate_campaigns" ADD CONSTRAINT "corporate_campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "corporate_invoices" ADD CONSTRAINT "corporate_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "corporate_monthly_metrics" ADD CONSTRAINT "corporate_monthly_metrics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "corporate_payment_methods" ADD CONSTRAINT "corporate_payment_methods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "corporate_programs" ADD CONSTRAINT "corporate_programs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "corporate_reports" ADD CONSTRAINT "corporate_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "corporate_workshops" ADD CONSTRAINT "corporate_workshops_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_pathway_state" ADD CONSTRAINT "patient_pathway_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- RenameIndex
ALTER INDEX IF EXISTS "idempotency_keys_endpoint_actor_request_hash_key" RENAME TO "idempotency_keys_endpoint_actor_id_request_hash_key";

-- RenameIndex
ALTER INDEX IF EXISTS "idx_invoice_is_paid_out" RENAME TO "invoices_isPaidOut_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "idx_invoice_payment_id" RENAME TO "invoices_paymentId_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "idx_payout_item_payout" RENAME TO "payout_items_payoutId_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "payout_items_invoiceId_unique" RENAME TO "payout_items_invoiceId_key";

-- RenameIndex
ALTER INDEX IF EXISTS "idx_payout_provider_created" RENAME TO "payouts_providerId_createdAt_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "idx_payout_status_created" RENAME TO "payouts_status_createdAt_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "user_wallet_transactions_wallet_created_idx_new" RENAME TO "user_wallet_transactions_walletId_createdAt_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "wallet_credits_wallet_status_idx_new" RENAME TO "wallet_credits_walletId_status_idx";
