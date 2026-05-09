/*
  Warnings:

  - The values [VERIFIED] on the enum `CertificationStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [REQUESTED,APPROVED,PAID,REJECTED] on the enum `PayoutStatus` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `corporate_agreements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `activated_at` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `agreement_code` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `base_amount_inr` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `client_reviewed_at` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `company_key` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `company_name` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `effective_end_date` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `effective_start_date` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `selected_addons` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `selected_workshops` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `sent_at` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `signed_uploaded_at` on the `corporate_agreements` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `corporate_agreements` table. All the data in the column will be lost.
  - The `status` column on the `payout_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `payouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `method` column on the `payouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `auth_audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eap_addon_catalog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eap_workshop_catalog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyKey` to the `corporate_agreements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `corporate_agreements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `corporate_agreements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `corporate_agreements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK', 'UPI');

-- AlterEnum
BEGIN;
CREATE TYPE "CertificationStatus_new" AS ENUM ('NONE', 'ENROLLED', 'COMPLETED', 'EXPIRED');
ALTER TABLE "therapist_profiles" ALTER COLUMN "certificationStatus" DROP DEFAULT;
ALTER TABLE "therapist_profiles" ALTER COLUMN "certificationStatus" TYPE "CertificationStatus_new" USING ("certificationStatus"::text::"CertificationStatus_new");
ALTER TYPE "CertificationStatus" RENAME TO "CertificationStatus_old";
ALTER TYPE "CertificationStatus_new" RENAME TO "CertificationStatus";
DROP TYPE "CertificationStatus_old";
ALTER TABLE "therapist_profiles" ALTER COLUMN "certificationStatus" SET DEFAULT 'NONE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PayoutStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "payout_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payouts" ALTER COLUMN "status" TYPE "PayoutStatus_new" USING ("status"::text::"PayoutStatus_new");
ALTER TYPE "PayoutStatus" RENAME TO "PayoutStatus_old";
ALTER TYPE "PayoutStatus_new" RENAME TO "PayoutStatus";
DROP TYPE "PayoutStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "auth_audit_logs" DROP CONSTRAINT "auth_audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_user_id_fkey";

-- DropIndex
DROP INDEX "appointment_requests_source_funnel_idx";

-- DropIndex
DROP INDEX "idx_audit_logs_details_gin";

-- DropIndex
DROP INDEX "idx_audit_logs_resource_created_at_desc";

-- DropIndex
DROP INDEX "corporate_agreements_agreement_code_key";

-- DropIndex
DROP INDEX "idx_corporate_agreements_company_key";

-- DropIndex
DROP INDEX "idx_corporate_agreements_company_status";

-- DropIndex
DROP INDEX "idx_corporate_agreements_created_at";

-- DropIndex
DROP INDEX "idx_corporate_agreements_status";

-- DropIndex
DROP INDEX "session_booking_intents_source_funnel_idx";

-- DropIndex
DROP INDEX "therapist_profiles_nri_pool_certified_idx";

-- DropIndex
DROP INDEX "therapy_sessions_source_funnel_idx";

-- AlterTable
ALTER TABLE "appointment_requests" ALTER COLUMN "source_funnel" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "corporate_agreements" DROP CONSTRAINT "corporate_agreements_pkey",
DROP COLUMN "activated_at",
DROP COLUMN "agreement_code",
DROP COLUMN "base_amount_inr",
DROP COLUMN "client_reviewed_at",
DROP COLUMN "company_key",
DROP COLUMN "company_name",
DROP COLUMN "created_at",
DROP COLUMN "currency",
DROP COLUMN "effective_end_date",
DROP COLUMN "effective_start_date",
DROP COLUMN "notes",
DROP COLUMN "selected_addons",
DROP COLUMN "selected_workshops",
DROP COLUMN "sent_at",
DROP COLUMN "signed_uploaded_at",
DROP COLUMN "updated_at",
ADD COLUMN     "companyKey" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "templateId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "value" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'Draft',
ADD CONSTRAINT "corporate_agreements_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "idempotency_keys" ALTER COLUMN "expires_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "institutional_agreements" ADD COLUMN     "entity_id" TEXT;

-- AlterTable
ALTER TABLE "patient_assessments" ALTER COLUMN "entryType" SET DATA TYPE TEXT,
ALTER COLUMN "utmCampaign" SET DATA TYPE TEXT,
ALTER COLUMN "utmMedium" SET DATA TYPE TEXT,
ALTER COLUMN "utmSource" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "payout_requests" ADD COLUMN     "platform_amount" BIGINT,
ADD COLUMN     "therapist_amount" BIGINT,
DROP COLUMN "status",
ADD COLUMN     "status" "PayoutRequestStatus" NOT NULL DEFAULT 'REQUESTED';

-- AlterTable
ALTER TABLE "payouts" DROP COLUMN "status",
ADD COLUMN     "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "method",
ADD COLUMN     "method" "PayoutMethod" NOT NULL DEFAULT 'BANK';

-- AlterTable
ALTER TABLE "platform_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "session_booking_intents" ALTER COLUMN "source_funnel" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "therapy_sessions" ALTER COLUMN "source_funnel" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "auth_audit_logs";

-- DropTable
DROP TABLE "eap_addon_catalog";

-- DropTable
DROP TABLE "eap_workshop_catalog";

-- CreateTable
CREATE TABLE "corporate_agreement_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_agreement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checks" JSONB,
    "flagReasons" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_preferences" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "primaryLanguage" TEXT NOT NULL,
    "secondaryLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "therapyModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" JSONB NOT NULL DEFAULT '{}',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "sessionDuration" TEXT NOT NULL DEFAULT '45 min',
    "reminderChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reminderTiming" TEXT NOT NULL DEFAULT '1h',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "admin_name" TEXT,
    "admin_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "pricing_model" TEXT NOT NULL,
    "price_per_member" DOUBLE PRECISION,
    "max_members" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAuditLog_userId_createdAt_idx" ON "AuthAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditLog_event_createdAt_idx" ON "AuthAuditLog"("event", "createdAt");

-- CreateIndex
CREATE INDEX "provider_verifications_userId_idx" ON "provider_verifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_preferences_patientId_key" ON "patient_preferences"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_admin_email_key" ON "Entity"("admin_email");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contract_number_key" ON "Contract"("contract_number");

-- CreateIndex
CREATE INDEX "Contract_entityId_idx" ON "Contract"("entityId");

-- CreateIndex
CREATE INDEX "institutional_agreements_entity_id_idx" ON "institutional_agreements"("entity_id");

-- CreateIndex
CREATE INDEX "payout_requests_providerId_status_requestedAt_idx" ON "payout_requests"("providerId", "status", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "payout_requests_status_requestedAt_idx" ON "payout_requests"("status", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "payouts_status_createdAt_idx" ON "payouts"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "corporate_agreements" ADD CONSTRAINT "corporate_agreements_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "corporate_agreement_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_preferences" ADD CONSTRAINT "patient_preferences_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_agreements" ADD CONSTRAINT "institutional_agreements_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_invoice_is_paid_out" RENAME TO "invoices_isPaidOut_idx";

-- RenameIndex
ALTER INDEX "idx_payout_item_payout" RENAME TO "payout_items_payoutId_idx";

-- RenameIndex
ALTER INDEX "payout_items_invoiceId_unique" RENAME TO "payout_items_invoiceId_key";

-- RenameIndex
ALTER INDEX "idx_payout_provider_created" RENAME TO "payouts_providerId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_payout_status_created" RENAME TO "payouts_status_createdAt_idx";
