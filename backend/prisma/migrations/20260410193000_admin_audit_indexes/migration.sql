-- Audit query optimization for governance UI filters and timelines.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'audit_logs' AND column_name = 'created_at'
	) THEN
		EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created_at_desc ON audit_logs (resource, created_at DESC)';
	ELSIF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'audit_logs' AND column_name = 'createdAt'
	) THEN
		EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created_at_desc ON audit_logs ("resource", "createdAt" DESC)';
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'audit_logs' AND column_name = 'user_id'
	) AND EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'audit_logs' AND column_name = 'created_at'
	) THEN
		EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at_desc ON audit_logs (user_id, created_at DESC)';
	ELSIF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'audit_logs' AND column_name = 'userId'
	) AND EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'audit_logs' AND column_name = 'createdAt'
	) THEN
		EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at_desc ON audit_logs ("userId", "createdAt" DESC)';
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_policy_text
ON audit_logs ((details->>'policy'));
