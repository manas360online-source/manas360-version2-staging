/*
  Warnings:

  - You are about to drop the column `expiryDate` on the `patient_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `patient_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `patient_subscriptions` table. All the data in the column will be lost.
  - Added the required column `billingCycle` to the `patient_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `planName` to the `patient_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `renewalDate` to the `patient_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProviderPlan" AS ENUM ('free', 'basic', 'standard', 'premium');

-- DropForeignKey
ALTER TABLE "financial_payments" DROP CONSTRAINT "financial_payments_providerId_fkey";

-- DropForeignKey
ALTER TABLE "financial_payments" DROP CONSTRAINT "financial_payments_sessionId_fkey";

-- AlterTable
ALTER TABLE "financial_payments" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "patientId" TEXT,
ALTER COLUMN "sessionId" DROP NOT NULL,
ALTER COLUMN "providerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "patient_subscriptions" DROP COLUMN "expiryDate",
DROP COLUMN "plan",
DROP COLUMN "startDate",
ADD COLUMN     "billingCycle" TEXT NOT NULL,
ADD COLUMN     "planName" TEXT NOT NULL,
ADD COLUMN     "renewalDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company_key" TEXT,
ADD COLUMN     "is_company_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "patient_plan_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_plan_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_subscriptions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "plan" "ProviderPlan" NOT NULL,
    "price" INTEGER NOT NULL,
    "leadsPerWeek" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_purchases" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "finalPrice" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_plan_configs" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_plan_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_status" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "launchedBy" TEXT,
    "launchedAt" TIMESTAMP(3),

    CONSTRAINT "system_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_tenants" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "issuer" TEXT,
    "client_id" TEXT,
    "client_secret" TEXT,
    "metadata_url" TEXT,
    "allowed_domains" TEXT[],
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_company_key" TEXT,

    CONSTRAINT "sso_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_identities" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_plan_configs_key_key" ON "patient_plan_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "provider_subscriptions_providerId_key" ON "provider_subscriptions"("providerId");

-- CreateIndex
CREATE INDEX "provider_subscriptions_status_idx" ON "provider_subscriptions"("status");

-- CreateIndex
CREATE INDEX "lead_purchases_providerId_status_idx" ON "lead_purchases"("providerId", "status");

-- CreateIndex
CREATE INDEX "lead_purchases_leadId_idx" ON "lead_purchases"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_purchases_providerId_leadId_key" ON "lead_purchases"("providerId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "sso_tenants_key_key" ON "sso_tenants"("key");

-- CreateIndex
CREATE UNIQUE INDEX "sso_identities_tenant_key_provider_provider_subject_key" ON "sso_identities"("tenant_key", "provider", "provider_subject");

-- AddForeignKey
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_wallets"("providerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "financial_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
