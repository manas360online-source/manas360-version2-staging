-- Ensure enum types required by the free-screening provider flow exist.
DO $$ BEGIN
    CREATE TYPE "ScreeningTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScreeningAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProviderExtraQuestionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "screening_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 3,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "randomizeOrder" BOOLEAN NOT NULL DEFAULT true,
    "status" "ScreeningTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "screening_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_templates_key_key" ON "screening_templates"("key");
CREATE INDEX IF NOT EXISTS "screening_templates_key_status_idx" ON "screening_templates"("key", "status");

CREATE TABLE IF NOT EXISTS "screening_questions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL DEFAULT 'general',
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "screening_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_questions_templateId_orderIndex_key" ON "screening_questions"("templateId", "orderIndex");
CREATE INDEX IF NOT EXISTS "screening_questions_templateId_isActive_idx" ON "screening_questions"("templateId", "isActive");

CREATE TABLE IF NOT EXISTS "screening_question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "screening_question_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_question_options_questionId_optionIndex_key" ON "screening_question_options"("questionId", "optionIndex");
CREATE INDEX IF NOT EXISTS "screening_question_options_questionId_idx" ON "screening_question_options"("questionId");

CREATE TABLE IF NOT EXISTS "screening_scoring_bands" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "interpretation" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "screening_scoring_bands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_scoring_bands_templateId_orderIndex_key" ON "screening_scoring_bands"("templateId", "orderIndex");
CREATE INDEX IF NOT EXISTS "screening_scoring_bands_templateId_minScore_maxScore_idx" ON "screening_scoring_bands"("templateId", "minScore", "maxScore");

CREATE TABLE IF NOT EXISTS "screening_attempts" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "patientId" TEXT,
    "accessTokenHash" TEXT,
    "status" "ScreeningAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "attemptSeed" INTEGER NOT NULL,
    "presentedOrder" JSONB NOT NULL,
    "totalScore" INTEGER,
    "severityLevel" TEXT,
    "interpretation" TEXT,
    "recommendation" TEXT,
    "actionLabel" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "screening_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "screening_attempts_templateId_status_idx" ON "screening_attempts"("templateId", "status");
CREATE INDEX IF NOT EXISTS "screening_attempts_patientId_createdAt_idx" ON "screening_attempts"("patientId", "createdAt");

CREATE TABLE IF NOT EXISTS "screening_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screening_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_answers_attemptId_questionId_key" ON "screening_answers"("attemptId", "questionId");
CREATE INDEX IF NOT EXISTS "screening_answers_attemptId_idx" ON "screening_answers"("attemptId");
CREATE INDEX IF NOT EXISTS "screening_answers_questionId_idx" ON "screening_answers"("questionId");

CREATE TABLE IF NOT EXISTS "provider_extra_questions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "templateQuestionId" TEXT,
    "prompt" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL DEFAULT 'provider-extra',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProviderExtraQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_extra_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "provider_extra_questions_providerId_status_idx" ON "provider_extra_questions"("providerId", "status");

CREATE TABLE IF NOT EXISTS "provider_extra_question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "templateOptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_extra_question_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_extra_question_options_questionId_optionIndex_key" ON "provider_extra_question_options"("questionId", "optionIndex");
CREATE INDEX IF NOT EXISTS "provider_extra_question_options_questionId_idx" ON "provider_extra_question_options"("questionId");

CREATE TABLE IF NOT EXISTS "provider_question_assignments" (
    "id" TEXT NOT NULL,
    "providerQuestionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "attemptId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "selectedOptionId" TEXT,
    "patientNotes" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_question_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "provider_question_assignments_patientId_isActive_idx" ON "provider_question_assignments"("patientId", "isActive");
CREATE INDEX IF NOT EXISTS "provider_question_assignments_providerQuestionId_idx" ON "provider_question_assignments"("providerQuestionId");
CREATE INDEX IF NOT EXISTS "provider_question_assignments_attemptId_idx" ON "provider_question_assignments"("attemptId");

DO $$ BEGIN
    ALTER TABLE "screening_questions"
        ADD CONSTRAINT "screening_questions_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "screening_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "screening_question_options"
        ADD CONSTRAINT "screening_question_options_questionId_fkey"
        FOREIGN KEY ("questionId") REFERENCES "screening_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "screening_scoring_bands"
        ADD CONSTRAINT "screening_scoring_bands_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "screening_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "screening_attempts"
        ADD CONSTRAINT "screening_attempts_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "screening_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "screening_attempts"
        ADD CONSTRAINT "screening_attempts_patientId_fkey"
        FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "screening_answers"
        ADD CONSTRAINT "screening_answers_attemptId_fkey"
        FOREIGN KEY ("attemptId") REFERENCES "screening_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "screening_answers"
        ADD CONSTRAINT "screening_answers_questionId_fkey"
        FOREIGN KEY ("questionId") REFERENCES "screening_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "screening_answers"
        ADD CONSTRAINT "screening_answers_optionId_fkey"
        FOREIGN KEY ("optionId") REFERENCES "screening_question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_extra_questions"
        ADD CONSTRAINT "provider_extra_questions_providerId_fkey"
        FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_extra_questions"
        ADD CONSTRAINT "provider_extra_questions_templateQuestionId_fkey"
        FOREIGN KEY ("templateQuestionId") REFERENCES "screening_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_extra_question_options"
        ADD CONSTRAINT "provider_extra_question_options_questionId_fkey"
        FOREIGN KEY ("questionId") REFERENCES "provider_extra_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_extra_question_options"
        ADD CONSTRAINT "provider_extra_question_options_templateOptionId_fkey"
        FOREIGN KEY ("templateOptionId") REFERENCES "screening_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_question_assignments"
        ADD CONSTRAINT "provider_question_assignments_providerQuestionId_fkey"
        FOREIGN KEY ("providerQuestionId") REFERENCES "provider_extra_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_question_assignments"
        ADD CONSTRAINT "provider_question_assignments_patientId_fkey"
        FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_question_assignments"
        ADD CONSTRAINT "provider_question_assignments_attemptId_fkey"
        FOREIGN KEY ("attemptId") REFERENCES "screening_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "provider_question_assignments"
        ADD CONSTRAINT "provider_question_assignments_selectedOptionId_fkey"
        FOREIGN KEY ("selectedOptionId") REFERENCES "provider_extra_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
