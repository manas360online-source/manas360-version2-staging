-- ============================================================
-- Migration: Hit a Sixer Gamification tables
-- STORY 11.5 - Hit a Sixer Gamification
-- ============================================================

-- 1. user_wallet
CREATE TABLE IF NOT EXISTS user_wallet (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Balances (in rupees)
    total_balance INTEGER NOT NULL DEFAULT 0 CHECK (total_balance >= 0),
    game_credits INTEGER NOT NULL DEFAULT 0 CHECK (game_credits >= 0),
    referral_credits INTEGER NOT NULL DEFAULT 0 CHECK (referral_credits >= 0),
    promo_credits INTEGER NOT NULL DEFAULT 0 CHECK (promo_credits >= 0),
    -- Lifetime tracking
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    lifetime_expired INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_transaction_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_balance
    ON user_wallet (user_id, total_balance);
CREATE INDEX IF NOT EXISTS idx_updated_at
    ON user_wallet (updated_at DESC);

COMMENT ON TABLE user_wallet IS 'User wallet balances and lifetime statistics';
COMMENT ON COLUMN user_wallet.total_balance IS 'Current available balance across all credit types';

-- 2. user_wallet_transactions
CREATE TABLE IF NOT EXISTS user_wallet_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id TEXT NOT NULL REFERENCES user_wallet(id) ON DELETE CASCADE,
    -- Transaction type
    transaction_type VARCHAR(30) NOT NULL CHECK (
        transaction_type IN (
            'credit_earned_game_four',
            'credit_earned_game_sixer',
            'credit_earned_game_out',
            'credit_earned_referral',
            'credit_earned_promo',
            'credit_used_booking',
            'credit_expired',
            'credit_refunded'
        )
    ),
    -- Amount (positive for earned, negative for used/expired)
    amount INTEGER NOT NULL,
    -- Source reference
    source VARCHAR(30),
    source_id TEXT,
    -- Balance snapshot
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    -- Expiry tracking (for earned credits)
    expires_at TIMESTAMPTZ,
    expired BOOLEAN DEFAULT FALSE,
    -- Description
    description TEXT,
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_transactions
    ON user_wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_type
    ON user_wallet_transactions (transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source
    ON user_wallet_transactions (source, source_id);
CREATE INDEX IF NOT EXISTS idx_expiry
    ON user_wallet_transactions (expires_at, expired) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_created_at
    ON user_wallet_transactions (created_at DESC);

COMMENT ON TABLE user_wallet_transactions IS 'Complete audit trail of all wallet credit movements';
COMMENT ON COLUMN user_wallet_transactions.amount IS 'Positive for credits earned, negative for credits used or expired';

-- 3. daily_game_plays
CREATE TABLE IF NOT EXISTS daily_game_plays (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_date DATE NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Subscription validation
    subscription_id TEXT REFERENCES patient_subscriptions(id),
    subscription_active BOOLEAN NOT NULL DEFAULT FALSE,
    -- Game outcome
    outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('sixer', 'four', 'out')),
    credit_amount INTEGER NOT NULL,
    -- Wallet reference
    wallet_transaction_id TEXT REFERENCES user_wallet_transactions(id),
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraints
    CONSTRAINT unique_user_game_date UNIQUE (user_id, game_date),
    CONSTRAINT valid_credit_amount CHECK (credit_amount IN (10, 50, 100))
);

CREATE INDEX IF NOT EXISTS idx_user_game_date
    ON daily_game_plays (user_id, game_date DESC);
CREATE INDEX IF NOT EXISTS idx_game_date
    ON daily_game_plays (game_date);
CREATE INDEX IF NOT EXISTS idx_outcome
    ON daily_game_plays (outcome, game_date);
CREATE INDEX IF NOT EXISTS idx_subscription
    ON daily_game_plays (subscription_id, subscription_active);

COMMENT ON TABLE daily_game_plays IS 'Tracks each users daily cricket game play and outcome';
COMMENT ON COLUMN daily_game_plays.outcome IS 'Game result: sixer (4%), four (8%), out (88%)';
COMMENT ON COLUMN daily_game_plays.credit_amount IS 'Wallet credit awarded: 100 for sixer, 50 for four, 10 for out';

-- 4. wallet_credits
CREATE TABLE IF NOT EXISTS wallet_credits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Credit details
    amount INTEGER NOT NULL CHECK (amount > 0),
    remaining_balance INTEGER NOT NULL CHECK (remaining_balance >= 0),
    -- Source
    source VARCHAR(30) NOT NULL,
    source_id TEXT,
    transaction_id TEXT REFERENCES user_wallet_transactions(id),
    -- Expiry
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    expired BOOLEAN DEFAULT FALSE,
    -- Usage
    fully_used BOOLEAN DEFAULT FALSE,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraints
    CONSTRAINT valid_remaining CHECK (remaining_balance <= amount)
);

CREATE INDEX IF NOT EXISTS idx_fully_used
    ON wallet_credits (fully_used);
CREATE INDEX IF NOT EXISTS idx_user_active
    ON wallet_credits (user_id, expired, fully_used) WHERE NOT expired AND NOT fully_used;
CREATE INDEX IF NOT EXISTS idx_expiry_pending
    ON wallet_credits (expires_at) WHERE NOT expired;
CREATE INDEX IF NOT EXISTS idx_wallet_credits_source
    ON wallet_credits (source, source_id);

COMMENT ON TABLE wallet_credits IS 'Individual credit line items with expiry and partial usage tracking';
COMMENT ON COLUMN wallet_credits.remaining_balance IS 'Current balance of this credit line (supports partial usage)';

-- 5. game_stats_daily
CREATE TABLE IF NOT EXISTS game_stats_daily (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    stat_date DATE UNIQUE NOT NULL,
    -- Play counts
    total_plays INTEGER DEFAULT 0,
    unique_players INTEGER DEFAULT 0,
    -- Outcome distribution
    total_sixers INTEGER DEFAULT 0,
    total_fours INTEGER DEFAULT 0,
    total_outs INTEGER DEFAULT 0,
    -- Percentages (for validation)
    sixer_percentage DECIMAL(5,2),
    four_percentage DECIMAL(5,2),
    out_percentage DECIMAL(5,2),
    -- Financial tracking
    total_credits_issued INTEGER DEFAULT 0,
    total_credits_redeemed INTEGER DEFAULT 0,
    total_credits_expired INTEGER DEFAULT 0,
    -- Session impact
    sessions_booked_with_credits INTEGER DEFAULT 0,
    revenue_generated INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stat_date
    ON game_stats_daily (stat_date DESC);

COMMENT ON TABLE game_stats_daily IS 'Daily aggregated statistics for monitoring and analytics';

-- 6. booking_wallet_usage
CREATE TABLE IF NOT EXISTS booking_wallet_usage (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    booking_id TEXT UNIQUE NOT NULL REFERENCES therapy_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Pricing breakdown
    original_amount INTEGER NOT NULL,
    wallet_credits_used INTEGER NOT NULL,
    final_amount INTEGER NOT NULL,
    -- Credit sources used (array of wallet_credit IDs)
    credit_ids TEXT[] NOT NULL,
    -- Transaction reference
    wallet_transaction_id TEXT REFERENCES user_wallet_transactions(id),
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking
    ON booking_wallet_usage (booking_id);
CREATE INDEX IF NOT EXISTS idx_user
    ON booking_wallet_usage (user_id, applied_at DESC);

COMMENT ON TABLE booking_wallet_usage IS 'Tracks which credits were used for which bookings';
