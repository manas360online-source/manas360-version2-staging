# Session Analytics Test Strategy

## Scope

Validate analytics correctness for:
- completion rate
- average duration
- template usage counts
- edge scenarios (incomplete, abandoned, duplicate)

## Test Data Seeding Plan

Use deterministic fixture inserts into analytics schema dimensions/facts:
- `analytics.dim_date`
- `analytics.dim_organization`
- `analytics.dim_therapist`
- `analytics.dim_template`
- `analytics.fact_session`

Seed one organization and one therapist with these sessions in date range:
1. Completed session (duration 1200s)
2. Completed session (duration 1800s)
3. Abandoned session (`is_completed=false`, `duration_seconds=NULL`)
4. In-progress session (`is_completed=false`, `duration_seconds=NULL`)
5. Duplicate insert attempt (same `source_session_id`) should fail by unique constraint

Refresh rollups before template/utilization assertions:

```sql
SELECT analytics.refresh_admin_rollups();
```

## Core Test Cases

1. Completion Rate Accuracy
- Input: seeded 4 sessions, 2 completed
- Expected: completion rate = `2 / 4 = 0.5000`
- Validate service output vs manual SQL aggregate

2. Average Duration Correctness
- Input: completed durations [1200, 1800]
- Expected avg = `1500.00`
- Exclude incomplete/abandoned sessions from avg

3. Template Count Accuracy
- Input: all 4 sessions use same template
- Expected template usage count = 4 after rollup refresh

4. Incomplete Sessions Edge Case
- Input: in-progress row with null duration
- Expected: included in total sessions, excluded from completion and avg duration

5. Abandoned Sessions Edge Case
- Input: abandoned row with null duration
- Expected: included in total sessions, excluded from completion and avg duration

6. Duplicate Sessions Edge Case
- Input: attempt duplicate `source_session_id`
- Expected: insert rejected by unique constraint

## SQL-vs-Manual Comparison Pattern

For each KPI:
1. Execute service method (`adminAnalyticsService`) with same range and organization.
2. Run manual SQL query against `analytics.fact_session`.
3. Assert equality (or exact numeric cast) between service and SQL results.

## Jest Integration Example

See executable example at:
- `backend/tests/integration/session-analytics.integration.test.ts`

This test demonstrates:
- data seeding
- rollup refresh
- SQL-vs-service comparison
- edge case validation

## Data Validation Checklist

Before test run:
- [ ] analytics schema exists
- [ ] `analytics.refresh_admin_rollups()` function exists
- [ ] test user/org keys are unique

During test assertions:
- [ ] total sessions matches seeded count
- [ ] completed sessions count matches expected
- [ ] completion rate equals manual SQL result
- [ ] avg duration equals manual SQL result
- [ ] template usage equals expected count after refresh
- [ ] duplicate session insert fails
- [ ] abandoned and in-progress sessions do not inflate avg duration

After test run:
- [ ] seeded fact rows are deleted
- [ ] seeded dimension rows are deleted
- [ ] no pollution in shared analytics tables

## Execution

Run full integration suite:

```bash
npm test -- --runInBand --testPathPattern=integration
```

Run only analytics integration test:

```bash
npm test -- --runInBand tests/integration/session-analytics.integration.test.ts
```
