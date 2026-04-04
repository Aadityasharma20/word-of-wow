/**
 * View Estimation Service
 * 
 * Estimates the views/reach of a submitted URL using the Serper API (Google Search API).
 * 
 * HOW IT WORKS:
 * 1. Uses Serper API to search Google for the exact URL (indexing & backlink check)
 * 2. Uses Serper API to look up subreddit size for Reddit posts
 * 3. Uses Serper API to gauge brand search volume for context
 * 4. Applies platform-specific multipliers (Reddit upvote ratios, LinkedIn engagement rates)
 * 5. Considers subreddit member count, post age, engagement ratio, content type
 * 6. Inflates the final number to account for organic shares, impressions, and second-degree visibility
 * 
 * WHERE SERPER IS USED:
 * - `searchGoogleForUrl()` — Searches Google for the exact URL to check indexing & backlinks
 * - `lookupSubredditSize()` — Searches Google for the subreddit to estimate member count
 * - `searchBrandContext()` — Searches for brand mentions to gauge overall brand search visibility
 * 
 * SERPER_API_KEY is set in the .env file.
 */

import { logger } from '../lib/logger';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const SERPER_BASE_URL = 'https://google.serper.dev';

// ── Platform view multipliers ────────────────────────────────
const PLATFORM_MULTIPLIERS: Record<string, {
    baseViews: number;
    upvoteMultiplier: number;
    commentMultiplier: number;
    googleIndexBonus: number;
    backlinksMultiplier: number;
}> = {
    reddit: {
        baseViews: 350,
        upvoteMultiplier: 85,
        commentMultiplier: 150,
        googleIndexBonus: 800,
        backlinksMultiplier: 400,
    },
    linkedin: {
        baseViews: 500,
        upvoteMultiplier: 55,
        commentMultiplier: 200,
        googleIndexBonus: 500,
        backlinksMultiplier: 300,
    },
    twitter: {
        baseViews: 400,
        upvoteMultiplier: 60,
        commentMultiplier: 120,
        googleIndexBonus: 350,
        backlinksMultiplier: 200,
    },
    x: {
        baseViews: 400,
        upvoteMultiplier: 60,
        commentMultiplier: 120,
        googleIndexBonus: 350,
        backlinksMultiplier: 200,
    },
    youtube: {
        baseViews: 1000,
        upvoteMultiplier: 20,
        commentMultiplier: 250,
        googleIndexBonus: 600,
        backlinksMultiplier: 350,
    },
    instagram: {
        baseViews: 600,
        upvoteMultiplier: 25,
        commentMultiplier: 180,
        googleIndexBonus: 200,
        backlinksMultiplier: 100,
    },
    review: {
        baseViews: 200,
        upvoteMultiplier: 40,
        commentMultiplier: 80,
        googleIndexBonus: 600,
        backlinksMultiplier: 400,
    },
    blog: {
        baseViews: 300,
        upvoteMultiplier: 45,
        commentMultiplier: 180,
        googleIndexBonus: 900,
        backlinksMultiplier: 500,
    },
};

const DEFAULT_MULTIPLIER = {
    baseViews: 250,
    upvoteMultiplier: 45,
    commentMultiplier: 100,
    googleIndexBonus: 400,
    backlinksMultiplier: 200,
};

// Inflation: account for organic sharing, second-degree visibility, screenshots, etc.
const INFLATION_FACTOR = 3.2;

// ═══════════════════════════════════════════════════════════════
//  SERPER API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * SERPER USAGE #1: Search Google for the exact submitted URL
 * Checks if the URL is indexed and how many results reference it.
 */
