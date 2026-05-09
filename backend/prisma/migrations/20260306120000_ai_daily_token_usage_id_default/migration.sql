-- Ensure DB-level id default exists for ai_daily_token_usage so raw inserts can omit id

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE ai_daily_token_usage
    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
