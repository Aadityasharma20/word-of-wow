/**
 * Brand Ambiguity & Context System
 * 
 * Cost-efficient brand mention filtering:
 * - Static ambiguity list loaded at startup (self-extending)
 * - Supabase-cached brand context (generated once via GPT-4o-mini)
 * - MD5 dedup for processed mentions
 * - Rule-based pre-filtering for non-ambiguous brands (zero AI)
 * - GPT-4o-mini classification only for ambiguous brands
 */

import { createHash } from 'crypto';
import { readFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from './supabase';
import { logger } from './logger';

// ── PATH TO AMBIGUOUS BRANDS FILE ──
const AMBIGUOUS_FILE = join(__dirname, '..', '..', '..', 'ambiguous_brand_names.txt');

// ── IN-MEMORY CACHE ──
let ambiguousBrandsSet: Set<string> | null = null;
const brandContextMemCache = new Map<string, BrandContext>();

export interface BrandContext {
    brandName: string;
    isAmbiguous: boolean;
    description: string;
    industry: string;
    keywords: string[];
    negativeContexts: string[];
}

// ════════════════════════════════════════════════════════════
// 1. AMBIGUITY FILE MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * Load the ambiguous brands file into memory.
 * Parses JSON array format or line-per-brand format.
 */
export function loadAmbiguousBrands(): Set<string> {
    if (ambiguousBrandsSet) return ambiguousBrandsSet;

    ambiguousBrandsSet = new Set<string>();

    try {
        if (!existsSync(AMBIGUOUS_FILE)) {
            logger.warn('[AMBIGUITY] ambiguous_brand_names.txt not found, starting with empty set');
            return ambiguousBrandsSet;
        }

        const raw = readFileSync(AMBIGUOUS_FILE, 'utf-8').trim();
        
        // Try JSON array format first
        if (raw.startsWith('[')) {
            const arr: string[] = JSON.parse(raw);
            for (const name of arr) {
                ambiguousBrandsSet.add(name.toLowerCase().trim());
            }
        } else {
            // Line-per-brand format
            for (const line of raw.split('\n')) {
                const clean = line.trim().toLowerCase().replace(/^["',]+|["',]+$/g, '');
                if (clean) ambiguousBrandsSet.add(clean);
            }
        }

        logger.info(`[AMBIGUITY] Loaded ${ambiguousBrandsSet.size} ambiguous brand names from file`);
    } catch (err: any) {
        logger.error(`[AMBIGUITY] Failed to load ambiguous brands file: ${err.message}`);
    }

    return ambiguousBrandsSet;
}

/**
 * Check if a brand name is in the static ambiguity list.
 */
export function isInAmbiguityFile(brandName: string): boolean {
    const set = loadAmbiguousBrands();
    return set.has(brandName.toLowerCase().trim());
}

/**
 * Append a newly discovered ambiguous brand to the file (self-learning).
 */
export function appendToAmbiguityFile(brandName: string): void {
    const clean = brandName.toLowerCase().trim();
    const set = loadAmbiguousBrands();

    if (set.has(clean)) return; // Already exists

    try {
        // Read current file, parse JSON array, append, write back
        if (existsSync(AMBIGUOUS_FILE)) {
            const raw = readFileSync(AMBIGUOUS_FILE, 'utf-8').trim();
            if (raw.startsWith('[')) {
                const arr: string[] = JSON.parse(raw);
                arr.push(clean);
                const { writeFileSync } = require('fs');
                writeFileSync(AMBIGUOUS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
            } else {
                appendFileSync(AMBIGUOUS_FILE, `\n${clean}`, 'utf-8');
            }
        }

        set.add(clean);
        logger.info(`[AMBIGUITY] Self-learned: appended "${clean}" to ambiguous brands file`);
    } catch (err: any) {
        logger.warn(`[AMBIGUITY] Failed to append "${clean}" to file: ${err.message}`);
        // Still add to in-memory set
        set.add(clean);
    }
}

// ════════════════════════════════════════════════════════════
// 2. BRAND CONTEXT (CACHED IN SUPABASE)
// ════════════════════════════════════════════════════════════

/**
 * Get or create brand context. Checks:
 * 1. In-memory cache
 * 2. Supabase brand_context_cache table
 * 3. Generate via GPT-4o-mini (one-time cost)
 */
export async function getBrandContext(brandName: string): Promise<BrandContext> {
    const clean = brandName.toLowerCase().trim();

    // 1. In-memory cache
    if (brandContextMemCache.has(clean)) {
        return brandContextMemCache.get(clean)!;
    }

    // 2. Supabase cache
    try {
        const { data, error } = await supabaseAdmin
            .from('brand_context_cache')
            .select('*')
            .eq('brand_name', clean)
            .single();

        if (!error && data && data.description) {
            const ctx: BrandContext = {
                brandName: clean,
                isAmbiguous: data.is_ambiguous,
                description: data.description,
                industry: data.industry || '',
                keywords: data.keywords || [],
                negativeContexts: data.negative_contexts || [],
            };
            brandContextMemCache.set(clean, ctx);
            return ctx;
        }
    } catch {
        // Table might not exist yet, continue to generate
    }

    // 3. Check ambiguity from file
    const isAmbiguous = isInAmbiguityFile(clean);

    // 4. Generate context via GPT-4o-mini (ONE-TIME per brand)
    const ctx = await generateBrandContext(clean, isAmbiguous);

    // 5. Store in Supabase
    try {
        await supabaseAdmin.from('brand_context_cache').upsert({
            brand_name: clean,
            is_ambiguous: ctx.isAmbiguous,
            description: ctx.description,
            industry: ctx.industry,
            keywords: ctx.keywords,
            negative_contexts: ctx.negativeContexts,
            context_generated_at: new Date().toISOString(),
        }, { onConflict: 'brand_name' });
    } catch (err: any) {
        logger.warn(`[BRAND-CTX] Failed to cache context for "${clean}": ${err.message}`);
    }

    brandContextMemCache.set(clean, ctx);
    return ctx;
}

/**
 * Generate brand context using GPT-4o-mini. Called ONCE per brand.
 */
async function generateBrandContext(brandName: string, isAmbiguous: boolean): Promise<BrandContext> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        logger.warn('[BRAND-CTX] No OPENAI_API_KEY — returning default context');
        return {
            brandName,
            isAmbiguous,
            description: `${brandName} brand`,
            industry: 'general',
            keywords: [brandName],
            negativeContexts: [],
        };
    }

    try {
        const prompt = `Brand: "${brandName}"

Return a JSON object with:
- "description": 1-sentence description of this brand/company (if it exists as a known brand)
- "industry": one word for the industry
- "keywords": array of 8-10 words/phrases strongly associated with this brand as a COMPANY (products, services, competitors)
- "negativeContexts": array of 8-10 words/phrases that indicate the word "${brandName}" is being used in its NON-BRAND meaning (e.g., for "apple": "fruit", "pie", "orchard", "tree")

If "${brandName}" is NOT a known brand, still provide generic business keywords and negative contexts for the word.

Reply ONLY with valid JSON. No markdown.`;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You generate brand context profiles. Respond ONLY with valid JSON.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.2,
            }),
        });

        if (!res.ok) throw new Error(`OpenAI API returned ${res.status}`);

        const data: any = await res.json();
        let raw = data.choices?.[0]?.message?.content?.trim() || '';
        raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(raw);

        const ctx: BrandContext = {
            brandName,
            isAmbiguous,
            description: parsed.description || `${brandName} brand`,
            industry: parsed.industry || 'general',
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map((k: string) => k.toLowerCase()) : [brandName],
            negativeContexts: Array.isArray(parsed.negativeContexts) ? parsed.negativeContexts.map((k: string) => k.toLowerCase()) : [],
        };

        logger.info(`[BRAND-CTX] Generated context for "${brandName}": industry=${ctx.industry}, ${ctx.keywords.length} keywords, ${ctx.negativeContexts.length} negative contexts`);
        return ctx;
    } catch (err: any) {
        logger.error(`[BRAND-CTX] GPT context generation failed for "${brandName}": ${err.message}`);
        return {
            brandName,
            isAmbiguous,
            description: `${brandName} brand`,
            industry: 'general',
            keywords: [brandName],
            negativeContexts: [],
        };
    }
}

