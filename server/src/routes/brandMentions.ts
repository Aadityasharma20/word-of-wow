import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { logger } from '../lib/logger';
import { isDictionaryWord } from '../lib/commonWords';
import { processMentionsPipeline, loadAmbiguousBrands } from '../lib/brandAmbiguity';

// Pre-load ambiguity list into memory at startup
loadAmbiguousBrands();

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/* ═══════════════════════════════════════════════════════════
   POST-PROCESSING UTILITIES (no OpenAI API)
   ═══════════════════════════════════════════════════════════ */

// ── Ultra-Sensitive Sentiment Re-Classifier ───────────
// 200+ keywords/phrases, structural patterns, emoji detection
// Philosophy: brand mentions are inherently opinionated — if someone
// bothered to write about a brand, they probably have an opinion.
// True neutrals are rare (only factual/informational content).

const POSITIVE_SINGLE = new Set([
    // Strong positive
    'love', 'amazing', 'awesome', 'excellent', 'fantastic', 'incredible', 'brilliant',
    'outstanding', 'wonderful', 'superb', 'phenomenal', 'stellar', 'exceptional',
    'remarkable', 'magnificent', 'glorious', 'spectacular', 'tremendous', 'marvelous',
    // Moderate positive
    'great', 'good', 'nice', 'cool', 'neat', 'sweet', 'solid', 'decent', 'fine',
    'impressive', 'beautiful', 'elegant', 'sleek', 'clean', 'polished', 'refined',
    'premium', 'quality', 'professional', 'modern', 'innovative', 'creative',
    // Recommendation / approval
    'recommend', 'recommended', 'recommending', 'endorse', 'endorsed', 'approve',
    'approved', 'praise', 'praised', 'praising', 'kudos', 'props', 'cheers',
    // Satisfaction / happiness
    'happy', 'glad', 'pleased', 'thrilled', 'excited', 'delighted', 'satisfied',
    'content', 'grateful', 'thankful', 'appreciate', 'appreciated', 'enjoying',
    // Function / performance
    'fast', 'quick', 'speedy', 'responsive', 'smooth', 'seamless', 'efficient',
    'effective', 'reliable', 'dependable', 'trustworthy', 'consistent', 'stable',
    'powerful', 'robust', 'capable', 'versatile', 'flexible', 'intuitive',
    // UX / design
    'easy', 'simple', 'straightforward', 'convenient', 'handy', 'useful', 'helpful',
    'friendly', 'accessible', 'ergonomic', 'comfortable', 'enjoyable', 'fun',
    // Value
    'worth', 'valuable', 'affordable', 'bargain', 'deal', 'steal',
    // Emotional
    'favorite', 'favourite', 'best', 'perfect', 'ideal', 'flawless', 'unbeatable',
    'unmatched', 'unparalleled', 'top', 'leading', 'superior', 'champion',
    // Growth / success
    'growing', 'thriving', 'booming', 'improving', 'progressing', 'evolving',
    'winning', 'succeeding', 'dominating', 'crushing',
    // Trust
    'trust', 'trusted', 'legit', 'legitimate', 'genuine', 'authentic', 'real',
    'transparent', 'honest', 'ethical', 'safe', 'secure',
    // Positive generic
    'like', 'liked', 'liking', 'enjoy', 'enjoyed', 'enjoying', 'fan',
    'supporter', 'advocate', 'loyalist', 'believer', 'admire', 'admired',
    'respect', 'respected', 'proud', 'loyalty', 'loyal',
]);

const NEGATIVE_SINGLE = new Set([
    // Strong negative
    'hate', 'terrible', 'horrible', 'awful', 'dreadful', 'atrocious', 'abysmal',
    'pathetic', 'disgusting', 'appalling', 'despicable', 'horrendous', 'abhorrent',
    // Moderate negative
    'bad', 'poor', 'mediocre', 'subpar', 'inferior', 'lacking', 'underwhelming',
    'disappointing', 'disappointed', 'unsatisfying', 'unsatisfied', 'unimpressed',
    'meh', 'bland', 'dull', 'boring', 'lame', 'weak', 'shallow',
    // Scam / fraud
    'scam', 'scammy', 'fraud', 'fraudulent', 'fake', 'sketchy', 'shady',
    'suspicious', 'deceptive', 'misleading', 'dishonest', 'unethical', 'predatory',
    // Broken / buggy
    'broken', 'buggy', 'glitchy', 'crashes', 'crashed', 'crashing', 'freezes',
    'freezing', 'laggy', 'lagging', 'malfunctioning', 'defective', 'faulty',
    // Frustration
    'frustrating', 'frustrated', 'annoying', 'annoyed', 'irritating', 'infuriating',
    'aggravating', 'maddening', 'stressful', 'painful', 'nightmare', 'headache',
    // Usability
    'unusable', 'useless', 'pointless', 'worthless', 'meaningless', 'impractical',
    'complicated', 'complex', 'confusing', 'unclear', 'convoluted', 'clunky', 'ugly',
    // Value
    'overpriced', 'expensive', 'costly', 'ripoff', 'pricey', 'overvalued',
    // Rejection
    'avoid', 'regret', 'regretted', 'regretting', 'cancel', 'cancelled',
    'cancelling', 'refund', 'refunded', 'uninstall', 'uninstalled', 'delete',
    'deleted', 'switched', 'switching', 'leaving', 'left', 'quit', 'quitting',
    // Quality
    'trash', 'garbage', 'junk', 'rubbish', 'crap', 'sucks', 'sucked', 'suck',
    'dislike', 'disliked', 'worst', 'unacceptable', 'intolerable',
    // Slow / unreliable
    'slow', 'unreliable', 'unstable', 'inconsistent', 'unpredictable',
    // Failure
    'fails', 'failed', 'failing', 'failure', 'flop', 'flopped',
    // Negativity markers
    'unfortunately', 'sadly', 'regrettably', 'alas',
]);

