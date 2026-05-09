# Admin Analytics Schema Usage

This document describes how to apply and use the PostgreSQL admin analytics schema.

## File

- SQL DDL: [backend/prisma/analytics/admin_analytics_schema.sql](../prisma/analytics/admin_analytics_schema.sql)

## Scope

The analytics schema is for **platform admin aggregated insights** only:

- Total sessions conducted
- Average session completion time
- Session completion rate
- Most used CBT templates
- Patient engagement metrics (cohort-level)
- Therapist utilization rate
- Exportable analytics reports

It is designed to avoid raw patient response content and therapist encrypted notes.

## Apply

Run against PostgreSQL with a privileged role:

```bash
psql "$DATABASE_URL" -f backend/prisma/analytics/admin_analytics_schema.sql
```

## Aggregation Strategy

- Source facts:
  - `analytics.fact_session`
  - `analytics.fact_engagement_event`
  - `analytics.fact_therapist_capacity_daily`
- Rollups:
  - `analytics.mv_admin_weekly_kpi`
  - `analytics.mv_admin_monthly_kpi`
  - `analytics.mv_admin_template_usage`
  - `analytics.mv_admin_therapist_utilization`

Refresh all rollups:

```sql
SELECT analytics.refresh_admin_rollups();
```

## Time-Range Filtering

Use `date_key` and date dimension joins for efficient weekly/monthly slicing:

- Weekly: filter/group by `dim_date.week_start_date`
- Monthly: filter/group by `dim_date.month_start_date`

## Example Queries

### 1) Total sessions + completion rate (time range)

```sql
SELECT
  COUNT(*) AS total_sessions,
  SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) AS completed_sessions,
  SUM(CASE WHEN is_completed THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*),0) AS completion_rate
FROM analytics.fact_session fs
JOIN analytics.dim_date d ON d.date_key = fs.date_key
WHERE d.calendar_date BETWEEN DATE '2026-01-01' AND DATE '2026-01-31';
```

### 2) Most used CBT templates

```sql
SELECT
  t.template_name,
  u.sessions_count
FROM analytics.mv_admin_template_usage u
JOIN analytics.dim_template t ON t.template_key = u.template_key
ORDER BY u.sessions_count DESC
LIMIT 10;
```

### 3) Therapist utilization

```sql
SELECT
  d.calendar_date,
  th.therapist_id,
  u.utilization_rate,
  u.effective_utilization_rate
FROM analytics.mv_admin_therapist_utilization u
JOIN analytics.dim_date d ON d.calendar_date = u.calendar_date
JOIN analytics.dim_therapist th ON th.therapist_key = u.therapist_key
WHERE d.calendar_date BETWEEN DATE '2026-02-01' AND DATE '2026-02-28';
```

## Scalability Notes

- Use monthly table partitioning for large-volume `fact_session` and `fact_engagement_event`.
- Keep ETL append-only for facts.
- Refresh rollups on schedule (e.g., every 15 minutes) and full reconcile nightly.
- Add additional AI-safe features in `ai_features` and event `metadata` only when de-identified.

## Privacy Notes

- No raw patient responses in analytics facts.
- No encrypted therapist notes.
- Cohort-level patient analysis only (`dim_patient_cohort`).
- Database role `analytics_admin` is granted read-only access to analytics schema objects.

## Query Pack (Fast + Secure + Consistent)

- Query pack file: [backend/prisma/analytics/admin_analytics_query_pack.sql](../prisma/analytics/admin_analytics_query_pack.sql)
- Includes optimized SQL for:
  - total sessions (date range)
  - average completion time
  - completion rate
  - most used templates (keyset pagination)
  - patient engagement score
  - therapist utilization rate by week (keyset pagination)

### Execution Guidelines

- Use parameterized execution only (`$1`, `$2`, ...).
- Filter with `organization_key` + `date_key`/`week_start_date` first to maximize index use.
- Prefer keyset pagination for large result sets; avoid deep `OFFSET`.
- Keep materialized views fresh by invoking `analytics.refresh_admin_rollups()` in the rollup scheduler.
