import { Worker, Job } from 'bullmq';
import redis from '../../lib/redis';
import { supabaseAdmin } from '../../lib/supabase';
import { assignCoupon } from '../../services/couponService';
import { trustScoreUpdateQueue } from '../queues';

interface RewardJobData {
    submissionId: string;
    campaignId: string;
    advocateId: string;
    finalScore: number;
}

async function processReward(job: Job<RewardJobData>) {
    const { submissionId, campaignId, advocateId, finalScore } = job.data;
    console.log(`[REWARD] Processing reward for submission ${submissionId}`);

    try {
        const couponResult = await assignCoupon(submissionId, campaignId, advocateId, finalScore);

        if (couponResult) {
            // Coupon assigned (couponService already updates submission.reward_issued and coupon_code_id)
            console.log(`[REWARD] ✅ Assigned coupon ${couponResult.code} (${couponResult.discountPercent}% off) to submission ${submissionId}`);
        } else {
            // No coupon available — mark reward_issued as false but don't block approval
            await supabaseAdmin
                .from('submissions')
                .update({ reward_issued: false })
                .eq('id', submissionId);
            console.warn(`[REWARD] ⚠️ No coupon available for submission ${submissionId}`);
        }
    } catch (err) {
        console.error(`[REWARD] Error assigning coupon for ${submissionId}:`, (err as Error).message);
        await supabaseAdmin
            .from('submissions')
            .update({ reward_issued: false })
            .eq('id', submissionId);
    }

    // Always trigger trust score update (even if coupon failed)
    await trustScoreUpdateQueue.add('update', {
        advocateId,
        submissionId,
    }, { priority: 1 });

    console.log(`[REWARD] Queued trust score update for advocate ${advocateId}`);
}

export function startRewardWorker() {
    const worker = new Worker('reward-processing', processReward, {
        connection: redis,
        concurrency: 2,
    });

    worker.on('completed', (job) => {
        console.log(`[REWARD] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[REWARD] Job ${job?.id} failed:`, err.message);
    });

    console.log('[REWARD] Worker started');
    return worker;
}
