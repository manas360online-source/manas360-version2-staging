-- Weekly curriculum schema upgrades for TherapyPlanActivity
-- Safe/idempotent SQL for environments where some columns may already exist.

DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'therapy_plan_activities'
  ) THEN
    ALTER TABLE "therapy_plan_activities"
      ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER NOT NULL DEFAULT 1;

    ALTER TABLE "therapy_plan_activities"
      ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE "therapy_plan_activities"
      ADD COLUMN IF NOT EXISTS "category" TEXT;

    -- Category is now optional and should not enforce a default value.
    ALTER TABLE "therapy_plan_activities"
      ALTER COLUMN "category" DROP NOT NULL,
      ALTER COLUMN "category" DROP DEFAULT;
  END IF;
END $$;
