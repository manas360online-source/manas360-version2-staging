-- Step 2 safety tightening: scoped idempotency uniqueness and optimistic locking support.

-- Replace weaker idempotency index with endpoint+actor scoped key uniqueness.
DROP INDEX IF EXISTS "idempotency_keys_id_endpoint_key";
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_id_endpoint_actor_id_key"
ON "idempotency_keys" ("id", "endpoint", "actor_id");

-- Support version-based optimistic updates from application layer.
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_id_version_key"
ON "invoices" ("id", "version");
