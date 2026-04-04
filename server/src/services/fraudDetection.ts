import { supabaseAdmin } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────

export interface FraudFlag {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detail: string;
}

export type FraudRiskLevel = 'none' | 'low' | 'medium' | 'high';

// ── Check 1: Duplicate URL ────────────────────────────────

export async function checkDuplicateURL(
    url: string,
    submissionId: string,
): Promise<FraudFlag | null> {
    const { count } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_url', url)
        .neq('id', submissionId);

    if (count && count > 0) {
        return {
            type: 'duplicate_url',
            severity: 'high',
            detail: `URL submitted ${count} time(s) before`,
        };
    }
    return null;
}

// ── Check 2: Submission Velocity ──────────────────────────
// Only flag if truly excessive (>8 in one hour)

export async function checkSubmissionVelocity(
    advocateId: string,
): Promise<FraudFlag | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('advocate_id', advocateId)
        .gte('created_at', oneHourAgo);

    if (count && count > 8) {
        return {
            type: 'high_velocity',
            severity: 'low',
            detail: `${count} submissions in the last hour`,
        };
    }
    return null;
}

// ── Check 3: Engagement Anomaly ───────────────────────────
// Only flag extreme cases (bot-like patterns)

export async function checkEngagementAnomaly(
    upvotes: number | null,
    comments: number | null,
    contentCreatedUtc: number | null,
): Promise<FraudFlag | null> {
    if (upvotes === null || comments === null) return null;

    // Extreme: 1000+ upvotes but 0-2 comments → almost certainly manipulated
    if (upvotes > 1000 && comments < 3) {
        return {
            type: 'engagement_anomaly',
            severity: 'medium',
            detail: `${upvotes} upvotes but only ${comments} comments`,
        };
    }

    return null;
}

// ── Main Fraud Analysis Function ──────────────────────────
// 
// No embeddings, no OpenAI calls. Just DB-based checks.
// This keeps fraud detection FREE and fast.

export async function runFraudChecks(params: {
    submissionId: string;
    advocateId: string;
    campaignId: string;
    url: string;
    content: string;
    platform: string;
    author: string;
    upvotes: number | null;
    commentsCount: number | null;
    contentCreatedUtc: number | null;
}): Promise<{ flags: FraudFlag[]; riskLevel: FraudRiskLevel }> {
    const [
        duplicateUrl,
        velocity,
        engagementAnomaly,
    ] = await Promise.all([
        checkDuplicateURL(params.url, params.submissionId),
        checkSubmissionVelocity(params.advocateId),
        checkEngagementAnomaly(params.upvotes, params.commentsCount, params.contentCreatedUtc),
    ]);

    const flags: FraudFlag[] = [
        ...(duplicateUrl ? [duplicateUrl] : []),
        ...(velocity ? [velocity] : []),
        ...(engagementAnomaly ? [engagementAnomaly] : []),
    ];

    const riskLevel = classifyRisk(flags);
    return { flags, riskLevel };
}

// ── Risk Classification (Relaxed) ─────────────────────────
// Only duplicate URLs (high severity) actually block a submission.
// Everything else is informational.

function classifyRisk(flags: FraudFlag[]): FraudRiskLevel {
    if (flags.length === 0) return 'none';

    const severities = flags.map((f) => f.severity);

    // Only critical flags (none currently) → high risk (auto-reject)
    if (severities.includes('critical')) return 'high';

    // Duplicate URL → high risk (auto-reject)
    if (severities.includes('high')) return 'high';

    // Medium or low flags → just low risk (passes through, no blocking)
    return 'low';
}
