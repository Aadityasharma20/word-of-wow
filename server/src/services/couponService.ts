import { supabaseAdmin } from '../lib/supabase';

interface CouponAssignmentResult {
    couponId: string;
    code: string;
    discountPercent: number;
    tierId: string;
}

/**
 * Assigns a coupon to an advocate based on their submission score.
 * Uses a database-level approach to prevent race conditions.
 *
 * @param submissionId - The submission that earned the coupon
 * @param campaignId - The campaign the submission belongs to
 * @param advocateId - The advocate to assign the coupon to
 * @param finalScore - The final score of the submission
 * @returns The assigned coupon details, or null if no coupon available
 */
export async function assignCoupon(
    submissionId: string,
    campaignId: string,
    advocateId: string,
    finalScore: number
): Promise<CouponAssignmentResult | null> {
    try {
        // 1. Find the coupon tier where finalScore falls between min_score and max_score
        const { data: tier, error: tierError } = await supabaseAdmin
            .from('coupon_tiers')
            .select('*')
            .eq('campaign_id', campaignId)
            .lte('min_score', finalScore)
            .gte('max_score', finalScore)
            .single();

        if (tierError || !tier) {
            console.log(`No matching coupon tier for score ${finalScore} in campaign ${campaignId}`);
            return null;
        }

        // 2. Find an unassigned coupon code in that tier
        //    We use a single atomic update to claim the coupon (preventing race conditions)
        //    First, find one unassigned code
        const { data: availableCoupon, error: couponError } = await supabaseAdmin
            .from('coupon_codes')
            .select('*')
            .eq('tier_id', tier.id)
            .eq('campaign_id', campaignId)
            .eq('is_assigned', false)
            .limit(1)
            .single();

        if (couponError || !availableCoupon) {
            // 3. No codes left — log warning
            console.warn(`No coupon codes available for tier ${tier.id} in campaign ${campaignId}. Brand needs to upload more codes.`);

            // Flag the submission so admin/brand knows
            await supabaseAdmin
                .from('submissions')
                .update({
                    review_notes: (await supabaseAdmin
                        .from('submissions')
                        .select('review_notes')
                        .eq('id', submissionId)
                        .single()
                    ).data?.review_notes
                        ? 'WARNING: No coupon codes available for this score tier.'
                        : 'WARNING: No coupon codes available for this score tier.',
                })
                .eq('id', submissionId);

            return null;
        }

        // 4. Atomically assign the coupon using an update with a WHERE clause
        //    This ensures no race condition: if another request already assigned this coupon,
        //    the update will match 0 rows
        const { data: assigned, error: assignError } = await supabaseAdmin
            .from('coupon_codes')
            .update({
                is_assigned: true,
                assigned_to: advocateId,
                assigned_at: new Date().toISOString(),
                submission_id: submissionId,
            })
            .eq('id', availableCoupon.id)
            .eq('is_assigned', false) // critical: ensures atomicity
            .select()
            .single();

        if (assignError || !assigned) {
            // Race condition: someone else claimed this coupon. Retry once.
            console.log('Race condition detected, retrying coupon assignment...');
            return assignCoupon(submissionId, campaignId, advocateId, finalScore);
        }

        // 5. Update submission: set reward_issued=true, coupon_code_id
        await supabaseAdmin
            .from('submissions')
            .update({
                reward_issued: true,
                coupon_code_id: assigned.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId);

        // 6. Return the coupon details
        return {
            couponId: assigned.id,
            code: assigned.code,
            discountPercent: assigned.discount_percent,
            tierId: tier.id,
        };
    } catch (err) {
        console.error('Error assigning coupon:', err);
        return null;
    }
}
