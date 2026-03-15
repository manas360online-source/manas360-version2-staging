DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationType') THEN
    CREATE TYPE "RegistrationType" AS ENUM ('RCI', 'NMC', 'STATE_COUNCIL', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OnboardingStatus') THEN
    CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProviderDocumentType') THEN
    CREATE TYPE "ProviderDocumentType" AS ENUM ('DEGREE', 'ID_PROOF', 'LICENSE');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboardingStatus" "OnboardingStatus";

ALTER TABLE "therapist_profiles"
  ADD COLUMN IF NOT EXISTS "registrationType" "RegistrationType",
  ADD COLUMN IF NOT EXISTS "highestQual" TEXT,
  ADD COLUMN IF NOT EXISTS "yearsExperience" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hourlyRate" INTEGER DEFAULT 0;

UPDATE "therapist_profiles"
SET
  "highestQual" = COALESCE("highestQual", "education"),
  "yearsExperience" = COALESCE("yearsExperience", "yearsOfExperience", 0),
  "hourlyRate" = COALESCE("hourlyRate", "consultationFee", 0)
WHERE TRUE;

CREATE TABLE IF NOT EXISTS "provider_documents" (
  "id" TEXT PRIMARY KEY,
  "providerProfileId" TEXT NOT NULL REFERENCES "therapist_profiles"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "documentType" "ProviderDocumentType" NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_documents_providerProfileId_documentType_key"
  ON "provider_documents"("providerProfileId", "documentType");

CREATE INDEX IF NOT EXISTS "provider_documents_userId_documentType_idx"
  ON "provider_documents"("userId", "documentType");
