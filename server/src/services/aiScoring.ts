import { chatCompletion } from '../lib/openai';

// ── Types ──────────────────────────────────────────────────

export interface ScoringDimension {
    score: number;
    confidence: number;
    reasoning: string;
    flags: string[];
}

export interface ScoringResult {
    contentQuality: ScoringDimension;
    brandRelevance: ScoringDimension;
    authenticity: ScoringDimension;
    engagementQuality: ScoringDimension;
    audienceRelevance: ScoringDimension;
    finalScore: number;
    combinedReasoning: string;
}

interface ScoringContext {
    content: string;
    title: string | null;
    platform: string;
    subreddit: string | null;
    upvotes: number | null;
    commentsCount: number | null;
    campaignDescription: string;
    campaignKeywords: string[];
    campaignGuidelines: string | null;
    brandIndustry: string | null;
    totalAdvocateSubmissions: number;
}

interface CampaignWeights {
    contentQuality: number;
    brandRelevance: number;
    authenticity: number;
    engagement: number;
    audienceRelevance: number;
}

// ── Helpers ────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

function truncate(text: string, maxLen = 1500): string {
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

// ── Single-Call Scoring (Budget-Friendly) ──────────────────

/**
 * Scores a submission with a SINGLE OpenAI API call.
 * Returns 5 numeric scores (0-100). No explanations, no reasoning.
 * This minimizes token usage to save API credits.
 */
export async function scoreSubmission(
    ctx: ScoringContext,
    weights: CampaignWeights,
): Promise<ScoringResult> {
    const systemPrompt = 'Return JSON: {"cq":N,"br":N,"au":N,"eq":N,"ar":N} where N is 0-100. No extra text.';

    const userPrompt = `Score this ${ctx.platform} ${ctx.title ? 'post' : 'comment'}:
"${truncate(ctx.content)}"
Campaign: "${truncate(ctx.campaignDescription, 300)}"
Keywords: ${ctx.campaignKeywords.slice(0, 10).join(',')}
${ctx.subreddit ? `Sub: r/${ctx.subreddit}` : ''}${ctx.brandIndustry ? ` Industry: ${ctx.brandIndustry}` : ''}

cq=content quality, br=brand relevance, au=authenticity, eq=engagement quality, ar=audience relevance`;

    const result = await chatCompletion(systemPrompt, userPrompt);

    const cq = clamp(Number(result.cq) || 50, 0, 100);
    const br = clamp(Number(result.br) || 50, 0, 100);
    const au = clamp(Number(result.au) || 50, 0, 100);
    const eq = clamp(Number(result.eq) || 50, 0, 100);
    const ar = clamp(Number(result.ar) || 50, 0, 100);

    const finalScore = Math.round(
        (cq * weights.contentQuality +
            br * weights.brandRelevance +
            au * weights.authenticity +
            eq * weights.engagement +
            ar * weights.audienceRelevance) * 100,
    ) / 100;

    const makeDim = (score: number): ScoringDimension => ({
        score,
        confidence: 0.8,
        reasoning: '',
        flags: [],
    });

    return {
        contentQuality: makeDim(cq),
        brandRelevance: makeDim(br),
        authenticity: makeDim(au),
        engagementQuality: makeDim(eq),
        audienceRelevance: makeDim(ar),
        finalScore,
        combinedReasoning: `CQ:${cq} BR:${br} AU:${au} EQ:${eq} AR:${ar} Final:${finalScore}`,
    };
}
