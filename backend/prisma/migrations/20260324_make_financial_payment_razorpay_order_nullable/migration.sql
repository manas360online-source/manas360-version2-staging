-- PhonePe flow no longer persists Razorpay order identifiers on financial_payments.
-- Some deployed environments still enforce NOT NULL on this legacy column.
-- Relax the constraint to avoid runtime insert failures during subscription/payment initiation.
ALTER TABLE IF EXISTS "financial_payments"
  ALTER COLUMN "razorpayOrderId" DROP NOT NULL;
