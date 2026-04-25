-- B2B institutional lead ranking and gated release support

ALTER TABLE "therapist_profiles"
ADD COLUMN "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "therapist_profiles"
ADD COLUMN "base_latitude" DOUBLE PRECISION;

ALTER TABLE "therapist_profiles"
ADD COLUMN "base_longitude" DOUBLE PRECISION;

CREATE TYPE "LeadTier" AS ENUM ('EXCLUSIVE', 'PRIORITY', 'STANDARD');
CREATE TYPE "LeadChannel" AS ENUM ('CONSUMER', 'B2B_INSTITUTIONAL');

ALTER TABLE "leads"
ADD COLUMN "channel" "LeadChannel" NOT NULL DEFAULT 'CONSUMER';

ALTER TABLE "leads"
ADD COLUMN "tier" "LeadTier";

ALTER TABLE "leads"
ADD COLUMN "visibleAt" TIMESTAMP(3);

CREATE INDEX "leads_providerId_status_visibleAt_idx" ON "leads"("providerId", "status", "visibleAt");
CREATE INDEX "leads_channel_tier_visibleAt_idx" ON "leads"("channel", "tier", "visibleAt");
