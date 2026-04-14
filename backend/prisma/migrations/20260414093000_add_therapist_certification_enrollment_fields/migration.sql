DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificationStatus') THEN
    CREATE TYPE "CertificationStatus" AS ENUM ('NONE', 'ENROLLED', 'COMPLETED', 'VERIFIED');
  END IF;
END $$;

ALTER TABLE "therapist_profiles"
  ADD COLUMN IF NOT EXISTS "certificationStatus" "CertificationStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "certificationCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "certificationPaymentId" TEXT,
  ADD COLUMN IF NOT EXISTS "leadBoostScore" INTEGER NOT NULL DEFAULT 0;
