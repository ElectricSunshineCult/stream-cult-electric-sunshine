-- Charity and Crowdfunding System for Stream Cult Platform
-- Date: 2025-11-07
-- Author: MiniMax Agent  
-- Description: Comprehensive charity and crowdfunding integration with badges, milestones, and leaderboards

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Registered Charities and Non-Profits
CREATE TABLE IF NOT EXISTS charities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(200) NOT NULL,
    organization_type VARCHAR(50) NOT NULL, -- 'charity', 'nonprofit', 'foundation', 'ngo'
    registration_number VARCHAR(100), -- Official registration/tracking number
    country VARCHAR(3) NOT NULL, -- ISO country code
    tax_id VARCHAR(100), -- Tax-exempt ID number
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    contact_email VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(50),
    mission_statement TEXT NOT NULL,
    description TEXT,
    focus_areas JSONB DEFAULT '[]'::jsonb, -- ['education', 'health', 'environment', etc.]
    verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'suspended'
    verification_documents JSONB DEFAULT '[]'::jsonb, -- URLs to verification docs
    verified_by UUID REFERENCES users(id), -- Admin who verified the charity
    verification_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Charity Campaigns (Crowdfunding Projects)
CREATE TABLE IF NOT EXISTS charity_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
    campaign_name VARCHAR(200) NOT NULL,
    campaign_description TEXT NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- 'emergency', 'project', 'ongoing', 'event'
    goal_amount DECIMAL(12,2) NOT NULL, -- Funding goal in USD
    current_amount DECIMAL(12,2) DEFAULT 0, -- Amount raised so far
    currency VARCHAR(3) DEFAULT 'USD',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMP WITH TIME ZONE,
    campaign_images JSONB DEFAULT '[]'::jsonb, -- URLs to campaign images
    tags JSONB DEFAULT '[]'::jsonb, -- Searchable tags
    status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'completed', 'cancelled', 'suspended'
    created_by UUID REFERENCES users(id), -- User who created the campaign
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Charity Donations Tracking
CREATE TABLE IF NOT EXISTS charity_donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES charity_campaigns(id) ON DELETE CASCADE,
    donor_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Can be anonymous
    donor_name VARCHAR(100), -- For anonymous donations
    donor_email VARCHAR(255), -- For anonymous donations
    streamer_id UUID REFERENCES users(id), -- Streamer who facilitated the donation
    donation_amount DECIMAL(10,2) NOT NULL, -- USD amount
    tokens_used INTEGER, -- Number of tokens donated (if applicable)
    donation_message TEXT, -- Optional message from donor
    is_anonymous BOOLEAN DEFAULT false,
    donation_source VARCHAR(50) NOT NULL, -- 'stream', 'direct', 'subscription', 'tip'
    transaction_id UUID, -- Reference to payment transaction
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'refunded', 'failed'
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Charity Stream Participation
CREATE TABLE IF NOT EXISTS charity_stream_participation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES charity_campaigns(id) ON DELETE CASCADE,
    streamer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_title VARCHAR(200),
    stream_description TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    donation_goal DECIMAL(10,2), -- Goal for this specific stream
    amount_raised DECIMAL(10,2) DEFAULT 0, -- Amount raised during stream
    viewer_count INTEGER DEFAULT 0,
    max_viewers INTEGER DEFAULT 0,
    charity_percentage DECIMAL(5,2) NOT NULL, -- Percentage of stream revenue going to charity
    platform_percentage DECIMAL(5,2) NOT NULL, -- Platform fee for charity streams
    admin_percentage DECIMAL(5,2) DEFAULT 0, -- Admin fee
    moderator_percentage DECIMAL(5,2) DEFAULT 0, -- Moderator fee
    streamer_percentage DECIMAL(5,2) NOT NULL, -- What streamer keeps
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed', 'cancelled'
    stream_url VARCHAR(500), -- Link to stream recording if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Charity Milestones and Badges
