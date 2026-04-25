-- Long-term schema alignment: users.permissions is used by code/seed and must exist in migration history.
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "permissions" JSONB DEFAULT '{}'::jsonb;
