import { supabaseAdmin } from '../lib/supabase';

/**
 * Checks for submissions past their 48-hour auto-approve deadline
 * and auto-approves them with coupon assignment.
 * Runs every 15 minutes via setInterval.
 */
async function processAutoApprovals() {
    try {
        const now = new Date().toISOString();

        // Find submissions past their auto-approve deadline
        const { data: expired, error } = await supabaseAdmin
            .from('submissions')
            .select('*, campaigns(*)')
            .in('review_status', ['pending_brand_review'])
            .not('auto_approve_at', 'is', null)
            .lte('auto_approve_at', now)
            .limit(50);

        if (error || !expired || expired.length === 0) return;

        console.log(`[AUTO-APPROVE] Found ${expired.length} submissions past deadline`);

        for (const submission of expired) {
            try {
                // Auto-approve
                await supabaseAdmin.from('submissions').update({
                    review_status: 'approved',
                    review_notes: 'Auto-approved (48h brand review deadline expired)',
                    auto_approve_at: null,
                    updated_at: new Date().toISOString(),
                }).eq('id', submission.id);

                // Assign coupon based on platform
                const campaign = (submission as any).campaigns;
                if (!campaign) continue;

                if (submission.platform === 'instagram' || submission.platform === 'review') {
                    await assignFlatCouponFromJob(submission, campaign);
                } else {
                    // Reddit/LinkedIn - use score-based assignment
                    const { assignCoupon } = await import('../services/couponService');
                    await assignCoupon(
                        submission.id,
                        submission.campaign_id,
                        submission.advocate_id,
                        submission.score_final || 0
                    );
                }

                console.log(`[AUTO-APPROVE] Approved submission ${submission.id}`);
            } catch (err) {
                console.error(`[AUTO-APPROVE] Error processing ${submission.id}:`, (err as Error).message);
            }
        }
    } catch (err) {
        console.error('[AUTO-APPROVE] Job error:', (err as Error).message);
    }
}

async function assignFlatCouponFromJob(submission: any, campaign: any) {
    let targetPercent = 0;

    if (submission.platform === 'instagram') {
        const cfg = campaign.instagram_config || { couponPercent: 20 };
        targetPercent = cfg.couponPercent || 20;
    } else if (submission.platform === 'review') {
        const cfg = campaign.review_config || { writtenCouponPercent: 15, videoCouponPercent: 30 };
        targetPercent = submission.review_type === 'video'
            ? (cfg.videoCouponPercent || 30)
            : (cfg.writtenCouponPercent || 15);
    }
    if (targetPercent <= 0) return;

    const { data: coupon } = await supabaseAdmin
        .from('coupon_codes')
        .select('*')
        .eq('campaign_id', submission.campaign_id)
        .eq('discount_percent', targetPercent)
        .eq('is_assigned', false)
        .limit(1)
        .single();

    if (!coupon) {
        console.warn(`[AUTO-APPROVE] No ${targetPercent}% coupon for campaign ${submission.campaign_id}`);
        return;
    }

    await supabaseAdmin.from('coupon_codes').update({
        is_assigned: true,
        assigned_to: submission.advocate_id,
        assigned_at: new Date().toISOString(),
        submission_id: submission.id,
    }).eq('id', coupon.id).eq('is_assigned', false);

    await supabaseAdmin.from('submissions').update({
        reward_issued: true,
        coupon_code_id: coupon.id,
        updated_at: new Date().toISOString(),
    }).eq('id', submission.id);
}

/** Start the auto-approve interval (every 15 minutes) */
export function startAutoApproveJob() {
    console.log('[AUTO-APPROVE] ⏰ Started (checks every 15 minutes)');
    // Run once immediately
    processAutoApprovals();
    // Then every 15 minutes
    setInterval(processAutoApprovals, 15 * 60 * 1000);
}
