// ============================================================
// Shared TypeScript Types — Word of Wow Platform
// ============================================================

// --- Enums / Literals ---

export type UserRole = 'advocate' | 'brand' | 'admin';
export type AdvocateTier = 'explorer';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type CampaignType = 'awareness' | 'engagement' | 'balanced';
export type Platform = 'reddit' | 'linkedin';
export type ContentType = 'post' | 'comment';
export type ScoringStatus = 'pending' | 'processing' | 'scored' | 'failed';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged_for_review';
export type FraudRiskLevel = 'none' | 'low' | 'medium' | 'high';
export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';

// --- Database Row Types ---

export interface Profile {
    id: string;
    role: UserRole;
    display_name: string;
    email: string;
    avatar_url: string | null;
    tier: AdvocateTier;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AdvocateProfile {
    id: string;
    reddit_username: string | null;
    linkedin_profile_url: string | null;
    trust_score: number;
    total_submissions: number;
    approved_submissions: number;
    fraud_flags: number;
    is_suspended: boolean;
    created_at: string;
    updated_at: string;
}

export interface BrandProfile {
    id: string;
    company_name: string;
    website_url: string | null;
    industry: string | null;
    logo_url: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Campaign {
    id: string;
    brand_id: string;
    title: string;
    description: string;
    guidelines: string | null;
    target_platforms: Platform[];
    campaign_type: CampaignType;
    status: CampaignStatus;
    max_submissions: number | null;
    min_score_threshold: number;
    keywords: string[];
    start_date: string | null;
    end_date: string | null;
    weight_content_quality: number;
    weight_brand_relevance: number;
    weight_authenticity: number;
    weight_engagement: number;
    weight_audience_relevance: number;
    created_at: string;
    updated_at: string;
}

export interface CouponTier {
    id: string;
    campaign_id: string;
    min_score: number;
    max_score: number;
    discount_percent: number;
    created_at: string;
}

export interface CouponCode {
    id: string;
    campaign_id: string;
    brand_id: string;
    tier_id: string;
    code: string;
    discount_percent: number;
    is_assigned: boolean;
    assigned_to: string | null;
    assigned_at: string | null;
    submission_id: string | null;
    expires_at: string | null;
    created_at: string;
}

export interface Submission {
    id: string;
    advocate_id: string;
    campaign_id: string;
    platform: Platform;
    content_type: ContentType;
    submitted_url: string;
    submitted_content: string | null;
    fetched_content: string | null;
    fetched_title: string | null;
    fetched_author: string | null;
    fetched_subreddit: string | null;
    fetched_upvotes: number | null;
    fetched_comments_count: number | null;
    fetched_at: string | null;
    score_content_quality: number | null;
    score_brand_relevance: number | null;
    score_authenticity: number | null;
    score_engagement: number | null;
    score_audience_relevance: number | null;
    score_fraud_penalty: number;
    score_final: number | null;
    score_reasoning: string | null;
    scoring_status: ScoringStatus;
    review_status: ReviewStatus;
    reviewed_by: string | null;
    review_notes: string | null;
    reviewed_at: string | null;
    fraud_risk_level: FraudRiskLevel;
    fraud_flags: string[] | null;
    reward_issued: boolean;
    coupon_code_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface TrustScoreHistory {
    id: string;
    advocate_id: string;
    previous_score: number | null;
    new_score: number | null;
    change_reason: string;
    submission_id: string | null;
    created_at: string;
}

export interface FraudLog {
    id: string;
    submission_id: string | null;
    advocate_id: string;
    fraud_type: string;
    severity: FraudSeverity;
    details: Record<string, unknown> | null;
    resolved: boolean;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
}

export interface AdminAction {
    id: string;
    admin_id: string;
    action_type: string;
    target_type: string;
    target_id: string;
    details: Record<string, unknown> | null;
    created_at: string;
}

// --- API Request/Response Types ---

export interface SignupRequest {
    email: string;
    password: string;
    role: 'advocate' | 'brand';
    displayName: string;
    companyName?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface CreateCampaignRequest {
    title: string;
    description: string;
    guidelines?: string;
    targetPlatforms: Platform[];
    campaignType: CampaignType;
    maxSubmissions?: number;
    minScoreThreshold?: number;
    keywords: string[];
    startDate?: string;
    endDate?: string;
    weights?: {
        contentQuality: number;
        brandRelevance: number;
        authenticity: number;
        engagement: number;
        audienceRelevance: number;
    };
    couponTiers?: {
        minScore: number;
        maxScore: number;
        discountPercent: number;
    }[];
}

export interface CreateSubmissionRequest {
    campaignId: string;
    url: string;
    platform: Platform;
    contentType: ContentType;
    content?: string;
}

export interface ReviewDecisionRequest {
    decision: 'approved' | 'rejected';
    notes: string;
}

export interface AuthUser {
    id: string;
    role: UserRole;
    email: string;
    displayName: string;
}

export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    code?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
