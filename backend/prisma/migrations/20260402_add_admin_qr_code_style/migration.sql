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

ALTER TABLE "qr_codes"
ADD COLUMN IF NOT EXISTS "style_preset" TEXT NOT NULL DEFAULT 'rounded',
ADD COLUMN IF NOT EXISTS "foreground_color" TEXT NOT NULL DEFAULT '#0F172A',
ADD COLUMN IF NOT EXISTS "background_color" TEXT NOT NULL DEFAULT '#FFFFFF';
