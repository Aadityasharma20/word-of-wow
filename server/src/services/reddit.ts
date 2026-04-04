/**
 * Reddit Content Handler
 *
 * Reddit has closed self-service API access (Responsible Builder Policy, 2025).
 * Phase 1 uses advocate-pasted content with URL validation — same approach as LinkedIn.
 * If Reddit API access is approved in the future, the OAuth + fetch logic can be re-enabled.
 */

// ── URL Validation ─────────────────────────────────────────

const REDDIT_URL_PATTERNS = [
    /reddit\.com\/r\/[^\/]+\/comments\/[a-z0-9]+/i,
    /redd\.it\/[a-z0-9]+/i,
];

export function isValidRedditUrl(url: string): boolean {
    return REDDIT_URL_PATTERNS.some((pattern) => pattern.test(url));
}

// ── URL Parsing (for metadata extraction from URL) ─────────

export interface RedditUrlParts {
    subreddit: string | null;
    postId: string | null;
    commentId: string | null;
}

export function parseRedditUrl(url: string): RedditUrlParts {
    // Post URL: https://www.reddit.com/r/{subreddit}/comments/{postId}/{slug}/
    // Comment URL: https://www.reddit.com/r/{subreddit}/comments/{postId}/{slug}/{commentId}/
    const postRegex = /reddit\.com\/r\/([^\/]+)\/comments\/([a-z0-9]+)\/?([^\/]*)\/?([a-z0-9]*)/i;
    const match = url.match(postRegex);

    if (!match) {
        return { subreddit: null, postId: null, commentId: null };
    }

    return {
        subreddit: match[1],
        postId: match[2],
        commentId: match[4] || null,
    };
}

// ── Content Processing (advocate-pasted) ───────────────────

export interface RedditContent {
    body: string;
    author: string | null;
    subreddit: string | null;
}

export function processRedditSubmission(
    submittedContent: string | null,
    url: string,
    redditUsername: string | null,
): RedditContent {
    if (!submittedContent || submittedContent.trim().length < 20) {
        throw new Error('Reddit content too short or missing (min 20 chars required). Please paste your post/comment text.');
    }

    const urlParts = parseRedditUrl(url);

    return {
        body: submittedContent.trim(),
        author: redditUsername || null,
        subreddit: urlParts.subreddit || null,
    };
}

// ── Account Age Check (disabled — no API access) ───────────

export async function getRedditAccountAge(_username: string): Promise<number | null> {
    // Reddit API access is not available in Phase 1
    // Return null to skip this fraud check gracefully
    return null;
}
