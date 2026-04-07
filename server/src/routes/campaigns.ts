import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';

const router = Router();

// --- Validation Schemas ---
const couponTierSchema = z.object({
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100),
    discountPercent: z.number().int().min(1).max(100),
}).refine((data) => data.minScore < data.maxScore, {
    message: 'minScore must be less than maxScore',
});

const weightsSchema = z.object({
    contentQuality: z.number().min(0).max(1),
    brandRelevance: z.number().min(0).max(1),
    authenticity: z.number().min(0).max(1),
    engagement: z.number().min(0).max(1),
    audienceRelevance: z.number().min(0).max(1),
}).refine(
    (w) => Math.abs(w.contentQuality + w.brandRelevance + w.authenticity + w.engagement + w.audienceRelevance - 1.0) <= 0.05,
    { message: 'Weights must sum to 1.0 (±0.05 tolerance)' }
);

const instagramConfigSchema = z.object({
    minFollowers: z.number().int().min(0).default(200),
    requireStory: z.boolean().default(true),
    requireReel: z.boolean().default(true),
    couponPercent: z.number().int().min(1).max(100).default(20),
}).optional();

const reviewConfigSchema = z.object({
    writtenCouponPercent: z.number().int().min(1).max(100).default(15),
    videoCouponPercent: z.number().int().min(1).max(100).default(30),
    minWordCount: z.number().int().min(0).default(50),
}).optional();

const createCampaignSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
    guidelines: z.string().max(2000).optional(),
    targetPlatforms: z.array(z.enum(['reddit', 'linkedin', 'instagram', 'review'])).min(1, 'At least one platform required'),
    campaignType: z.enum(['awareness', 'engagement', 'balanced']),
    maxSubmissions: z.number().int().min(1).optional(),
    minScoreThreshold: z.number().min(40).max(95).default(60),
    keywords: z.array(z.string()).min(1, 'At least 1 keyword required').max(20, 'Maximum 20 keywords'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    weights: weightsSchema.optional(),
    couponTiers: z.array(couponTierSchema).min(1).optional(),
    autoApprove: z.boolean().default(true),
    approvalMode: z.enum(['auto', 'manual', 'wow_team']).default('auto'),
    instagramConfig: instagramConfigSchema,
    reviewConfig: reviewConfigSchema,
}).refine(
    (data) => !data.endDate || !data.startDate || new Date(data.endDate) > new Date(data.startDate),
    { message: 'End date must be after start date', path: ['endDate'] }
);

const updateCampaignSchema = z.object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(20).max(2000).optional(),
    guidelines: z.string().max(2000).optional(),
    targetPlatforms: z.array(z.enum(['reddit', 'linkedin', 'instagram', 'review'])).min(1).optional(),
    campaignType: z.enum(['awareness', 'engagement', 'balanced']).optional(),
    maxSubmissions: z.number().int().min(1).optional(),
    minScoreThreshold: z.number().min(40).max(95).optional(),
    keywords: z.array(z.string()).min(1).max(20).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    weights: weightsSchema.optional(),
    couponTiers: z.array(couponTierSchema).min(1).optional(),
    autoApprove: z.boolean().optional(),
    approvalMode: z.enum(['auto', 'manual', 'wow_team']).optional(),
    instagramConfig: instagramConfigSchema,
    reviewConfig: reviewConfigSchema,
});

const statusChangeSchema = z.object({
    status: z.enum(['active', 'paused', 'completed']),
});

const couponUploadSchema = z.object({
    tierId: z.string().uuid(),
    codes: z.array(z.string().min(1)).min(1, 'At least one code required'),
});

// Validate coupon tiers don't overlap
function validateTiersNoOverlap(tiers: { minScore: number; maxScore: number }[]): string | null {
    const sorted = [...tiers].sort((a, b) => a.minScore - b.minScore);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].minScore < sorted[i - 1].maxScore) {
            return 'Coupon tiers must not overlap';
        }
    }
    return null;
}

