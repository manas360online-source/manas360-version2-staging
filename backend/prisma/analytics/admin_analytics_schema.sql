-- MANAS360 Admin Analytics Schema (PostgreSQL)
-- Purpose: admin-only aggregated insights for therapy effectiveness, growth, and therapist performance.
-- Privacy: does NOT store raw patient responses or therapist encrypted notes.

BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

-- =============================
-- Dimensions (normalized)
-- =============================

CREATE TABLE IF NOT EXISTS analytics.dim_date (
  date_key            integer PRIMARY KEY, -- yyyymmdd
  calendar_date       date NOT NULL UNIQUE,
  day_of_week         smallint NOT NULL,
  week_of_year        smallint NOT NULL,
  month_of_year       smallint NOT NULL,
  quarter_of_year     smallint NOT NULL,
  year_num            integer NOT NULL,
  week_start_date     date NOT NULL,
  month_start_date    date NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_organization (
  organization_key    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id     text NOT NULL UNIQUE,
  organization_name   text,
  plan_tier           text,
  region              text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_therapist (
  therapist_key       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  therapist_id        text NOT NULL UNIQUE,
  specialization      text,
  region              text,
  license_type        text,
  onboarded_at        timestamptz,
  active_from         timestamptz,
  active_to           timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.dim_template (
  template_key        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id         text NOT NULL,
  template_version    integer NOT NULL,
  template_name       text NOT NULL,
  category            text,
  target_audience     text,
  estimated_duration_minutes integer,
  published_at        timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, template_version)
);

CREATE TABLE IF NOT EXISTS analytics.dim_patient_cohort (
  patient_cohort_key  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cohort_label        text NOT NULL UNIQUE,
  signup_month        date,
  age_band            text,
  region              text,
  acquisition_channel text,
  risk_band           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================
-- Facts
-- =============================

-- Session fact at one row per session (no raw response content)
CREATE TABLE IF NOT EXISTS analytics.fact_session (
  session_key         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_session_id   text NOT NULL UNIQUE,
  date_key            integer NOT NULL REFERENCES analytics.dim_date(date_key),
  organization_key    bigint REFERENCES analytics.dim_organization(organization_key),
  therapist_key       bigint NOT NULL REFERENCES analytics.dim_therapist(therapist_key),
  template_key        bigint NOT NULL REFERENCES analytics.dim_template(template_key),
  patient_cohort_key  bigint REFERENCES analytics.dim_patient_cohort(patient_cohort_key),
  started_at          timestamptz NOT NULL,
  ended_at            timestamptz,
  duration_seconds    integer,
  status              text NOT NULL,
  is_completed        boolean NOT NULL DEFAULT false,
  is_billable         boolean NOT NULL DEFAULT false,
  completion_ratio    numeric(5,4),
  ai_features         jsonb, -- optional safe aggregate features only
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('completed','abandoned','cancelled','paused','in_progress')),
  CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CHECK (completion_ratio IS NULL OR (completion_ratio >= 0 AND completion_ratio <= 1))
);

-- Engagement events at aggregate-safe grain (no PHI)
CREATE TABLE IF NOT EXISTS analytics.fact_engagement_event (
  event_key           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_event_id     text,
  source_session_id   text,
  date_key            integer NOT NULL REFERENCES analytics.dim_date(date_key),
  organization_key    bigint REFERENCES analytics.dim_organization(organization_key),
  therapist_key       bigint REFERENCES analytics.dim_therapist(therapist_key),
  template_key        bigint REFERENCES analytics.dim_template(template_key),
  patient_cohort_key  bigint REFERENCES analytics.dim_patient_cohort(patient_cohort_key),
  event_type          text NOT NULL,
  event_ts            timestamptz NOT NULL,
  event_count         integer NOT NULL DEFAULT 1,
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (event_count > 0),
  CHECK (event_type IN ('session_started','session_resumed','session_completed','session_abandoned','session_paused','dropoff','template_started')),
  UNIQUE(source_event_id)
);

-- Daily therapist capacity fact for utilization
CREATE TABLE IF NOT EXISTS analytics.fact_therapist_capacity_daily (
  capacity_key        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date_key            integer NOT NULL REFERENCES analytics.dim_date(date_key),
  therapist_key       bigint NOT NULL REFERENCES analytics.dim_therapist(therapist_key),
  organization_key    bigint REFERENCES analytics.dim_organization(organization_key),
  available_minutes   integer NOT NULL DEFAULT 0,
  booked_minutes      integer NOT NULL DEFAULT 0,
  completed_minutes   integer NOT NULL DEFAULT 0,
  unavailable_minutes integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (available_minutes >= 0),
  CHECK (booked_minutes >= 0),
  CHECK (completed_minutes >= 0),
  CHECK (unavailable_minutes >= 0),
  UNIQUE(date_key, therapist_key)
);

-- Export tracking for generated analytics reports
CREATE TABLE IF NOT EXISTS analytics.report_export_job (
  export_job_key      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requested_by_admin_id text NOT NULL,
  report_type         text NOT NULL,
  format              text NOT NULL,
  range_start         timestamptz NOT NULL,
  range_end           timestamptz NOT NULL,
  filter_payload      jsonb,
  status              text NOT NULL DEFAULT 'queued',
  output_uri          text,
  row_count           bigint,
  started_at          timestamptz,
  finished_at         timestamptz,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (format IN ('csv','xlsx','json','parquet')),
  CHECK (status IN ('queued','running','completed','failed','cancelled'))
);

-- =============================
-- Indexes (aggregation-first)
-- =============================

CREATE INDEX IF NOT EXISTS idx_fact_session_date_key
  ON analytics.fact_session(date_key);

CREATE INDEX IF NOT EXISTS idx_fact_session_started_at
  ON analytics.fact_session(started_at);

CREATE INDEX IF NOT EXISTS idx_fact_session_status_date
  ON analytics.fact_session(status, date_key);

CREATE INDEX IF NOT EXISTS idx_fact_session_template_date
  ON analytics.fact_session(template_key, date_key);

CREATE INDEX IF NOT EXISTS idx_fact_session_therapist_date
  ON analytics.fact_session(therapist_key, date_key);

CREATE INDEX IF NOT EXISTS idx_fact_session_org_date
  ON analytics.fact_session(organization_key, date_key);

CREATE INDEX IF NOT EXISTS idx_fact_session_org_date_template
  ON analytics.fact_session(organization_key, date_key, template_key);

CREATE INDEX IF NOT EXISTS idx_fact_session_org_date_therapist
  ON analytics.fact_session(organization_key, date_key, therapist_key);

CREATE INDEX IF NOT EXISTS idx_fact_session_org_date_completed_duration
  ON analytics.fact_session(organization_key, date_key)
  INCLUDE (duration_seconds)
  WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_fact_session_completed_partial
  ON analytics.fact_session(date_key, therapist_key, template_key)
  WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_fact_engagement_event_date_type
  ON analytics.fact_engagement_event(date_key, event_type);

CREATE INDEX IF NOT EXISTS idx_fact_engagement_event_session_ts
  ON analytics.fact_engagement_event(source_session_id, event_ts);

CREATE INDEX IF NOT EXISTS idx_fact_engagement_event_template_date
  ON analytics.fact_engagement_event(template_key, date_key);

CREATE INDEX IF NOT EXISTS idx_fact_capacity_therapist_date
  ON analytics.fact_therapist_capacity_daily(therapist_key, date_key);

CREATE INDEX IF NOT EXISTS idx_export_job_created_status
  ON analytics.report_export_job(created_at, status);

-- =============================
-- Materialized Views (weekly/monthly rollups)
-- =============================

DROP MATERIALIZED VIEW IF EXISTS analytics.mv_admin_weekly_kpi;
CREATE MATERIALIZED VIEW analytics.mv_admin_weekly_kpi AS
SELECT
  d.week_start_date,
  fs.organization_key,
  fs.therapist_key,
  fs.template_key,
  COUNT(*)::bigint AS total_sessions_conducted,
  AVG(CASE WHEN fs.is_completed THEN fs.duration_seconds END)::numeric(12,2) AS avg_session_completion_seconds,
  (SUM(CASE WHEN fs.is_completed THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0))::numeric(8,4) AS session_completion_rate,
  COUNT(DISTINCT fs.patient_cohort_key)::bigint AS engaged_patient_cohorts,
  SUM(CASE WHEN fs.is_completed THEN fs.duration_seconds ELSE 0 END)::bigint AS completed_duration_seconds
FROM analytics.fact_session fs
JOIN analytics.dim_date d ON d.date_key = fs.date_key
GROUP BY d.week_start_date, fs.organization_key, fs.therapist_key, fs.template_key;

DROP INDEX IF EXISTS analytics.uq_mv_admin_weekly_kpi;
CREATE UNIQUE INDEX uq_mv_admin_weekly_kpi
  ON analytics.mv_admin_weekly_kpi(week_start_date, organization_key, therapist_key, template_key);

CREATE INDEX IF NOT EXISTS idx_mv_admin_weekly_org_week_template
  ON analytics.mv_admin_weekly_kpi(organization_key, week_start_date, template_key)
  INCLUDE (total_sessions_conducted);

CREATE INDEX IF NOT EXISTS idx_mv_admin_weekly_org_week_therapist
  ON analytics.mv_admin_weekly_kpi(organization_key, week_start_date, therapist_key)
  INCLUDE (total_sessions_conducted);

DROP MATERIALIZED VIEW IF EXISTS analytics.mv_admin_monthly_kpi;
CREATE MATERIALIZED VIEW analytics.mv_admin_monthly_kpi AS
SELECT
  d.month_start_date,
  fs.organization_key,
  fs.therapist_key,
  fs.template_key,
  COUNT(*)::bigint AS total_sessions_conducted,
  AVG(CASE WHEN fs.is_completed THEN fs.duration_seconds END)::numeric(12,2) AS avg_session_completion_seconds,
  (SUM(CASE WHEN fs.is_completed THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0))::numeric(8,4) AS session_completion_rate,
  COUNT(DISTINCT fs.patient_cohort_key)::bigint AS engaged_patient_cohorts,
  SUM(CASE WHEN fs.is_completed THEN fs.duration_seconds ELSE 0 END)::bigint AS completed_duration_seconds
FROM analytics.fact_session fs
JOIN analytics.dim_date d ON d.date_key = fs.date_key
GROUP BY d.month_start_date, fs.organization_key, fs.therapist_key, fs.template_key;

DROP INDEX IF EXISTS analytics.uq_mv_admin_monthly_kpi;
CREATE UNIQUE INDEX uq_mv_admin_monthly_kpi
  ON analytics.mv_admin_monthly_kpi(month_start_date, organization_key, therapist_key, template_key);

-- Top templates helper view
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_admin_template_usage;
CREATE MATERIALIZED VIEW analytics.mv_admin_template_usage AS
SELECT
  fs.template_key,
  COUNT(*)::bigint AS sessions_count,
  SUM(CASE WHEN fs.is_completed THEN 1 ELSE 0 END)::bigint AS completed_sessions_count,
  AVG(CASE WHEN fs.is_completed THEN fs.duration_seconds END)::numeric(12,2) AS avg_completion_seconds
FROM analytics.fact_session fs
GROUP BY fs.template_key;

DROP INDEX IF EXISTS analytics.uq_mv_admin_template_usage;
CREATE UNIQUE INDEX uq_mv_admin_template_usage
  ON analytics.mv_admin_template_usage(template_key);

-- Therapist utilization helper view
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_admin_therapist_utilization;
CREATE MATERIALIZED VIEW analytics.mv_admin_therapist_utilization AS
SELECT
  d.calendar_date,
  c.organization_key,
  c.therapist_key,
  c.available_minutes,
  c.booked_minutes,
  c.completed_minutes,
  (c.booked_minutes::numeric / NULLIF(c.available_minutes, 0))::numeric(8,4) AS utilization_rate,
  (c.completed_minutes::numeric / NULLIF(c.available_minutes, 0))::numeric(8,4) AS effective_utilization_rate
FROM analytics.fact_therapist_capacity_daily c
JOIN analytics.dim_date d ON d.date_key = c.date_key;

DROP INDEX IF EXISTS analytics.uq_mv_admin_therapist_utilization;
CREATE UNIQUE INDEX uq_mv_admin_therapist_utilization
  ON analytics.mv_admin_therapist_utilization(calendar_date, organization_key, therapist_key);

-- =============================
-- Refresh procedure
-- =============================

CREATE OR REPLACE FUNCTION analytics.refresh_admin_rollups()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_admin_weekly_kpi;
  EXCEPTION WHEN others THEN
    REFRESH MATERIALIZED VIEW analytics.mv_admin_weekly_kpi;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_admin_monthly_kpi;
  EXCEPTION WHEN others THEN
    REFRESH MATERIALIZED VIEW analytics.mv_admin_monthly_kpi;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_admin_template_usage;
  EXCEPTION WHEN others THEN
    REFRESH MATERIALIZED VIEW analytics.mv_admin_template_usage;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_admin_therapist_utilization;
  EXCEPTION WHEN others THEN
    REFRESH MATERIALIZED VIEW analytics.mv_admin_therapist_utilization;
  END;
END;
$$;

-- =============================
-- Admin-only RBAC (database-level)
-- =============================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_admin') THEN
    CREATE ROLE analytics_admin NOINHERIT;
  END IF;
END;
$$;

REVOKE ALL ON SCHEMA analytics FROM PUBLIC;
GRANT USAGE ON SCHEMA analytics TO analytics_admin;

REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM PUBLIC;
DO $$
DECLARE
  mv record;
BEGIN
  FOR mv IN
    SELECT schemaname, matviewname
    FROM pg_matviews
    WHERE schemaname = 'analytics'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', mv.schemaname, mv.matviewname);
  END LOOP;
END;
$$;

GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO analytics_admin;
DO $$
DECLARE
  mv record;
BEGIN
  FOR mv IN
    SELECT schemaname, matviewname
    FROM pg_matviews
    WHERE schemaname = 'analytics'
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE %I.%I TO analytics_admin', mv.schemaname, mv.matviewname);
  END LOOP;
END;
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  GRANT SELECT ON TABLES TO analytics_admin;

COMMIT;
