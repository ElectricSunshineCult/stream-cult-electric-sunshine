-- Enhanced Payment System with Revenue Sharing
-- Date: 2025-11-07
-- Author: MiniMax Agent
-- Description: Comprehensive payment system with platform fees, revenue sharing, and payout tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Platform Fee Configuration
CREATE TABLE IF NOT EXISTS platform_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_type VARCHAR(50) NOT NULL, -- 'token_purchase', 'tip', 'subscription', 'payout'
    platform_percentage DECIMAL(5,2) NOT NULL, -- Platform takes this percentage
    admin_percentage DECIMAL(5,2) NOT NULL, -- Admins get this percentage
    moderator_percentage DECIMAL(5,2) NOT NULL, -- Moderators get this percentage
    creator_percentage DECIMAL(5,2) NOT NULL, -- Content creators get this percentage
    min_amount DECIMAL(10,2) DEFAULT 0, -- Minimum amount for this fee type
    max_amount DECIMAL(10,2), -- Maximum amount for this fee type
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Revenue Distribution Ledger
CREATE TABLE IF NOT EXISTS revenue_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL, -- References the original transaction
    distribution_type VARCHAR(50) NOT NULL, -- 'token_purchase', 'tip', 'subscription'
    platform_amount DECIMAL(10,2) NOT NULL,
    admin_amount DECIMAL(10,2) NOT NULL,
    moderator_amount DECIMAL(10,2) NOT NULL,
    creator_amount DECIMAL(10,2) NOT NULL,
    admin_recipient_id UUID REFERENCES users(id),
    moderator_recipient_id UUID REFERENCES users(id),
    creator_recipient_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'distributed', 'rejected'
    distributed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Token Payout Requests
CREATE TABLE IF NOT EXISTS token_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_tokens INTEGER NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    payout_method VARCHAR(50) NOT NULL, -- 'paypal', 'bank_transfer', 'crypto', 'check'
    payout_details JSONB NOT NULL, -- Account details, crypto address, etc.
    conversion_rate DECIMAL(10,6) NOT NULL, -- Token to USD conversion rate at time of request
    platform_fee_percentage DECIMAL(5,2) NOT NULL,
    platform_fee_amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL, -- amount after platform fees
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected', 'failed'
    processing_fee DECIMAL(10,2) DEFAULT 0, -- Processing fee charged by payment processor
    admin_notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payout Transaction History
CREATE TABLE IF NOT EXISTS payout_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_id UUID NOT NULL REFERENCES token_payouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_transaction_id VARCHAR(255), -- PayPal transaction ID, bank reference, etc.
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    payment_processor VARCHAR(50) NOT NULL, -- 'paypal', 'stripe', 'bank', 'crypto'
    processor_response JSONB, -- Full response from payment processor
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Token Exchange Rates
CREATE TABLE IF NOT EXISTS token_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_type VARCHAR(50) NOT NULL, -- 'buy', 'sell'
    rate DECIMAL(10,6) NOT NULL, -- 1 USD = X tokens (for buy) or X tokens = 1 USD (for sell)
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payment Method Preferences
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- 'paypal', 'bank_account', 'crypto_wallet', 'check'
    method_name VARCHAR(100) NOT NULL, -- User-friendly name
    method_details JSONB NOT NULL, -- Encrypted sensitive data
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tax Information
CREATE TABLE IF NOT EXISTS user_tax_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax_country VARCHAR(3) NOT NULL, -- ISO country code
    tax_id VARCHAR(100), -- SSN, EIN, VAT number, etc.
    tax_id_type VARCHAR(50), -- 'ssn', 'ein', 'vat', 'other'
    withholding_percentage DECIMAL(5,2) DEFAULT 0, -- For international users
    tax_year INTEGER NOT NULL,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    total_withheld DECIMAL(12,2) DEFAULT 0,
    tax_documents_generated JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tax_year)
);

