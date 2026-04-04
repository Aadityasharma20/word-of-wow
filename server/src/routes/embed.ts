import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

/* ═══════════════════════════════════════════════════════════
   EMBED SETTINGS API
   Stores and serves embed widget configurations per campaign.
   Uses the campaigns table + a JSON column for embed settings.
   ═══════════════════════════════════════════════════════════ */

interface EmbedSettings {
    stickyPill: { enabled: boolean; headline: string; cta: string; rewardText: string };
    exitIntent: { enabled: boolean; headline: string; subtext: string; cta: string };
    embedSection: { enabled: boolean; headline: string; description: string; cta: string };
    shareFlow: { enabled: boolean; suggestedText: string; hashtags: string };
}

const DEFAULT_EMBED: EmbedSettings = {
    stickyPill: {
        enabled: true,
        headline: '💬 Loved using this?',
        cta: 'Spread the Word of Wow & earn rewards',
        rewardText: 'Get exclusive discounts and offers!',
    },
    exitIntent: {
        enabled: true,
        headline: 'Before you go… Spread the Word of Wow 🎁',
        subtext: 'Share your experience and earn exciting rewards',
        cta: 'Share & Earn Rewards',
    },
    embedSection: {
        enabled: false,
        headline: '💡 Spread the Word of Wow',
        description: 'Share your honest experience and earn rewards',
        cta: 'Get Started',
    },
    shareFlow: {
        enabled: true,
        suggestedText: "I've been using {product} and it's amazing 🚀",
        hashtags: '#WordOfWow',
    },
};

/**
 * GET /api/embed/:campaignId
 * Public — no auth required. Returns embed settings for the SDK.
 */
router.get('/:campaignId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { campaignId } = req.params;

        const { data: campaign, error } = await supabaseAdmin
            .from('campaigns')
            .select('id, title, description, brand_id, status, embed_settings, profiles!campaigns_brand_id_fkey(company_name)')
            .eq('id', campaignId)
            .eq('status', 'active')
            .single();

        if (error || !campaign) {
            res.status(404).json({ error: 'Campaign not found or inactive', code: 404 });
            return;
        }

        const embedSettings = campaign.embed_settings || DEFAULT_EMBED;
        const brandName = (campaign as any).profiles?.company_name || 'this product';

        res.json({
            success: true,
            data: {
                campaignId: campaign.id,
                title: campaign.title,
                description: campaign.description,
                brandName,
                embedSettings,
                campaignUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/campaign/${campaign.id}`,
            },
        });
    } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to fetch embed settings');
        res.status(500).json({ error: 'Failed to fetch embed settings', code: 500 });
    }
});

/**
 * PATCH /api/embed/:campaignId
 * Updates embed settings for a campaign. Requires auth + brand ownership.
 */
router.patch('/:campaignId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'brand') {
            res.status(403).json({ error: 'Only brand users can update embed settings', code: 403 });
            return;
        }

        const { campaignId } = req.params;
        const { embedSettings } = req.body;

        // Verify ownership
        const { data: campaign, error: fetchErr } = await supabaseAdmin
            .from('campaigns')
            .select('id, brand_id')
            .eq('id', campaignId)
            .single();

        if (fetchErr || !campaign) {
            res.status(404).json({ error: 'Campaign not found', code: 404 });
            return;
        }

        if (campaign.brand_id !== req.user.id) {
            res.status(403).json({ error: 'You do not own this campaign', code: 403 });
            return;
        }

        const { error: updateErr } = await supabaseAdmin
            .from('campaigns')
            .update({ embed_settings: embedSettings })
            .eq('id', campaignId);

        if (updateErr) {
            // If embed_settings column doesn't exist, try adding it via RPC or just store as metadata
            logger.warn({ updateErr }, 'Could not update embed_settings — column may not exist. Storing in metadata.');
            // Fallback: store in campaign metadata
            const { error: metaErr } = await supabaseAdmin
                .from('campaigns')
                .update({ metadata: { embed_settings: embedSettings } } as any)
                .eq('id', campaignId);
            
            if (metaErr) {
                res.status(500).json({ error: 'Failed to save embed settings', code: 500 });
                return;
            }
        }

        logger.info({ campaignId, userId: req.user.id }, 'Embed settings updated');
        res.json({ success: true, data: embedSettings });
    } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to update embed settings');
        res.status(500).json({ error: 'Failed to update embed settings', code: 500 });
    }
});

export default router;