async function searchGoogleForUrl(url: string): Promise<{
    isIndexed: boolean;
    totalResults: number;
    backlinks: number;
}> {
    if (!SERPER_API_KEY) {
        logger.warn('[VIEW-EST] SERPER_API_KEY not set, skipping Google search');
        return { isIndexed: false, totalResults: 0, backlinks: 0 };
    }

    try {
        const response = await fetch(`${SERPER_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: `"${url}"`,
                num: 10,
            }),
        });

        if (!response.ok) {
            logger.error(`[VIEW-EST] Serper API error: ${response.status}`);
            return { isIndexed: false, totalResults: 0, backlinks: 0 };
        }

        const data: any = await response.json();
        const organic = data.organic || [];
        const isIndexed = organic.some((r: any) => r.link?.includes(url) || url.includes(r.link));
        const totalResults = parseInt(data.searchParameters?.totalResults || '0', 10);

        // Count how many results reference/link to this URL
        const backlinks = Math.min(organic.length, 10);

        return { isIndexed, totalResults: Math.min(totalResults, 100000), backlinks };
    } catch (err) {
        logger.error(`[VIEW-EST] Serper search failed: ${(err as Error).message}`);
        return { isIndexed: false, totalResults: 0, backlinks: 0 };
    }
}

/**
 * SERPER USAGE #2: Look up subreddit size (member count)
 * Searches Google for "r/{subreddit} reddit members" and parses the result
 * to estimate how many members the subreddit has.
 * 
 * Why this matters: A post in r/technology (15M members) has vastly more
 * potential reach than a post in r/obscureniche (500 members).
 */
async function lookupSubredditSize(subreddit: string): Promise<number> {
    if (!SERPER_API_KEY || !subreddit) return 0;

    // Clean subreddit name (remove r/ prefix if present)
    const subName = subreddit.replace(/^r\//, '').trim();
    if (!subName) return 0;

    try {
        const response = await fetch(`${SERPER_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: `r/${subName} reddit members subreddit`,
                num: 5,
            }),
        });

        if (!response.ok) return 0;

        const data: any = await response.json();

        // Check knowledge graph first (Google often shows subreddit info)
        if (data.knowledgeGraph?.description) {
            const desc = data.knowledgeGraph.description;
            const memberMatch = desc.match(/([\d,.]+)\s*(million|k|m|thousand)?\s*members/i);
            if (memberMatch) {
                return parseMembers(memberMatch[1], memberMatch[2]);
            }
        }

        // Check answer box
        if (data.answerBox?.snippet) {
            const snippet = data.answerBox.snippet;
            const memberMatch = snippet.match(/([\d,.]+)\s*(million|k|m|thousand)?\s*members/i);
            if (memberMatch) {
                return parseMembers(memberMatch[1], memberMatch[2]);
            }
        }

        // Check organic results for member counts
        const allText = (data.organic || []).map((r: any) =>
            `${r.title || ''} ${r.snippet || ''}`
        ).join(' ');

        const memberMatch = allText.match(/([\d,.]+)\s*(million|k|m|thousand)?\s*members/i);
        if (memberMatch) {
            return parseMembers(memberMatch[1], memberMatch[2]);
        }

        // Fallback: check for "subscribers" instead of "members"
        const subMatch = allText.match(/([\d,.]+)\s*(million|k|m|thousand)?\s*subscribers/i);
        if (subMatch) {
            return parseMembers(subMatch[1], subMatch[2]);
        }

        logger.warn(`[VIEW-EST] Could not determine size for r/${subName}`);
        return 0;
    } catch (err) {
        logger.error(`[VIEW-EST] Subreddit lookup failed: ${(err as Error).message}`);
        return 0;
    }
}

/**
 * Parse member count strings like "15.2 million", "350k", "12,500"
 */
function parseMembers(numStr: string, suffix?: string): number {
    const num = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(num)) return 0;

    const s = (suffix || '').toLowerCase();
    if (s === 'million' || s === 'm') return Math.round(num * 1_000_000);
    if (s === 'k' || s === 'thousand') return Math.round(num * 1_000);
    return Math.round(num);
}

/**
 * SERPER USAGE #3: Search for brand name to gauge search volume context
 */
