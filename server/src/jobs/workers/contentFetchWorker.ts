import { Worker, Job } from 'bullmq';
import redis from '../../lib/redis';
import { supabaseAdmin } from '../../lib/supabase';
import { isValidRedditUrl, processRedditSubmission } from '../../services/reddit';
import { isValidLinkedInUrl, processLinkedInSubmission } from '../../services/linkedin';
import { aiScoringQueue } from '../queues';

interface ContentFetchJobData {
    submissionId: string;
}

async function processContentFetch(job: Job<ContentFetchJobData>) {
    const { submissionId } = job.data;
    console.log(`[CONTENT-FETCH] Processing submission ${submissionId}`);

    // Update scoring status to processing
    await supabaseAdmin
        .from('submissions')
        .update({ scoring_status: 'processing' })
        .eq('id', submissionId);

    // Fetch submission details
    const { data: submission, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

    if (error || !submission) {
        throw new Error(`Submission ${submissionId} not found`);
    }

    const platform = submission.platform as string;
    const url = submission.submitted_url as string;

    try {
        if (platform === 'reddit') {
            // Validate Reddit URL
            if (!isValidRedditUrl(url)) {
                await supabaseAdmin
                    .from('submissions')
                    .update({
                        scoring_status: 'failed',
                        review_notes: 'Invalid Reddit URL format',
                    })
                    .eq('id', submissionId);
                return;
            }

            // Fetch advocate's Reddit username
            const { data: advocateProfile } = await supabaseAdmin
                .from('advocate_profiles')
                .select('reddit_username')
                .eq('id', submission.advocate_id)
                .single();

            const redditContent = processRedditSubmission(
                submission.submitted_content,
                url,
                advocateProfile?.reddit_username || null,
            );

            await supabaseAdmin
                .from('submissions')
                .update({
                    fetched_content: redditContent.body,
                    fetched_author: redditContent.author,
                    fetched_subreddit: redditContent.subreddit,
                    fetched_at: new Date().toISOString(),
                })
                .eq('id', submissionId);

        } else if (platform === 'linkedin') {
            // Validate LinkedIn URL
            if (!isValidLinkedInUrl(url)) {
                await supabaseAdmin
                    .from('submissions')
                    .update({
                        scoring_status: 'failed',
                        review_notes: 'Invalid LinkedIn URL format',
                    })
                    .eq('id', submissionId);
                return;
            }

            // Fetch advocate's LinkedIn profile URL
            const { data: advocateProfile } = await supabaseAdmin
                .from('advocate_profiles')
                .select('linkedin_profile_url')
                .eq('id', submission.advocate_id)
                .single();

            const linkedinContent = processLinkedInSubmission(
                submission.submitted_content,
                advocateProfile?.linkedin_profile_url || null,
            );

            await supabaseAdmin
                .from('submissions')
                .update({
                    fetched_content: linkedinContent.body,
                    fetched_author: linkedinContent.author,
                    fetched_at: new Date().toISOString(),
                })
                .eq('id', submissionId);
        }

        // Chain: add job to AI scoring queue
        await aiScoringQueue.add('score', { submissionId }, { priority: 1 });
        console.log(`[CONTENT-FETCH] ✅ Processed content for ${submissionId}, queued for AI scoring`);

    } catch (err) {
        const errorMsg = (err as Error).message;

        // Content missing or too short — permanent failure, don't retry
        if (errorMsg.includes('too short') || errorMsg.includes('missing')) {
            await supabaseAdmin
                .from('submissions')
                .update({
                    scoring_status: 'failed',
                    review_notes: errorMsg,
                })
                .eq('id', submissionId);
            return;
        }

        // For other transient errors, throw to trigger BullMQ retry
        throw err;
    }
}

export function startContentFetchWorker() {
    const worker = new Worker('content-fetch', processContentFetch, {
        connection: redis,
        concurrency: 5,
    });

    worker.on('completed', (job) => {
        console.log(`[CONTENT-FETCH] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[CONTENT-FETCH] Job ${job?.id} failed:`, err.message);
    });

    console.log('[CONTENT-FETCH] Worker started');
    return worker;
}
