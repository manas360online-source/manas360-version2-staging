-- PhonePe flow no longer persists Razorpay order identifiers on financial_payments.
-- Some deployed environments still enforce NOT NULL on this legacy column.
-- Relax the constraint to avoid runtime insert failures during subscription/payment initiation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'financial_payments'
      AND column_name = 'razorpayOrderId'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "financial_payments"
      ALTER COLUMN "razorpayOrderId" DROP NOT NULL;
  END IF;
END $$;
