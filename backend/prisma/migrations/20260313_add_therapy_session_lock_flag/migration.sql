-- Lock provider-scheduled sessions so patients cannot request time changes
ALTER TABLE "therapy_sessions"
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT true;
