import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { submissionLimiter } from '../middleware/rateLimiter';
import { processSubmissionPipeline, stepReward } from '../jobs/pipeline';

const router = Router();

// --- Validation Schemas ---
const createSubmissionSchema = z.object({
    campaignId: z.string().uuid(),
    url: z.string().url('Invalid URL').optional(),
    platform: z.enum(['reddit', 'linkedin', 'instagram', 'review']),
    contentType: z.enum(['post', 'comment', 'story', 'reel', 'both', 'written_review', 'video_review']).default('post'),
    content: z.string().min(1).optional(),
    instagramHandle: z.string().min(1).optional(),
    instagramType: z.enum(['story', 'reel', 'both']).optional(),
    followerCount: z.number().int().min(0).optional(),
    proofScreenshotUrl: z.string().url().optional(),
    reviewType: z.enum(['written', 'video']).optional(),
});

// --- POST /api/submissions ---
router.post('/', authMiddleware, roleGuard('advocate'), submissionLimiter, validate(createSubmissionSchema), async (req: Request, res: Response) => {
    try {
        const {
            campaignId, url, platform, contentType, content,
            instagramHandle, instagramType, followerCount,
            proofScreenshotUrl, reviewType,
        } = req.body;
        const advocateId = req.user!.id;

        // Check suspension
        const { data: advocateProfile } = await supabaseAdmin
            .from('advocate_profiles')
            .select('is_suspended')
            .eq('id', advocateId)
            .single();

        if (!advocateProfile) {
            res.status(400).json({ error: 'Advocate profile not found', code: 400 });
            return;
        }
        if (advocateProfile.is_suspended) {
            res.status(403).json({ error: 'Your account is suspended', code: 403 });
            return;
        }

        // Fetch campaign
        const { data: campaign, error: campError } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campError || !campaign) {
            res.status(404).json({ error: 'Campaign not found', code: 404 });
            return;
        }
        if (campaign.status !== 'active') {
            res.status(400).json({ error: 'Campaign is not active', code: 400 });
            return;
        }
        if (campaign.brand_id === advocateId) {
            res.status(403).json({ error: 'Cannot submit to your own campaign', code: 403 });
            return;
        }
        if (!campaign.target_platforms.includes(platform)) {
            res.status(400).json({ error: `Campaign does not accept ${platform} submissions`, code: 400 });
            return;
        }

        // Instagram-specific validation
        if (platform === 'instagram') {
            if (!instagramHandle) {
                res.status(400).json({ error: 'Instagram handle is required', code: 400 });
                return;
            }
            const igConfig = campaign.instagram_config || { minFollowers: 200 };
            if (followerCount !== undefined && followerCount < (igConfig.minFollowers || 200)) {
                res.status(400).json({ error: `Minimum ${igConfig.minFollowers || 200} followers required`, code: 400 });
                return;
            }
        }

        // Reddit/LinkedIn URL validation
        if (platform === 'reddit' || platform === 'linkedin') {
            if (!url) {
                res.status(400).json({ error: 'URL is required for this platform', code: 400 });
                return;
            }
            if (platform === 'reddit' && !url.includes('reddit.com')) {
                res.status(400).json({ error: 'URL must be a reddit.com link', code: 400 });
                return;
            }
            if (platform === 'linkedin' && !url.includes('linkedin.com')) {
                res.status(400).json({ error: 'URL must be a linkedin.com link', code: 400 });
                return;
            }
        }

        // Duplicate URL check (only for URL-based)
        if (url) {
            const { data: existing } = await supabaseAdmin
                .from('submissions')
                .select('id')
                .eq('campaign_id', campaignId)
                .eq('submitted_url', url)
                .single();
            if (existing) {
                res.status(400).json({ error: 'This URL has already been submitted', code: 400 });
                return;
            }
        }

        // Max submissions check
        if (campaign.max_submissions) {
            const { count } = await supabaseAdmin
                .from('submissions')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', campaignId);
            if (count && count >= campaign.max_submissions) {
                res.status(400).json({ error: 'Campaign has reached maximum submissions', code: 400 });
                return;
            }
        }

        // Rate limit: 10/hr
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentCount } = await supabaseAdmin
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('advocate_id', advocateId)
            .gte('created_at', oneHourAgo);
        if (recentCount && recentCount >= 10) {
            res.status(429).json({ error: 'Maximum 10 submissions per hour', code: 429 });
            return;
        }

        // Compute estimated eyeballs
        let estimatedEyeballs = 0;
        if (platform === 'instagram') {
            const fc = followerCount || 0;
            if (instagramType === 'story') estimatedEyeballs = Math.round(fc * 0.08);
            else if (instagramType === 'reel') estimatedEyeballs = Math.round(fc * 0.25);
            else estimatedEyeballs = Math.round(fc * 0.25 + fc * 0.08);
        } else if (platform === 'review') {
            estimatedEyeballs = reviewType === 'video' ? 150 : 50;
        }

        // Determine auto_approve_at
        const approvalMode = campaign.approval_mode || 'auto';
        let autoApproveAt = null;
        if (approvalMode === 'manual') {
            autoApproveAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        }

        // Create submission
        const { data: submission, error: subError } = await supabaseAdmin
            .from('submissions')
            .insert({
                advocate_id: advocateId,
                campaign_id: campaignId,
                platform,
                content_type: contentType,
                submitted_url: url || null,
                submitted_content: content || null,
                scoring_status: 'pending',
                review_status: 'pending',
                instagram_handle: instagramHandle || null,
                instagram_type: instagramType || null,
                follower_count: followerCount || null,
                review_type: reviewType || null,
                proof_screenshot_url: proofScreenshotUrl || null,
                estimated_eyeballs: estimatedEyeballs,
                auto_approve_at: autoApproveAt,
            })
            .select()
            .single();

        if (subError) {
            console.error('[SUBMISSIONS] Insert failed:', subError.message);
            res.status(500).json({ error: 'Failed to create submission', code: 500 });
            return;
        }

        // Update advocate total_submissions
        try {
            const { data: curProfile } = await supabaseAdmin
                .from('advocate_profiles')
                .select('total_submissions')
                .eq('id', advocateId)
                .single();
            if (curProfile) {
                await supabaseAdmin
                    .from('advocate_profiles')
                    .update({ total_submissions: (curProfile.total_submissions || 0) + 1 })
                    .eq('id', advocateId);
            }
        } catch { /* non-critical */ }

        // Route to appropriate processing
        if (platform === 'reddit' || platform === 'linkedin') {
            // AI scoring pipeline
            processSubmissionPipeline(submission.id).catch(err => {
                console.error('[SUBMISSIONS] Pipeline error:', (err as Error).message);
            });
            console.log(`[SUBMISSIONS] Started pipeline for ${submission.id}`);
        } else {
            // Instagram / Review: no AI, handle by approval mode
            handleNonAIPlatform(submission, campaign).catch(err => {
                console.error('[SUBMISSIONS] Non-AI handler error:', (err as Error).message);
            });
        }

        res.status(201).json({ data: submission });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- Non-AI Platform Handler ---
async function handleNonAIPlatform(submission: any, campaign: any) {
    const mode = campaign.approval_mode || 'auto';

    // Mark as scored (no AI needed)
    await supabaseAdmin.from('submissions').update({
        scoring_status: 'scored',
        score_final: 100,
    }).eq('id', submission.id);

    if (mode === 'auto') {
        await supabaseAdmin.from('submissions').update({
            review_status: 'approved',
        }).eq('id', submission.id);
        await assignFlatCoupon(submission, campaign);
    } else if (mode === 'manual') {
        await supabaseAdmin.from('submissions').update({
            review_status: 'pending_brand_review',
        }).eq('id', submission.id);
    } else if (mode === 'wow_team') {
        await supabaseAdmin.from('submissions').update({
            review_status: 'pending_wow_review',
        }).eq('id', submission.id);
    }
}

// --- Flat Coupon Assignment ---
async function assignFlatCoupon(submission: any, campaign: any) {
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

    // Find unassigned coupon with matching %
    const { data: coupon } = await supabaseAdmin
        .from('coupon_codes')
        .select('*')
        .eq('campaign_id', submission.campaign_id)
        .eq('discount_percent', targetPercent)
        .eq('is_assigned', false)
        .limit(1)
        .single();

    if (!coupon) {
        console.warn(`[COUPON] No ${targetPercent}% coupon for campaign ${submission.campaign_id}`);
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

    console.log(`[COUPON] Assigned ${targetPercent}% coupon ${coupon.code} to ${submission.id}`);
}

// --- GET /api/submissions ---
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const {
            campaignId, status, scoringStatus,
            page = '1', limit = '20', sortBy = 'created_at', sortOrder = 'desc',
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        let query = supabaseAdmin.from('submissions').select('*', { count: 'exact' });

        if (req.user!.role === 'advocate') {
            query = query.eq('advocate_id', req.user!.id);
        } else if (req.user!.role === 'brand') {
            const { data: campaigns } = await supabaseAdmin
                .from('campaigns')
                .select('id')
                .eq('brand_id', req.user!.id);

            if (campaigns && campaigns.length > 0) {
                query = query.in('campaign_id', campaigns.map((c) => c.id));
            } else {
                res.json({ data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 });
                return;
            }
        }

        if (campaignId) query = query.eq('campaign_id', campaignId as string);
        if (status) query = query.eq('review_status', status as string);
        if (scoringStatus) query = query.eq('scoring_status', scoringStatus as string);

        const ascending = sortOrder === 'asc';
        query = query.order(sortBy as string, { ascending }).range(offset, offset + limitNum - 1);

        const { data, error, count } = await query;

        if (error) {
            res.status(500).json({ error: 'Failed to fetch submissions', code: 500 });
            return;
        }

        // Enrich with advocate name/email
        let enrichedData = data || [];
        if (enrichedData.length > 0) {
            const advocateIds = [...new Set(enrichedData.map((s: any) => s.advocate_id))];
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, display_name, email')
                .in('id', advocateIds);

            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
            enrichedData = enrichedData.map((s: any) => {
                const profile = profileMap.get(s.advocate_id);
                return {
                    ...s,
                    advocate_name: profile?.display_name || 'Anonymous',
                    advocate_email: profile?.email || '—',
                };
            });
        }

        res.json({
            data: enrichedData,
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil((count || 0) / limitNum),
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/submissions/:id ---
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: submission, error } = await supabaseAdmin
            .from('submissions')
            .select('*')
            .eq('id', id as string)
            .single();

        if (error || !submission) {
            res.status(404).json({ error: 'Submission not found', code: 404 });
            return;
        }

        if (req.user!.role === 'advocate' && submission.advocate_id !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }

        if (req.user!.role === 'brand') {
            const { data: camp } = await supabaseAdmin
                .from('campaigns')
                .select('brand_id')
                .eq('id', submission.campaign_id)
                .single();
            if (!camp || camp.brand_id !== req.user!.id) {
                res.status(403).json({ error: 'Forbidden', code: 403 });
                return;
            }
        }

        const { data: campaign } = await supabaseAdmin
            .from('campaigns')
            .select('title')
            .eq('id', submission.campaign_id)
            .single();

        let couponCode = null;
        let discountPercent = null;
        let couponExpiresAt = null;

        if (submission.coupon_code_id) {
            const { data: coupon } = await supabaseAdmin
                .from('coupon_codes')
                .select('code, expires_at, discount_percent')
                .eq('id', submission.coupon_code_id)
                .single();
            if (coupon) {
                couponCode = coupon.code;
                couponExpiresAt = coupon.expires_at;
                discountPercent = coupon.discount_percent || null;
            }
        }

        res.json({
            data: {
                ...submission,
                campaign_title: campaign?.title || '—',
                coupon_code: couponCode,
                discount_percent: discountPercent,
                coupon_expires_at: couponExpiresAt,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- PATCH /api/submissions/:id/review ---
// Manual approve/reject by brand OR admin (WoW team)
const reviewSchema = z.object({
    action: z.enum(['approve', 'reject']),
    notes: z.string().max(500).optional(),
});

router.patch('/:id/review', authMiddleware, roleGuard('brand', 'admin'), validate(reviewSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { action, notes } = req.body;

        const { data: submission, error: subErr } = await supabaseAdmin
            .from('submissions')
            .select('*')
            .eq('id', id)
            .single();

        if (subErr || !submission) {
            res.status(404).json({ error: 'Submission not found', code: 404 });
            return;
        }

        // Brand must own the campaign; Admin can review any
        if (req.user!.role === 'brand') {
            const { data: camp } = await supabaseAdmin
                .from('campaigns')
                .select('brand_id')
                .eq('id', submission.campaign_id)
                .single();
            if (!camp || camp.brand_id !== req.user!.id) {
                res.status(403).json({ error: 'Forbidden', code: 403 });
                return;
            }
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const reviewer = req.user!.role === 'admin' ? 'WoW Team' : 'Brand';
        const reviewNotes = notes || `${action === 'approve' ? 'Approved' : 'Rejected'} by ${reviewer}`;

        await supabaseAdmin.from('submissions').update({
            review_status: newStatus,
            review_notes: reviewNotes,
            auto_approve_at: null, // Clear timer
            updated_at: new Date().toISOString(),
        }).eq('id', id);

        // If approved, trigger reward
        if (action === 'approve') {
            const platform = submission.platform;
            if (platform === 'instagram' || platform === 'review') {
                // Flat coupon assignment
                const { data: camp } = await supabaseAdmin
                    .from('campaigns')
                    .select('*')
                    .eq('id', submission.campaign_id)
                    .single();
                if (camp) {
                    assignFlatCoupon(submission, camp).catch(err => {
                        console.error('[REVIEW] Flat coupon error:', (err as Error).message);
                    });
                }
            } else {
                // Score-based coupon for Reddit/LinkedIn
                stepReward(id as string, submission.campaign_id, submission.advocate_id, submission.score_final || 0).catch(err => {
                    console.error('[REVIEW] Reward error:', (err as Error).message);
                });
            }
        }

        res.json({ data: { id, review_status: newStatus, review_notes: reviewNotes } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

export default router;
