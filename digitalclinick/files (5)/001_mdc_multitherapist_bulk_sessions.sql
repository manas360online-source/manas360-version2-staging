-- ═══════════════════════════════════════════════════════════════
-- MyDigitalClinic — Migration 001
-- Multi-Therapist Accounts + Bulk Import + Audio Sessions (Jitsi)
-- Run AFTER base mdc_clinics / mdc_patients / mdc_sessions exist
-- Database: PostgreSQL 14+
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. MULTI-THERAPIST: Extend mdc_clinics ────────────────────

ALTER TABLE mdc_clinics
  ADD COLUMN IF NOT EXISTS clinic_code VARCHAR(10) UNIQUE,
  ADD COLUMN IF NOT EXISTS max_therapists INTEGER DEFAULT 5;

-- Auto-generate clinic_code on insert if null
CREATE OR REPLACE FUNCTION generate_clinic_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(10);
  code_exists BOOLEAN;
BEGIN
  IF NEW.clinic_code IS NULL THEN
    LOOP
      new_code := 'MDC-' || upper(substr(md5(random()::text), 1, 4));
      SELECT EXISTS(SELECT 1 FROM mdc_clinics WHERE clinic_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.clinic_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinic_code ON mdc_clinics;
CREATE TRIGGER trg_clinic_code
  BEFORE INSERT ON mdc_clinics
  FOR EACH ROW EXECUTE FUNCTION generate_clinic_code();

-- Backfill existing clinics that have no code
UPDATE mdc_clinics
SET clinic_code = 'MDC-' || upper(substr(md5(id::text), 1, 4))
WHERE clinic_code IS NULL;


-- ─── 2. THERAPIST SLOTS TABLE ──────────────────────────────────
-- Each therapist in a clinic gets a suffixed login ID (MDC-7A3F-01)
-- Slot 1 is always the clinic admin/owner

CREATE TABLE IF NOT EXISTS mdc_therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES mdc_clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),           -- NULL until therapist accepts invite
  slot_number INTEGER NOT NULL,                 -- 1-5
  login_suffix VARCHAR(15) NOT NULL,            -- e.g., MDC-7A3F-01
  display_name VARCHAR(200) NOT NULL,
  role VARCHAR(20) DEFAULT 'therapist',         -- admin / therapist
  specialization VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, slot_number),
  UNIQUE(login_suffix),
  CONSTRAINT max_slot CHECK (slot_number >= 1 AND slot_number <= 5)
);

CREATE INDEX idx_mdc_therapists_clinic ON mdc_therapists(clinic_id);
CREATE INDEX idx_mdc_therapists_login ON mdc_therapists(login_suffix);
CREATE INDEX idx_mdc_therapists_user ON mdc_therapists(user_id) WHERE user_id IS NOT NULL;

-- Auto-generate login_suffix from clinic_code + slot_number
CREATE OR REPLACE FUNCTION generate_therapist_suffix()
RETURNS TRIGGER AS $$
DECLARE
  code VARCHAR(10);
BEGIN
  SELECT clinic_code INTO code FROM mdc_clinics WHERE id = NEW.clinic_id;
  NEW.login_suffix := code || '-' || lpad(NEW.slot_number::text, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_therapist_suffix ON mdc_therapists;
CREATE TRIGGER trg_therapist_suffix
  BEFORE INSERT ON mdc_therapists
  FOR EACH ROW EXECUTE FUNCTION generate_therapist_suffix();


-- ─── 3. BULK PATIENT IMPORT (enhanced) ─────────────────────────
-- mdc_patient_imports already exists from base schema
-- Add import_rows detail table for row-level tracking

CREATE TABLE IF NOT EXISTS mdc_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES mdc_patient_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,                      -- original CSV row as JSON
  patient_id UUID REFERENCES mdc_patients(id),  -- set after successful import
  status VARCHAR(20) DEFAULT 'pending',         -- pending / imported / skipped / error
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mdc_import_rows_import ON mdc_import_rows(import_id);
CREATE INDEX idx_mdc_import_rows_status ON mdc_import_rows(import_id, status);


-- ─── 4. JITSI SESSION ROOMS ────────────────────────────────────
-- Track Jitsi room metadata per session

CREATE TABLE IF NOT EXISTS mdc_session_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mdc_sessions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES mdc_clinics(id),
  room_id VARCHAR(100) NOT NULL UNIQUE,         -- jitsi room name (mdc-7a3f-xxx)
  mode VARCHAR(10) DEFAULT 'audio',             -- audio / video
  jitsi_url TEXT NOT NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mdc_rooms_session ON mdc_session_rooms(session_id);
CREATE INDEX idx_mdc_rooms_clinic ON mdc_session_rooms(clinic_id);

-- Add session_type 'audio' to mdc_sessions if not already present
-- (existing values: in_person / audio / follow_up — audio already covered)
-- Add jitsi_room_id reference
ALTER TABLE mdc_sessions
  ADD COLUMN IF NOT EXISTS jitsi_room_id UUID REFERENCES mdc_session_rooms(id);

COMMIT;
