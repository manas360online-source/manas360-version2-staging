-- Therapist professional modules persistence

CREATE TABLE IF NOT EXISTS therapist_session_notes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    therapist_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'Therapy Session',
    subjective TEXT NOT NULL DEFAULT '',
    objective TEXT NOT NULL DEFAULT '',
    assessment TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT '',
    phq9 INTEGER,
    gad7 INTEGER,
    assigned_exercise TEXT,
    next_session_date TIMESTAMP(3),
    status TEXT NOT NULL DEFAULT 'draft',
    history JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT therapist_session_notes_session_id_fkey FOREIGN KEY (session_id) REFERENCES therapy_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT therapist_session_notes_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT therapist_session_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS therapist_session_notes_therapist_id_updated_at_idx
    ON therapist_session_notes(therapist_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS therapist_session_notes_patient_id_updated_at_idx
    ON therapist_session_notes(patient_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS therapist_exercises (
    id TEXT PRIMARY KEY,
    therapist_id TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    worksheet_url TEXT,
    completion_rate INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT therapist_exercises_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT therapist_exercises_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS therapist_exercises_therapist_id_updated_at_idx
    ON therapist_exercises(therapist_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS therapist_exercises_patient_id_idx
    ON therapist_exercises(patient_id);

CREATE TABLE IF NOT EXISTS therapist_cbt_modules (
    id TEXT PRIMARY KEY,
    therapist_id TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    title TEXT NOT NULL,
    approach TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT therapist_cbt_modules_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT therapist_cbt_modules_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS therapist_cbt_modules_therapist_id_updated_at_idx
    ON therapist_cbt_modules(therapist_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS therapist_cbt_modules_patient_id_idx
    ON therapist_cbt_modules(patient_id);

CREATE TABLE IF NOT EXISTS therapist_assessment_records (
    id TEXT PRIMARY KEY,
    therapist_id TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT NOT NULL,
    type TEXT NOT NULL,
    score INTEGER NOT NULL,
    assessed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT therapist_assessment_records_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT therapist_assessment_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS therapist_assessment_records_therapist_id_assessed_at_idx
    ON therapist_assessment_records(therapist_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS therapist_assessment_records_patient_id_idx
    ON therapist_assessment_records(patient_id);

CREATE TABLE IF NOT EXISTS therapist_resources (
    id TEXT PRIMARY KEY,
    therapist_id TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT therapist_resources_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT therapist_resources_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS therapist_resources_therapist_id_updated_at_idx
    ON therapist_resources(therapist_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS therapist_resources_patient_id_idx
    ON therapist_resources(patient_id);

CREATE TABLE IF NOT EXISTS therapist_care_team_members (
    id TEXT PRIMARY KEY,
    therapist_id TEXT NOT NULL,
    patient_id TEXT,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    treatment TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    suggestions TEXT NOT NULL DEFAULT '',
    prescriptions TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT therapist_care_team_members_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT therapist_care_team_members_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS therapist_care_team_members_therapist_id_updated_at_idx
    ON therapist_care_team_members(therapist_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS therapist_care_team_members_patient_id_idx
    ON therapist_care_team_members(patient_id);
