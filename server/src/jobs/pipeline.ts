/**
 * Direct submission processing pipeline — no Redis/BullMQ needed.
 * Runs contentFetch → aiScoring → fraudDetection → reward → trustScore
 * as direct async calls. Fire-and-forget from the API handler.
 */

import { supabaseAdmin } from '../lib/supabase';
import { isValidRedditUrl, processRedditSubmission } from '../services/reddit';
import { isValidLinkedInUrl, processLinkedInSubmission } from '../services/linkedin';
import { scoreSubmission } from '../services/aiScoring';
import { runFraudChecks, FraudFlag } from '../services/fraudDetection';
import { assignCoupon } from '../services/couponService';
import { calculateTrustScore } from '../services/trustScore';
import { estimateViews } from '../services/viewEstimation';

// ── Step 1: Content Fetch ─────────────────────────────────
async function stepContentFetch(submissionId: string) {
    console.log(`[PIPELINE] Step 1: Content fetch for ${submissionId}`);

    await supabaseAdmin
        .from('submissions')
        .update({ scoring_status: 'processing' })
        .eq('id', submissionId);

    const { data: submission, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

    if (error || !submission) throw new Error(`Submission ${submissionId} not found`);

    const platform = submission.platform as string;
    const url = submission.submitted_url as string;

    if (platform === 'reddit') {
        if (!isValidRedditUrl(url)) {
            await supabaseAdmin
                .from('submissions')
                .update({ scoring_status: 'failed', review_notes: 'Invalid Reddit URL format' })
                .eq('id', submissionId);
            return;
        }

        const { data: advocateProfile } = await supabaseAdmin
            .from('advocate_profiles')
            .select('reddit_username')
            .eq('id', submission.advocate_id)
            .single();

        const redditContent = processRedditSubmission(
            submission.submitted_content,
            url,
            advocateProfile?.reddit_username || null,
        );

        await supabaseAdmin
            .from('submissions')
            .update({
                fetched_content: redditContent.body,
                fetched_author: redditContent.author,
                fetched_subreddit: redditContent.subreddit,
                fetched_at: new Date().toISOString(),
            })
            .eq('id', submissionId);

    } else if (platform === 'linkedin') {
        if (!isValidLinkedInUrl(url)) {
            await supabaseAdmin
                .from('submissions')
                .update({ scoring_status: 'failed', review_notes: 'Invalid LinkedIn URL format' })
                .eq('id', submissionId);
            return;
        }

        const { data: advocateProfile } = await supabaseAdmin
            .from('advocate_profiles')
            .select('linkedin_profile_url')
            .eq('id', submission.advocate_id)
            .single();

        const linkedinContent = processLinkedInSubmission(
            submission.submitted_content,
            advocateProfile?.linkedin_profile_url || null,
        );

        await supabaseAdmin
            .from('submissions')
            .update({
                fetched_content: linkedinContent.body,
                fetched_author: linkedinContent.author,
                fetched_at: new Date().toISOString(),
            })
            .eq('id', submissionId);
    }

    // Compute estimated eyeballs using Serper-based view estimation
    const { data: updatedSub } = await supabaseAdmin
        .from('submissions').select('fetched_upvotes, fetched_comments_count, fetched_subreddit, platform, submitted_url, campaign_id').eq('id', submissionId).single();
    if (updatedSub) {
        // Get brand name for context search
        let brandName = '';
        try {
            const { data: campaign } = await supabaseAdmin
                .from('campaigns').select('brand_id').eq('id', updatedSub.campaign_id).single();
            if (campaign) {
                const { data: brand } = await supabaseAdmin
                    .from('brand_profiles').select('company_name').eq('id', campaign.brand_id).single();
                brandName = brand?.company_name || '';
            }
        } catch { /* brand name is optional */ }

        const eyeballs = await estimateViews(
            updatedSub.submitted_url || '',
            updatedSub.platform,
            updatedSub.fetched_upvotes || 0,
            updatedSub.fetched_comments_count || 0,
            brandName,
            updatedSub.fetched_subreddit || undefined,
        );

        if (eyeballs > 0) {
            await supabaseAdmin.from('submissions')
                .update({ estimated_eyeballs: eyeballs })
                .eq('id', submissionId);
        }
    }

    console.log(`[PIPELINE] Step 1 ✅ Content fetched for ${submissionId}`);
}

// ── Step 2: AI Scoring ────────────────────────────────────
async function stepAiScoring(submissionId: string) {
    console.log(`[PIPELINE] Step 2: AI scoring for ${submissionId}`);

    const { data: submission } = await supabaseAdmin
        .from('submissions').select('*').eq('id', submissionId).single();
    if (!submission) throw new Error(`Submission ${submissionId} not found`);

    const { data: campaign } = await supabaseAdmin
        .from('campaigns').select('*').eq('id', submission.campaign_id).single();
    if (!campaign) throw new Error(`Campaign ${submission.campaign_id} not found`);

    const { data: brand } = await supabaseAdmin
        .from('brand_profiles').select('industry').eq('id', campaign.brand_id).single();

    const { count: totalAdvocateSubmissions } = await supabaseAdmin
        .from('submissions').select('*', { count: 'exact', head: true }).eq('advocate_id', submission.advocate_id);

    const content = submission.fetched_content || submission.submitted_content;
    if (!content) {
        await supabaseAdmin.from('submissions')
            .update({ scoring_status: 'failed', review_notes: 'No content available to score' })
            .eq('id', submissionId);
        return;
    }

    const result = await scoreSubmission(
        {
            content,
            title: submission.fetched_title || null,
            platform: submission.platform,
            subreddit: submission.fetched_subreddit || null,
            upvotes: submission.fetched_upvotes,
            commentsCount: submission.fetched_comments_count,
            campaignDescription: campaign.description,
            campaignKeywords: campaign.keywords || [],
            campaignGuidelines: campaign.guidelines || null,
            brandIndustry: brand?.industry || null,
            totalAdvocateSubmissions: totalAdvocateSubmissions || 0,
        },
        {
            contentQuality: campaign.weight_content_quality,
            brandRelevance: campaign.weight_brand_relevance,
            authenticity: campaign.weight_authenticity,
            engagement: campaign.weight_engagement,
            audienceRelevance: campaign.weight_audience_relevance,
        },
    );

    await supabaseAdmin
        .from('submissions')
        .update({
            score_content_quality: result.contentQuality.score,
            score_brand_relevance: result.brandRelevance.score,
            score_authenticity: result.authenticity.score,
            score_engagement: result.engagementQuality.score,
            score_audience_relevance: result.audienceRelevance.score,
            score_final: result.finalScore,
            score_reasoning: result.combinedReasoning,
            scoring_status: 'scored',
            updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

    console.log(`[PIPELINE] Step 2 ✅ Scored ${submissionId} (final: ${result.finalScore})`);
}

// ── Step 3: Fraud Detection + Auto-Decision ────────────────
async function stepFraudDetection(submissionId: string) {
    console.log(`[PIPELINE] Step 3: Fraud detection for ${submissionId}`);

    const { data: submission } = await supabaseAdmin
        .from('submissions').select('*').eq('id', submissionId).single();
    if (!submission) throw new Error(`Submission ${submissionId} not found`);

    const { data: campaign } = await supabaseAdmin
        .from('campaigns').select('min_score_threshold, auto_approve').eq('id', submission.campaign_id).single();

    const content = submission.fetched_content || submission.submitted_content || '';

    const { flags, riskLevel } = await runFraudChecks({
        submissionId,
        advocateId: submission.advocate_id,
        campaignId: submission.campaign_id,
        url: submission.submitted_url,
        content,
        platform: submission.platform,
        author: submission.fetched_author || 'unknown',
        upvotes: submission.fetched_upvotes,
        commentsCount: submission.fetched_comments_count,
        contentCreatedUtc: null,
    });

    const flagDescriptions = flags.map((f: FraudFlag) => `${f.type}: ${f.detail}`);

    await supabaseAdmin.from('submissions')
        .update({
            fraud_risk_level: riskLevel,
            fraud_flags: flagDescriptions.length > 0 ? flagDescriptions : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

    if (flags.length > 0) {
        const fraudLogEntries = flags.map((flag: FraudFlag) => ({
            submission_id: submissionId,
            advocate_id: submission.advocate_id,
            fraud_type: flag.type,
            severity: flag.severity,
            details: { detail: flag.detail },
        }));
        await supabaseAdmin.from('fraud_logs').insert(fraudLogEntries);

        const { data: advocateProfile } = await supabaseAdmin
            .from('advocate_profiles').select('fraud_flags').eq('id', submission.advocate_id).single();
        if (advocateProfile) {
            await supabaseAdmin.from('advocate_profiles')
                .update({ fraud_flags: (advocateProfile.fraud_flags || 0) + flags.length, updated_at: new Date().toISOString() })
                .eq('id', submission.advocate_id);
        }
    }

    const finalScore = submission.score_final || 0;
    const threshold = campaign?.min_score_threshold || 60;
    const autoApprove = campaign?.auto_approve !== false;

    if (riskLevel === 'high') {
        await supabaseAdmin.from('submissions')
            .update({ review_status: 'rejected', review_notes: `Auto-rejected: high fraud risk (${flagDescriptions.join('; ')})`, updated_at: new Date().toISOString() })
            .eq('id', submissionId);
        console.log(`[PIPELINE] Step 3 ❌ Auto-rejected ${submissionId} (high fraud risk)`);

    } else if (riskLevel === 'medium') {
        await supabaseAdmin.from('submissions')
            .update({ review_status: 'flagged_for_review', review_notes: `Flagged for review: ${flagDescriptions.join('; ')}`, updated_at: new Date().toISOString() })
            .eq('id', submissionId);
        console.log(`[PIPELINE] Step 3 ⚠️ Flagged ${submissionId} for review`);

    } else if (finalScore >= threshold && autoApprove) {
        await supabaseAdmin.from('submissions')
            .update({ review_status: 'approved', review_notes: 'Auto-approved: passed all fraud checks and met score threshold', updated_at: new Date().toISOString() })
            .eq('id', submissionId);
        // Trigger reward
        await stepReward(submissionId, submission.campaign_id, submission.advocate_id, finalScore);
        console.log(`[PIPELINE] Step 3 ✅ Auto-approved ${submissionId} (score: ${finalScore})`);

    } else if (finalScore >= threshold && !autoApprove) {
        await supabaseAdmin.from('submissions')
            .update({ review_status: 'pending_brand_review', review_notes: 'Passed fraud checks. Awaiting brand approval.', updated_at: new Date().toISOString() })
            .eq('id', submissionId);
        console.log(`[PIPELINE] Step 3 ⏳ ${submissionId} pending brand review (score: ${finalScore})`);

    } else {
        await supabaseAdmin.from('submissions')
            .update({ review_status: 'rejected', review_notes: `Score (${finalScore}) below campaign threshold (${threshold})`, updated_at: new Date().toISOString() })
            .eq('id', submissionId);
        console.log(`[PIPELINE] Step 3 ❌ Rejected ${submissionId} (score ${finalScore} < threshold ${threshold})`);
    }
}

// ── Step 4: Reward Assignment ──────────────────────────────
export async function stepReward(submissionId: string, campaignId: string, advocateId: string, finalScore: number) {
    console.log(`[PIPELINE] Step 4: Reward for ${submissionId}`);
    try {
        const couponResult = await assignCoupon(submissionId, campaignId, advocateId, finalScore);
        if (couponResult) {
            console.log(`[PIPELINE] Step 4 ✅ Assigned coupon ${couponResult.code} (${couponResult.discountPercent}% off)`);
        } else {
            await supabaseAdmin.from('submissions').update({ reward_issued: false }).eq('id', submissionId);
            console.warn(`[PIPELINE] Step 4 ⚠️ No coupon available for ${submissionId}`);
        }
    } catch (err) {
        console.error(`[PIPELINE] Step 4 error:`, (err as Error).message);
        await supabaseAdmin.from('submissions').update({ reward_issued: false }).eq('id', submissionId);
    }

    // Always update trust score
    await stepTrustScore(advocateId, submissionId);
}

// ── Step 5: Trust Score Update ─────────────────────────────
async function stepTrustScore(advocateId: string, submissionId: string) {
    console.log(`[PIPELINE] Step 5: Trust score for advocate ${advocateId}`);
    try {
        const { data: currentProfile } = await supabaseAdmin
            .from('advocate_profiles')
            .select('trust_score')
            .eq('id', advocateId)
            .single();

        const previousScore = currentProfile?.trust_score || 50.00;
        const newScore = await calculateTrustScore(advocateId);

        const { count: approvedCount } = await supabaseAdmin
            .from('submissions').select('*', { count: 'exact', head: true })
            .eq('advocate_id', advocateId).eq('review_status', 'approved');

        const { count: totalCount } = await supabaseAdmin
            .from('submissions').select('*', { count: 'exact', head: true })
            .eq('advocate_id', advocateId);

        await supabaseAdmin.from('advocate_profiles')
            .update({
                trust_score: newScore,
                total_submissions: totalCount || 0,
                approved_submissions: approvedCount || 0,
                updated_at: new Date().toISOString(),
            })
            .eq('id', advocateId);

        await supabaseAdmin.from('trust_score_history').insert({
            advocate_id: advocateId,
            previous_score: previousScore,
            new_score: newScore,
            change_reason: `Score updated after submission ${submissionId} was processed`,
            submission_id: submissionId,
        });

        console.log(`[PIPELINE] Step 5 ✅ Trust score: ${previousScore} → ${newScore}`);
    } catch (err) {
        console.error(`[PIPELINE] Step 5 error:`, (err as Error).message);
    }
}

// ── Main Pipeline ──────────────────────────────────────────
/**
 * Process a submission through the entire pipeline.
 * Called fire-and-forget from the submission API handler.
 */
export async function processSubmissionPipeline(submissionId: string) {
    console.log(`[PIPELINE] ▶ Starting pipeline for submission ${submissionId}`);
    try {
        await stepContentFetch(submissionId);
        await stepAiScoring(submissionId);
        await stepFraudDetection(submissionId);
        console.log(`[PIPELINE] ✅ Pipeline completed for ${submissionId}`);
    } catch (err) {
        console.error(`[PIPELINE] ❌ Pipeline failed for ${submissionId}:`, (err as Error).message);
        // Mark submission as failed
        await supabaseAdmin
            .from('submissions')
            .update({ scoring_status: 'failed', review_notes: `Pipeline error: ${(err as Error).message}` })
            .eq('id', submissionId);
    }
}
