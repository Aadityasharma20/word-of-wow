// BullMQ Job Queue Infrastructure — Agent 2 (Sentinel)

// Re-export queues
export {
    contentFetchQueue,
    aiScoringQueue,
    fraudDetectionQueue,
    rewardProcessingQueue,
    trustScoreUpdateQueue,
    getAllQueueStats,
} from './queues';

// Worker start functions
import { startContentFetchWorker } from './workers/contentFetchWorker';
import { startAiScoringWorker } from './workers/aiScoringWorker';
import { startFraudDetectionWorker } from './workers/fraudDetectionWorker';
import { startRewardWorker } from './workers/rewardWorker';
import { startTrustScoreWorker } from './workers/trustScoreWorker';

/**
 * Start all BullMQ workers. Call this once during server startup.
 */
export function startAllWorkers() {
    console.log('[JOBS] Starting all BullMQ workers...');

    startContentFetchWorker();
    startAiScoringWorker();
    startFraudDetectionWorker();
    startRewardWorker();
    startTrustScoreWorker();

    console.log('[JOBS] ✅ All 5 workers registered and running');
}
