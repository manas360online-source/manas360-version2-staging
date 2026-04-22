-- Persist appointment-request to therapy-session linkage
ALTER TABLE "appointment_requests"
  ADD COLUMN IF NOT EXISTS "therapy_session_id" TEXT;

-- One confirmed smart-match request must map to at most one therapy session
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_requests_therapy_session_id_key"
  ON "appointment_requests"("therapy_session_id")
  WHERE "therapy_session_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "appointment_requests_therapy_session_id_idx"
  ON "appointment_requests"("therapy_session_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointment_requests_therapy_session_id_fkey'
  ) THEN
    ALTER TABLE "appointment_requests"
      ADD CONSTRAINT "appointment_requests_therapy_session_id_fkey"
      FOREIGN KEY ("therapy_session_id")
      REFERENCES "therapy_sessions"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- DB-level slot protection for active sessions
CREATE UNIQUE INDEX IF NOT EXISTS "therapy_sessions_provider_active_slot_uq"
  ON "therapy_sessions"("therapistProfileId", "dateTime")
  WHERE "status" IN ('PENDING', 'CONFIRMED');

CREATE UNIQUE INDEX IF NOT EXISTS "therapy_sessions_patient_active_slot_uq"
  ON "therapy_sessions"("patientProfileId", "dateTime")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
