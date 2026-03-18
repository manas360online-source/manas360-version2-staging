-- Clinical data integrity models for provider workflows
CREATE TABLE IF NOT EXISTS "prescriptions" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "drug_name" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "prescribed_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "refills_remaining" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "adherence_rate" INTEGER NOT NULL DEFAULT 0,
  "warnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prescriptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backward-compatible normalization for environments with a legacy prescriptions table.
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "provider_id" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "dosage" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "prescribed_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "refills_remaining" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "adherence_rate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "warnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'psychiatrist_id'
  ) THEN
    EXECUTE 'UPDATE "prescriptions" SET "provider_id" = "psychiatrist_id" WHERE "provider_id" IS NULL AND "psychiatrist_id" IS NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name IN ('starting_dose','target_dose','max_dose')
  ) THEN
    EXECUTE 'UPDATE "prescriptions" SET "dosage" = COALESCE("starting_dose", "target_dose", "max_dose", ''N/A'') WHERE "dosage" IS NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'prescriptions'
      AND constraint_name = 'prescriptions_provider_id_fkey'
  ) THEN
    ALTER TABLE "prescriptions"
    ADD CONSTRAINT "prescriptions_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "prescriptions_patient_id_status_idx" ON "prescriptions" ("patient_id", "status");
CREATE INDEX IF NOT EXISTS "prescriptions_provider_id_status_idx" ON "prescriptions" ("provider_id", "status");

CREATE TABLE IF NOT EXISTS "lab_orders" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "test_name" TEXT NOT NULL,
  "date_ordered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "ordering_physician" TEXT NOT NULL,
  "interpretation" TEXT NOT NULL,
  "biomarkers" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lab_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lab_orders_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lab_orders_patient_id_status_idx" ON "lab_orders" ("patient_id", "status");
CREATE INDEX IF NOT EXISTS "lab_orders_provider_id_status_idx" ON "lab_orders" ("provider_id", "status");

CREATE TABLE IF NOT EXISTS "goals" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "goals_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "goals_patient_id_status_idx" ON "goals" ("patient_id", "status");
CREATE INDEX IF NOT EXISTS "goals_provider_id_status_idx" ON "goals" ("provider_id", "status");