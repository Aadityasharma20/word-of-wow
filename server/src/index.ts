import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: '../.env' });

import { logger } from './lib/logger';
import { requestLogger } from './middleware/requestLogger';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import submissionRoutes from './routes/submissions';
import adminRoutes from './routes/admin';
import brandMentionsRoutes from './routes/brandMentions';
import embedRoutes from './routes/embed';
// BullMQ workers disabled — using direct pipeline (no Redis needed)
import { supabaseAdmin } from './lib/supabase';
import { startAutoApproveJob } from './jobs/autoApproveJob';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Global Middleware ---
app.use(compression()); // gzip responses
app.use(helmet());

const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(generalLimiter);

// --- Health Check ---
app.get('/api/health', async (_req, res) => {
    const checks: Record<string, string> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: `${Math.round(process.uptime())}s`,
    };

    // Check database
    try {
        const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
        checks.database = error ? 'error' : 'connected';
    } catch {
        checks.database = 'disconnected';
    }

    // Check Redis
    try {
        const { default: Redis } = await import('ioredis');
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            const redis = new Redis(redisUrl, { connectTimeout: 3000, lazyConnect: true });
            await redis.connect();
            await redis.ping();
            checks.redis = 'connected';
            await redis.quit();
        } else {
            checks.redis = 'not_configured';
        }
    } catch {
        checks.redis = 'disconnected';
    }

    const isHealthy = checks.database === 'connected';
    res.status(isHealthy ? 200 : 503).json(checks);
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/brand-mentions', brandMentionsRoutes);
app.use('/api/embed', embedRoutes);

// --- 404 Handler ---
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found', code: 404 });
});

// --- Global Error Handler ---
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📋 Health check: http://localhost:${PORT}/api/health`);
    logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

    // BullMQ workers disabled — using direct pipeline instead (no Redis needed)
    // To re-enable, uncomment the block below and ensure Redis is available.
    // try {
    //     startAllWorkers();
    // } catch (err) {
    //     logger.error({ err }, '⚠️ Failed to start BullMQ workers');
    // }
    console.log('[PIPELINE] ✅ Using direct processing pipeline (no Redis required)');
    startAutoApproveJob();
});

export default app;
