-- Post-recovery cleanup for prescriptions schema consistency.
-- This aligns legacy table shape with Prisma expectations and hardens constraints.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prescriptions'
      AND column_name = 'psychiatrist_id'
  ) THEN
    EXECUTE '
      UPDATE "prescriptions"
      SET "provider_id" = "psychiatrist_id"
      WHERE "provider_id" IS NULL AND "psychiatrist_id" IS NOT NULL
    ';
  END IF;
END $$;

DO $$
DECLARE
  has_starting_dose BOOLEAN;
  has_target_dose BOOLEAN;
  has_max_dose BOOLEAN;
  dosage_expr TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'starting_dose'
  ) INTO has_starting_dose;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'target_dose'
  ) INTO has_target_dose;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'max_dose'
  ) INTO has_max_dose;

  dosage_expr := '';

  IF has_starting_dose THEN
    dosage_expr := dosage_expr || '"starting_dose", ';
  END IF;

  IF has_target_dose THEN
    dosage_expr := dosage_expr || '"target_dose", ';
  END IF;

  IF has_max_dose THEN
    dosage_expr := dosage_expr || '"max_dose", ';
  END IF;

  EXECUTE 'UPDATE "prescriptions" SET "dosage" = COALESCE('
    || dosage_expr
    || '''N/A'') WHERE "dosage" IS NULL';
END $$;

UPDATE "prescriptions"
SET "instructions" = 'Take as prescribed.'
WHERE "instructions" IS NULL;

DO $$
DECLARE
  null_provider_count INTEGER;
  null_dosage_count INTEGER;
  null_instructions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_provider_count FROM "prescriptions" WHERE "provider_id" IS NULL;
  SELECT COUNT(*) INTO null_dosage_count FROM "prescriptions" WHERE "dosage" IS NULL;
  SELECT COUNT(*) INTO null_instructions_count FROM "prescriptions" WHERE "instructions" IS NULL;

  IF null_provider_count > 0 OR null_dosage_count > 0 OR null_instructions_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL: provider_id nulls=%, dosage nulls=%, instructions nulls=%',
      null_provider_count, null_dosage_count, null_instructions_count;
  END IF;
END $$;

ALTER TABLE "prescriptions"
  ALTER COLUMN "provider_id" SET NOT NULL,
  ALTER COLUMN "dosage" SET NOT NULL,
  ALTER COLUMN "instructions" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'prescriptions'::regclass
      AND conname = 'prescriptions_patient_id_fkey'
  ) THEN
    ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_patient_id_fkey";
  END IF;

  ALTER TABLE "prescriptions"
    ADD CONSTRAINT "prescriptions_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END $$;
