-- ============================================================
-- Word of Wow — Complete Database Migration
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- =====================
-- MIGRATION 1: Core Tables
-- =====================

-- Enable pgvector for Agent 2 (embedding similarity)
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('advocate', 'brand', 'admin')),
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    tier TEXT NOT NULL DEFAULT 'explorer' CHECK (tier IN ('explorer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advocate Profiles
CREATE TABLE advocate_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    reddit_username TEXT,
    linkedin_profile_url TEXT,
    trust_score NUMERIC(5,2) DEFAULT 50.00,
    total_submissions INTEGER DEFAULT 0,
    approved_submissions INTEGER DEFAULT 0,
    fraud_flags INTEGER DEFAULT 0,
    is_suspended BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Profiles
CREATE TABLE brand_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    website_url TEXT,
    industry TEXT,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brand_profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    guidelines TEXT,
    target_platforms TEXT[] NOT NULL DEFAULT '{reddit,linkedin}',
    campaign_type TEXT NOT NULL DEFAULT 'awareness'
        CHECK (campaign_type IN ('awareness', 'engagement', 'balanced')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    max_submissions INTEGER,
    min_score_threshold NUMERIC(5,2) DEFAULT 60.00,
    keywords TEXT[],
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    -- Scoring weight customization (must sum to 1.0)
    weight_content_quality NUMERIC(3,2) DEFAULT 0.20,
    weight_brand_relevance NUMERIC(3,2) DEFAULT 0.25,
    weight_authenticity NUMERIC(3,2) DEFAULT 0.25,
    weight_engagement NUMERIC(3,2) DEFAULT 0.15,
    weight_audience_relevance NUMERIC(3,2) DEFAULT 0.15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Discount Tiers (score-to-discount mapping per campaign)
CREATE TABLE coupon_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Codes (pool uploaded by brand, assigned to advocates on approval)
CREATE TABLE coupon_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brand_profiles(id),
    tier_id UUID NOT NULL REFERENCES coupon_tiers(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_percent INTEGER NOT NULL,
    is_assigned BOOLEAN DEFAULT false,
    assigned_to UUID REFERENCES advocate_profiles(id),
    assigned_at TIMESTAMPTZ,
    submission_id UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    platform TEXT NOT NULL CHECK (platform IN ('reddit', 'linkedin')),
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment')),
    submitted_url TEXT NOT NULL,
    submitted_content TEXT,
    -- Fetched content snapshot (populated by Agent 2)
    fetched_content TEXT,
    fetched_title TEXT,
    fetched_author TEXT,
    fetched_subreddit TEXT,
    fetched_upvotes INTEGER,
    fetched_comments_count INTEGER,
    fetched_at TIMESTAMPTZ,
    -- Scoring (populated by Agent 2)
    score_content_quality NUMERIC(5,2),
    score_brand_relevance NUMERIC(5,2),
    score_authenticity NUMERIC(5,2),
    score_engagement NUMERIC(5,2),
    score_audience_relevance NUMERIC(5,2),
    score_fraud_penalty NUMERIC(5,2) DEFAULT 0,
    score_final NUMERIC(5,2),
    score_reasoning TEXT,
    scoring_status TEXT DEFAULT 'pending'
        CHECK (scoring_status IN ('pending', 'processing', 'scored', 'failed')),
    -- Review
    review_status TEXT DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected', 'flagged_for_review')),
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    -- Fraud
    fraud_risk_level TEXT DEFAULT 'none'
        CHECK (fraud_risk_level IN ('none', 'low', 'medium', 'high')),
    fraud_flags TEXT[],
    -- Reward
    reward_issued BOOLEAN DEFAULT false,
    coupon_code_id UUID REFERENCES coupon_codes(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Score History
CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    previous_score NUMERIC(5,2),
    new_score NUMERIC(5,2),
    change_reason TEXT NOT NULL,
    submission_id UUID REFERENCES submissions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud Logs
CREATE TABLE fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id),
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    fraud_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submission Embeddings (for Agent 2 similarity detection)
CREATE TABLE submission_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Actions Log
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- MIGRATION 2: Indexes
-- =====================

CREATE INDEX idx_submissions_advocate ON submissions(advocate_id);
CREATE INDEX idx_submissions_campaign ON submissions(campaign_id);
CREATE INDEX idx_submissions_review_status ON submissions(review_status);
CREATE INDEX idx_submissions_scoring_status ON submissions(scoring_status);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_fraud_logs_submission ON fraud_logs(submission_id);
CREATE INDEX idx_fraud_logs_advocate ON fraud_logs(advocate_id);
CREATE INDEX idx_trust_history_advocate ON trust_score_history(advocate_id);
CREATE INDEX idx_coupon_codes_campaign ON coupon_codes(campaign_id);
CREATE INDEX idx_coupon_codes_tier ON coupon_codes(tier_id);
CREATE INDEX idx_coupon_codes_unassigned ON coupon_codes(campaign_id, tier_id) WHERE is_assigned = false;
CREATE INDEX idx_coupon_tiers_campaign ON coupon_tiers(campaign_id);
CREATE INDEX idx_submission_embeddings_advocate ON submission_embeddings(advocate_id);

-- =====================
-- MIGRATION 3: RLS Policies
-- =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE advocate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_tiers ENABLE ROW LEVEL SECURITY;

-- Profiles: users read own, admins read all
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Advocates: read own, admins read all
CREATE POLICY advocate_select ON advocate_profiles FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Brands: read own, admins read all, advocates read brand name/logo for campaigns
CREATE POLICY brand_select ON brand_profiles FOR SELECT USING (true);
CREATE POLICY brand_update ON brand_profiles FOR UPDATE USING (auth.uid() = id);

-- Campaigns: active visible to all, brand manages own
CREATE POLICY campaigns_select ON campaigns FOR SELECT USING (
    status = 'active' OR
    brand_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY campaigns_insert ON campaigns FOR INSERT WITH CHECK (brand_id = auth.uid());
CREATE POLICY campaigns_update ON campaigns FOR UPDATE USING (
    brand_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Submissions: advocate sees own, brand sees their campaign's, admin sees all
CREATE POLICY submissions_select ON submissions FOR SELECT USING (
    advocate_id = auth.uid() OR
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = submissions.campaign_id AND campaigns.brand_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY submissions_insert ON submissions FOR INSERT WITH CHECK (advocate_id = auth.uid());

-- Coupon codes: advocate sees own assigned, brand sees campaign's, admin sees all
CREATE POLICY coupon_codes_select ON coupon_codes FOR SELECT USING (
    assigned_to = auth.uid() OR
    brand_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
