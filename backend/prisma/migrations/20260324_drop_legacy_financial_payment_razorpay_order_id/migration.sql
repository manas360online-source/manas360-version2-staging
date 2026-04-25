-- Remove legacy Razorpay order column from financial payments.
-- Subscription/session payments now flow via PhonePe using merchantTransactionId.
DROP INDEX IF EXISTS "financial_payments_razorpayOrderId_key";
DROP INDEX IF EXISTS "financial_payments_razorpayOrderId_idx";

ALTER TABLE IF EXISTS "financial_payments"
  DROP COLUMN IF EXISTS "razorpayOrderId";
