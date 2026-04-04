import { Queue, ConnectionOptions } from 'bullmq';
import { getRedis } from '../lib/redis';

const defaultConnection = getRedis() as ConnectionOptions;

// ── Queue Definitions ──────────────────────────────────────

export const contentFetchQueue = new Queue('content-fetch', {
    connection: defaultConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
    },
});

export const aiScoringQueue = new Queue('ai-scoring', {
    connection: defaultConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
    },
});

export const fraudDetectionQueue = new Queue('fraud-detection', {
    connection: defaultConnection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
    },
});

export const trustScoreUpdateQueue = new Queue('trust-score-update', {
    connection: defaultConnection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
    },
});

export const rewardProcessingQueue = new Queue('reward-processing', {
    connection: defaultConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
    },
});

// ── Helper: Get all queue stats ────────────────────────────

const ALL_QUEUES = [
    { name: 'content-fetch', queue: contentFetchQueue },
    { name: 'ai-scoring', queue: aiScoringQueue },
    { name: 'fraud-detection', queue: fraudDetectionQueue },
    { name: 'reward-processing', queue: rewardProcessingQueue },
    { name: 'trust-score-update', queue: trustScoreUpdateQueue },
];

export async function getAllQueueStats() {
    const stats = await Promise.all(
        ALL_QUEUES.map(async ({ name, queue }) => {
            const [waiting, active, completed, failed, delayed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount(),
            ]);
            return { name, waiting, active, completed, failed, delayed };
        }),
    );
    return stats;
}
