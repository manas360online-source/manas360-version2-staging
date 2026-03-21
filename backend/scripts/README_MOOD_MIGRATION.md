Migration scripts for consolidating mood data into `daily_checkins`

Files:
- `migrate_mood_to_daily_checkins.js` — idempotent migration script (Node + Prisma).
- `verify_mood_migration.js` — verification tool reporting counts & averages for a sample of patients.

Quick run (from repo root):
  node backend/scripts/migrate_mood_to_daily_checkins.js

To verify (sample 50 patients):
  node backend/scripts/verify_mood_migration.js --sample 50

Notes & safety:
- The migration inserts `daily_checkins` rows with `type = 'legacy_migrated'` and writes a marker
  like `[migrated:patientMoodEntry:<id>]` to `reflectionGood` so runs are idempotent.
- The script will skip creating a migrated row if a non-legacy `daily_checkins` already exists for the
  same patient & date to avoid overwriting genuine check-ins.
- Run in staging first. Keep DB backups and/or run within a transaction scope per-batch if your DB permits.