async function searchBrandContext(brandName: string): Promise<number> {
    if (!SERPER_API_KEY || !brandName) return 0;

    try {
        const response = await fetch(`${SERPER_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: `"${brandName}" review`,
                num: 5,
            }),
        });

        if (!response.ok) return 0;

        const data: any = await response.json();
        const totalResults = parseInt(data.searchParameters?.totalResults || '0', 10);

        if (totalResults > 100000) return 500;   // Major brand
        if (totalResults > 10000) return 250;    // Established brand
        if (totalResults > 1000) return 100;     // Growing brand
        return 0;
    } catch {
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: Subreddit size → view bonus
// ═══════════════════════════════════════════════════════════════

/**
 * Convert subreddit member count to estimated additional views.
 * 
 * Logic: On Reddit, a post's visibility is proportional to the community size.
 * - Tiny sub (<5K):      minimal extra reach, post is seen by a handful
 * - Small sub (5-50K):   moderate reach, +200-500 views
 * - Medium sub (50-500K): strong reach, +500-2000 views 
 * - Large sub (500K-5M):  massive reach, +2000-8000 views
 * - Mega sub (5M+):       viral potential, +8000-20000 views
 * 
 * Within each tier, we scale logarithmically so 10M isn't 2x of 5M.
 * We also factor in the "hot page" effect: popular posts in large subs
 * reach way more people than the average post.
 */
function subredditSizeBonus(memberCount: number, upvotes: number): number {
    if (memberCount <= 0) return 0;

    // Base bonus from community size (log-scaled)
    let bonus = 0;
    if (memberCount >= 5_000_000) {
        bonus = 8000 + Math.min(12000, Math.round(Math.log10(memberCount / 5_000_000) * 5000));
    } else if (memberCount >= 500_000) {
        bonus = 2000 + Math.round((memberCount - 500_000) / 500_000 * 6000);
    } else if (memberCount >= 50_000) {
        bonus = 500 + Math.round((memberCount - 50_000) / 450_000 * 1500);
    } else if (memberCount >= 5_000) {
        bonus = 200 + Math.round((memberCount - 5_000) / 45_000 * 300);
    } else {
        bonus = Math.round(memberCount * 0.04);
    }

    // Engagement ratio bonus: if upvotes are high relative to sub size,
    // the post is performing well and reaching more of the community
    if (memberCount > 0 && upvotes > 0) {
        const engagementRatio = upvotes / memberCount;
        if (engagementRatio > 0.01) {
            // Post reached >1% of the sub — viral territory
            bonus = Math.round(bonus * 1.8);
        } else if (engagementRatio > 0.005) {
            // Strong performance
            bonus = Math.round(bonus * 1.4);
        } else if (engagementRatio > 0.001) {
            // Above average
            bonus = Math.round(bonus * 1.15);
        }
    }

    return bonus;
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS: Additional view factors
// ═══════════════════════════════════════════════════════════════

/**
 * Extract subreddit name from a Reddit URL
 */
function extractSubreddit(url: string): string {
    const match = url.match(/reddit\.com\/r\/([^/]+)/i);
    return match ? match[1] : '';
}

/**
 * Engagement quality multiplier.
 * A post with 100 upvotes and 50 comments is more visible than 
 * one with 100 upvotes and 2 comments (indicates discussion/controversy).
 */
function engagementQualityMultiplier(upvotes: number, comments: number): number {
    if (upvotes <= 0) return 1.0;
    const ratio = comments / upvotes;
    // High comment-to-upvote ratio = active discussion = more visibility
    if (ratio >= 1.0) return 1.5;   // Very active thread
    if (ratio >= 0.5) return 1.3;   // Active discussion
    if (ratio >= 0.2) return 1.15;  // Normal engagement
    if (ratio >= 0.05) return 1.0;  // Low discussion
    return 0.9;                     // Barely any discussion
}

/**
 * Content freshness bonus.
 * Recent content gets more views due to platform algorithms.
 */
function freshnessBonusViews(platform: string): number {
    // Fresh content is more visible on these platforms
    switch (platform) {
        case 'reddit': return 150;    // Reddit's hot algorithm favors fresh content
        case 'twitter':
        case 'x': return 200;          // Twitter is very time-sensitive
        case 'linkedin': return 180;   // LinkedIn feed is time-based
        default: return 50;
    }
}

// ═══════════════════════════════════════════════════════════════
//  PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════════

function detectPlatform(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('reddit.com')) return 'reddit';
    if (lower.includes('linkedin.com')) return 'linkedin';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('trustpilot.com') || lower.includes('g2.com') || lower.includes('capterra.com')) return 'review';
    if (lower.includes('medium.com') || lower.includes('blog')) return 'blog';
    return 'other';
}

/**
 * SERPER: Look up YouTube video view count using Serper's dedicated video search.
 * Uses /videos endpoint first (which returns YouTube metadata directly),
 * then falls back to regular search if needed.
 */
async function lookupYouTubeViews(url: string): Promise<number> {
    if (!SERPER_API_KEY) return 0;

    // Extract video title/ID for searching
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : '';

    try {
        // Method 1: Use Serper /videos endpoint — returns YouTube-specific data
        const videoResponse = await fetch(`${SERPER_BASE_URL}/videos`, {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: videoId ? `site:youtube.com ${videoId}` : url, num: 5 }),
        });

        if (videoResponse.ok) {
            const videoData: any = await videoResponse.json();
            const videos = videoData.videos || [];
            // Find matching video and extract views
            for (const v of videos) {
                const vLink = v.link || '';
                const vTitle = `${v.title || ''} ${v.snippet || ''}`;
                // Match on video ID or URL
                if (videoId && (vLink.includes(videoId) || vTitle.includes(videoId))) {
                    // Serper video results often have views in snippet or as metadata
                    const allText = `${v.title || ''} ${v.snippet || ''} ${v.duration || ''} ${v.views || ''}`;
                    const views = parseViewCount(allText);
                    if (views > 0) {
                        logger.info(`[VIEW-EST] YouTube video search found ${views.toLocaleString()} views for ${url}`);
                        return views;
                    }
                }
            }
            // Try all video results if no exact match
            for (const v of videos) {
                const allText = `${v.title || ''} ${v.snippet || ''} ${v.views || ''}`;
                const views = parseViewCount(allText);
                if (views > 0) {
                    logger.info(`[VIEW-EST] YouTube video search (fallback) found ${views.toLocaleString()} views`);
                    return views;
                }
            }
        }

        // Method 2: Regular Google search for the URL
        const response = await fetch(`${SERPER_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: `"${url}" views`, num: 10 }),
        });
        if (!response.ok) return 0;
        const data: any = await response.json();

        // Combine all text from results
        const allText = [
            ...(data.organic || []).map((r: any) => `${r.title || ''} ${r.snippet || ''}`),
            data.knowledgeGraph?.description || '',
            data.answerBox?.snippet || '',
            data.answerBox?.answer || '',
        ].join(' ');

        const views = parseViewCount(allText);
        if (views > 0) {
            logger.info(`[VIEW-EST] YouTube regular search found ${views.toLocaleString()} views for ${url}`);
            return views;
        }

        logger.warn(`[VIEW-EST] Could not parse YouTube views for ${url}`);
        return 0;
    } catch (err) {
        logger.error(`[VIEW-EST] YouTube view lookup failed: ${(err as Error).message}`);
        return 0;
    }
}

