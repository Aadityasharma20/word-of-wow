/**
 * LinkedIn Content Handler
 *
 * LinkedIn API is restricted in Phase 1. We validate the URL format and
 * copy advocate-pasted content to fetched_content for scoring.
 */

// ── URL Validation ─────────────────────────────────────────

const LINKEDIN_URL_PATTERNS = [
    /linkedin\.com\/feed\/update\//i,
    /linkedin\.com\/posts\//i,
];

export function isValidLinkedInUrl(url: string): boolean {
    return LINKEDIN_URL_PATTERNS.some((pattern) => pattern.test(url));
}

// ── Content Processing ─────────────────────────────────────

export interface LinkedInContent {
    body: string;
    author: string | null;
}

export function processLinkedInSubmission(
    submittedContent: string | null,
    linkedinProfileUrl: string | null,
): LinkedInContent {
    if (!submittedContent || submittedContent.trim().length < 50) {
        throw new Error('LinkedIn content too short or missing (min 50 chars required)');
    }

    return {
        body: submittedContent.trim(),
        author: linkedinProfileUrl || null,
    };
}
