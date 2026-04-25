ALTER TABLE "therapy_sessions"
ADD COLUMN IF NOT EXISTS "audio_recording_url" TEXT;