const POSITIVE_PHRASES = [
    'highly recommend', 'strongly recommend', 'definitely recommend', 'would recommend',
    'totally recommend', 'absolutely recommend', '10 out of 10', '10/10', '9/10',
    '5 stars', '5/5', '4 stars', '4/5', '4.5', 'five stars', 'four stars',
    'love it', 'love this', 'love their', 'love the', 'love how', 'loving it',
    'so good', 'so great', 'so amazing', 'so helpful', 'really good', 'really great',
    'really helpful', 'really nice', 'really impressed', 'really enjoy', 'very good',
    'very nice', 'very helpful', 'very impressed', 'very satisfied', 'pretty good',
    'pretty great', 'pretty solid', 'pretty amazing', 'quite good', 'quite impressive',
    'must have', 'must try', 'must use', 'game changer', 'game-changer', 'life changer',
    'changed my life', 'blown away', 'blew my mind', 'mind blown', 'mind-blowing',
    'exceeded expectations', 'above and beyond', 'goes above', 'over the top',
    'can\'t live without', 'no complaints', 'zero complaints', 'no issues',
    'works great', 'works perfectly', 'works well', 'works like a charm',
    'worked perfectly', 'worked great', 'worked well', 'worked flawlessly',
    'well done', 'job well done', 'nailed it', 'killed it', 'crushing it',
    'top notch', 'top-notch', 'first class', 'first-class', 'world class',
    'best in class', 'best ever', 'best i\'ve', 'best product', 'best tool',
    'best app', 'best service', 'better than', 'worth every penny', 'worth it',
    'worth the', 'money well spent', 'bang for the buck', 'bang for your buck',
    'saved me', 'helps me', 'helped me', 'thank you', 'thanks to', 'grateful for',
    'big fan', 'huge fan', 'loyal customer', 'loyal user', 'long time user',
    'switched to', 'never going back', 'never looked back', 'not going back',
    'can\'t go back', 'won\'t go back', 'made my life easier', 'makes my life easier',
    'pleasure to use', 'joy to use', 'dream to use', 'breath of fresh air',
    'step up', 'leveled up', 'level up', 'next level', 'next-level',
    'ahead of', 'stands out', 'stand out', 'sets apart', 'in a league of its own',
    'nothing compares', 'second to none', 'one of the best',
    'i love', 'we love', 'everyone loves', 'people love',
    'i recommend', 'we recommend', 'i suggest', 'i endorse',
    'positive experience', 'great experience', 'amazing experience',
    'wonderful experience', 'excellent experience', 'fantastic experience',
    'great customer service', 'excellent support', 'amazing support',
    'very responsive', 'super responsive', 'quick response', 'fast response',
    'well built', 'well-built', 'well designed', 'well-designed',
    'beautifully designed', 'beautifully crafted', 'thoughtfully designed',
    'easy to use', 'user friendly', 'user-friendly', 'beginner friendly',
    'super easy', 'dead simple', 'just works', 'it just works',
];

const NEGATIVE_PHRASES = [
    'do not buy', 'don\'t buy', 'do not use', 'don\'t use', 'do not recommend',
    'don\'t recommend', 'would not recommend', 'wouldn\'t recommend',
    'stay away', 'stay clear', 'steer clear', 'run away', 'beware of',
    'worst ever', 'worst experience', 'worst product', 'worst service',
    'worst app', 'worst tool', 'worst decision', 'biggest mistake',
    'bad experience', 'terrible experience', 'horrible experience',
    'awful experience', 'negative experience', 'poor experience',
    'complete waste', 'total waste', 'waste of time', 'waste of money',
    'waste of space', 'not worth', 'not worth it', 'overpriced for',
    'doesn\'t work', 'does not work', 'didn\'t work', 'never works',
    'stopped working', 'keeps crashing', 'keeps freezing', 'keeps failing',
    'can\'t stand', 'fed up', 'sick of', 'tired of', 'had enough',
    'so bad', 'really bad', 'very bad', 'pretty bad', 'quite bad',
    'so terrible', 'really terrible', 'such a disappointment', 'let down',
    'let me down', 'fell short', 'falls short', 'not as advertised',
    'false advertising', 'bait and switch', 'hidden fees', 'hidden charges',
    'customer service is', 'support is terrible', 'support is awful',
    'no support', 'no response', 'no help', 'ignored my', 'ignoring',
    '1 star', '1/5', '0 stars', '0/5', '0/10', '2/10', 'one star', 'zero stars',
    'never again', 'never buying', 'never using', 'never recommend',
    'going back to', 'went back to', 'switched away', 'unsubscribed',
    'asked for refund', 'demanded refund', 'got a refund', 'refund please',
    'money back', 'want my money back', 'give me my money',
    'rip off', 'rip-off', 'cash grab', 'money grab',
    'not impressed', 'not satisfied', 'not happy', 'not pleased',
    'lost trust', 'lost faith', 'lost confidence', 'can\'t trust',
    'getting worse', 'gone downhill', 'going downhill', 'went downhill',
    'used to be good', 'used to be great', 'not what it used to be',
];

// Positive emoji/emoticon patterns
const POSITIVE_EMOJI = /[❤️💕💖💗💙💚💛🧡💜🤍🖤💯🔥⭐🌟✨🏆🥇🎉🎊👏👍🙌💪🤩😍😊😃😄🥰💐🌹✅☑️👌🤗💎💡🚀⚡🎯🏅]/u;
const NEGATIVE_EMOJI = /[💩👎😡😤😠🤮🤢😡😤🖕💔😞😢😭😩😫🚫❌⛔🤡💀☠️]/u;

