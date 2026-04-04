import { Worker, Job } from 'bullmq';
import redis from '../../lib/redis';
import { supabaseAdmin } from '../../lib/supabase';
import { calculateTrustScore } from '../../services/trustScore';

interface TrustScoreJobData {
    advocateId: string;
    submissionId: string;
}

async function processTrustScoreUpdate(job: Job<TrustScoreJobData>) {
    const { advocateId, submissionId } = job.data;
    console.log(`[TRUST-SCORE] Recalculating trust score for advocate ${advocateId}`);

    // Fetch current trust score
    const { data: currentProfile } = await supabaseAdmin
        .from('advocate_profiles')
        .select('trust_score, total_submissions, approved_submissions')
        .eq('id', advocateId)
        .single();

    const previousScore = currentProfile?.trust_score || 50.00;

    // Calculate new trust score
    const newScore = await calculateTrustScore(advocateId);

    // Update advocate_profiles
    // Recount approved submissions accurately
    const { count: approvedCount } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('advocate_id', advocateId)
        .eq('review_status', 'approved');

    const { count: totalCount } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('advocate_id', advocateId);

    await supabaseAdmin
        .from('advocate_profiles')
        .update({
            trust_score: newScore,
            total_submissions: totalCount || 0,
            approved_submissions: approvedCount || 0,
            updated_at: new Date().toISOString(),
        })
        .eq('id', advocateId);

    // Track history
    const changeReason = newScore > previousScore
        ? `Score increased after submission ${submissionId} was processed`
        : newScore < previousScore
            ? `Score decreased after submission ${submissionId} was processed`
            : `Score unchanged after submission ${submissionId} was processed`;

    await supabaseAdmin.from('trust_score_history').insert({
        advocate_id: advocateId,
        previous_score: previousScore,
        new_score: newScore,
        change_reason: changeReason,
        submission_id: submissionId,
    });

    console.log(`[TRUST-SCORE] ✅ Updated advocate ${advocateId}: ${previousScore} → ${newScore}`);
}

export function startTrustScoreWorker() {
    const worker = new Worker('trust-score-update', processTrustScoreUpdate, {
        connection: redis,
        concurrency: 2,
    });

    worker.on('completed', (job) => {
        console.log(`[TRUST-SCORE] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[TRUST-SCORE] Job ${job?.id} failed:`, err.message);
    });

    console.log('[TRUST-SCORE] Worker started');
    return worker;
}
