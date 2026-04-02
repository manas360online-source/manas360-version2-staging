CREATE TABLE IF NOT EXISTS "qr_codes" (
  "code" TEXT NOT NULL,
  "redirect_url" TEXT NOT NULL,
  "template_id" TEXT NOT NULL DEFAULT 'classic-black',
  "logo_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("code")
);

CREATE INDEX IF NOT EXISTS "qr_codes_created_by_id_idx" ON "qr_codes"("created_by_id");
CREATE INDEX IF NOT EXISTS "qr_codes_created_at_idx" ON "qr_codes"("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'qr_codes_created_by_id_fkey'
  ) THEN
    ALTER TABLE "qr_codes"
      ADD CONSTRAINT "qr_codes_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
