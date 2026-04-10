-- Add payout tracking to invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "isPaidOut" BOOLEAN DEFAULT false;

-- Create Payout model table
CREATE TABLE "payouts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "providerId" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "method" TEXT NOT NULL DEFAULT 'BANK',
  "referenceId" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "payouts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payout_amount_positive" CHECK ("amountMinor" > 0)
);

-- Create PayoutItem model table
CREATE TABLE "payout_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payoutId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  CONSTRAINT "payout_items_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payout_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payout_items_invoiceId_unique" UNIQUE("invoiceId"),
  CONSTRAINT "payout_item_amount_positive" CHECK ("amountMinor" > 0)
);

-- Create indexes for query performance
CREATE INDEX "idx_payout_provider_created" ON "payouts"("providerId", "createdAt" DESC);
CREATE INDEX "idx_payout_status_created" ON "payouts"("status", "createdAt" DESC);
CREATE INDEX "idx_payout_item_payout" ON "payout_items"("payoutId");
CREATE INDEX IF NOT EXISTS "idx_invoice_is_paid_out" ON "invoices"("isPaidOut");
