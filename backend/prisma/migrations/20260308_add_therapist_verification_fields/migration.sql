-- Add therapist verification fields to users for admin verification workflow
ALTER TABLE IF EXISTS "users"
  ADD COLUMN IF NOT EXISTS "isTherapistVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "therapistVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "therapistVerifiedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "users_isTherapistVerified_idx" ON "users"("isTherapistVerified");
CREATE INDEX IF NOT EXISTS "users_therapistVerifiedByUserId_idx" ON "users"("therapistVerifiedByUserId");
