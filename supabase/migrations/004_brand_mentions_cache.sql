-- ============================================================
-- Migration 004: Brand Context Cache & Mention Dedup
-- Supports the cost-efficient brand mentions pipeline
-- ============================================================

-- Brand context cache: stores ambiguity status + AI-generated context per brand
-- This table is the backbone of the cost optimization system
CREATE TABLE IF NOT EXISTS brand_context_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL UNIQUE,
    is_ambiguous BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    industry TEXT,
    keywords TEXT[] DEFAULT '{}',
    negative_contexts TEXT[] DEFAULT '{}',
    context_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast brand name lookups
CREATE INDEX IF NOT EXISTS idx_brand_context_name ON brand_context_cache(brand_name);

-- Mention hashes: prevents processing the same mention content twice
CREATE TABLE IF NOT EXISTS mention_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hash, brand_name)
);

CREATE INDEX IF NOT EXISTS idx_mention_hash ON mention_hashes(hash);
CREATE INDEX IF NOT EXISTS idx_mention_brand ON mention_hashes(brand_name);

-- Auto-cleanup: remove old mention hashes after 30 days to save storage
-- (mentions older than 30 days will be re-processable)
