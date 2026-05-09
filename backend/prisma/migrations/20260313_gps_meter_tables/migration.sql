-- ============================================================
-- Migration: GPS Meter / Therapeutic GPS tables
-- Story 7.8 + 9.11 – Real-time empathy analytics
-- ============================================================

-- 1. session_monitoring
-- Tracks the overall GPS state for each therapy session
CREATE TABLE IF NOT EXISTS session_monitoring (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL,           -- FK to sessions table
    therapist_id            UUID NOT NULL,
    patient_id              UUID NOT NULL,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at                TIMESTAMPTZ,
    status                  TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'ended', 'error')),
    latest_empathy_score    INT DEFAULT 50
                                CHECK (latest_empathy_score BETWEEN 0 AND 100),
    latest_depth_level      TEXT DEFAULT 'L1'
                                CHECK (latest_depth_level IN ('L1','L2','L3','L4','L5')),
    latest_crisis_risk      TEXT DEFAULT 'low'
                                CHECK (latest_crisis_risk IN ('low','medium','high')),
    transcript_complete     BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_monitoring_session_id
    ON session_monitoring (session_id);
CREATE INDEX IF NOT EXISTS idx_session_monitoring_therapist_id
    ON session_monitoring (therapist_id);

-- 2. empathy_snapshots
-- One row per 30-second GPS broadcast
CREATE TABLE IF NOT EXISTS empathy_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_id       UUID NOT NULL REFERENCES session_monitoring(id) ON DELETE CASCADE,
    snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    empathy_score       INT NOT NULL CHECK (empathy_score BETWEEN 0 AND 100),
    therapist_tone      INT CHECK (therapist_tone BETWEEN 0 AND 100),
    patient_sentiment   INT CHECK (patient_sentiment BETWEEN 0 AND 100),
    emotional_resonance INT CHECK (emotional_resonance BETWEEN 0 AND 100),
    depth_level         TEXT NOT NULL DEFAULT 'L1',
    crisis_risk         TEXT NOT NULL DEFAULT 'low',
    traffic_light       TEXT NOT NULL DEFAULT 'green'
                            CHECK (traffic_light IN ('green','yellow','red')),
    ai_suggestion       TEXT,
    reasoning           TEXT
);

CREATE INDEX IF NOT EXISTS idx_empathy_snapshots_monitoring_id
    ON empathy_snapshots (monitoring_id);

-- 3. session_transcripts
-- Individual transcript segments (speaker-labelled)
CREATE TABLE IF NOT EXISTS session_transcripts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_id   UUID NOT NULL REFERENCES session_monitoring(id) ON DELETE CASCADE,
    speaker         TEXT NOT NULL CHECK (speaker IN ('therapist','patient')),
    text            TEXT NOT NULL,
    spoken_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sentiment_score NUMERIC(5,3),   -- -1.0 to 1.0
    word_count      INT
);

CREATE INDEX IF NOT EXISTS idx_session_transcripts_monitoring_id
    ON session_transcripts (monitoring_id);
CREATE INDEX IF NOT EXISTS idx_session_transcripts_spoken_at
    ON session_transcripts (spoken_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_session_transcripts_fts
    ON session_transcripts USING gin(to_tsvector('english', text));

-- 4. coaching_suggestions
-- AI-generated coaching suggestions sent to therapist
CREATE TABLE IF NOT EXISTS coaching_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_id   UUID NOT NULL REFERENCES session_monitoring(id) ON DELETE CASCADE,
    suggested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    priority        TEXT NOT NULL DEFAULT 'info'
                        CHECK (priority IN ('info','warning','critical')),
    message         TEXT NOT NULL,
    trigger_reason  TEXT,
    acknowledged    BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    followed        BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_coaching_suggestions_monitoring_id
    ON coaching_suggestions (monitoring_id);

-- 5. crisis_alerts
-- Crisis events detected during session
CREATE TABLE IF NOT EXISTS crisis_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_id   UUID NOT NULL REFERENCES session_monitoring(id) ON DELETE CASCADE,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    keywords        TEXT[] NOT NULL DEFAULT '{}',
    severity        TEXT NOT NULL DEFAULT 'medium'
                        CHECK (severity IN ('low','medium','high')),
    confidence      NUMERIC(4,3),
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_monitoring_id
    ON crisis_alerts (monitoring_id);

-- 6. session_analytics
-- Post-session aggregate scorecard
CREATE TABLE IF NOT EXISTS session_analytics (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_id           UUID NOT NULL UNIQUE REFERENCES session_monitoring(id) ON DELETE CASCADE,
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    avg_empathy_score       NUMERIC(5,2),
    pct_time_green          NUMERIC(5,2),
    pct_time_yellow         NUMERIC(5,2),
    pct_time_red            NUMERIC(5,2),
    therapist_talk_pct      NUMERIC(5,2),
    patient_talk_pct        NUMERIC(5,2),
    total_words             INT,
    validation_phrase_count INT DEFAULT 0,
    reflection_count        INT DEFAULT 0,
    open_question_count     INT DEFAULT 0,
    crisis_count            INT DEFAULT 0,
    ai_summary              TEXT,
    strengths               TEXT[],
    improvements            TEXT[],
    coaching_recommendations TEXT[]
);

-- Helper: auto-update updated_at on session_monitoring
CREATE OR REPLACE FUNCTION update_session_monitoring_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_monitoring_updated_at ON session_monitoring;
CREATE TRIGGER trg_session_monitoring_updated_at
    BEFORE UPDATE ON session_monitoring
    FOR EACH ROW EXECUTE FUNCTION update_session_monitoring_timestamp();