/**
 * Parse view count from a text string. Handles:
 * - "1.2M views", "345K views", "70K views"
 * - "12,345 views", "1234 views"
 * - "views: 70,000", "70000 views"
 */
function parseViewCount(text: string): number {
    // Pattern 1: "X views" with suffix
    const patterns = [
        /(\d[\d,.]*)\s*(million|m|billion|b|k)\s*views/i,
        /(\d[\d,.]*)\s*views/i,
        /views[:\s]+(\d[\d,.]*)\s*(million|m|billion|b|k)?/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const num = parseFloat(match[1].replace(/,/g, ''));
            if (isNaN(num)) continue;
            const suffix = (match[2] || '').toLowerCase();
            if (suffix === 'million' || suffix === 'm') return Math.round(num * 1_000_000);
            if (suffix === 'billion' || suffix === 'b') return Math.round(num * 1_000_000_000);
            if (suffix === 'k') return Math.round(num * 1_000);
            return Math.round(num);
        }
    }
    return 0;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ESTIMATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Estimate views for a submitted URL.
 * 
 * @param url - Submitted URL
 * @param platform - Platform name
 * @param upvotes - Upvotes/likes count
 * @param comments - Comments count
 * @param brandName - Brand name for context
 * @param subreddit - Subreddit name (for Reddit posts)
 * @returns Estimated views (inflated)
 * 
 * FACTORS CONSIDERED:
 * 1. Platform base views
 * 2. Upvotes × platform multiplier
 * 3. Comments × platform multiplier
 * 4. Google indexing status (via Serper)
 * 5. Backlinks from Google results (via Serper)
 * 6. Google search visibility for the URL (via Serper)
 * 7. Subreddit member count / community size (via Serper)
 * 8. Engagement ratio (upvotes relative to subreddit size)
 * 9. Engagement quality (comment-to-upvote ratio)
 * 10. Content freshness bonus
 * 11. Brand search volume context (via Serper)
 * 12. Inflation factor (1.8x for organic shares + second-degree reach)
 */
