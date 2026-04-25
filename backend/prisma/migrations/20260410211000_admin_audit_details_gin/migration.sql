-- Audit JSON acceleration for high-volume governance queries.
-- Ops note: monitor GIN index bloat and schedule VACUUM ANALYZE audit_logs;
-- ensure autovacuum settings are tuned for high-churn audit workloads.
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin
ON audit_logs USING GIN (details);
