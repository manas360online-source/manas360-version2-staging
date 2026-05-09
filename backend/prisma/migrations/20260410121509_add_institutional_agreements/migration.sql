-- CreateTable
CREATE TABLE "agreement_templates" (
    "id" SERIAL NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_type" TEXT NOT NULL,
    "template_html" TEXT NOT NULL,
    "template_variables" JSONB NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_agreements" (
    "id" SERIAL NOT NULL,
    "agreement_number" TEXT NOT NULL,
    "template_id" INTEGER NOT NULL,
    "agreement_type" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "partner_type" TEXT NOT NULL,
    "partner_contact_name" TEXT NOT NULL,
    "partner_contact_email" TEXT NOT NULL,
    "partner_contact_phone" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "annual_value" DOUBLE PRECISION,
    "payment_terms" TEXT,
    "billing_cycle" TEXT,
    "template_data" JSONB NOT NULL,
    "generated_pdf_path" TEXT,
    "signature_status" TEXT NOT NULL DEFAULT 'draft',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutional_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_signature_logs" (
    "id" SERIAL NOT NULL,
    "agreement_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "event_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_signature_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agreement_templates_template_name_key" ON "agreement_templates"("template_name");

-- CreateIndex
CREATE UNIQUE INDEX "institutional_agreements_agreement_number_key" ON "institutional_agreements"("agreement_number");

-- CreateIndex
CREATE INDEX "institutional_agreements_template_id_idx" ON "institutional_agreements"("template_id");

-- CreateIndex
CREATE INDEX "institutional_agreements_status_idx" ON "institutional_agreements"("status");

-- CreateIndex
CREATE INDEX "institutional_agreements_signature_status_idx" ON "institutional_agreements"("signature_status");

-- CreateIndex
CREATE INDEX "agreement_signature_logs_agreement_id_idx" ON "agreement_signature_logs"("agreement_id");

-- CreateIndex
CREATE INDEX "agreement_signature_logs_event_type_idx" ON "agreement_signature_logs"("event_type");

-- AddForeignKey
ALTER TABLE "institutional_agreements" ADD CONSTRAINT "institutional_agreements_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "agreement_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_signature_logs" ADD CONSTRAINT "agreement_signature_logs_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "institutional_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
