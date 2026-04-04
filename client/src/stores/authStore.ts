import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthUser {
    id: string;
    role: 'advocate' | 'brand' | 'admin';
    email: string;
    displayName: string;
}

interface AuthState {
    user: AuthUser | null;
    session: any | null;
    isLoading: boolean;
    error: string | null;
    signup: (email: string, password: string, role: 'advocate' | 'brand', displayName: string, companyName?: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    error: null,

    signup: async (email, password, role, displayName, companyName) => {
        try {
            set({ isLoading: true, error: null });

            // Use server API — it creates user with email_confirm: true and returns a session
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const res = await fetch(`${baseUrl}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role, displayName, companyName }),
                signal: AbortSignal.timeout(30000),
            }).catch(() => {
                throw new Error('Server is waking up — please wait 30 seconds and try again.');
            });

            const json = await res.json();

            if (!res.ok) {
                const msg = json.error || 'Signup failed';
                set({ error: msg, isLoading: false });
                throw new Error(msg);
            }

            // Sign in directly on the client (server already created + confirmed the user)
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                console.error('Post-signup sign-in error:', signInError.message);
            }

            const user: AuthUser = {
                id: json.data.user.id,
                role: json.data.user.role,
                email: json.data.user.email,
                displayName: json.data.user.displayName,
            };
            set({ user, session: signInData?.session || null, isLoading: false });
        } catch (err: any) {
            const message = err.message || 'Signup failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    signInWithGoogle: async () => {
        try {
            set({ isLoading: true, error: null });
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) {
                set({ error: error.message, isLoading: false });
                throw new Error(error.message);
            }
            // Browser will redirect to Google — no further code runs here
        } catch (err: any) {
            const message = err.message || 'Google sign-in failed';
            set({ error: message, isLoading: false });
        }
    },

    login: async (email, password) => {
        try {
            set({ isLoading: true, error: null });

            // Sign in on the client first to get a valid session
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                set({ error: signInError.message, isLoading: false });
                throw new Error(signInError.message);
            }

            // Fetch profile using the server API (bypasses RLS via supabaseAdmin)
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const profileRes = await fetch(`${baseUrl}/auth/session`, {
                headers: { 'Authorization': `Bearer ${signInData.session?.access_token}` },
                signal: AbortSignal.timeout(15000),
            }).catch(() => null);

            let role: 'advocate' | 'brand' | 'admin' = 'advocate';
            let displayName = email;

            if (profileRes?.ok) {
                const profileJson = await profileRes.json();
                role = profileJson.data?.user?.role || 'advocate';
                displayName = profileJson.data?.user?.displayName || email;
            }

            const user: AuthUser = {
                id: signInData.user.id,
                role,
                email: signInData.user.email || email,
                displayName,
            };

            set({ user, session: signInData.session, isLoading: false });
        } catch (err: any) {
            const message = err.message || 'Login failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    logout: async () => {
        try {
            set({ isLoading: true });
            await supabase.auth.signOut();
            set({ user: null, session: null, isLoading: false });
        } catch (err) {
            set({ user: null, session: null, isLoading: false });
        }
    },

    checkSession: async () => {
        try {
            set({ isLoading: true });
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                set({ user: null, session: null, isLoading: false });
                return;
            }

            // Fetch profile via server API (bypasses RLS)
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const res = await fetch(`${baseUrl}/auth/session`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                const json = await res.json();
                const userData = json.data?.user;
                if (userData) {
                    set({
                        user: {
                            id: userData.id || session.user.id,
                            role: userData.role,
                            email: userData.email || session.user.email,
                            displayName: userData.displayName || session.user.email,
                        },
                        session,
                        isLoading: false,
                    });
                    return;
                }
            }

            // If server fetch fails, still set basic user from session
            set({ user: null, session: null, isLoading: false });
        } catch (err) {
            set({ user: null, session: null, isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