CREATE TABLE IF NOT EXISTS charity_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_name VARCHAR(100) NOT NULL,
    milestone_type VARCHAR(50) NOT NULL, -- 'total_donated', 'campaigns_supported', 'streams_hosted', 'yearly_goal'
    target_value DECIMAL(12,2) NOT NULL, -- Amount or count to reach
    badge_icon VARCHAR(100), -- Icon name for the badge
    badge_color VARCHAR(20), -- Color for the badge
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. User Charity Achievements
CREATE TABLE IF NOT EXISTS charity_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES charity_milestones(id),
    achievement_type VARCHAR(50) NOT NULL, -- 'donor', 'streamer', 'supporter', 'champion'
    current_value DECIMAL(12,2) NOT NULL, -- Current progress toward milestone
    target_value DECIMAL(12,2) NOT NULL, -- Target for this achievement
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    badge_earned BOOLEAN DEFAULT false,
    badge_earned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, milestone_id)
);

-- 7. Charity Revenue Distribution
CREATE TABLE IF NOT EXISTS charity_revenue_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_participation_id UUID NOT NULL REFERENCES charity_stream_participation(id) ON DELETE CASCADE,
    gross_revenue DECIMAL(10,2) NOT NULL, -- Total revenue from the stream
    charity_amount DECIMAL(10,2) NOT NULL, -- Amount going to charity
    platform_amount DECIMAL(10,2) NOT NULL, -- Platform fee
    admin_amount DECIMAL(10,2) NOT NULL, -- Admin fee
    moderator_amount DECIMAL(10,2) NOT NULL, -- Moderator fee
    streamer_amount DECIMAL(10,2) NOT NULL, -- What streamer receives
    charity_id UUID NOT NULL REFERENCES charities(id),
    charity_campaign_id UUID REFERENCES charity_campaigns(id),
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Monthly Charity Leaderboards
CREATE TABLE IF NOT EXISTS charity_leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_year VARCHAR(7) NOT NULL, -- Format: '2025-11'
    leaderboard_type VARCHAR(50) NOT NULL, -- 'top_donors', 'top_streamers', 'top_campaigns', 'most_supporters'
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- For user-based leaderboards
    campaign_id UUID REFERENCES charity_campaigns(id) ON DELETE CASCADE, -- For campaign leaderboards
    metric_value DECIMAL(12,2) NOT NULL, -- The value being ranked (donation amount, viewer count, etc.)
    rank_position INTEGER NOT NULL,
    badge_awarded BOOLEAN DEFAULT false,
    badge_awarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month_year, leaderboard_type, user_id),
    UNIQUE(month_year, leaderboard_type, campaign_id)
);

-- 9. Charity Fund Transfers
CREATE TABLE IF NOT EXISTS charity_fund_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES charity_campaigns(id) ON DELETE CASCADE,
    total_amount DECIMAL(12,2) NOT NULL, -- Total amount being transferred
    transfer_method VARCHAR(50) NOT NULL, -- 'bank_transfer', 'check', 'crypto', 'paypal'
    transfer_details JSONB NOT NULL, -- Transfer specific details
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    transfer_fee DECIMAL(10,2) DEFAULT 0, -- Fee charged by transfer method
    net_amount DECIMAL(12,2) NOT NULL, -- Amount after fees
    requested_by UUID REFERENCES users(id), -- Admin who initiated transfer
    processed_by UUID REFERENCES users(id), -- Admin who processed transfer
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    external_reference VARCHAR(255), -- Bank transaction ID, check number, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. User Charity Preferences
CREATE TABLE IF NOT EXISTS user_charity_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    favorite_charities JSONB DEFAULT '[]'::jsonb, -- Array of charity IDs
    default_charity_percentage DECIMAL(5,2) DEFAULT 5.0, -- Default % to donate from tips/streams
    donation_notifications BOOLEAN DEFAULT true,
    leaderboard_visibility BOOLEAN DEFAULT true,
    badge_visibility BOOLEAN DEFAULT true,
    auto_participate BOOLEAN DEFAULT false, -- Auto-participate in charity streams
    preferred_focus_areas JSONB DEFAULT '[]'::jsonb, -- User's preferred charity focus areas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add columns to existing users table for charity tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_charity_donated DECIMAL(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS charity_campaigns_supported INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS charity_streams_hosted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS charity_donations_made INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS charity_achievements_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS charity_badges_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_charity_activity TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_charities_verification_status ON charities(verification_status);
