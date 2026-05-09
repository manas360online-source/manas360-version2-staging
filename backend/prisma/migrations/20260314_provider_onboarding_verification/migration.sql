ALTER TABLE "therapist_profiles"
  ADD COLUMN IF NOT EXISTS "professionalType" TEXT,
  ADD COLUMN IF NOT EXISTS "registrationNum" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "education" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseRci" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseNmc" TEXT,
  ADD COLUMN IF NOT EXISTS "clinicalCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "corporateReady" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shiftPreferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "bankDetails" JSONB,
  ADD COLUMN IF NOT EXISTS "tagline" TEXT,
  ADD COLUMN IF NOT EXISTS "digitalSignature" TEXT,
  ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "therapist_profiles_registrationNum_key"
  ON "therapist_profiles"("registrationNum")
  WHERE "registrationNum" IS NOT NULL;

UPDATE "therapist_profiles"
SET "contactEmail" = u.email
FROM "users" u
WHERE u.id = "therapist_profiles"."userId"
  AND "therapist_profiles"."contactEmail" IS NULL;
