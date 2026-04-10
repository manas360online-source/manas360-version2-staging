-- CreateEnum for InvoiceMethod
CREATE TYPE "InvoiceMethod" AS ENUM ('PDF', 'SWIPE');

-- CreateTable for SwipeItemMapping
CREATE TABLE "swipe_item_mappings" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "swipe_item_id" TEXT NOT NULL,
    "base_rate_minor" BIGINT NOT NULL,
    "sac_code" TEXT,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swipe_item_mappings_pkey" PRIMARY KEY ("id")
);

-- Add invoiceMethod column to invoices table
ALTER TABLE "invoices" ADD COLUMN "invoice_method" "InvoiceMethod" NOT NULL DEFAULT 'PDF';

-- Add invoiceMethod column to invoice_events table
ALTER TABLE "invoice_events" ADD COLUMN "invoice_method" "InvoiceMethod";

-- CreateIndex for swipe_item_mappings
CREATE UNIQUE INDEX "swipe_item_mappings_service_id_key" ON "swipe_item_mappings"("service_id");
CREATE INDEX "swipe_item_mappings_service_id_idx" ON "swipe_item_mappings"("service_id");
CREATE INDEX "swipe_item_mappings_swipe_item_id_idx" ON "swipe_item_mappings"("swipe_item_id");
CREATE INDEX "swipe_item_mappings_is_active_idx" ON "swipe_item_mappings"("is_active");
