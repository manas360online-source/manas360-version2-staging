-- Add NRI pool fields to therapist_profiles
ALTER TABLE "therapist_profiles"
  ADD COLUMN IF NOT EXISTS "nri_pool_certified" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "nri_pool_certified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nri_timezone_shifts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add optional source funnel tag to therapy_sessions for analytics
ALTER TABLE "therapy_sessions"
  ADD COLUMN IF NOT EXISTS "source_funnel" VARCHAR(30);

-- Add optional source funnel tag to smart-match appointment requests
ALTER TABLE "appointment_requests"
  ADD COLUMN IF NOT EXISTS "source_funnel" VARCHAR(30);

-- Add optional source funnel tag to session booking intents
ALTER TABLE "session_booking_intents"
  ADD COLUMN IF NOT EXISTS "source_funnel" VARCHAR(30);

-- Indexes for NRI eligibility filtering and funnel reporting
CREATE INDEX IF NOT EXISTS "therapist_profiles_nri_pool_certified_idx" ON "therapist_profiles"("nri_pool_certified");
CREATE INDEX IF NOT EXISTS "therapy_sessions_source_funnel_idx" ON "therapy_sessions"("source_funnel");
CREATE INDEX IF NOT EXISTS "appointment_requests_source_funnel_idx" ON "appointment_requests"("source_funnel");
CREATE INDEX IF NOT EXISTS "session_booking_intents_source_funnel_idx" ON "session_booking_intents"("source_funnel");
