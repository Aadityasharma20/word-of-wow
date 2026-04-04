import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, supabase } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// --- Validation Schemas ---
const signupSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['advocate', 'brand'], { errorMap: () => ({ message: 'Role must be advocate or brand' }) }),
    displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100),
    companyName: z.string().min(2).max(200).optional(),
}).refine(
    (data) => data.role !== 'brand' || data.companyName,
    { message: 'Company name is required for brand accounts', path: ['companyName'] }
);

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

// --- POST /api/auth/signup ---
router.post('/signup', authLimiter, validate(signupSchema), async (req: Request, res: Response) => {
    try {
        const { email, password, role, displayName, companyName } = req.body;
        console.log('[SIGNUP] Attempting signup for:', email, 'role:', role);

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            console.error('[SIGNUP] Auth creation failed:', authError.message);
            res.status(400).json({ error: authError.message, code: 400 });
            return;
        }

        const userId = authData.user.id;
        console.log('[SIGNUP] Auth user created:', userId);

        // Insert into profiles table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                role,
                display_name: displayName,
                email,
            });

        if (profileError) {
            console.error('[SIGNUP] Profile insert failed:', profileError.message, profileError.details, profileError.hint);
            await supabaseAdmin.auth.admin.deleteUser(userId);
            res.status(500).json({ error: 'Failed to create profile: ' + profileError.message, code: 500 });
            return;
        }

        console.log('[SIGNUP] Profile created for:', userId);

        // Insert into role-specific table
        if (role === 'advocate') {
            const { error } = await supabaseAdmin
                .from('advocate_profiles')
                .insert({ id: userId });

            if (error) {
                console.error('[SIGNUP] Advocate profile insert failed:', error.message, error.details, error.hint);
                await supabaseAdmin.from('profiles').delete().eq('id', userId);
                await supabaseAdmin.auth.admin.deleteUser(userId);
                res.status(500).json({ error: 'Failed to create advocate profile: ' + error.message, code: 500 });
                return;
            }
        } else if (role === 'brand') {
            const { error } = await supabaseAdmin
                .from('brand_profiles')
                .insert({ id: userId, company_name: companyName });

            if (error) {
                console.error('[SIGNUP] Brand profile insert failed:', error.message, error.details, error.hint);
                await supabaseAdmin.from('profiles').delete().eq('id', userId);
                await supabaseAdmin.auth.admin.deleteUser(userId);
                res.status(500).json({ error: 'Failed to create brand profile: ' + error.message, code: 500 });
                return;
            }
        }

        console.log('[SIGNUP] Role profile created. Done!');

        // Return user data — client will sign in directly via supabase.auth.signInWithPassword()
        res.status(201).json({
            data: {
                user: { id: userId, role, email, displayName },
            },
        });
    } catch (err: any) {
        console.error('[SIGNUP] Unexpected error:', err.message, err.stack);
        res.status(500).json({ error: 'Internal server error: ' + err.message, code: 500 });
    }
});

// --- POST /api/auth/login ---
router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Use the regular supabase client for sign-in (NOT supabaseAdmin, which would contaminate its context)
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            res.status(401).json({ error: 'Invalid email or password', code: 401 });
            return;
        }

        // Fetch profile to get role
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            res.status(500).json({ error: 'User profile not found', code: 500 });
            return;
        }

        res.json({
            data: {
                user: {
                    id: profile.id,
                    role: profile.role,
                    email: profile.email,
                    displayName: profile.display_name,
                },
                session: data.session,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- GET /api/auth/session ---
router.get('/session', authMiddleware, async (req: Request, res: Response) => {
    try {
        res.json({ data: { user: req.user } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

// --- POST /api/auth/logout ---
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            // Supabase doesn't have a server-side signout per token,
            // but we acknowledge the logout
        }
        res.json({ data: { message: 'Logged out successfully' } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error', code: 500 });
    }
});

export default router;
