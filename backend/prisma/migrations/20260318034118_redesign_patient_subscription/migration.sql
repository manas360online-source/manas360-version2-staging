/*
  Warnings:

  - You are about to drop the column `billingCycle` on the `patient_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `planName` on the `patient_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `renewalDate` on the `patient_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the `cbt_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cbt_session_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cbt_session_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coaching_suggestions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `crisis_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `empathy_snapshots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_responses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_session_responses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_branching_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_exports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_monitoring` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_template_library` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_transcripts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template_tags_on_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `therapist_cbt_modules` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `expiryDate` to the `patient_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan` to the `patient_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AppointmentRequestStatus" AS ENUM ('PENDING', 'ACCEPTED_BY_PROVIDER', 'PAYMENT_PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'REJECTED_BY_ALL');

-- CreateEnum
CREATE TYPE "ProviderRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialPaymentType" AS ENUM ('PLATFORM_FEE', 'PROVIDER_FEE');

-- CreateEnum
CREATE TYPE "PlanActivityFrequency" AS ENUM ('DAILY_RITUAL', 'WEEKLY_MILESTONE', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "PlanActivityType" AS ENUM ('MOOD_CHECKIN', 'EXERCISE', 'AUDIO_THERAPY', 'CLINICAL_ASSESSMENT', 'READING_MATERIAL', 'SESSION_BOOKING');

-- DropForeignKey
ALTER TABLE "cbt_questions" DROP CONSTRAINT "cbt_questions_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "cbt_session_templates" DROP CONSTRAINT "cbt_session_templates_therapistId_fkey";

-- DropForeignKey
ALTER TABLE "cbt_session_versions" DROP CONSTRAINT "cbt_session_versions_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "coaching_suggestions" DROP CONSTRAINT "coaching_suggestions_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "crisis_alerts" DROP CONSTRAINT "crisis_alerts_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "empathy_snapshots" DROP CONSTRAINT "empathy_snapshots_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_responses" DROP CONSTRAINT "patient_responses_questionId_fkey";

-- DropForeignKey
ALTER TABLE "patient_session_responses" DROP CONSTRAINT "patient_session_responses_patientId_fkey";

-- DropForeignKey
ALTER TABLE "patient_session_responses" DROP CONSTRAINT "patient_session_responses_previousResponseId_fkey";

-- DropForeignKey
ALTER TABLE "patient_session_responses" DROP CONSTRAINT "patient_session_responses_questionId_fkey";

-- DropForeignKey
ALTER TABLE "patient_session_responses" DROP CONSTRAINT "patient_session_responses_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "patient_sessions" DROP CONSTRAINT "patient_sessions_patientId_fkey";

-- DropForeignKey
ALTER TABLE "patient_sessions" DROP CONSTRAINT "patient_sessions_templateId_fkey";

-- DropForeignKey
ALTER TABLE "provider_documents" DROP CONSTRAINT "provider_documents_providerProfileId_fkey";

-- DropForeignKey
ALTER TABLE "provider_documents" DROP CONSTRAINT "provider_documents_userId_fkey";

-- DropForeignKey
ALTER TABLE "question_branching_rules" DROP CONSTRAINT "question_branching_rules_fromQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "question_branching_rules" DROP CONSTRAINT "question_branching_rules_toQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "session_analytics" DROP CONSTRAINT "session_analytics_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "session_exports" DROP CONSTRAINT "session_exports_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "session_template_library" DROP CONSTRAINT "session_template_library_templateId_fkey";

-- DropForeignKey
ALTER TABLE "session_transcripts" DROP CONSTRAINT "session_transcripts_monitoring_id_fkey";

-- DropForeignKey
ALTER TABLE "template_tags_on_templates" DROP CONSTRAINT "template_tags_on_templates_tagId_fkey";

-- DropForeignKey
ALTER TABLE "template_tags_on_templates" DROP CONSTRAINT "template_tags_on_templates_templateId_fkey";

-- DropForeignKey
ALTER TABLE "therapist_cbt_modules" DROP CONSTRAINT "therapist_cbt_modules_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "therapist_cbt_modules" DROP CONSTRAINT "therapist_cbt_modules_therapist_id_fkey";

-- DropForeignKey
ALTER TABLE "user_pets" DROP CONSTRAINT "user_pets_user_id_fkey";

-- DropIndex
DROP INDEX "users_isTherapistVerified_idx";

-- DropIndex
DROP INDEX "users_therapistVerifiedByUserId_idx";

-- AlterTable
ALTER TABLE "ai_daily_token_usage" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "care_team_assignments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "consents" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "financial_payments" ADD COLUMN     "paymentType" "FinancialPaymentType" NOT NULL DEFAULT 'PROVIDER_FEE';

-- AlterTable
ALTER TABLE "goals" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lab_orders" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patient_subscriptions" DROP COLUMN "billingCycle",
DROP COLUMN "planName",
DROP COLUMN "renewalDate",
ADD COLUMN     "expiryDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "plan" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "prescriptions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "provider_documents" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "revenue_ledger" ADD COLUMN     "paymentType" "FinancialPaymentType";

-- AlterTable
ALTER TABLE "tenant_policies" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "therapist_assessment_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "therapist_care_team_members" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "therapist_exercises" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "therapist_resources" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "therapist_session_notes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_capabilities" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_pets" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "cbt_questions";

-- DropTable
DROP TABLE "cbt_session_templates";

-- DropTable
DROP TABLE "cbt_session_versions";

-- DropTable
DROP TABLE "coaching_suggestions";

-- DropTable
DROP TABLE "crisis_alerts";

-- DropTable
DROP TABLE "empathy_snapshots";

-- DropTable
DROP TABLE "patient_responses";

-- DropTable
DROP TABLE "patient_session_responses";

-- DropTable
DROP TABLE "patient_sessions";

-- DropTable
DROP TABLE "question_branching_rules";

-- DropTable
DROP TABLE "session_analytics";

-- DropTable
DROP TABLE "session_exports";

-- DropTable
DROP TABLE "session_monitoring";

-- DropTable
DROP TABLE "session_template_library";

-- DropTable
DROP TABLE "session_transcripts";

-- DropTable
DROP TABLE "template_tags";

-- DropTable
DROP TABLE "template_tags_on_templates";

-- DropTable
DROP TABLE "therapist_cbt_modules";

-- DropEnum
DROP TYPE "BranchingConditionOperator";

-- DropEnum
DROP TYPE "PatientSessionStatus";

-- DropEnum
DROP TYPE "QuestionType";

-- CreateTable
CREATE TABLE "appointment_requests" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "availabilityPrefs" JSONB NOT NULL,
    "providers" JSONB NOT NULL DEFAULT '[]',
    "accepted_provider_id" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "duration_minutes" INTEGER NOT NULL DEFAULT 50,
    "preferred_specialization" TEXT,
    "payment_deadline_at" TIMESTAMP(3),
    "razorpay_order_id" TEXT,
    "razorpay_payment_id" TEXT,
    "amountMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_plans" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "therapistId" TEXT,
    "title" TEXT NOT NULL,
    "providerNote" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_plan_activities" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "frequency" "PlanActivityFrequency" NOT NULL DEFAULT 'ONE_TIME',
    "activityType" "PlanActivityType" NOT NULL,
    "referenceId" TEXT,
    "estimatedMinutes" INTEGER DEFAULT 5,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "dayNumber" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_plan_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addendums" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider_signature" TEXT,

    CONSTRAINT "addendums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_documents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "source" TEXT,
    "source_id" TEXT,
    "file_path" TEXT,
    "s3_object_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_conversations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "isSupport" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checkins" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "mood" INTEGER NOT NULL,
    "energy" INTEGER,
    "sleep" INTEGER,
    "context" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intention" TEXT,
    "reflectionGood" TEXT,
    "reflectionBad" TEXT,
    "stressLevel" INTEGER,
    "gratitude" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_requests_razorpay_order_id_key" ON "appointment_requests"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "appointment_requests_patientId_status_createdAt_idx" ON "appointment_requests"("patientId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "appointment_requests_status_expires_at_idx" ON "appointment_requests"("status", "expires_at");

-- CreateIndex
CREATE INDEX "appointment_requests_accepted_provider_id_idx" ON "appointment_requests"("accepted_provider_id");

-- CreateIndex
CREATE INDEX "therapy_plans_patientId_status_idx" ON "therapy_plans"("patientId", "status");

-- CreateIndex
CREATE INDEX "therapy_plan_activities_planId_idx" ON "therapy_plan_activities"("planId");

-- CreateIndex
CREATE INDEX "addendums_note_id_idx" ON "addendums"("note_id");

-- CreateIndex
CREATE INDEX "patient_documents_patient_id_idx" ON "patient_documents"("patient_id");

-- CreateIndex
CREATE INDEX "direct_conversations_patientId_lastMessageAt_idx" ON "direct_conversations"("patientId", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "direct_conversations_providerId_lastMessageAt_idx" ON "direct_conversations"("providerId", "lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "direct_conversations_patientId_providerId_key" ON "direct_conversations"("patientId", "providerId");

-- CreateIndex
CREATE INDEX "direct_messages_conversationId_createdAt_idx" ON "direct_messages"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "direct_messages_senderId_idx" ON "direct_messages"("senderId");

-- CreateIndex
CREATE INDEX "daily_checkins_patient_date_idx" ON "daily_checkins"("patient_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkins_patient_date_type_uq" ON "daily_checkins"("patient_id", "date", "type");

-- CreateIndex
CREATE INDEX "financial_payments_paymentType_status_idx" ON "financial_payments"("paymentType", "status");
