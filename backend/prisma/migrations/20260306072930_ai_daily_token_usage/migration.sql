-- Persisted daily AI token usage for cross-instance budget enforcement

CREATE TABLE IF NOT EXISTS ai_daily_token_usage (
    id TEXT PRIMARY KEY,
    day_key TEXT NOT NULL UNIQUE,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_daily_token_usage_day_key_idx
    ON ai_daily_token_usage(day_key);
