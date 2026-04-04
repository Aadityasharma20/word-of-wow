import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
    plugins: [
        react(),
        // Pre-compress assets for production (gzip + brotli)
        compression({ algorithm: 'gzip', threshold: 1024 }),
        compression({ algorithm: 'brotliCompress', threshold: 1024 }),
    ],
    envDir: '..',
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'es2022',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'chart-vendor': ['recharts'],
                    'supabase-vendor': ['@supabase/supabase-js'],
                },
            },
        },
    },
});
