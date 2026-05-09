-- Supabase/Postgres-compatible EAP agreements schema
-- Enables UUID generation for primary keys.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) corporate_agreements
CREATE TABLE IF NOT EXISTS "corporate_agreements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "agreement_code" TEXT NOT NULL UNIQUE,
    "company_key" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "base_amount_inr" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "selected_addons" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "selected_workshops" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "notes" TEXT,
    "sent_at" TIMESTAMPTZ,
    "client_reviewed_at" TIMESTAMPTZ,
    "signed_uploaded_at" TIMESTAMPTZ,
    "activated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "corporate_agreements_status_check"
      CHECK ("status" IN ('draft', 'sent', 'client_reviewing', 'signed_uploaded', 'active'))
);

-- 2) eap_addon_catalog
CREATE TABLE IF NOT EXISTS "eap_addon_catalog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "addon_code" TEXT NOT NULL UNIQUE,
    "addon_name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'per_employee_per_month',
    "price_inr" NUMERIC(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "eap_addon_catalog_price_check" CHECK ("price_inr" >= 0)
);

-- 3) eap_workshop_catalog
CREATE TABLE IF NOT EXISTS "eap_workshop_catalog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workshop_code" TEXT NOT NULL UNIQUE,
    "workshop_name" TEXT NOT NULL,
    "description" TEXT,
    "delivery_mode" TEXT NOT NULL DEFAULT 'hybrid',
    "duration_minutes" INTEGER NOT NULL,
    "base_price_inr" NUMERIC(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "eap_workshop_catalog_duration_check" CHECK ("duration_minutes" > 0),
    CONSTRAINT "eap_workshop_catalog_price_check" CHECK ("base_price_inr" >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_corporate_agreements_company_key" ON "corporate_agreements" ("company_key");
CREATE INDEX IF NOT EXISTS "idx_corporate_agreements_status" ON "corporate_agreements" ("status");
CREATE INDEX IF NOT EXISTS "idx_corporate_agreements_created_at" ON "corporate_agreements" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_corporate_agreements_company_status" ON "corporate_agreements" ("company_key", "status");

CREATE INDEX IF NOT EXISTS "idx_eap_addon_catalog_active_order" ON "eap_addon_catalog" ("is_active", "display_order");
CREATE INDEX IF NOT EXISTS "idx_eap_workshop_catalog_active_order" ON "eap_workshop_catalog" ("is_active", "display_order");

-- Seed addon catalog
INSERT INTO "eap_addon_catalog"
    ("addon_code", "addon_name", "description", "unit", "price_inr", "display_order", "metadata")
VALUES
    ('addon_1on1_extra', 'Extra 1:1 Counseling Sessions', 'Additional 1:1 therapy sessions beyond base package', 'per_session', 899.00, 1, '{"category":"clinical"}'::jsonb),
    ('addon_manager_training', 'Manager Mental Health Training', 'Training for managers to identify and support at-risk employees', 'per_workshop', 25000.00, 2, '{"category":"training"}'::jsonb),
    ('addon_crisis_hotline', '24x7 Crisis Hotline', 'Round-the-clock crisis response support', 'per_company_per_month', 45000.00, 3, '{"category":"support"}'::jsonb),
    ('addon_custom_content', 'Custom Wellness Content Pack', 'Localized and customized wellness content bundle', 'per_pack', 15000.00, 4, '{"category":"content"}'::jsonb)
ON CONFLICT ("addon_code") DO UPDATE
SET
    "addon_name" = EXCLUDED."addon_name",
    "description" = EXCLUDED."description",
    "unit" = EXCLUDED."unit",
    "price_inr" = EXCLUDED."price_inr",
    "display_order" = EXCLUDED."display_order",
    "metadata" = EXCLUDED."metadata",
    "updated_at" = NOW();

-- Seed workshop catalog
INSERT INTO "eap_workshop_catalog"
    ("workshop_code", "workshop_name", "description", "delivery_mode", "duration_minutes", "base_price_inr", "display_order", "metadata")
VALUES
    ('ws_stress_resilience', 'Stress & Resilience Workshop', 'Practical stress management and resilience building', 'hybrid', 120, 35000.00, 1, '{"audience":"all_employees"}'::jsonb),
    ('ws_burnout_prevention', 'Burnout Prevention for Teams', 'Early signs, prevention framework, and team interventions', 'online', 90, 30000.00, 2, '{"audience":"people_managers"}'::jsonb),
    ('ws_psychological_safety', 'Psychological Safety at Work', 'Build psychologically safe team culture and communication', 'onsite', 120, 42000.00, 3, '{"audience":"leadership"}'::jsonb),
    ('ws_mindfulness_focus', 'Mindfulness & Focus Lab', 'Attention training, focus routines, and guided practices', 'hybrid', 75, 22000.00, 4, '{"audience":"all_employees"}'::jsonb)
ON CONFLICT ("workshop_code") DO UPDATE
SET
    "workshop_name" = EXCLUDED."workshop_name",
    "description" = EXCLUDED."description",
    "delivery_mode" = EXCLUDED."delivery_mode",
    "duration_minutes" = EXCLUDED."duration_minutes",
    "base_price_inr" = EXCLUDED."base_price_inr",
    "display_order" = EXCLUDED."display_order",
    "metadata" = EXCLUDED."metadata",
    "updated_at" = NOW();
