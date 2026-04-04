DO $$ BEGIN
  CREATE TYPE "GroupTherapyMode" AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GroupTherapyStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'LIVE', 'ENDED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GroupTherapyInviteStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'PAYMENT_PENDING', 'PAID', 'JOINED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GroupTherapyEnrollmentStatus" AS ENUM ('PAYMENT_PENDING', 'PAID', 'JOINED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "group_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'GENERAL',
  "description" TEXT,
  "max_capacity" INTEGER NOT NULL DEFAULT 15,
  "session_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "group_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "group_categories_name_key" ON "group_categories"("name");

CREATE TABLE IF NOT EXISTS "group_therapy_sessions" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "description" TEXT,
  "session_mode" "GroupTherapyMode" NOT NULL DEFAULT 'PUBLIC',
  "status" "GroupTherapyStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "requested_by_id" TEXT NOT NULL,
  "host_therapist_id" TEXT NOT NULL,
  "approved_by_id" TEXT,
  "group_category_id" TEXT,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "duration_minutes" INTEGER NOT NULL DEFAULT 60,
  "max_members" INTEGER NOT NULL DEFAULT 10,
  "price_minor" BIGINT NOT NULL DEFAULT 0,
  "allow_guest_join" BOOLEAN NOT NULL DEFAULT true,
  "requires_admin_gate" BOOLEAN NOT NULL DEFAULT true,
  "requires_payment" BOOLEAN NOT NULL DEFAULT true,
  "jitsi_room_name" TEXT,
  "publish_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "approved_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  CONSTRAINT "group_therapy_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "group_therapy_invites" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "patient_user_id" TEXT NOT NULL,
  "invited_by_id" TEXT NOT NULL,
  "status" "GroupTherapyInviteStatus" NOT NULL DEFAULT 'INVITED',
  "amount_minor" BIGINT NOT NULL DEFAULT 0,
  "payment_id" TEXT,
  "payment_deadline" TIMESTAMP(3),
  "message" TEXT,
  "accepted_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "joined_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "group_therapy_invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "group_therapy_enrollments" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT,
  "guest_name" TEXT,
  "guest_email" TEXT,
  "status" "GroupTherapyEnrollmentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
  "amount_minor" BIGINT NOT NULL DEFAULT 0,
  "payment_id" TEXT,
  "merchant_transaction" TEXT,
  "paid_at" TIMESTAMP(3),
  "joined_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "group_therapy_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "group_therapy_invites_session_id_patient_user_id_key" ON "group_therapy_invites"("session_id", "patient_user_id");

CREATE INDEX IF NOT EXISTS "group_therapy_sessions_status_scheduled_at_idx" ON "group_therapy_sessions"("status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "group_therapy_sessions_host_therapist_id_status_idx" ON "group_therapy_sessions"("host_therapist_id", "status");
CREATE INDEX IF NOT EXISTS "group_therapy_sessions_requested_by_id_created_at_idx" ON "group_therapy_sessions"("requested_by_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "group_therapy_sessions_session_mode_status_idx" ON "group_therapy_sessions"("session_mode", "status");

CREATE INDEX IF NOT EXISTS "group_therapy_invites_patient_user_id_status_idx" ON "group_therapy_invites"("patient_user_id", "status");
CREATE INDEX IF NOT EXISTS "group_therapy_invites_session_id_status_idx" ON "group_therapy_invites"("session_id", "status");

CREATE INDEX IF NOT EXISTS "group_therapy_enrollments_session_id_status_idx" ON "group_therapy_enrollments"("session_id", "status");
CREATE INDEX IF NOT EXISTS "group_therapy_enrollments_user_id_status_idx" ON "group_therapy_enrollments"("user_id", "status");
CREATE INDEX IF NOT EXISTS "group_therapy_enrollments_guest_email_status_idx" ON "group_therapy_enrollments"("guest_email", "status");

DO $$ BEGIN
  ALTER TABLE "group_therapy_sessions"
    ADD CONSTRAINT "group_therapy_sessions_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_sessions"
    ADD CONSTRAINT "group_therapy_sessions_host_therapist_id_fkey"
    FOREIGN KEY ("host_therapist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_sessions"
    ADD CONSTRAINT "group_therapy_sessions_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_sessions"
    ADD CONSTRAINT "group_therapy_sessions_group_category_id_fkey"
    FOREIGN KEY ("group_category_id") REFERENCES "group_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_invites"
    ADD CONSTRAINT "group_therapy_invites_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "group_therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_invites"
    ADD CONSTRAINT "group_therapy_invites_patient_user_id_fkey"
    FOREIGN KEY ("patient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_invites"
    ADD CONSTRAINT "group_therapy_invites_invited_by_id_fkey"
    FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_invites"
    ADD CONSTRAINT "group_therapy_invites_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "financial_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_enrollments"
    ADD CONSTRAINT "group_therapy_enrollments_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "group_therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_enrollments"
    ADD CONSTRAINT "group_therapy_enrollments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "group_therapy_enrollments"
    ADD CONSTRAINT "group_therapy_enrollments_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "financial_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
