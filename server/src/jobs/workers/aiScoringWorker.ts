import { Worker, Job } from 'bullmq';
import redis from '../../lib/redis';
import { supabaseAdmin } from '../../lib/supabase';
import { scoreSubmission } from '../../services/aiScoring';
import { fraudDetectionQueue } from '../queues';

interface AiScoringJobData {
    submissionId: string;
}

async function processAiScoring(job: Job<AiScoringJobData>) {
    const { submissionId } = job.data;
    console.log(`[AI-SCORING] Processing submission ${submissionId}`);

    // Fetch submission with campaign and brand data
    const { data: submission, error: subError } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

    if (subError || !submission) {
        throw new Error(`Submission ${submissionId} not found`);
    }

    const { data: campaign, error: campError } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', submission.campaign_id)
        .single();

    if (campError || !campaign) {
        throw new Error(`Campaign ${submission.campaign_id} not found`);
    }

    // Get brand info for industry context
    const { data: brand } = await supabaseAdmin
        .from('brand_profiles')
        .select('industry')
        .eq('id', campaign.brand_id)
        .single();

    // Count advocate's total submissions for context
    const { count: totalAdvocateSubmissions } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('advocate_id', submission.advocate_id);

    // Content to score (use fetched_content, fall back to submitted_content)
    const content = submission.fetched_content || submission.submitted_content;
    if (!content) {
        await supabaseAdmin
            .from('submissions')
            .update({ scoring_status: 'failed', review_notes: 'No content available to score' })
            .eq('id', submissionId);
        return;
    }

    try {
        // Run AI scoring across all 5 dimensions in parallel
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

        // Update submission with scores
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

        // Chain: add job to fraud detection queue
        await fraudDetectionQueue.add('detect', { submissionId }, { priority: 1 });
        console.log(`[AI-SCORING] ✅ Scored submission ${submissionId} (final: ${result.finalScore}), queued for fraud detection`);

    } catch (err) {
        const errorMsg = (err as Error).message;

        // Check if it's a JSON parse error (retry once, then fail)
        if (errorMsg.includes('JSON') && (job.attemptsMade || 0) >= 1) {
            await supabaseAdmin
                .from('submissions')
                .update({
                    scoring_status: 'failed',
                    review_notes: 'AI scoring failed: Invalid response from AI model',
                })
                .eq('id', submissionId);
            return;
        }

        // Let BullMQ retry for transient errors (timeouts, etc.)
        throw err;
    }
}

export function startAiScoringWorker() {
    const worker = new Worker('ai-scoring', processAiScoring, {
        connection: redis,
        concurrency: 3,
    });

    worker.on('completed', (job) => {
        console.log(`[AI-SCORING] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[AI-SCORING] Job ${job?.id} failed:`, err.message);
    });

    console.log('[AI-SCORING] Worker started');
    return worker;
}
