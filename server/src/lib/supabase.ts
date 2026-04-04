import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

console.log('[SUPABASE] URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING');
console.log('[SUPABASE] Service key:', supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING');
console.log('[SUPABASE] Anon key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');

// Admin client (uses service role key — bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Regular client (uses anon key — respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabaseUrl, supabaseAnonKey };
