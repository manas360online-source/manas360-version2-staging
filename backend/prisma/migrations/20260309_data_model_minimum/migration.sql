-- Minimum enterprise data model additions for MANAS360
-- Adds required user fields and must-have governance/compliance tables.

-- Extend existing role enum safely.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'PSYCHOLOGIST'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'PSYCHOLOGIST';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'SUPER_ADMIN'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED', 'DELETED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProviderType') THEN
    CREATE TYPE "ProviderType" AS ENUM ('THERAPIST', 'PSYCHOLOGIST', 'COACH', 'PSYCHIATRIST');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "provider_type" "ProviderType",
  ADD COLUMN IF NOT EXISTS "company_id" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS "users_provider_type_idx" ON "users"("provider_type");
CREATE INDEX IF NOT EXISTS "users_company_id_idx" ON "users"("company_id");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");
CREATE INDEX IF NOT EXISTS "users_company_id_status_idx" ON "users"("company_id", "status");

CREATE TABLE IF NOT EXISTS "user_capabilities" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'effective',
  "isEffective" BOOLEAN NOT NULL DEFAULT true,
  "grantedById" TEXT,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_capabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_capabilities_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "user_capabilities_userId_capability_key" UNIQUE ("userId", "capability")
);

CREATE INDEX IF NOT EXISTS "user_capabilities_capability_isEffective_idx" ON "user_capabilities"("capability", "isEffective");
CREATE INDEX IF NOT EXISTS "user_capabilities_computedAt_idx" ON "user_capabilities"("computedAt");

CREATE TABLE IF NOT EXISTS "care_team_assignments" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "assignedById" TEXT,
  "accessScope" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "care_team_assignments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "care_team_assignments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "care_team_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "care_team_assignments_patientId_providerId_key" UNIQUE ("patientId", "providerId")
);

CREATE INDEX IF NOT EXISTS "care_team_assignments_providerId_status_idx" ON "care_team_assignments"("providerId", "status");
CREATE INDEX IF NOT EXISTS "care_team_assignments_assignedAt_idx" ON "care_team_assignments"("assignedAt");

CREATE TABLE IF NOT EXISTS "consents" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "consentType" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "artifactRef" TEXT,
  "status" TEXT NOT NULL DEFAULT 'GRANTED',
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "consents_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "consents_userId_consentType_status_idx" ON "consents"("userId", "consentType", "status");
CREATE INDEX IF NOT EXISTS "consents_grantedAt_idx" ON "consents"("grantedAt");

CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT,
  "actorRole" TEXT,
  "tenantId" TEXT,
  "scope" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "traceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "audit_events_tenantId_scope_createdAt_idx" ON "audit_events"("tenantId", "scope", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_events_actorId_createdAt_idx" ON "audit_events"("actorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_events_traceId_idx" ON "audit_events"("traceId");

CREATE TABLE IF NOT EXISTS "tenant_policies" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE,
  "privacyPolicy" JSONB NOT NULL,
  "featureFlags" JSONB NOT NULL,
  "policyVersion" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_policies_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "tenant_policies_effectiveFrom_idx" ON "tenant_policies"("effectiveFrom");