function classifySentiment(text: string): 'Positive' | 'Negative' | 'Neutral' {
    const lower = text.toLowerCase();
    let score = 0;

    // ── Phase 1: Multi-word phrase matching (highest weight: ±3) ───
    for (const phrase of POSITIVE_PHRASES) {
        if (lower.includes(phrase)) score += 3;
    }
    for (const phrase of NEGATIVE_PHRASES) {
        if (lower.includes(phrase)) score -= 3;
    }

    // ── Phase 2: Single word matching (weight: ±1) ────────────────
    // Split text into words for exact matching
    const words = lower.replace(/[^a-z0-9'-]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    for (const word of words) {
        if (POSITIVE_SINGLE.has(word)) score += 1;
        if (NEGATIVE_SINGLE.has(word)) score -= 1;
    }

    // ── Phase 3: Negation detection (flips positive → negative) ───
    const negationPatterns = [
        /\b(not|isn'?t|wasn'?t|aren'?t|don'?t|doesn'?t|didn'?t|can'?t|won'?t|wouldn'?t|shouldn'?t|never|no longer|barely|hardly)\s+\w*\s*(good|great|amazing|excellent|best|nice|helpful|recommend|worth|impressive|reliable|fast|easy|useful|solid|decent|fan)/gi,
        /\b(nothing)\s+(special|great|impressive|good|amazing|remarkable)/gi,
        /\b(far from)\s+(perfect|ideal|great|good|amazing)/gi,
        /\b(leaves? (much|a lot) to be desired)/gi,
        /\b(could be (much |a lot |way )?(better|improved))/gi,
    ];
    for (const pat of negationPatterns) {
        if (pat.test(lower)) {
            score -= 3; // Strong negative override
        }
    }

    // ── Phase 4: Structural/contextual patterns ───────────────────
    // Comparisons in favor of brand
    if (/\b(better than|superior to|outperforms?|beats?|outclass|outshine)/i.test(lower)) score += 2;
    if (/\b(worse than|inferior to|pales? in comparison|can't compete|doesn't compare)/i.test(lower)) score -= 2;

    // Expressions of switching TO (positive about new brand)
    if (/\b(switched to|moved to|migrated to|adopted|chose|choosing|picked|went with)\b/i.test(lower) && score >= 0) score += 2;

    // Recommendation patterns
    if (/\b(you should (try|use|check|get)|give it a (try|shot)|check (it |this )?out)\b/i.test(lower)) score += 2;

    // ── Phase 4b: USAGE-DETECTION (key rule: mentioning you USE a product = positive) ──
    // If a user mentions they USE the product, they're sharing a positive experience
    // unless strong negative signals override it. +3 bonus for usage signals.
    const usagePatterns = [
        /\b(i use|i'm using|i am using|we use|we're using|we are using)\b/i,
        /\b(i('ve| have) been using|we('ve| have) been using)\b/i,
        /\b(been using .* for (months|years|weeks|days|a while|some time))\b/i,
        /\b(daily driver|go-to (tool|app|product|service|platform|solution))\b/i,
        /\b(i (bought|purchased|ordered|subscribed|signed up|registered))\b/i,
        /\b(we (bought|purchased|ordered|subscribed|signed up|registered))\b/i,
        /\b(our team uses|my team uses|our company uses|our org uses)\b/i,
        /\b(been a (customer|user|subscriber|member|client) (of|for|since))\b/i,
        /\b(loyal (customer|user|subscriber|fan) (of|for|since))\b/i,
        /\b(started using|began using|just started|just got|just bought)\b/i,
        /\b(currently using|actively using|still using|always use)\b/i,
        /\b(i rely on|we rely on|depends? on|count on)\b/i,
        /\b(installed|set up|implemented|deployed|integrated|onboarded)\b/i,
        /\b(paying for|pay for|our subscription|my subscription|my plan)\b/i,
        /\b(renewed|extended|upgraded|continued with)\b/i,
        /\b(can't imagine .* without|wouldn't be possible without)\b/i,
        /\b(part of (my|our) (workflow|stack|toolkit|setup|routine))\b/i,
        /\b(use it (every|daily|regularly|all the time|constantly|frequently))\b/i,
        /\b(i('m| am) (a|an) (user|customer|subscriber|member|client) of)\b/i,
    ];
    for (const pat of usagePatterns) {
        if (pat.test(lower)) {
            score += 2; // Usage of product = mild positive (reduced from 3 to prevent overshadowing negative signals)
            break; // Only count once
        }
    }

    // Question patterns are usually neutral
    if (/^(is|are|has|have|does|do|can|could|should|would|what|how|why|where|when|which|who)\b/i.test(lower.trim()) && score === 0) {
        // Questions without sentiment words stay neutral
        return 'Neutral';
    }

    // ── Phase 5: Emoji / emoticon detection ───────────────────────
    if (POSITIVE_EMOJI.test(text)) score += 2;
    if (NEGATIVE_EMOJI.test(text)) score -= 2;

    // Multiple exclamation marks with positive context = amplified positive
    const exclCount = (text.match(/!/g) || []).length;
    if (exclCount >= 2 && score > 0) score += 1;
    if (exclCount >= 2 && score < 0) score -= 1;

    // ── Phase 5b: Negative override for ambiguous contexts ────────
    // Posts about "issues", "problems", "support" are inherently negative even with some positive words
    if (/\b(issue|problem|bug|error|crash|broken|fix|support ticket|customer support|complaint)/i.test(lower) && score > 0 && score <= 3) {
        score -= 2; // Pull back toward negative
    }
    // Posts mentioning frustration, waiting, delay are negative
    if (/\b(waiting|waited|delay|delayed|slow response|no response|still waiting|took forever|takes forever)/i.test(lower)) {
        score -= 2;
    }
    // "but" + negative pattern usually means the overall sentiment is mixed-to-negative
    if (/\bbut\b.{0,40}\b(expensive|slow|buggy|broken|disappointed|frustrat|annoying|lack|miss|confus|complic)/i.test(lower) && score > 0) {
        score -= 3; // "It's good but expensive/slow" = not positive
    }

    // ── Phase 6: Engagement-based bias ────────────────────────────
    // High-upvoted content about brands tends to be opinionated (not neutral)

    // ── Final classification ──────────────────────────────────────
    // Positive threshold: score > 3 (slightly relaxed from > 4)
    if (score > 3) return 'Positive';
    if (score < -1) return 'Negative'; // Only clearly negative (score <= -2)
    
    // Score is 0-3 — borderline territory
    if (score >= 2 && lower.length > 100) return 'Positive';
    
    // Score of exactly 0 with negative-leaning keywords → mildly negative
    if (score === 0 && /\b(issue|problem|complaint|disappoint|frustrat|broken|bug)/i.test(lower)) return 'Negative';
    
    // Score of -1 is only Negative if there's clear negative language
    if (score === -1) return 'Neutral';
    
    return 'Neutral';
}

function reclassifyMentions(data: any): void {
    if (!data) return;

    const allMentions: any[] = [
        ...(data.top_mentions || []),
        ...(data.all_mentions || []),
    ];

    // Build a set of unique mentions by link to avoid double-counting
    const processed = new Set<string>();

    const counts: Record<string, number> = { Positive: 0, Negative: 0, Neutral: 0 };
    const byPlatform: Record<string, Record<string, number>> = {};

    for (const m of allMentions) {
        const key = m.link || m.title || Math.random().toString();
        if (processed.has(key)) continue;
        processed.add(key);

        const text = `${m.title || ''} ${m.snippet || ''}`;
        const newSentiment = classifySentiment(text);
        m.sentiment = newSentiment;
        counts[newSentiment] = (counts[newSentiment] || 0) + 1;

        const plat = m.platform || 'Other';
        if (!byPlatform[plat]) byPlatform[plat] = { Positive: 0, Negative: 0, Neutral: 0 };
        byPlatform[plat][newSentiment]++;
    }

    // Also reclassify top_mentions (they share objects if from all_mentions, but might be separate)
    for (const m of (data.top_mentions || [])) {
        const text = `${m.title || ''} ${m.snippet || ''}`;
        m.sentiment = classifySentiment(text);
    }

    const total = processed.size || 1;
    data.sentiment_breakdown = {
        Positive: { count: counts.Positive || 0, percentage: Math.round(((counts.Positive || 0) / total) * 100) },
        Negative: { count: counts.Negative || 0, percentage: Math.round(((counts.Negative || 0) / total) * 100) },
        Neutral: { count: counts.Neutral || 0, percentage: Math.round(((counts.Neutral || 0) / total) * 100) },
    };

    data.sentiment_by_platform = byPlatform;
}

// ── Relevancy Scoring (to filter irrelevant mentions) ──────
function calculateRelevancy(mention: any, brandName: string): number {
    if (!brandName) return 1; // No brand name to compare against
    const brand = brandName.toLowerCase().trim();
    const brandWords = brand.split(/\s+/).filter(w => w.length > 2);
    const text = `${mention.title || ''} ${mention.snippet || ''}`.toLowerCase();
    const url = (mention.link || '').toLowerCase();
    
    // ── MULTI-WORD BRAND ENFORCEMENT ──
    // For brands with 2+ significant words (e.g. "Red Bull", "Word of Wow"),
    // ALL words must be present together. A single word match is NOT enough.
    const isMultiWord = brandWords.length >= 2;
    
    // 1. Exact brand name match = high relevancy
    if (text.includes(brand)) return 1.0;
    
    // 2. All brand words present (e.g. "Acme Corp" → both "acme" and "corp" found)
    const allWordsPresent = brandWords.length > 0 && brandWords.every(w => text.includes(w));
    if (allWordsPresent) return 0.9;
    
    // ── For multi-word brands, REJECT if not all words are present ──
    if (isMultiWord) {
        // Only exception: URL contains the full brand name (concatenated or hyphenated)
        const brandSlug = brand.replace(/\s+/g, '');
        const brandHyphen = brand.replace(/\s+/g, '-');
        if (url.includes(brandSlug) || url.includes(brandHyphen)) return 0.5;
        
        // Otherwise, partial matches for multi-word brands are IRRELEVANT
        return 0.0;
    }
    
    // ── Single-word brand logic (unchanged) ──
    // 3. Partial match: the word is present in text
    const longestWord = brandWords.sort((a, b) => b.length - a.length)[0] || brand;
    if (longestWord.length >= 3 && text.includes(longestWord)) return 0.6;
    
    // 4. URL contains brand name
    if (url.includes(brand.replace(/\s+/g, ''))) return 0.5;
    if (url.includes(brand.replace(/\s+/g, '-'))) return 0.5;
    
    // 5. No match at all — irrelevant
    return 0.0;
}

// ── Dictionary Word Brand Disambiguation ───────────────
// For brands that are common English words (Apple, Dove, Puma, etc.),
// filter out mentions that use the word literally, not as a brand.
// Uses LOCAL heuristics — no API calls.

// Business/brand context indicators (if present, likely about the brand)
const BRAND_CONTEXT_KEYWORDS = [
    'company', 'brand', 'product', 'app', 'software', 'platform', 'service',
    'startup', 'tech', 'launch', 'ceo', 'founder', 'revenue', 'stock',
    'share price', 'market cap', 'ipo', 'acquisition', 'merger', 'investor',
    'valuation', 'quarterly', 'earnings', 'annual report', 'partnership',
    'review', 'rating', 'customer', 'user', 'download', 'update', 'version',
    'release', 'feature', 'subscription', 'pricing', 'plan', 'trial',
    'enterprise', 'competitor', 'market share', 'industry', 'sector',
    'device', 'phone', 'laptop', 'wearable', 'gadget', 'hardware',
    'innovation', 'patent', 'trademark', 'copyright', 'brand ambassador',
    'sponsor', 'campaign', 'marketing', 'advertisement', 'commercial',
    'coupon', 'discount', 'deal', 'promo', 'offer', 'buy', 'purchase',
    'order', 'shipping', 'delivery', 'return policy', 'warranty',
    'customer support', 'help desk', 'faq', 'terms of service',
];

// Known business domains that indicate a brand mention
const BUSINESS_DOMAINS = [
    'techcrunch.com', 'theverge.com', 'wired.com', 'engadget.com',
    'mashable.com', 'arstechnica.com', 'cnet.com', 'zdnet.com',
    'bloomberg.com', 'reuters.com', 'forbes.com', 'businessinsider.com',
    'wsj.com', 'cnbc.com', 'crunchbase.com', 'producthunt.com',
    'g2.com', 'capterra.com', 'trustpilot.com', 'glassdoor.com',
    'linkedin.com', 'ycombinator.com', 'techradar.com', 'tomsguide.com',
    'macrumors.com', 'androidauthority.com', '9to5mac.com',
    'venturebeat.com', 'hbr.org', 'inc.com', 'entrepreneur.com',
];

// Literal context patterns for common word brands (word → literal patterns)
const LITERAL_CONTEXT_PATTERNS: Record<string, RegExp[]> = {
    apple: [
        /apple\s*(pie|sauce|cider|juice|tree|orchard|picking|harvest|fruit|seed|slice|bake|crisp|tart|vinegar|crumble)/i,
        /\b(eat|ate|eating|bake|baking|cook|cooking|recipe|ingredient|delicious|ripe|green|red)\b.*apple/i,
        /apple.*\b(fruit|healthy|organic|farm|garden|food|snack|dessert|diet)\b/i,
    ],
    dove: [
        /dove\s*(bird|nest|coo|peace|flock|feather|turtle|white\s*dove|ring\s*dove)/i,
        /\b(bird|pigeon|avian|wildlife|ornithol|nest|flew|flying)\b.*dove/i,
    ],
    puma: [
        /puma\s*(animal|cat|mountain\s*lion|cougar|wild|habitat|conservation)/i,
        /\b(animal|wildlife|zoo|big\s*cat|predator|species|endangered)\b.*puma/i,
    ],
    jaguar: [
        /jaguar\s*(animal|cat|big\s*cat|wildlife|habitat|conservation|species|zoo)/i,
        /\b(animal|wildlife|endangered|predator|species|rainforest|zoo)\b.*jaguar/i,
    ],
    shell: [
        /shell\s*(beach|sea|ocean|collect|fossil|clam|oyster|snail|conch|turtle)/i,
        /\b(seashell|beach|ocean|marine|mollusk|coral)\b.*shell/i,
    ],
    sage: [
        /sage\s*(herb|plant|spice|tea|leaf|garden|cook|season|dried|fresh)/i,
        /\b(herb|spice|seasoning|cooking|recipe|garden|plant)\b.*sage/i,
    ],
    mint: [
        /mint\s*(herb|plant|tea|leaf|flavor|fresh|garden|julep|chocolate)/i,
        /\b(herb|tea|flavor|chew|gum|candy|fresh|breath)\b.*mint/i,
    ],
    nest: [
        /\b(bird|egg|robin|eagle|build|hatc|tree|branch)\b.*nest/i,
        /nest\s*(egg|bird|build|tree|branch|hatc)/i,
    ],
    bloom: [
        /bloom\s*(flower|garden|spring|petal|blossom)/i,
        /\b(flower|garden|petal|blossom|plant|spring)\b.*bloom/i,
    ],
    hive: [
        /hive\s*(bee|honey|colony|queen|swarm|wax)/i,
        /\b(bee|honey|beekeeper|pollinator|colony)\b.*hive/i,
    ],
    oracle: [
        /oracle\s*(ancient|greek|delphi|prophecy|divination|myth)/i,
    ],
    amazon: [
        /amazon\s*(river|rainforest|jungle|basin|tribe|forest|deforestation)/i,
        /\b(river|rainforest|jungle|wildlife|ecosystem|tributary)\b.*amazon/i,
    ],
};

/**
 * Filter mentions for dictionary-word brands.
 * Returns the filtered array with literal-use mentions removed.
 */
function filterDictionaryWordMentions(
    mentions: any[],
    brandName: string,
    brandUrl?: string
): any[] {
    const brandLower = brandName.toLowerCase().trim();

    // Only apply to dictionary-word brands
    if (!isDictionaryWord(brandLower)) return mentions;

    logger.info(`[DISAMBIGUATION] Brand "${brandName}" is a common dictionary word — applying context filter`);

    let brandDomain = '';
    if (brandUrl) {
        try { brandDomain = new URL(brandUrl).hostname.replace(/^www\./, ''); } catch { /* invalid URL */ }
    }
    const literalPatterns = LITERAL_CONTEXT_PATTERNS[brandLower] || [];

    let filteredOut = 0;

    const filtered = mentions.filter(m => {
        const text = `${m.title || ''} ${m.snippet || ''}`.toLowerCase();
        const url = (m.link || '').toLowerCase();

        // ── AUTO-KEEP: URL is from a known business/tech domain ──
        if (BUSINESS_DOMAINS.some(d => url.includes(d))) return true;

        // ── AUTO-KEEP: URL contains the brand's own domain ──
        if (brandDomain && url.includes(brandDomain)) return true;

        // ── AUTO-REJECT: Text matches known literal-use patterns ──
        if (literalPatterns.length > 0 && literalPatterns.some(p => p.test(text))) {
            filteredOut++;
            return false;
        }

        // ── HEURISTIC: Check for business context keywords ──
        const hasBusinessContext = BRAND_CONTEXT_KEYWORDS.some(kw => text.includes(kw));
        if (hasBusinessContext) return true;

        // ── HEURISTIC: If text only has the word once and no business context, likely literal ──
        const brandRegex = new RegExp(`\\b${brandLower}\\b`, 'gi');
        const matches = text.match(brandRegex);
        const mentionCount = matches ? matches.length : 0;
        
        // If the brand word appears only once and there's no business context, check deeper
        if (mentionCount <= 1 && !hasBusinessContext) {
            // Check if it's in a recipe, nature, or casual context
            const casualIndicators = [
                'recipe', 'cook', 'bake', 'garden', 'nature', 'animal', 'bird',
                'flower', 'plant', 'tree', 'fruit', 'vegetable', 'food', 'eat',
                'pet', 'wild', 'forest', 'ocean', 'beach', 'hobby', 'craft',
                'diy', 'homemade',
            ];
            const isCasual = casualIndicators.some(kw => text.includes(kw));
            if (isCasual) {
                filteredOut++;
                return false;
            }
        }

        // ── Keep by default if ambiguous (don't over-filter) ──
        return true;
    });

    if (filteredOut > 0) {
        logger.info(`[DISAMBIGUATION] Filtered ${filteredOut} literal-use mentions of "${brandName}"`);
    }

    return filtered;
}

// ── Estimated Reach Calculator ────────────────────────
const PLATFORM_REACH: Record<string, (m: any) => number> = {
    reddit: (m) => ((m.upvotes || 0) * 30) + ((m.num_comments || 0) * 55) + 350,
    linkedin: (m) => 600 + ((m.upvotes || 0) * 40),
    twitter: (m) => 450 + ((m.upvotes || 0) * 15),
    x: (m) => 450 + ((m.upvotes || 0) * 15),
    youtube: (m) => 1000 + ((m.upvotes || 0) * 20) + ((m.num_comments || 0) * 80),
    trustpilot: () => 120,
    review: () => 120,
    blog: () => 250,
    article: () => 250,
};

function calculateReach(data: any): number {
    if (!data?.all_mentions) return 0;
    let total = 0;
    const processed = new Set<string>();

    for (const m of data.all_mentions) {
        const key = m.link || m.title || Math.random().toString();
        if (processed.has(key)) continue;
        processed.add(key);

        const platform = (m.platform || 'other').toLowerCase();
        const calc = PLATFORM_REACH[platform] || (() => 200);
        const reach = Math.round(calc(m) * 2.2); // 2.2x multiplier for broader view estimation
        m.estimated_reach = reach;
        total += reach;
    }

    data.estimated_reach = total;
    return total;
}

// ── WOW Score Calculator ──────────────────────────────
const PLATFORM_AUTHORITY: Record<string, number> = {
    linkedin: 1.0,
    reddit: 0.8,
    twitter: 0.7,
    x: 0.7,
    trustpilot: 0.6,
    review: 0.5,
    blog: 0.4,
    article: 0.4,
};

function calculateWowScore(data: any): number {
    if (!data || !data.all_mentions?.length) return 0;

    const totalMentions = data.total_mentions || data.all_mentions.length;
    const reach = data.estimated_reach || 0;

    // 1. Reach component (0-100, log-scaled: higher bar — 50K = ~60, 500K = ~80, 5M = ~100)
    const reachScore = Math.min(100, reach > 0 ? (Math.log10(reach) / Math.log10(5000000)) * 100 : 0);

    // 2. Mention volume (0-100, log-scaled: 20 = ~50, 100 = ~75, 500+ = ~100)
    const mentionScore = Math.min(100, totalMentions > 0 ? (Math.log10(totalMentions) / Math.log10(500)) * 100 : 0);

    // 3. Sentiment (user's exact formula)
    const P = (data.sentiment_breakdown?.Positive?.count || 0) / Math.max(totalMentions, 1);
    const N = (data.sentiment_breakdown?.Negative?.count || 0) / Math.max(totalMentions, 1);
    const Neutral = (data.sentiment_breakdown?.Neutral?.count || 0) / Math.max(totalMentions, 1);

    // Reduced negative weight from -1.5 to -1.0 (less punishing)
    const rawSentiment = (P * 1) + (N * -1.0) + (Neutral * 0.3);
    const normalizedSentiment = (rawSentiment + 1.0) / 2.0;
    const sentimentScore = Math.min(100, Math.max(0, normalizedSentiment * 100));

    // 4. Authority / Source Quality (weighted average of platform scores)
    const processed = new Set<string>();
    let authoritySum = 0;
    let authorityCount = 0;
    for (const m of (data.all_mentions || [])) {
        const key = m.link || m.title || Math.random().toString();
        if (processed.has(key)) continue;
        processed.add(key);

        const plat = (m.platform || 'other').toLowerCase();
        authoritySum += PLATFORM_AUTHORITY[plat] || 0.3;
        authorityCount++;
    }
    const authorityScore = authorityCount > 0 ? (authoritySum / authorityCount) * 100 : 30;

    // 5. ★ Est. Views by Sentiment — DIRECT penalty ─────────────
    const allMentions: any[] = data.all_mentions || [];
    const positiveViews = allMentions.filter(m => m.sentiment === 'Positive').reduce((s: number, m: any) => s + (m.estimated_reach || 0), 0);
    const negativeViews = allMentions.filter(m => m.sentiment === 'Negative').reduce((s: number, m: any) => s + (m.estimated_reach || 0), 0);
    const viewsDifference = positiveViews - negativeViews;

    // Determine direct penalty and breakdown score
    let viewsSentimentPenalty = 0;
    let sentimentByViewsScore = 50; // default mid-range if no issue

    if (negativeViews > positiveViews * 1.5) {
        // Negative views SIGNIFICANTLY exceed positive → -20 (reduced from -30)
        viewsSentimentPenalty = 20;
        sentimentByViewsScore = Math.max(5, Math.round(10 * (positiveViews / Math.max(negativeViews, 1))));
    } else if (negativeViews > positiveViews || Math.abs(viewsDifference) < 4000) {
        // Slightly more negative or close → -10 (reduced from -15)
        viewsSentimentPenalty = 10;
        sentimentByViewsScore = 15 + Math.round(25 * Math.min(1, Math.abs(viewsDifference) / 4000));
    } else {
        // Positive is ahead — no penalty, breakdown 45-85
        sentimentByViewsScore = 45 + Math.round(40 * Math.min(1, viewsDifference / Math.max(positiveViews, 1)));
    }

    // Store for frontend access
    data.views_sentiment_analysis = {
        positiveViews,
        negativeViews,
        negativeExceedsPositive: negativeViews > positiveViews,
        viewsPenaltyApplied: viewsSentimentPenalty,
    };

    // Final WOW Score (base formula, then flat penalty)
    const rawScore = Math.round(
        (0.25 * reachScore) +
        (0.25 * mentionScore) +
        (0.30 * sentimentScore) +
        (0.10 * authorityScore) +
        (0.10 * Math.max(0, sentimentByViewsScore))
    );

    // Apply the FLAT penalty directly
    const finalScore = Math.min(100, Math.max(0, rawScore - viewsSentimentPenalty));

    data.wow_score = finalScore;
    data.wow_score_breakdown = {
        reach: Math.round(reachScore),
        mentions: Math.round(mentionScore),
        sentiment: Math.round(sentimentScore),
        authority: Math.round(authorityScore),
        sentimentByViews: sentimentByViewsScore,
    };

    return data.wow_score;
}

// ── Local WOW Insights Generator (no API needed) ──────
// Extracts themes from mention snippets using keyword pattern matching.
// Used as a fallback when the n8n OpenAI insights call fails.

const POSITIVE_THEMES: [RegExp, string][] = [
    [/(?:great|amazing|excellent|fantastic|wonderful|awesome|superb|outstanding)\s*(?:product|service|quality|experience|support|team)/i, 'Customers praise the overall product quality and experience'],
    [/(?:fast|quick|speedy|rapid|instant)\s*(?:delivery|shipping|response|service|support)/i, 'Fast delivery and responsive customer service'],
    [/(?:easy|simple|intuitive|user.?friendly|seamless)\s*(?:to use|setup|interface|navigation|experience)/i, 'Easy-to-use and intuitive user experience'],
    [/(?:love|loved|loving|adore|enjoy)\s*(?:the|this|using|it|their)/i, 'Strong emotional connection — customers love using the product'],
    [/(?:recommend|recommended|highly recommend|would recommend|must.?try)/i, 'High recommendation rate among customers'],
    [/(?:best|top|favorite|favourite|go.?to|preferred)\s*(?:product|brand|choice|option|app|tool|service)/i, 'Considered a top choice/favorite in its category'],
    [/(?:value|affordable|worth|good price|fair price|bang for.*buck|great deal)/i, 'Good value for money'],
    [/(?:reliable|dependable|consistent|trust|trusted|trustworthy|solid)/i, 'Known for reliability and consistency'],
    [/(?:helpful|responsive|friendly|supportive)\s*(?:staff|team|support|service|customer)/i, 'Helpful and friendly customer support'],
    [/(?:innovative|modern|cutting.?edge|advanced|unique|creative|fresh)/i, 'Innovative approach appreciated by users'],
];

const NEGATIVE_THEMES: [RegExp, string][] = [
    [/(?:slow|delayed|late|waiting|took.*long|takes.*forever)/i, 'Complaints about slow response times or delays'],
    [/(?:expensive|overpriced|costly|high price|too much|ripoff|rip.?off)/i, 'Pricing concerns — perceived as too expensive'],
    [/(?:bug|buggy|crash|error|glitch|broken|doesn.?t work|not working)/i, 'Technical issues: bugs, crashes, or errors reported'],
    [/(?:poor|bad|terrible|horrible|awful|worst|disappointing)\s*(?:quality|service|support|experience)/i, 'Poor quality or disappointing experience'],
    [/(?:unresponsive|no response|ignored|never replied|can.?t reach|hard to reach)/i, 'Customer support is unresponsive or hard to reach'],
    [/(?:confusing|complicated|difficult|hard to|unclear|complex|steep learning)/i, 'Confusing or complicated user experience'],
    [/(?:misleading|false|scam|fraud|deceptive|dishonest|fake)/i, 'Trust issues — concerns about misleading claims'],
    [/(?:cancel|refund|return|charged|billing|subscription)\s*(?:issue|problem|difficult|impossible)/i, 'Issues with billing, cancellation, or refunds'],
    [/(?:lack|missing|no |doesn.?t have|wish.*had|need.*more)\s*(?:feature|option|function)/i, 'Missing features or functionality gaps'],
    [/(?:downgrade|worse|declined|used to be|went downhill|not.*anymore)/i, 'Product quality perceived as declining over time'],
];

const SUGGESTION_TEMPLATES = [
    { condition: (neg: string[]) => neg.some(n => /slow|delay|response/i.test(n)), text: 'Invest in faster response times and set clear SLAs for customer inquiries' },
    { condition: (neg: string[]) => neg.some(n => /expensive|pric/i.test(n)), text: 'Review pricing strategy — consider introductory offers or transparent tier comparisons' },
    { condition: (neg: string[]) => neg.some(n => /bug|crash|error|technical/i.test(n)), text: 'Prioritize stability and bug fixes — establish a public status page for transparency' },
    { condition: (neg: string[]) => neg.some(n => /support|unresponsive/i.test(n)), text: 'Strengthen customer support channels — consider live chat and faster ticket resolution' },
    { condition: (neg: string[]) => neg.some(n => /confusing|complicated/i.test(n)), text: 'Simplify onboarding with guided tutorials and clearer documentation' },
    { condition: (neg: string[]) => neg.some(n => /trust|misleading|scam/i.test(n)), text: 'Build trust through verified reviews, case studies, and transparent communication' },
    { condition: (neg: string[]) => neg.some(n => /missing|feature|lack/i.test(n)), text: 'Create a public feature request board to prioritize what customers want most' },
    { condition: (neg: string[]) => neg.some(n => /billing|cancel|refund/i.test(n)), text: 'Make cancellation and refund processes simple and transparent' },
    { condition: (_neg: string[]) => true, text: 'Encourage satisfied customers to share their experience on social platforms' },
    { condition: (_neg: string[]) => true, text: 'Monitor brand sentiment regularly and address negative mentions promptly' },
];

function generateLocalInsights(data: any): { likes: string[]; complaints: string[]; suggestions: string[] } {
    const mentions: any[] = data.all_mentions || [];
    const positives = mentions.filter(m => m.sentiment === 'Positive');
    const negatives = mentions.filter(m => m.sentiment === 'Negative');

    // Extract likes from positive mentions
    const likes: string[] = [];
    const allPosText = positives.map(m => `${m.title || ''} ${m.snippet || ''}`).join(' ');
    for (const [pattern, theme] of POSITIVE_THEMES) {
        if (pattern.test(allPosText) && likes.length < 5) {
            likes.push(theme);
        }
    }
    if (likes.length === 0 && positives.length > 0) {
        likes.push('Customers are generally expressing positive sentiment about the brand');
    }
    if (likes.length === 0) {
        likes.push('Not enough positive mentions to identify specific themes');
    }

    // Extract complaints from negative mentions
    const complaints: string[] = [];
    const allNegText = negatives.map(m => `${m.title || ''} ${m.snippet || ''}`).join(' ');
    for (const [pattern, theme] of NEGATIVE_THEMES) {
        if (pattern.test(allNegText) && complaints.length < 5) {
            complaints.push(theme);
        }
    }
    if (complaints.length === 0 && negatives.length > 0) {
        complaints.push('Some negative sentiment detected but no specific recurring themes');
    }
    if (complaints.length === 0) {
        complaints.push('No significant complaints found in recent mentions');
    }

    // Generate suggestions based on complaints
    const suggestions: string[] = [];
    for (const tmpl of SUGGESTION_TEMPLATES) {
        if (tmpl.condition(complaints) && suggestions.length < 5) {
            suggestions.push(tmpl.text);
        }
    }

    return { likes, complaints, suggestions };
}

/* ═══════════════════════════════════════════════════════════
   ROUTE
   ═══════════════════════════════════════════════════════════ */

/**
 * POST /api/brand-mentions/track
 * Triggers the n8n Brand Mentions Tracker workflow, then applies
 * post-processing (sentiment fix, reach estimation, WOW score).
 * Only accessible by brand-role users.
 */
router.post('/track', async (req: Request, res: Response): Promise<void> => {
    try {
        // Role check — brand only
        if (req.user?.role !== 'brand') {
            res.status(403).json({ error: 'Only brand users can track mentions', code: 403 });
            return;
        }

        const { brand_name, brand_url } = req.body;

        if (!brand_name || typeof brand_name !== 'string' || brand_name.trim() === '') {
            res.status(400).json({ error: 'brand_name is required', code: 400 });
            return;
        }

        const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/brand-mentions';

        logger.info({ brand_name, brand_url, userId: req.user.id }, 'Brand mentions tracking requested');

        // Call the n8n webhook using native fetch
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout

        try {
            const n8nResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand_name: brand_name.trim(),
                    brand_url: brand_url?.trim() || undefined,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            const responseText = await n8nResponse.text();

            if (!n8nResponse.ok) {
                logger.error({ status: n8nResponse.status, body: responseText }, 'n8n webhook returned error');
                res.status(502).json({
                    error: 'n8n workflow returned an error',
                    details: responseText,
                    code: 502,
                });
                return;
            }

            if (!responseText || responseText.trim() === '') {
                logger.error({ brand_name }, 'n8n returned empty response');
                res.status(502).json({
                    error: 'n8n returned an empty response. Please re-import the updated workflow JSON and ensure the workflow is active.',
                    code: 502,
                });
                return;
            }

            let data: any;
            try {
                data = JSON.parse(responseText);
            } catch {
                logger.error({ responseText: responseText.substring(0, 200) }, 'n8n returned non-JSON');
                res.status(502).json({
                    error: 'n8n returned an unexpected response format.',
                    details: responseText.substring(0, 200),
                    code: 502,
                });
                return;
            }

            // ═══ POST-PROCESSING (no OpenAI API) ═══

            // 0a. SUPPLEMENT: Fetch additional Reddit mentions via Serper directly
            const SERPER_API_KEY_LOCAL = process.env.SERPER_API_KEY || '';
            if (SERPER_API_KEY_LOCAL) {
                try {
                    const redditQueries = [
                        `"${brand_name.trim()}" site:reddit.com`,
                        `"${brand_name.trim()}" reddit review`,
                        `"${brand_name.trim()}" reddit discussion`,
                        `"${brand_name.trim()}" reddit experience`,
                    ];
                    const existingLinks = new Set(
                        (data.all_mentions || []).map((m: any) => m.link).filter(Boolean)
                    );
                    let addedCount = 0;

                    for (const query of redditQueries) {
                        try {
                            const serperRes = await fetch('https://google.serper.dev/search', {
                                method: 'POST',
                                headers: {
                                    'X-API-KEY': SERPER_API_KEY_LOCAL,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ q: query, num: 20 }),
                            });
                            if (serperRes.ok) {
                                const serperData: any = await serperRes.json();
                                for (const result of (serperData.organic || [])) {
                                    const link = result.link || '';
                                    if (!link || existingLinks.has(link)) continue;
                                    if (!link.includes('reddit.com')) continue;
                                    existingLinks.add(link);
                                    const mention = {
                                        title: result.title || '',
                                        snippet: result.snippet || '',
                                        link,
                                        platform: 'Reddit',
                                        sentiment: 'Neutral',
                                        upvotes: 0,
                                        num_comments: 0,
                                        source: 'serper_supplement',
                                    };
                                    if (!data.all_mentions) data.all_mentions = [];
                                    data.all_mentions.push(mention);
                                    addedCount++;
                                }
                            }
                        } catch (e) { /* ignore individual query failures */ }
                    }
                    if (addedCount > 0) {
                        logger.info(`[SUPPLEMENT] Added ${addedCount} extra Reddit mentions for "${brand_name}" via Serper`);
                    }
                } catch (e) {
                    logger.warn(`[SUPPLEMENT] Serper supplementation failed: ${(e as Error).message}`);
                }
            }

            // 0b. FILTER: Remove brand's own official social media pages
            const brandNameClean = brand_name.trim().toLowerCase().replace(/\s+/g, '');
            const brandUrlClean = (brand_url || '').trim().toLowerCase();
            if (data.all_mentions) {
                data.all_mentions = data.all_mentions.filter((m: any) => {
                    const link = (m.link || '').toLowerCase();
                    // Filter out LinkedIn company pages (brand posting about itself)
                    if (link.includes('linkedin.com/company/')) return false;
                    if (link.includes('linkedin.com/posts/') && link.includes(brandNameClean)) return false;
                    // Filter out brand's official Twitter/Instagram/Facebook pages
                    if (link.includes('twitter.com/' + brandNameClean) || link.includes('x.com/' + brandNameClean)) return false;
                    if (link.includes('instagram.com/' + brandNameClean)) return false;
                    if (link.includes('facebook.com/' + brandNameClean)) return false;
                    // Filter out the brand's own website (if provided)
                    if (brandUrlClean && link.startsWith(brandUrlClean.replace(/\/$/, ''))) return false;
                    return true;
                });
            }
            if (data.top_mentions) {
                data.top_mentions = data.top_mentions.filter((m: any) => {
                    const link = (m.link || '').toLowerCase();
                    if (link.includes('linkedin.com/company/')) return false;
                    if (link.includes('linkedin.com/posts/') && link.includes(brandNameClean)) return false;
                    if (link.includes('twitter.com/' + brandNameClean) || link.includes('x.com/' + brandNameClean)) return false;
                    if (link.includes('instagram.com/' + brandNameClean)) return false;
                    if (link.includes('facebook.com/' + brandNameClean)) return false;
                    if (brandUrlClean && link.startsWith(brandUrlClean.replace(/\/$/, ''))) return false;
                    return true;
                });
            }
            
            // ═══════════════════════════════════════════════════════
            // SMART PIPELINE: Dedup → Rule-filter → Conditional AI
            // Uses cached brand context + static ambiguity list
            // Non-ambiguous brands = ZERO AI calls for filtering
            // ═══════════════════════════════════════════════════════

            // 0. RELEVANCY FILTER — basic keyword relevancy scoring
            const brandNameLower = brand_name.trim().toLowerCase();
            let filteredCount = 0;
            if (data.all_mentions) {
                const before = data.all_mentions.length;
                data.all_mentions = data.all_mentions.filter((m: any) => {
                    const score = calculateRelevancy(m, brandNameLower);
                    m.relevancy_score = score;
                    return score >= 0.3;
                });
                filteredCount = before - data.all_mentions.length;
                if (filteredCount > 0) {
                    logger.info(`[RELEVANCY] Filtered out ${filteredCount} irrelevant mentions for "${brand_name}"`);
                }
            }
            if (data.top_mentions) {
                data.top_mentions = data.top_mentions.filter((m: any) => {
                    const score = calculateRelevancy(m, brandNameLower);
                    return score >= 0.3;
                });
            }
            data.total_mentions = (data.all_mentions || []).length;
            data.filtered_irrelevant = filteredCount;

            // 0b. SMART AMBIGUITY PIPELINE — replaces old dictionary filter
            // Handles: dedup, rule-based pre-filter, cached brand context,
            // GPT-4o-mini classification ONLY for ambiguous brands
            if (data.all_mentions && data.all_mentions.length > 0) {
                const { filtered: smartFiltered, stats } = await processMentionsPipeline(
                    data.all_mentions,
                    brand_name.trim(),
                    brand_url
                );
                data.all_mentions = smartFiltered;
                data.total_mentions = smartFiltered.length;
                data.pipeline_stats = stats;

                // Also apply to top_mentions
                if (data.top_mentions) {
                    const topLinks = new Set(smartFiltered.map((m: any) => m.link));
                    data.top_mentions = data.top_mentions.filter((m: any) => topLinks.has(m.link));
                }
            }
            
            // 1. Re-classify sentiments with stricter keyword analysis
            reclassifyMentions(data);

            // 1b. Extract positive_sources (source links for positive mentions)
            if (data.all_mentions) {
                data.positive_sources = data.all_mentions
                    .filter((m: any) => m.sentiment === 'Positive' && m.link)
                    .slice(0, 5)
                    .map((m: any) => ({
                        title: m.title || '',
                        link: m.link,
                        platform: m.platform || 'Other',
                        snippet: m.snippet || '',
                    }));
                // Also extract negative_sources if not already present
                if (!data.negative_sources) {
                    data.negative_sources = data.all_mentions
                        .filter((m: any) => m.sentiment === 'Negative' && m.link)
                        .slice(0, 5)
                        .map((m: any) => ({
                            title: m.title || '',
                            link: m.link,
                            platform: m.platform || 'Other',
                            snippet: m.snippet || '',
                        }));
                }
            }

            // 2. Estimate reach per mention and total
            calculateReach(data);

            // 3. Calculate composite WOW Score
            calculateWowScore(data);

            // 4. Fix WOW Insights — regenerate locally if n8n/OpenAI failed
            const insights = data.wow_insights;
            const insightsBroken = !insights
                || !insights.likes
                || !insights.complaints
                || (insights.likes.length === 1 && insights.likes[0] === 'Unable to parse insights')
                || (insights.likes.length === 0 && insights.complaints.length === 0);

            if (insightsBroken) {
                logger.info(`[INSIGHTS] n8n insights empty/broken for "${brand_name}" — generating locally`);
                data.wow_insights = generateLocalInsights(data);
            }

            logger.info(
                {
                    brand_name,
                    totalMentions: data?.total_mentions,
                    wowScore: data?.wow_score,
                    estimatedReach: data?.estimated_reach,
                },
                'Brand mentions tracking completed (post-processed)'
            );

            res.json({
                success: true,
                data,
            });
        } catch (fetchErr: any) {
            clearTimeout(timeout);
            throw fetchErr;
        }
    } catch (err: any) {
        logger.error({ err: err.message, stack: err.stack }, 'Brand mentions tracking failed');

        if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
            res.status(503).json({
                error: 'n8n workflow service is not reachable. Please ensure n8n is running.',
                code: 503,
            });
            return;
        }

        if (err.name === 'AbortError') {
            res.status(504).json({
                error: 'The tracking request timed out. The workflow may still be processing.',
                code: 504,
            });
            return;
        }

        res.status(500).json({
            error: 'Failed to track brand mentions',
            details: err.message,
            code: 500,
        });
    }
});

export default router;

