import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: add Authorization header
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Session expired, sign out
            await supabase.auth.signOut();
            window.location.href = '/auth/login';
        }
        return Promise.reject(error);
    }
);

export default api;