// ════════════════════════════════════════════════════════════
// 3. MENTION DEDUPLICATION (MD5)
// ════════════════════════════════════════════════════════════

/**
 * Generate MD5 hash of normalized mention text.
 */
export function getMentionHash(text: string): string {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 500);
    return createHash('md5').update(normalized).digest('hex');
}

/**
 * Check if a set of mention hashes already exist in DB.
 * Returns a Set of existing hashes for fast lookup.
 */
export async function getExistingHashes(hashes: string[], brandName: string): Promise<Set<string>> {
    const existing = new Set<string>();
    if (hashes.length === 0) return existing;

    try {
        // Batch check in chunks of 200
        const clean = brandName.toLowerCase().trim();
        for (let i = 0; i < hashes.length; i += 200) {
            const batch = hashes.slice(i, i + 200);
            const { data } = await supabaseAdmin
                .from('mention_hashes')
                .select('hash')
                .eq('brand_name', clean)
                .in('hash', batch);

            if (data) {
                for (const row of data) existing.add(row.hash);
            }
        }
    } catch (err: any) {
        logger.warn(`[DEDUP] Failed to check existing hashes: ${err.message}`);
    }

    return existing;
}

/**
 * Store processed mention hashes in DB.
 */
export async function storeProcessedHashes(hashes: string[], brandName: string): Promise<void> {
    if (hashes.length === 0) return;

    try {
        const clean = brandName.toLowerCase().trim();
        const rows = hashes.map(h => ({ hash: h, brand_name: clean }));

        // Insert in chunks, ignoring duplicates
        for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100);
            await supabaseAdmin
                .from('mention_hashes')
                .upsert(batch, { onConflict: 'hash,brand_name', ignoreDuplicates: true });
        }
    } catch (err: any) {
        logger.warn(`[DEDUP] Failed to store hashes: ${err.message}`);
    }
}

