-- Admin analytics query pack (fast + secure + consistent)
-- Notes:
-- 1) Always use parameterized execution from app layer.
-- 2) Prefer date_key integer bounds (YYYYMMDD) for fact_session scans.
-- 3) Use keyset pagination for large result sets; avoid OFFSET for deep pages.

-- =========================================================
-- 1) Total sessions conducted (date range filter)
-- params: $1 = start_date_key int, $2 = end_date_key int, $3 = organization_key bigint
-- =========================================================
SELECT COUNT(*)::bigint AS total_sessions
FROM analytics.fact_session fs
WHERE fs.organization_key = $3
  AND fs.date_key BETWEEN $1 AND $2;


-- =========================================================
-- 2) Average completion time
-- params: $1 = start_date_key int, $2 = end_date_key int, $3 = organization_key bigint
-- =========================================================
SELECT AVG(fs.duration_seconds)::numeric(12,2) AS avg_completion_seconds
FROM analytics.fact_session fs
WHERE fs.organization_key = $3
  AND fs.date_key BETWEEN $1 AND $2
  AND fs.is_completed = true
  AND fs.duration_seconds IS NOT NULL;


-- =========================================================
-- 3) Completion rate (completed vs started)
-- params: $1 = start_date_key int, $2 = end_date_key int, $3 = organization_key bigint
-- =========================================================
SELECT
  started_sessions,
  completed_sessions,
  (completed_sessions::numeric / NULLIF(started_sessions, 0))::numeric(8,4) AS completion_rate
FROM (
  SELECT
    COUNT(*)::bigint AS started_sessions,
    COUNT(*) FILTER (WHERE fs.is_completed)::bigint AS completed_sessions
  FROM analytics.fact_session fs
  WHERE fs.organization_key = $3
    AND fs.date_key BETWEEN $1 AND $2
) x;


-- =========================================================
-- 4) Most used templates (first page)
-- params: $1 = start_week_date date, $2 = end_week_date date, $3 = organization_key bigint, $4 = page_size int
-- =========================================================
WITH agg AS (
  SELECT
    w.template_key,
    SUM(w.total_sessions_conducted)::bigint AS sessions_count
  FROM analytics.mv_admin_weekly_kpi w
  WHERE w.organization_key = $3
    AND w.week_start_date >= $1
    AND w.week_start_date <  $2
  GROUP BY w.template_key
)
SELECT
  a.template_key,
  t.template_id,
  t.template_version,
  t.template_name,
  a.sessions_count
FROM agg a
JOIN analytics.dim_template t ON t.template_key = a.template_key
ORDER BY a.sessions_count DESC, a.template_key ASC
LIMIT $4;

-- 4b) Most used templates (next page via keyset)
-- params: $1 = start_week_date date, $2 = end_week_date date, $3 = organization_key bigint, $4 = page_size int,
--         $5 = last_sessions_count bigint, $6 = last_template_key bigint
WITH agg AS (
  SELECT
    w.template_key,
    SUM(w.total_sessions_conducted)::bigint AS sessions_count
  FROM analytics.mv_admin_weekly_kpi w
  WHERE w.organization_key = $3
    AND w.week_start_date >= $1
    AND w.week_start_date <  $2
  GROUP BY w.template_key
)
SELECT
  a.template_key,
  t.template_id,
  t.template_version,
  t.template_name,
  a.sessions_count
FROM agg a
JOIN analytics.dim_template t ON t.template_key = a.template_key
WHERE (a.sessions_count < $5)
   OR (a.sessions_count = $5 AND a.template_key > $6)
ORDER BY a.sessions_count DESC, a.template_key ASC
LIMIT $4;


-- =========================================================
-- 5) Patient engagement score (avg answers per session)
-- params: $1 = start_ts timestamptz, $2 = end_ts timestamptz, $3 = therapist_id text (nullable)
-- =========================================================
SELECT AVG(m.answered_count)::numeric(10,2) AS engagement_score
FROM analytics_session_metrics m
WHERE m.completed_at >= $1
  AND m.completed_at <  $2
  AND ($3 IS NULL OR m.therapist_id = $3);


-- =========================================================
-- 6) Therapist utilization rate (sessions/week per therapist)
-- first page params: $1 = start_week_date date, $2 = end_week_date date, $3 = organization_key bigint, $4 = page_size int
-- =========================================================
WITH weekly AS (
  SELECT
    w.week_start_date,
    w.therapist_key,
    SUM(w.total_sessions_conducted)::bigint AS sessions_per_week
  FROM analytics.mv_admin_weekly_kpi w
  WHERE w.organization_key = $3
    AND w.week_start_date >= $1
    AND w.week_start_date <  $2
  GROUP BY w.week_start_date, w.therapist_key
)
SELECT
  week_start_date,
  therapist_key,
  sessions_per_week
FROM weekly
ORDER BY week_start_date DESC, therapist_key ASC
LIMIT $4;

-- 6b) next page via keyset
-- params add: $5 = last_week_start_date date, $6 = last_therapist_key bigint
WITH weekly AS (
  SELECT
    w.week_start_date,
    w.therapist_key,
    SUM(w.total_sessions_conducted)::bigint AS sessions_per_week
  FROM analytics.mv_admin_weekly_kpi w
  WHERE w.organization_key = $3
    AND w.week_start_date >= $1
    AND w.week_start_date <  $2
  GROUP BY w.week_start_date, w.therapist_key
)
SELECT
  week_start_date,
  therapist_key,
  sessions_per_week
FROM weekly
WHERE (week_start_date < $5)
   OR (week_start_date = $5 AND therapist_key > $6)
ORDER BY week_start_date DESC, therapist_key ASC
LIMIT $4;