// Default coupon tiers
const DEFAULT_COUPON_TIERS = [
    { minScore: 60, maxScore: 69.99, discountPercent: 10 },
    { minScore: 70, maxScore: 79.99, discountPercent: 25 },
    { minScore: 80, maxScore: 89.99, discountPercent: 50 },
    { minScore: 90, maxScore: 100, discountPercent: 75 },
];

// --- POST /api/campaigns ---
router.post('/', authMiddleware, roleGuard('brand'), validate(createCampaignSchema), async (req: Request, res: Response) => {
    try {
        console.log('[CAMPAIGNS] POST /campaigns body:', JSON.stringify(req.body, null, 2));
        const {
            title, description, guidelines, targetPlatforms, campaignType,
            maxSubmissions, minScoreThreshold, keywords, startDate, endDate,
            weights, couponTiers, autoApprove, approvalMode,
            instagramConfig, reviewConfig,
        } = req.body;

        const brandId = req.user!.id;

        // Use default weights if not provided
        const w = weights || {
            contentQuality: 0.20,
            brandRelevance: 0.25,
            authenticity: 0.25,
            engagement: 0.15,
            audienceRelevance: 0.15,
        };

        // Use default coupon tiers if not provided
        const tiers = couponTiers || DEFAULT_COUPON_TIERS;

        // Validate tiers don't overlap
        const overlapError = validateTiersNoOverlap(tiers);
        if (overlapError) {
            res.status(400).json({ error: overlapError, code: 400 });
            return;
        }

        // Insert campaign
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from('campaigns')
            .insert({
                brand_id: brandId,
                title,
                description,
                guidelines: guidelines || null,
                target_platforms: targetPlatforms,
                campaign_type: campaignType,
                max_submissions: maxSubmissions || null,
                min_score_threshold: minScoreThreshold || 60,
                keywords,
                start_date: startDate || null,
                end_date: endDate || null,
                weight_content_quality: w.contentQuality,
                weight_brand_relevance: w.brandRelevance,
                weight_authenticity: w.authenticity,
                weight_engagement: w.engagement,
                weight_audience_relevance: w.audienceRelevance,
                auto_approve: autoApprove !== undefined ? autoApprove : true,
                approval_mode: approvalMode || 'auto',
                instagram_config: instagramConfig || null,
                review_config: reviewConfig || null,
            })
            .select()
            .single();

        if (campaignError) {
            console.error('[CAMPAIGNS] Insert failed:', campaignError.message, campaignError.details, campaignError.hint, campaignError.code);
            res.status(500).json({ error: 'Failed to create campaign: ' + campaignError.message, code: 500 });
            return;
        }

        // Insert coupon tiers
        const tierInserts = tiers.map((t: any) => ({
            campaign_id: campaign.id,
            min_score: t.minScore,
            max_score: t.maxScore,
            discount_percent: t.discountPercent,
        }));

        const { data: insertedTiers, error: tierError } = await supabaseAdmin
            .from('coupon_tiers')
            .insert(tierInserts)
            .select();

        if (tierError) {
            // Cleanup campaign on tier failure
            await supabaseAdmin.from('campaigns').delete().eq('id', campaign.id);
            res.status(500).json({ error: 'Failed to create coupon tiers', code: 500 });
            return;
        }

        res.status(201).json({
            data: { ...campaign, coupon_tiers: insertedTiers },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/campaigns ---
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { status, platform, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        let query = supabaseAdmin.from('campaigns').select('*', { count: 'exact' });

        // Role-based filtering
        if (req.user!.role === 'brand') {
            query = query.eq('brand_id', req.user!.id);
        } else if (req.user!.role === 'advocate') {
            query = query.eq('status', 'active');
        }
        // admin sees all

        if (status) {
            query = query.eq('status', status as string);
        }
        if (platform) {
            query = query.contains('target_platforms', [platform as string]);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('[CAMPAIGNS] GET / error:', error.message, error.code, error.details);
            res.status(500).json({ error: 'Failed to fetch campaigns', code: 500 });
            return;
        }

        console.log(`[CAMPAIGNS] GET / returning ${(data || []).length} campaigns for user ${req.user!.id} (role: ${req.user!.role})`);

        res.json({
            data,
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil((count || 0) / limitNum),
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/campaigns/:id ---
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: campaign, error } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !campaign) {
            res.status(404).json({ error: 'Campaign not found', code: 404 });
            return;
        }

        // Check access
        if (req.user!.role === 'brand' && campaign.brand_id !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }
        if (req.user!.role === 'advocate' && campaign.status !== 'active') {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }

        // Fetch coupon tiers
        const { data: tiers } = await supabaseAdmin
            .from('coupon_tiers')
            .select('*')
            .eq('campaign_id', id)
            .order('min_score', { ascending: true });

        // Fetch submission counts
        const { count: totalSubmissions } = await supabaseAdmin
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', id);

        const { count: approvedSubmissions } = await supabaseAdmin
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', id)
            .eq('review_status', 'approved');

        // Enrich tiers with coupon code counts
        const enrichedTiers = await Promise.all((tiers || []).map(async (tier: any) => {
            const { count: totalCodes } = await supabaseAdmin
                .from('coupon_codes')
                .select('*', { count: 'exact', head: true })
                .eq('tier_id', tier.id);

            const { count: assignedCodes } = await supabaseAdmin
                .from('coupon_codes')
                .select('*', { count: 'exact', head: true })
                .eq('tier_id', tier.id)
                .eq('is_assigned', true);

            return {
                ...tier,
                total_codes: totalCodes || 0,
                assigned_codes: assignedCodes || 0,
            };
        }));

        res.json({
            data: {
                ...campaign,
                coupon_tiers: enrichedTiers,
                submission_count: totalSubmissions || 0,
                approved_count: approvedSubmissions || 0,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- PATCH /api/campaigns/:id ---
router.patch('/:id', authMiddleware, roleGuard('brand', 'admin'), validate(updateCampaignSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Fetch current campaign
        const { data: campaign, error: fetchError } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !campaign) {
            res.status(404).json({ error: 'Campaign not found', code: 404 });
            return;
        }

        // Brand can only update own campaigns
        if (req.user!.role === 'brand' && campaign.brand_id !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }

        // Only draft or paused campaigns can be updated
        if (!['draft', 'paused'].includes(campaign.status)) {
            res.status(400).json({ error: 'Can only update draft or paused campaigns', code: 400 });
            return;
        }

        const {
            title, description, guidelines, targetPlatforms, campaignType,
            maxSubmissions, minScoreThreshold, keywords, startDate, endDate,
            weights, couponTiers,
        } = req.body;

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (guidelines !== undefined) updateData.guidelines = guidelines;
        if (targetPlatforms !== undefined) updateData.target_platforms = targetPlatforms;
        if (campaignType !== undefined) updateData.campaign_type = campaignType;
        if (maxSubmissions !== undefined) updateData.max_submissions = maxSubmissions;
        if (minScoreThreshold !== undefined) updateData.min_score_threshold = minScoreThreshold;
        if (keywords !== undefined) updateData.keywords = keywords;
        if (startDate !== undefined) updateData.start_date = startDate;
        if (endDate !== undefined) updateData.end_date = endDate;
        if (weights) {
            updateData.weight_content_quality = weights.contentQuality;
            updateData.weight_brand_relevance = weights.brandRelevance;
            updateData.weight_authenticity = weights.authenticity;
            updateData.weight_engagement = weights.engagement;
            updateData.weight_audience_relevance = weights.audienceRelevance;
        }

        updateData.updated_at = new Date().toISOString();

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('campaigns')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            res.status(500).json({ error: 'Failed to update campaign', code: 500 });
            return;
        }

        // Update coupon tiers if provided
        if (couponTiers) {
            const overlapError = validateTiersNoOverlap(couponTiers);
            if (overlapError) {
                res.status(400).json({ error: overlapError, code: 400 });
                return;
            }

            // Delete old tiers and insert new ones
            await supabaseAdmin.from('coupon_tiers').delete().eq('campaign_id', id);
            const tierInserts = couponTiers.map((t: any) => ({
                campaign_id: id,
                min_score: t.minScore,
                max_score: t.maxScore,
                discount_percent: t.discountPercent,
            }));
            await supabaseAdmin.from('coupon_tiers').insert(tierInserts);
        }

        // Fetch updated tiers
        const { data: tiers } = await supabaseAdmin
            .from('coupon_tiers')
            .select('*')
            .eq('campaign_id', id)
            .order('min_score', { ascending: true });

        res.json({ data: { ...updated, coupon_tiers: tiers } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- PATCH /api/campaigns/:id/status ---
router.patch('/:id/status', authMiddleware, roleGuard('brand', 'admin'), validate(statusChangeSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status: newStatus } = req.body;

        const { data: campaign, error } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !campaign) {
            res.status(404).json({ error: 'Campaign not found', code: 404 });
            return;
        }

        if (req.user!.role === 'brand' && campaign.brand_id !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }

        // Validate allowed transitions
        const allowedTransitions: Record<string, string[]> = {
            draft: ['active'],
            active: ['paused', 'completed'],
            paused: ['active', 'completed'],
        };

        if (!allowedTransitions[campaign.status]?.includes(newStatus)) {
            res.status(400).json({
                error: `Cannot transition from ${campaign.status} to ${newStatus}`,
                code: 400,
            });
            return;
        }

        // Activating requires at least 1 coupon tier with uploaded codes
        if (newStatus === 'active') {
            const { data: tiers } = await supabaseAdmin
                .from('coupon_tiers')
                .select('id')
                .eq('campaign_id', id);

            if (!tiers || tiers.length === 0) {
                res.status(400).json({ error: 'Campaign must have at least 1 coupon tier', code: 400 });
                return;
            }

            const { count } = await supabaseAdmin
                .from('coupon_codes')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', id);

            if (!count || count === 0) {
                res.status(400).json({
                    error: 'Campaign must have uploaded coupon codes before activation',
                    code: 400,
                });
                return;
            }
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('campaigns')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            res.status(500).json({ error: 'Failed to update campaign status', code: 500 });
            return;
        }

        res.json({ data: updated });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- POST /api/campaigns/:id/coupons/upload ---
router.post('/:id/coupons/upload', authMiddleware, roleGuard('brand', 'admin'), validate(couponUploadSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { tierId, codes } = req.body;

        // Verify campaign ownership
        const { data: campaign, error: campError } = await supabaseAdmin
            .from('campaigns')
            .select('brand_id')
            .eq('id', id)
            .single();

        if (campError || !campaign) {
            res.status(404).json({ error: 'Campaign not found', code: 404 });
            return;
        }

        if (req.user!.role === 'brand' && campaign.brand_id !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }

        // Verify tier belongs to this campaign
        const { data: tier, error: tierError } = await supabaseAdmin
            .from('coupon_tiers')
            .select('*')
            .eq('id', tierId)
            .eq('campaign_id', id)
            .single();

        if (tierError || !tier) {
            res.status(400).json({ error: 'Tier does not belong to this campaign', code: 400 });
            return;
        }

        // Bulk insert coupon codes
        const couponInserts = codes.map((code: string) => ({
            campaign_id: id,
            brand_id: campaign.brand_id,
            tier_id: tierId,
            code,
            discount_percent: tier.discount_percent,
            is_assigned: false,
        }));

        console.log(`[COUPONS] Inserting ${couponInserts.length} codes for tier ${tierId}. Sample:`, JSON.stringify(couponInserts[0]));

        const { data: insertedData, error: insertError } = await supabaseAdmin
            .from('coupon_codes')
            .insert(couponInserts)
            .select();

        if (insertError) {
            console.error('[COUPONS] Insert FAILED:', insertError.message, insertError.details, insertError.hint, insertError.code);
            res.status(500).json({ error: 'Failed to upload coupon codes: ' + insertError.message, code: 500 });
            return;
        }

        res.status(201).json({
            data: { count: codes.length, tierId, discountPercent: tier.discount_percent },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/campaigns/:id/coupons ---
router.get('/:id/coupons', authMiddleware, roleGuard('brand', 'admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verify access
        const { data: campaign, error: campError } = await supabaseAdmin
            .from('campaigns')
            .select('brand_id')
            .eq('id', id)
            .single();

        if (campError || !campaign) {
            res.status(404).json({ error: 'Campaign not found', code: 404 });
            return;
        }

        if (req.user!.role === 'brand' && campaign.brand_id !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }

        // Get tiers with coupon stats
        const { data: tiers } = await supabaseAdmin
            .from('coupon_tiers')
            .select('*')
            .eq('campaign_id', id)
            .order('min_score', { ascending: true });

        const tierStats = await Promise.all((tiers || []).map(async (tier) => {
            const { count: total } = await supabaseAdmin
                .from('coupon_codes')
                .select('*', { count: 'exact', head: true })
                .eq('tier_id', tier.id);

            const { count: assigned } = await supabaseAdmin
                .from('coupon_codes')
                .select('*', { count: 'exact', head: true })
                .eq('tier_id', tier.id)
                .eq('is_assigned', true);

            return {
                ...tier,
                total_codes: total || 0,
                assigned_codes: assigned || 0,
                available_codes: (total || 0) - (assigned || 0),
            };
        }));

        res.json({ data: tierStats });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/campaigns/:id/public --- (NO AUTH — for public campaign landing pages)
router.get('/:id/public', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Fetch campaign (active only) with brand info
        const { data: campaign, error } = await supabaseAdmin
            .from('campaigns')
            .select('id, title, description, guidelines, target_platforms, campaign_type, keywords, start_date, end_date, brand_id')
            .eq('id', id)
            .eq('status', 'active')
            .single();

        if (error || !campaign) {
            res.status(404).json({ error: 'Campaign not found or no longer active', code: 404 });
            return;
        }

        // Fetch brand info
        const { data: brandProfile } = await supabaseAdmin
            .from('brand_profiles')
            .select('company_name, logo_url, website_url, industry')
            .eq('id', campaign.brand_id)
            .single();

        // Fetch reward tiers
        const { data: tiers } = await supabaseAdmin
            .from('coupon_tiers')
            .select('min_score, max_score, discount_percent')
            .eq('campaign_id', id)
            .order('min_score', { ascending: true });

        // Fetch submission count for social proof
        const { count: submissionCount } = await supabaseAdmin
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', id);

        res.json({
            data: {
                id: campaign.id,
                title: campaign.title,
                description: campaign.description,
                guidelines: campaign.guidelines,
                platforms: campaign.target_platforms,
                campaignType: campaign.campaign_type,
                keywords: campaign.keywords,
                startDate: campaign.start_date,
                endDate: campaign.end_date,
                brand: {
                    name: brandProfile?.company_name || 'Brand',
                    logo: brandProfile?.logo_url || null,
                    website: brandProfile?.website_url || null,
                    industry: brandProfile?.industry || null,
                },
                rewardTiers: (tiers || []).map((t: any) => ({
                    minScore: t.min_score,
                    maxScore: t.max_score,
                    discountPercent: t.discount_percent,
                })),
                participantCount: submissionCount || 0,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

export default router;
