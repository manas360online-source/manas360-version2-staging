ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destination_url" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_dynamic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "qr_codes_qr_type_idx" ON "qr_codes"("qr_type");
CREATE INDEX IF NOT EXISTS "qr_codes_owner_id_idx" ON "qr_codes"("owner_id");
CREATE INDEX IF NOT EXISTS "qr_codes_expires_at_idx" ON "qr_codes"("expires_at");

CREATE TABLE IF NOT EXISTS "qr_scans" (
  "id" TEXT NOT NULL,
  "qr_code_code" TEXT NOT NULL,
  "scan_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "device_type" TEXT,
  "device_os" TEXT,
  "ip_address" TEXT,
  "session_id" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_code_scan_timestamp_idx" ON "qr_scans"("qr_code_code", "scan_timestamp");
CREATE INDEX IF NOT EXISTS "qr_scans_session_id_idx" ON "qr_scans"("session_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_scans_qr_code_code_fkey'
  ) THEN
    ALTER TABLE "qr_scans"
      ADD CONSTRAINT "qr_scans_qr_code_code_fkey"
      FOREIGN KEY ("qr_code_code") REFERENCES "qr_codes"("code")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "qr_conversions" (
  "id" TEXT NOT NULL,
  "qr_code_code" TEXT NOT NULL,
  "qr_scan_id" TEXT,
  "session_id" TEXT,
  "conversion_type" TEXT NOT NULL,
  "attributed_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "conversion_data" JSONB,
  "conversion_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_conversions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "qr_conversions_qr_code_code_conversion_type_idx" ON "qr_conversions"("qr_code_code", "conversion_type");
CREATE INDEX IF NOT EXISTS "qr_conversions_session_id_idx" ON "qr_conversions"("session_id");
CREATE INDEX IF NOT EXISTS "qr_conversions_conversion_at_idx" ON "qr_conversions"("conversion_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_conversions_qr_code_code_fkey'
  ) THEN
    ALTER TABLE "qr_conversions"
      ADD CONSTRAINT "qr_conversions_qr_code_code_fkey"
      FOREIGN KEY ("qr_code_code") REFERENCES "qr_codes"("code")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_conversions_qr_scan_id_fkey'
  ) THEN
    ALTER TABLE "qr_conversions"
      ADD CONSTRAINT "qr_conversions_qr_scan_id_fkey"
      FOREIGN KEY ("qr_scan_id") REFERENCES "qr_scans"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
