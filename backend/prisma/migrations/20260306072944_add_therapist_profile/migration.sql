-- DropForeignKey
ALTER TABLE IF EXISTS "chat_analyses" DROP CONSTRAINT IF EXISTS "chat_analyses_user_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "crisis_escalations" DROP CONSTRAINT IF EXISTS "crisis_escalations_user_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "gad7_assessments" DROP CONSTRAINT IF EXISTS "gad7_assessments_user_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "mood_logs" DROP CONSTRAINT IF EXISTS "mood_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "mood_predictions" DROP CONSTRAINT IF EXISTS "mood_predictions_user_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "phq9_assessments" DROP CONSTRAINT IF EXISTS "phq9_assessments_user_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "risk_scores" DROP CONSTRAINT IF EXISTS "risk_scores_user_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "mood_predictions_user_batch_idx";

-- AlterTable
ALTER TABLE IF EXISTS "ai_daily_token_usage" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "chat_analyses" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE IF EXISTS "crisis_escalations" ALTER COLUMN "ops_alerted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "patient_shown_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "therapist_alerted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "backup_alerted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "therapist_ack_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE IF EXISTS "gad7_assessments" ALTER COLUMN "assessed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE IF EXISTS "mood_logs" ALTER COLUMN "logged_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE IF EXISTS "mood_predictions" ALTER COLUMN "prediction_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "batch_date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE IF EXISTS "patient_exercises" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "patient_payment_methods" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "patient_progress" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "patient_subscriptions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "phq9_assessments" ALTER COLUMN "assessed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE IF EXISTS "risk_scores" ALTER COLUMN "evaluated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE IF EXISTS "therapist_assessment_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "therapist_care_team_members" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "therapist_cbt_modules" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "therapist_exercises" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "therapist_resources" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "therapist_session_notes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "therapist_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsOfExperience" INTEGER DEFAULT 0,
    "consultationFee" INTEGER DEFAULT 0,
    "availability" JSONB,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bot_type" TEXT NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapist_profiles_userId_key" ON "therapist_profiles"("userId");

-- CreateIndex
CREATE INDEX "therapist_profiles_userId_idx" ON "therapist_profiles"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_user_bot_ts_idx" ON "chat_messages"("user_id", "bot_type", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_user_ts_idx" ON "chat_messages"("user_id", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "therapist_profiles" ADD CONSTRAINT "therapist_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phq9_assessments" ADD CONSTRAINT "phq9_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gad7_assessments" ADD CONSTRAINT "gad7_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_escalations" ADD CONSTRAINT "crisis_escalations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_logs" ADD CONSTRAINT "mood_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_analyses" ADD CONSTRAINT "chat_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_predictions" ADD CONSTRAINT "mood_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