CREATE INDEX IF NOT EXISTS idx_charities_active ON charities(is_active);
CREATE INDEX IF NOT EXISTS idx_charity_campaigns_charity_id ON charity_campaigns(charity_id);
CREATE INDEX IF NOT EXISTS idx_charity_campaigns_status ON charity_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_charity_campaigns_dates ON charity_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_charity_donations_campaign_id ON charity_donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_charity_donations_donor_id ON charity_donations(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_charity_donations_streamer_id ON charity_donations(streamer_id);
CREATE INDEX IF NOT EXISTS idx_charity_stream_participation_campaign_id ON charity_stream_participation(campaign_id);
CREATE INDEX IF NOT EXISTS idx_charity_stream_participation_streamer_id ON charity_stream_participation(streamer_id);
CREATE INDEX IF NOT EXISTS idx_charity_stream_participation_dates ON charity_stream_participation(scheduled_start, actual_start);
CREATE INDEX IF NOT EXISTS idx_charity_achievements_user_id ON charity_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_charity_achievements_milestone_id ON charity_achievements(milestone_id);
CREATE INDEX IF NOT EXISTS idx_charity_revenue_distributions_charity_id ON charity_revenue_distributions(charity_id);
CREATE INDEX IF NOT EXISTS idx_charity_leaderboards_month_year ON charity_leaderboards(month_year);
CREATE INDEX IF NOT EXISTS idx_charity_leaderboards_type ON charity_leaderboards(leaderboard_type);
CREATE INDEX IF NOT EXISTS idx_charity_fund_transfers_charity_id ON charity_fund_transfers(charity_id);
CREATE INDEX IF NOT EXISTS idx_charity_fund_transfers_status ON charity_fund_transfers(status);
CREATE INDEX IF NOT EXISTS idx_user_charity_preferences_user_id ON user_charity_preferences(user_id);

-- Add updated_at triggers
CREATE TRIGGER update_charities_updated_at
    BEFORE UPDATE ON charities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charity_campaigns_updated_at
    BEFORE UPDATE ON charity_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charity_stream_participation_updated_at
    BEFORE UPDATE ON charity_stream_participation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charity_achievements_updated_at
    BEFORE UPDATE ON charity_achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_charity_preferences_updated_at
    BEFORE UPDATE ON user_charity_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default charity milestones
INSERT INTO charity_milestones (milestone_name, milestone_type, target_value, badge_icon, badge_color, description) VALUES
-- Donor Milestones
('First Drop', 'total_donated', 10.00, 'heart', '#FF69B4', 'Made your first charity donation'),
('Generous Heart', 'total_donated', 100.00, 'heart', '#FF1493', 'Donated $100 total to charity'),
('Philanthropist', 'total_donated', 500.00, 'star', '#FFD700', 'Donated $500 total to charity'),
('Hero of Hope', 'total_donated', 1000.00, 'crown', '#8A2BE2', 'Donated $1000 total to charity'),
('Champion of Change', 'total_donated', 5000.00, 'trophy', '#32CD32', 'Donated $5000 total to charity'),

-- Campaign Support Milestones
('Supporter', 'campaigns_supported', 1, 'handshake', '#4169E1', 'Supported your first charity campaign'),
('Advocate', 'campaigns_supported', 5, 'bullhorn', '#20B2AA', 'Supported 5 charity campaigns'),
('Ambassador', 'campaigns_supported', 10, 'shield', '#DC143C', 'Supported 10 charity campaigns'),

-- Stream Host Milestones
('First Stream', 'streams_hosted', 1, 'video', '#FF6347', 'Hosted your first charity stream'),
('Streamer', 'streams_hosted', 5, 'tv', '#4682B4', 'Hosted 5 charity streams'),
('Broadcaster', 'streams_hosted', 20, 'broadcast', '#FF4500', 'Hosted 20 charity streams'),
('Streaming Legend', 'streams_hosted', 50, 'mic', '#9932CC', 'Hosted 50 charity streams'),

-- Monthly Goals
('Monthly Hero', 'yearly_goal', 100.00, 'calendar', '#00CED1', 'Donated $100 in a single month'),
('Monthly Champion', 'yearly_goal', 500.00, 'calendar-check', '#FF8C00', 'Donated $500 in a single month')
ON CONFLICT DO NOTHING;

-- Insert sample verified charities (for testing)
INSERT INTO charities (organization_name, organization_type, registration_number, country, tax_id, website_url, contact_email, contact_person, mission_statement, description, focus_areas, verification_status, verification_date, is_active) VALUES
('Save the Children International', 'charity', 'SC001234', 'US', 'EIN: 53-0204657', 'https://www.savethechildren.org', 'info@savethechildren.org', 'Sarah Johnson', 'We fight for children every day and are inspired to make sure all children attain the right to survive, thrive and fulfill their potential to the last', 'Save the Children is a leading nonprofit organization for children, working in over 120 countries. We save children''s lives, fight for their rights and help them fulfil their potential.', '["education", "health", "protection", "emergency"]', 'verified', NOW(), true),
('World Wildlife Fund', 'charity', 'WWF001', 'US', 'EIN: 52-1693387', 'https://www.worldwildlife.org', 'contact@worldwildlife.org', 'Michael Chen', 'We conserve nature and reduce the most pressing threats to the diversity of life on Earth', 'WWF is the world''s leading conservation organization, working in 100 countries and supported by more than five million members worldwide.', '["environment", "conservation", "climate"]', 'verified', NOW(), true),
('Doctors Without Borders', 'nonprofit', 'MSF001', 'FR', 'FR-N/A', 'https://www.doctorswithoutborders.org', 'info@msf.org', 'Emma Rodriguez', 'Doctors Without Borders provides medical humanitarian assistance to people affected by conflict, epidemics, disasters, or excluded from healthcare', 'Doctors Without Borders is an international humanitarian medical non-governmental organization of French origin known for its projects in conflict zones and in countries affected by endemic diseases.', '["health", "emergency", "humanitarian"]', 'verified', NOW(), true),
('Habitat for Humanity', 'nonprofit', 'HFH001', 'US', 'EIN: 91-1914868', 'https://www.habitat.org', 'info@habitat.org', 'David Wilson', 'We help families build strength, stability and self-reliance through shelter', 'Habitat for Humanity is a nonprofit organization that helps families build and improve places to call home. We believe everyone deserves a decent place to live.', '["housing", "poverty", "community"]', 'verified', NOW(), true)
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE charities IS 'Verified charities and non-profits that can receive donations through the platform';
COMMENT ON TABLE charity_campaigns IS 'Specific crowdfunding campaigns created by verified charities';
COMMENT ON TABLE charity_donations IS 'Individual donations made to charity campaigns';
COMMENT ON TABLE charity_stream_participation IS 'Records of charity streams hosted by users';
COMMENT ON TABLE charity_milestones IS 'Achievement milestones and badge definitions for charity participation';
COMMENT ON TABLE charity_achievements IS 'User progress toward charity milestones and earned badges';
COMMENT ON TABLE charity_revenue_distributions IS 'Revenue distribution records for charity streams';
COMMENT ON TABLE charity_leaderboards IS 'Monthly and yearly leaderboards for charity participation';
COMMENT ON TABLE charity_fund_transfers IS 'Records of funds transferred to charities';
COMMENT ON TABLE user_charity_preferences IS 'User preferences for charity participation and notifications';

-- Grant necessary permissions (adjust based on your database setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stream_cult_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stream_cult_user;