// ════════════════════════════════════════════════════════════
// 4. MENTION FILTERING PIPELINE
// ════════════════════════════════════════════════════════════

/**
 * Rule-based pre-filter using brand context.
 * Returns { keep: true/false, reason: string }
 */
export function ruleBasedFilter(
    mention: { title?: string; snippet?: string; link?: string },
    context: BrandContext
): { keep: boolean; reason: string } {
    const text = `${mention.title || ''} ${mention.snippet || ''}`.toLowerCase().substring(0, 250);

    // Auto-reject if text contains negative context keywords (literal use)
    if (context.negativeContexts.length > 0) {
        const negHits = context.negativeContexts.filter(neg => text.includes(neg));
        const posHits = context.keywords.filter(kw => text.includes(kw));

        // If has more negative context hits than positive keyword hits → reject
        if (negHits.length > 0 && posHits.length === 0) {
            return { keep: false, reason: `negative_context: ${negHits.slice(0, 3).join(', ')}` };
        }
    }

    // Auto-keep if text contains brand-specific keywords
    const keywordHits = context.keywords.filter(kw => text.includes(kw));
    if (keywordHits.length >= 2) {
        return { keep: true, reason: `strong_keyword_match: ${keywordHits.slice(0, 3).join(', ')}` };
    }

    // For non-ambiguous brands, auto-keep everything that has the brand name
    if (!context.isAmbiguous) {
        return { keep: true, reason: 'non_ambiguous_brand' };
    }

    // For ambiguous brands with weak signals → needs AI
    return { keep: true, reason: 'needs_ai_classification' };
}

/**
 * GPT-4o-mini batch classification for ambiguous brand mentions.
 * Only called for ambiguous brands, only for mentions that need AI.
 * Returns array of booleans (true = keep this mention).
 */
export async function batchClassifyMentions(
    mentions: { title?: string; snippet?: string }[],
    context: BrandContext
): Promise<boolean[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || mentions.length === 0) {
        // No API key → keep all (better than losing data)
        return mentions.map(() => true);
    }

    // Trim all mentions to 200 chars max
    const trimmed = mentions.map((m, i) => {
        const text = `${m.title || ''} ${m.snippet || ''}`.substring(0, 200);
        return `${i + 1}. ${text}`;
    });

    const prompt = `Brand: "${context.brandName}"
Description: ${context.description}

For each post below, answer ONLY "Y" or "N":
Y = this post refers to "${context.brandName}" as a brand/company
N = this post uses "${context.brandName}" in its literal/non-brand meaning

${trimmed.join('\n')}

Respond with ONLY comma-separated Y/N values. Example: Y,N,Y,Y,N`;

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You classify brand mentions. Respond ONLY with comma-separated Y or N values.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: Math.min(mentions.length * 3 + 50, 2000),
                temperature: 0,
            }),
        });

        if (!res.ok) throw new Error(`OpenAI returned ${res.status}`);

        const data: any = await res.json();
        const raw = data.choices?.[0]?.message?.content?.trim() || '';
        const codes = raw.split(',').map((s: string) => s.trim().toUpperCase());

        return mentions.map((_, i) => {
            const code = codes[i] || 'Y';
            return code === 'Y';
        });
    } catch (err: any) {
        logger.error(`[CLASSIFY] Batch classification failed: ${err.message}`);
        // On error, keep all mentions (don't lose data)
        return mentions.map(() => true);
    }
}