-- 8. Subscription Tiers
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_price DECIMAL(8,2) NOT NULL,
    token_bonus_percentage DECIMAL(5,2) DEFAULT 0, -- Bonus tokens on purchases
    features JSONB DEFAULT '{
        "badge": true,
        "custom_emotes": 10,
        "priority_support": false,
        "ad_free": false,
        "exclusive_content": false
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
    external_subscription_id VARCHAR(255), -- Stripe subscription ID
    status VARCHAR(20) NOT NULL, -- 'active', 'cancelled', 'past_due', 'unpaid'
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancellation_date TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Dispute Resolution
CREATE TABLE IF NOT EXISTS payment_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dispute_type VARCHAR(50) NOT NULL, -- 'chargeback', 'refund_request', 'service_issue'
    reason TEXT NOT NULL,
    amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'escalated'
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolution_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to existing users table for enhanced payment tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earned DECIMAL(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_paid_out DECIMAL(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_payout_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_tokens_purchased INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_tips_received INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_verification_status VARCHAR(20) DEFAULT 'pending';

-- Add columns to existing transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admin_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS moderator_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS creator_share DECIMAL(10,2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_fees_type ON platform_fees(fee_type);
CREATE INDEX IF NOT EXISTS idx_platform_fees_active ON platform_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_revenue_distributions_transaction ON revenue_distributions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_revenue_distributions_status ON revenue_distributions(status);
CREATE INDEX IF NOT EXISTS idx_token_payouts_user_id ON token_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_token_payouts_status ON token_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_payout_id ON payout_transactions(payout_id);
CREATE INDEX IF NOT EXISTS idx_token_rates_type ON token_rates(rate_type);
CREATE INDEX IF NOT EXISTS idx_token_rates_active ON token_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user_id ON user_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tax_info_user_id ON user_tax_info(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active ON subscription_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_user_id ON payment_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_platform_fees_updated_at ON platform_fees;
CREATE TRIGGER update_platform_fees_updated_at
    BEFORE UPDATE ON platform_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_token_payouts_updated_at ON token_payouts;
CREATE TRIGGER update_token_payouts_updated_at
    BEFORE UPDATE ON token_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_payment_methods_updated_at ON user_payment_methods;
CREATE TRIGGER update_user_payment_methods_updated_at
    BEFORE UPDATE ON user_payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_tax_info_updated_at ON user_tax_info;
CREATE TRIGGER update_user_tax_info_updated_at
    BEFORE UPDATE ON user_tax_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_tiers_updated_at ON subscription_tiers;
CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_disputes_updated_at ON payment_disputes;
CREATE TRIGGER update_payment_disputes_updated_at
    BEFORE UPDATE ON payment_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default platform fee structure
INSERT INTO platform_fees (fee_type, platform_percentage, admin_percentage, moderator_percentage, creator_percentage, min_amount) VALUES
('token_purchase', 5.0, 2.0, 1.0, 2.0, 0.00),
('tip', 3.0, 1.5, 0.5, 5.0, 0.50),
('subscription', 10.0, 3.0, 2.0, 0.0, 0.00),
('payout', 2.0, 0.5, 0.0, 0.0, 10.00)
ON CONFLICT DO NOTHING;

-- Insert default subscription tiers
INSERT INTO subscription_tiers (name, description, monthly_price, token_bonus_percentage, features) VALUES
('Free', 'Basic access to Stream Cult platform', 0.00, 0, '{
    "badge": false,
    "custom_emotes": 0,
    "priority_support": false,
    "ad_free": false,
    "exclusive_content": false
}'),
('Supporter', 'Enhanced experience with bonus tokens and features', 4.99, 10, '{
    "badge": true,
    "custom_emotes": 5,
    "priority_support": true,
    "ad_free": false,
    "exclusive_content": false
}'),
('VIP', 'Premium access with full feature set', 9.99, 20, '{
    "badge": true,
    "custom_emotes": 15,
    "priority_support": true,
    "ad_free": true,
    "exclusive_content": true
}'),
('Premium', 'Ultimate tier with exclusive benefits', 19.99, 35, '{
    "badge": true,
    "custom_emotes": 50,
    "priority_support": true,
    "ad_free": true,
    "exclusive_content": true
}')
ON CONFLICT DO NOTHING;

-- Insert default token exchange rates
INSERT INTO token_rates (rate_type, rate) VALUES
('buy', 25.0),  -- 1 USD = 25 tokens
('sell', 0.04)  -- 1 token = 0.04 USD (20 tokens = 1 USD)
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE platform_fees IS 'Configuration for platform fee structure and revenue sharing percentages';
COMMENT ON TABLE revenue_distributions IS 'Records of how revenue is distributed among platform, admins, moderators, and creators';
COMMENT ON TABLE token_payouts IS 'User requests to cash out tokens for real money';
COMMENT ON TABLE payout_transactions IS 'Detailed transaction records for completed payouts';
COMMENT ON TABLE token_rates IS 'Token exchange rates for buying and selling tokens';
COMMENT ON TABLE user_payment_methods IS 'User payment method preferences and details';
COMMENT ON TABLE user_tax_info IS 'Tax information for users receiving payouts';
COMMENT ON TABLE subscription_tiers IS 'Available subscription tiers and their features';
COMMENT ON TABLE user_subscriptions IS 'User subscription records and status';
COMMENT ON TABLE payment_disputes IS 'Payment disputes and resolution tracking';

-- Grant necessary permissions (adjust based on your database setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stream_cult_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stream_cult_user;