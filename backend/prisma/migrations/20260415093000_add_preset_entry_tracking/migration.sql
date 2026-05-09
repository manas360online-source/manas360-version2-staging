-- Add preset entry tracking fields to patient_assessments table
ALTER TABLE "patient_assessments" ADD COLUMN IF NOT EXISTS "entryType" VARCHAR(50);
ALTER TABLE "patient_assessments" ADD COLUMN IF NOT EXISTS "sourceMetadata" TEXT;
ALTER TABLE "patient_assessments" ADD COLUMN IF NOT EXISTS "utmCampaign" VARCHAR(255);
ALTER TABLE "patient_assessments" ADD COLUMN IF NOT EXISTS "utmMedium" VARCHAR(255);
ALTER TABLE "patient_assessments" ADD COLUMN IF NOT EXISTS "utmSource" VARCHAR(255);

-- Create indexes for preset entry tracking
CREATE INDEX IF NOT EXISTS "patient_assessments_entryType_createdAt_idx"
	ON "patient_assessments"("entryType", "createdAt" DESC);
