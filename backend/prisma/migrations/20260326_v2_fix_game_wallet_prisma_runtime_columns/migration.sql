-- Align game/wallet DB columns with current Prisma models
-- Non-destructive: keeps legacy snake_case columns for backward compatibility.

-- Legacy compatibility:
-- Earlier migration created user_wallet (singular) with snake_case user_id.
-- Later Prisma model expects user_wallets with camelCase userId.
DO $$ BEGIN
  IF to_regclass('public.user_wallets') IS NULL AND to_regclass('public.user_wallet') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE user_wallet RENAME TO user_wallets';
  END IF;
END $$;

ALTER TABLE user_wallets
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

UPDATE user_wallets
SET "userId" = COALESCE("userId", user_id)
WHERE "userId" IS NULL;

DO $$ BEGIN
  CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WalletCreditStatus" AS ENUM ('AVAILABLE', 'USED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- user_wallet_transactions: add Prisma-expected camelCase columns.
ALTER TABLE user_wallet_transactions
  ADD COLUMN IF NOT EXISTS "walletId" TEXT,
  ADD COLUMN IF NOT EXISTS "transactionType" "WalletTransactionType",
  ADD COLUMN IF NOT EXISTS "balanceAfter" INTEGER,
  ADD COLUMN IF NOT EXISTS "referenceId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);

-- Backfill from legacy columns where needed.
UPDATE user_wallet_transactions
SET
  "walletId" = COALESCE("walletId", wallet_id),
  "transactionType" = COALESCE(
    "transactionType",
    CASE
      WHEN amount >= 0 THEN 'CREDIT'::"WalletTransactionType"
      ELSE 'DEBIT'::"WalletTransactionType"
    END
  ),
  "balanceAfter" = COALESCE("balanceAfter", balance_after),
  "referenceId" = COALESCE("referenceId", source_id),
  "createdAt" = COALESCE("createdAt", created_at::timestamp)
WHERE
  "walletId" IS NULL
  OR "transactionType" IS NULL
  OR "balanceAfter" IS NULL
  OR "createdAt" IS NULL;

ALTER TABLE user_wallet_transactions
  ALTER COLUMN "walletId" SET NOT NULL,
  ALTER COLUMN "transactionType" SET NOT NULL,
  ALTER COLUMN "balanceAfter" SET NOT NULL,
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "createdAt" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE user_wallet_transactions
    ADD CONSTRAINT user_wallet_transactions_wallet_fkey_new
    FOREIGN KEY ("walletId") REFERENCES user_wallets(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS user_wallet_transactions_wallet_created_idx_new
  ON user_wallet_transactions("walletId", "createdAt" DESC);

-- wallet_credits: add Prisma-expected camelCase columns.
ALTER TABLE wallet_credits
  ADD COLUMN IF NOT EXISTS "walletId" TEXT,
  ADD COLUMN IF NOT EXISTS status "WalletCreditStatus",
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);

-- Backfill walletId by joining user_wallets via legacy user_id.
UPDATE wallet_credits wc
SET "walletId" = uw.id
FROM user_wallets uw
WHERE wc."walletId" IS NULL AND uw."userId" = wc.user_id;

-- Backfill remaining columns from legacy fields.
UPDATE wallet_credits
SET
  status = COALESCE(
    status,
    CASE
      WHEN expired = true THEN 'EXPIRED'::"WalletCreditStatus"
      WHEN fully_used = true THEN 'USED'::"WalletCreditStatus"
      ELSE 'AVAILABLE'::"WalletCreditStatus"
    END
  ),
  "expiresAt" = COALESCE("expiresAt", expires_at::timestamp),
  "createdAt" = COALESCE("createdAt", created_at::timestamp)
WHERE
  status IS NULL
  OR "expiresAt" IS NULL
  OR "createdAt" IS NULL;

ALTER TABLE wallet_credits
  ALTER COLUMN "walletId" SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'AVAILABLE',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "createdAt" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE wallet_credits
    ADD CONSTRAINT wallet_credits_wallet_fkey_new
    FOREIGN KEY ("walletId") REFERENCES user_wallets(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS wallet_credits_wallet_status_idx_new
  ON wallet_credits("walletId", status);
