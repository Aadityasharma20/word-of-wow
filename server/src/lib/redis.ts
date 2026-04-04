import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis | null = null;

/**
 * Get a Redis connection. Returns null if REDIS_URL is not set.
 * Connection is lazy — only created when first requested.
 */
export function getRedis(): Redis | null {
    if (!REDIS_URL) {
        console.warn('[REDIS] REDIS_URL not set — Redis features disabled.');
        return null;
    }

    if (!redis) {
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
        });

        redis.on('connect', () => console.log('[REDIS] Connected successfully'));
        redis.on('error', (err) => console.error('[REDIS] Error:', err.message));
    }

    return redis;
}

// Default export for backwards compatibility (lazy — won't connect until used)
export default { getRedis };
