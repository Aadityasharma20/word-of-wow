import { Worker, Job, ConnectionOptions } from 'bullmq';
import { getRedis } from '../../lib/redis';
import { supabaseAdmin } from '../../lib/supabase';
import { runFraudChecks, FraudFlag } from '../../services/fraudDetection';
import { rewardProcessingQueue } from '../queues';

interface FraudDetectionJobData {
    submissionId: string;
}

async function processFraudDetection(job: Job<FraudDetectionJobData>) {
    const { submissionId } = job.data;
    console.log(`[FRAUD-DETECTION] Processing submission ${submissionId}`);

    // Fetch submission
    const { data: submission, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

    if (error || !submission) {
        throw new Error(`Submission ${submissionId} not found`);
    }

    // Fetch campaign for threshold
    const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('min_score_threshold, auto_approve')
        .eq('id', submission.campaign_id)
        .single();

    const content = submission.fetched_content || submission.submitted_content || '';

    // Run all 6 fraud checks
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
        contentCreatedUtc: null, // Not stored separately, would need to be fetched
    });

    // Store fraud flags in submission
    const flagDescriptions = flags.map((f: FraudFlag) => `${f.type}: ${f.detail}`);

    await supabaseAdmin
        .from('submissions')
        .update({
            fraud_risk_level: riskLevel,
            fraud_flags: flagDescriptions.length > 0 ? flagDescriptions : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

    // Create fraud_logs entries for each flag
    if (flags.length > 0) {
        const fraudLogEntries = flags.map((flag: FraudFlag) => ({
            submission_id: submissionId,
            advocate_id: submission.advocate_id,
            fraud_type: flag.type,
            severity: flag.severity,
            details: { detail: flag.detail },
        }));

        await supabaseAdmin.from('fraud_logs').insert(fraudLogEntries);

        // Update advocate's fraud_flags count
        const { data: advocateProfile } = await supabaseAdmin
            .from('advocate_profiles')
            .select('fraud_flags')
            .eq('id', submission.advocate_id)
            .single();

        if (advocateProfile) {
            await supabaseAdmin
                .from('advocate_profiles')
                .update({
                    fraud_flags: (advocateProfile.fraud_flags || 0) + flags.length,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', submission.advocate_id);
        }
    }

    // ── Auto-Decision Logic ────────────────────────────────
    const finalScore = submission.score_final || 0;
    const threshold = campaign?.min_score_threshold || 60;
    const autoApprove = campaign?.auto_approve !== false; // default true

    if (riskLevel === 'high') {
        // Auto-reject
        await supabaseAdmin
            .from('submissions')
            .update({
                review_status: 'rejected',
                review_notes: `Auto-rejected: high fraud risk (${flagDescriptions.join('; ')})`,
                updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId);
        console.log(`[FRAUD-DETECTION] ❌ Auto-rejected submission ${submissionId} (high fraud risk)`);

    } else if (riskLevel === 'medium') {
        // Flag for admin review
        await supabaseAdmin
            .from('submissions')
            .update({
                review_status: 'flagged_for_review',
                review_notes: `Flagged for review: ${flagDescriptions.join('; ')}`,
                updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId);
        console.log(`[FRAUD-DETECTION] ⚠️ Flagged submission ${submissionId} for admin review`);

    } else if (finalScore >= threshold && autoApprove) {
        // Auto-approve → trigger reward
        await supabaseAdmin
            .from('submissions')
            .update({
                review_status: 'approved',
                review_notes: 'Auto-approved: passed all fraud checks and met score threshold',
                updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId);

        await rewardProcessingQueue.add('process', {
            submissionId,
            campaignId: submission.campaign_id,
            advocateId: submission.advocate_id,
            finalScore,
        }, { priority: 1 });

        console.log(`[FRAUD-DETECTION] ✅ Auto-approved submission ${submissionId} (score: ${finalScore})`);

    } else if (finalScore >= threshold && !autoApprove) {
        // Manual approval required — set to pending_brand_review
        await supabaseAdmin
            .from('submissions')
            .update({
                review_status: 'pending_brand_review',
                review_notes: 'Passed fraud checks. Awaiting brand approval.',
                updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId);
        console.log(`[FRAUD-DETECTION] ⏳ Submission ${submissionId} pending brand review (score: ${finalScore})`);

    } else {
        // Below threshold → reject
        await supabaseAdmin
            .from('submissions')
            .update({
                review_status: 'rejected',
                review_notes: `Score (${finalScore}) below campaign threshold (${threshold})`,
                updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId);
        console.log(`[FRAUD-DETECTION] ❌ Rejected submission ${submissionId} (score ${finalScore} < threshold ${threshold})`);
    }
}

export function startFraudDetectionWorker() {
    const worker = new Worker('fraud-detection', processFraudDetection, {
        connection: getRedis() as ConnectionOptions,
        concurrency: 3,
    });

    worker.on('completed', (job) => {
        console.log(`[FRAUD-DETECTION] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[FRAUD-DETECTION] Job ${job?.id} failed:`, err.message);
    });

    console.log('[FRAUD-DETECTION] Worker started');
    return worker;
}