export async function estimateViews(
    url: string,
    platform?: string,
    upvotes?: number,
    comments?: number,
    brandName?: string,
    subreddit?: string,
): Promise<number> {
    const detectedPlatform = platform || detectPlatform(url);
    const multiplier = PLATFORM_MULTIPLIERS[detectedPlatform] || DEFAULT_MULTIPLIER;
    const ups = upvotes || 0;
    const cmts = comments || 0;

    // 1. Base views for the platform
    let estimatedViews = multiplier.baseViews;

    // 2-3. Engagement-based views (upvotes + comments)
    if (ups > 0) {
        estimatedViews += ups * multiplier.upvoteMultiplier;
    }
    if (cmts > 0) {
        estimatedViews += cmts * multiplier.commentMultiplier;
    }

    // 4-6. SERPER: Google indexing, backlinks, search visibility
    const googleData = await searchGoogleForUrl(url);

    if (googleData.isIndexed) {
        estimatedViews += multiplier.googleIndexBonus;
        logger.info(`[VIEW-EST] URL is Google-indexed: +${multiplier.googleIndexBonus} views`);
    }
    if (googleData.backlinks > 0) {
        estimatedViews += googleData.backlinks * multiplier.backlinksMultiplier;
        logger.info(`[VIEW-EST] Found ${googleData.backlinks} backlinks: +${googleData.backlinks * multiplier.backlinksMultiplier} views`);
    }
    if (googleData.totalResults > 100) {
        const searchBonus = Math.min(1000, Math.round(Math.log10(googleData.totalResults) * 150));
        estimatedViews += searchBonus;
    }

    // 7-8. SERPER: Subreddit size & engagement ratio (Reddit-specific)
    if (detectedPlatform === 'reddit') {
        const subName = subreddit || extractSubreddit(url);
        if (subName) {
            const memberCount = await lookupSubredditSize(subName);
            if (memberCount > 0) {
                const subBonus = subredditSizeBonus(memberCount, ups);
                estimatedViews += subBonus;
                logger.info(`[VIEW-EST] Subreddit r/${subName}: ~${memberCount.toLocaleString()} members, +${subBonus} views`);
            } else {
                // Fallback: if we couldn't determine size, add a modest default
                estimatedViews += 800;
                logger.warn(`[VIEW-EST] Could not determine r/${subName} size, adding default +800`);
            }
        }
    }

    // 7b. SERPER: YouTube actual view count
    if (detectedPlatform === 'youtube') {
        const ytViews = await lookupYouTubeViews(url);
        if (ytViews > 0) {
            estimatedViews += ytViews;
            logger.info(`[VIEW-EST] YouTube video has ${ytViews.toLocaleString()} views, adding directly`);
        }
    }

    // 9. Engagement quality multiplier (comment-to-upvote ratio)
    const eqMultiplier = engagementQualityMultiplier(ups, cmts);
    estimatedViews = Math.round(estimatedViews * eqMultiplier);

    // 10. Content freshness bonus
    estimatedViews += freshnessBonusViews(detectedPlatform);

    // 11. SERPER: Brand search volume context
    const brandBonus = await searchBrandContext(brandName || '');
    estimatedViews += brandBonus;

    // 12. Apply inflation factor
    estimatedViews = Math.round(estimatedViews * INFLATION_FACTOR);

    // Minimum floor
    estimatedViews = Math.max(estimatedViews, 250);

    logger.info(`[VIEW-EST] Final estimate for ${url}: ${estimatedViews} views (platform: ${detectedPlatform}, upvotes: ${ups}, comments: ${cmts}, indexed: ${googleData.isIndexed})`);

    return estimatedViews;
}
