import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { assignCoupon } from '../services/couponService';

const router = Router();

// --- Validation Schemas ---
const reviewDecisionSchema = z.object({
    decision: z.enum(['approved', 'rejected']),
    notes: z.string().min(1, 'Notes are required').max(2000),
});

// --- GET /api/admin/users ---
router.get('/users', authMiddleware, roleGuard('admin'), async (req: Request, res: Response) => {
    try {
        const { role, is_active, is_suspended, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });

        if (role) query = query.eq('role', role as string);
        if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

        query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

        const { data: profiles, error, count } = await query;

        if (error) {
            res.status(500).json({ error: 'Failed to fetch users', code: 500 });
            return;
        }

        // If filtering by suspension, fetch advocate profiles
        let result = profiles || [];
        if (is_suspended !== undefined) {
            const { data: advocates } = await supabaseAdmin
                .from('advocate_profiles')
                .select('id, trust_score, is_suspended')
                .eq('is_suspended', is_suspended === 'true');

            const advocateIds = new Set((advocates || []).map((a) => a.id));
            result = result.filter((p) => p.role !== 'advocate' || advocateIds.has(p.id));
        }

        // Enrich with advocate data
        const enriched = await Promise.all(result.map(async (profile) => {
            if (profile.role === 'advocate') {
                const { data: adv } = await supabaseAdmin
                    .from('advocate_profiles')
                    .select('trust_score, is_suspended, total_submissions, approved_submissions')
                    .eq('id', profile.id)
                    .single();
                return { ...profile, advocate_data: adv };
            }
            if (profile.role === 'brand') {
                const { data: brand } = await supabaseAdmin
                    .from('brand_profiles')
                    .select('company_name')
                    .eq('id', profile.id)
                    .single();
                return { ...profile, brand_data: brand };
            }
            return profile;
        }));

        res.json({
            data: enriched,
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil((count || 0) / limitNum),
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- PATCH /api/admin/users/:id/suspend ---
router.patch('/users/:id/suspend', authMiddleware, roleGuard('admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verify user is an advocate
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', id)
            .single();

        if (!profile || profile.role !== 'advocate') {
            res.status(400).json({ error: 'Can only suspend advocates', code: 400 });
            return;
        }

        const { error } = await supabaseAdmin
            .from('advocate_profiles')
            .update({ is_suspended: true, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            res.status(500).json({ error: 'Failed to suspend user', code: 500 });
            return;
        }

        // Log admin action
        await supabaseAdmin.from('admin_actions').insert({
            admin_id: req.user!.id,
            action_type: 'suspend_advocate',
            target_type: 'advocate_profile',
            target_id: id,
            details: { reason: req.body.reason || 'No reason provided' },
        });

        res.json({ data: { message: 'Advocate suspended', id } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- PATCH /api/admin/users/:id/unsuspend ---
router.patch('/users/:id/unsuspend', authMiddleware, roleGuard('admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('advocate_profiles')
            .update({ is_suspended: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            res.status(500).json({ error: 'Failed to unsuspend user', code: 500 });
            return;
        }

        await supabaseAdmin.from('admin_actions').insert({
            admin_id: req.user!.id,
            action_type: 'unsuspend_advocate',
            target_type: 'advocate_profile',
            target_id: id,
            details: { reason: req.body.reason || 'No reason provided' },
        });

        res.json({ data: { message: 'Advocate unsuspended', id } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/admin/review-queue ---
router.get('/review-queue', authMiddleware, roleGuard('admin'), async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        const { data: submissions, error, count } = await supabaseAdmin
            .from('submissions')
            .select('*', { count: 'exact' })
            .eq('review_status', 'flagged_for_review')
            .order('created_at', { ascending: true })
            .range(offset, offset + limitNum - 1);

        if (error) {
            res.status(500).json({ error: 'Failed to fetch review queue', code: 500 });
            return;
        }

        // Enrich with advocate trust score
        const enriched = await Promise.all((submissions || []).map(async (sub) => {
            const { data: advocate } = await supabaseAdmin
                .from('advocate_profiles')
                .select('trust_score')
                .eq('id', sub.advocate_id)
                .single();

            const { data: campaign } = await supabaseAdmin
                .from('campaigns')
                .select('title')
                .eq('id', sub.campaign_id)
                .single();

            return {
                ...sub,
                advocate_trust_score: advocate?.trust_score,
                campaign_title: campaign?.title,
            };
        }));

        res.json({
            data: enriched,
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil((count || 0) / limitNum),
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- POST /api/admin/review/:submissionId ---
router.post('/review/:submissionId', authMiddleware, roleGuard('admin'), validate(reviewDecisionSchema), async (req: Request, res: Response) => {
    try {
        const submissionId = req.params.submissionId as string;
        const { decision, notes } = req.body;

        // Fetch submission
        const { data: submission, error: fetchError } = await supabaseAdmin
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .single();

        if (fetchError || !submission) {
            res.status(404).json({ error: 'Submission not found', code: 404 });
            return;
        }

        // Update submission review status
        const updateData: any = {
            review_status: decision,
            reviewed_by: req.user!.id,
            review_notes: notes,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabaseAdmin
            .from('submissions')
            .update(updateData)
            .eq('id', submissionId);

        if (updateError) {
            res.status(500).json({ error: 'Failed to update submission', code: 500 });
            return;
        }

        // If approved and scored, assign coupon
        let couponResult = null;
        if (decision === 'approved' && submission.score_final !== null) {
            couponResult = await assignCoupon(
                submissionId,
                submission.campaign_id,
                submission.advocate_id,
                submission.score_final
            );
        }

        // Log admin action
        await supabaseAdmin.from('admin_actions').insert({
            admin_id: req.user!.id,
            action_type: `review_${decision}`,
            target_type: 'submission',
            target_id: submissionId,
            details: { notes, coupon_assigned: !!couponResult },
        });

        res.json({
            data: {
                message: `Submission ${decision}`,
                submissionId,
                coupon_assigned: couponResult,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/admin/actions ---
router.get('/actions', authMiddleware, roleGuard('admin'), async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        const { data, error, count } = await supabaseAdmin
            .from('admin_actions')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limitNum - 1);

        if (error) {
            res.status(500).json({ error: 'Failed to fetch admin actions', code: 500 });
            return;
        }

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

// --- GET /api/admin/queues ---
router.get('/queues', authMiddleware, roleGuard('admin'), async (_req: Request, res: Response) => {
    // BullMQ queues disabled — using direct pipeline (no Redis)
    res.json({ data: [], message: 'Using direct processing pipeline (no Redis queues)' });
});

export default router;
