-- Restore GPS Meter persistence tables used by backend/src/services/gps-meter.service.ts
-- Safe to run on environments where these tables are missing.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS session_monitoring (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL,
  therapist_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  latest_empathy_score integer,
  latest_depth_level text,
  latest_crisis_risk text,
  started_at timestamptz NOT NULL DEFAULT NOW(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_monitoring_session_status_idx
  ON session_monitoring (session_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS empathy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_id uuid NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT NOW(),
  empathy_score integer NOT NULL,
  therapist_tone numeric,
  patient_sentiment numeric,
  emotional_resonance numeric,
  depth_level text,
  crisis_risk text,
  traffic_light text,
  ai_suggestion text,
  reasoning text,
  CONSTRAINT empathy_snapshots_monitoring_id_fkey
    FOREIGN KEY (monitoring_id) REFERENCES session_monitoring(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS empathy_snapshots_monitoring_time_idx
  ON empathy_snapshots (monitoring_id, snapshot_at);

CREATE TABLE IF NOT EXISTS session_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_id uuid NOT NULL,
  speaker text NOT NULL,
  text text NOT NULL,
  spoken_at timestamptz NOT NULL DEFAULT NOW(),
  sentiment_score numeric,
  word_count integer NOT NULL DEFAULT 0,
  CONSTRAINT session_transcripts_monitoring_id_fkey
    FOREIGN KEY (monitoring_id) REFERENCES session_monitoring(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_transcripts_monitoring_time_idx
  ON session_transcripts (monitoring_id, spoken_at);

CREATE TABLE IF NOT EXISTS coaching_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_id uuid NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'info',
  trigger_reason text,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT coaching_suggestions_monitoring_id_fkey
    FOREIGN KEY (monitoring_id) REFERENCES session_monitoring(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS coaching_suggestions_monitoring_idx
  ON coaching_suggestions (monitoring_id, created_at);

CREATE TABLE IF NOT EXISTS crisis_alerts (
  id uuid PRIMARY KEY,
  monitoring_id uuid NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL,
  confidence numeric NOT NULL,
  message text,
  detected_at timestamptz NOT NULL DEFAULT NOW(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolution_note text,
  CONSTRAINT crisis_alerts_monitoring_id_fkey
    FOREIGN KEY (monitoring_id) REFERENCES session_monitoring(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS crisis_alerts_monitoring_idx
  ON crisis_alerts (monitoring_id, detected_at DESC);

CREATE TABLE IF NOT EXISTS session_analytics (
  id uuid PRIMARY KEY,
  monitoring_id uuid NOT NULL UNIQUE,
  avg_empathy_score integer,
  pct_time_green integer,
  pct_time_yellow integer,
  pct_time_red integer,
  therapist_talk_pct integer,
  patient_talk_pct integer,
  total_words integer,
  crisis_count integer,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT session_analytics_monitoring_id_fkey
    FOREIGN KEY (monitoring_id) REFERENCES session_monitoring(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_analytics_created_idx
  ON session_analytics (created_at DESC);