/**
 * Full mention processing pipeline.
 * This is the main entry point called from brandMentions.ts
 */
export async function processMentionsPipeline(
    mentions: any[],
    brandName: string,
    brandUrl?: string
): Promise<{ filtered: any[]; stats: PipelineStats }> {
    const stats: PipelineStats = {
        totalInput: mentions.length,
        deduplicated: 0,
        ruleFiltered: 0,
        aiFiltered: 0,
        aiSkipped: 0,
        totalOutput: 0,
        aiCallsMade: 0,
    };

    if (mentions.length === 0) {
        return { filtered: [], stats };
    }

    // 1. Get brand context (cached after first call)
    const context = await getBrandContext(brandName);
    logger.info(`[PIPELINE] Brand "${brandName}": ambiguous=${context.isAmbiguous}, industry=${context.industry}`);

    // 2. Dedup via MD5 hashes
    const hashes = mentions.map(m => getMentionHash(`${m.title || ''} ${m.snippet || ''} ${m.link || ''}`));
    const existingHashes = await getExistingHashes(hashes, brandName);

    let dedupFiltered: any[] = [];
    const newHashes: string[] = [];

    for (let i = 0; i < mentions.length; i++) {
        if (existingHashes.has(hashes[i])) {
            stats.deduplicated++;
        } else {
            dedupFiltered.push(mentions[i]);
            newHashes.push(hashes[i]);
        }
    }

    // 3. Trim content to 250 chars (cost optimization)
    for (const m of dedupFiltered) {
        if (m.snippet && m.snippet.length > 250) {
            m.snippet = m.snippet.substring(0, 250);
        }
    }

    // 4. Rule-based pre-filter
    const needsAI: any[] = [];
    const autoKept: any[] = [];

    for (const m of dedupFiltered) {
        const result = ruleBasedFilter(m, context);
        if (!result.keep) {
            stats.ruleFiltered++;
        } else if (result.reason === 'needs_ai_classification') {
            needsAI.push(m);
        } else {
            autoKept.push(m);
        }
    }

    // 5. AI classification — ONLY for ambiguous brands, ONLY for uncertain mentions
    let aiKept: any[] = [];
    if (context.isAmbiguous && needsAI.length > 0) {
        stats.aiCallsMade = 1;
        
        // Batch in groups of 80 to stay within token limits
        for (let i = 0; i < needsAI.length; i += 80) {
            const batch = needsAI.slice(i, i + 80);
            const results = await batchClassifyMentions(batch, context);
            
            for (let j = 0; j < batch.length; j++) {
                if (results[j]) {
                    aiKept.push(batch[j]);
                } else {
                    stats.aiFiltered++;
                }
            }
            if (i + 80 < needsAI.length) stats.aiCallsMade++;
        }
    } else {
        // Non-ambiguous brand → keep all uncertain mentions (zero AI cost)
        aiKept = needsAI;
        stats.aiSkipped = needsAI.length;
    }

    const finalMentions = [...autoKept, ...aiKept];
    stats.totalOutput = finalMentions.length;

    // 6. Store new hashes for dedup in future runs
    await storeProcessedHashes(newHashes, brandName);

    logger.info(
        `[PIPELINE] "${brandName}" results: in=${stats.totalInput} dedup=${stats.deduplicated} rule_filtered=${stats.ruleFiltered} ai_filtered=${stats.aiFiltered} ai_skipped=${stats.aiSkipped} ai_calls=${stats.aiCallsMade} out=${stats.totalOutput}`
    );

    return { filtered: finalMentions, stats };
}

export interface PipelineStats {
    totalInput: number;
    deduplicated: number;
    ruleFiltered: number;
    aiFiltered: number;
    aiSkipped: number;
    totalOutput: number;
    aiCallsMade: number;
}
