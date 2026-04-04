import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { AuthUser } from '../../../shared/types';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized', code: 401 });
            return;
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            res.status(401).json({ error: 'Unauthorized', code: 401 });
            return;
        }

        // Fetch profile from profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            res.status(401).json({ error: 'User profile not found', code: 401 });
            return;
        }

        // Attach user to request
        req.user = {
            id: profile.id,
            role: profile.role,
            email: profile.email,
            displayName: profile.display_name,
        };

        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized', code: 401 });
    }
}
