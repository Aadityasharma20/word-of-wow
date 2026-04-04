# Agent 2: Sentinel — Intelligence Engineer

> **Timeline:** Week 3–5 | **Depends On:** Agent 1 (Atlas) | **Outputs Feed:** Agent 3 (Prism)

---

## Mission

Build the AI-powered scoring pipeline, fraud detection engine, trust score calculator, and background job system. When you're done, a submitted URL goes through: content fetch → AI scoring → fraud check → auto-decision → coupon assignment → trust score update — all asynchronously.

---

## Prerequisites From Agent 1 (Atlas)

You will receive a working system with:
- ✅ Supabase DB with all tables (submissions, coupon_tiers, coupon_codes, fraud_logs, etc.)
- ✅ Auth middleware and role guards
- ✅ `POST /api/submissions` that saves submissions with `scoring_status: 'pending'`
- ✅ `couponService.assignCoupon(submissionId, campaignId, advocateId, finalScore)` function
- ✅ Admin review endpoints

---

## Task 1: Job Queue Infrastructure (BullMQ + Redis)

### What To Do
Set up BullMQ with Upstash Redis. Create 5 job queues and their workers.

### Exact Steps

1. Install: `npm install bullmq ioredis` in `server/`
2. Create `server/src/lib/redis.ts`:
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
export default redis;
```

3. Create `server/src/jobs/queues.ts` — define all 5 queues:

| Queue Name | Concurrency | Max Retries | Backoff |
|---|---|---|---|
| `content-fetch` | 5 | 3 | Exponential, 5s base |
| `ai-scoring` | 3 | 3 | Exponential, 10s base |
| `fraud-detection` | 3 | 2 | Exponential, 5s base |
| `trust-score-update` | 2 | 2 | Fixed 5s |
| `reward-processing` | 2 | 3 | Fixed 5s |

4. Create worker files in `server/src/jobs/workers/`:
   - `contentFetchWorker.ts`
   - `aiScoringWorker.ts`
   - `fraudDetectionWorker.ts`
   - `trustScoreWorker.ts`
   - `rewardWorker.ts`

5. **CRITICAL**: Modify Atlas's `POST /api/submissions` endpoint to add a job to the `content-fetch` queue after saving the submission:
```typescript
await contentFetchQueue.add('fetch', { submissionId: submission.id }, { priority: 1 });
```

6. Each worker, on completion, triggers the next queue:
   - `content-fetch` → adds job to `ai-scoring`
   - `ai-scoring` → adds job to `fraud-detection`
   - `fraud-detection` → adds job to `reward-processing` (if auto-approved)
   - `reward-processing` → adds job to `trust-score-update`

7. Create `GET /api/admin/queues` — returns queue stats (waiting, active, completed, failed counts)

### Definition of Done
- Redis connects successfully
- All 5 queues created and workers registered
- Submission creation triggers `content-fetch` job
- Job completion chains to next queue
- Failed jobs retry with backoff
- Admin can view queue stats

---

## Task 2: Reddit Content Fetcher

### What To Do
Fetch Reddit post/comment content via Reddit API when `content-fetch` job runs.

### Exact Steps

1. Create `server/src/services/reddit.ts`
2. Implement Reddit OAuth:
   - `POST https://www.reddit.com/api/v1/access_token` with client credentials
   - Cache token for 1 hour (token expires every 2 hours)

3. URL Parsing — extract content ID:
   - Post URL format: `https://www.reddit.com/r/{subreddit}/comments/{postId}/{slug}/`
   - Comment URL format: `https://www.reddit.com/r/{subreddit}/comments/{postId}/{slug}/{commentId}/`
   - Extract `postId` and optionally `commentId` using regex

4. Fetch content:
   - Posts: `GET https://oauth.reddit.com/api/info?id=t3_{postId}`
   - Comments: `GET https://oauth.reddit.com/r/{subreddit}/comments/{postId}?comment={commentId}`
   - Extract fields:
     - `title` (posts only)
     - `selftext` or `body` (the actual content)
     - `author`
     - `subreddit`
     - `ups` (upvotes)
     - `num_comments`
     - `created_utc` (to calculate account age)

5. Update submission record:
```sql
UPDATE submissions SET
    fetched_content = :body,
    fetched_title = :title,
    fetched_author = :author,
    fetched_subreddit = :subreddit,
    fetched_upvotes = :ups,
    fetched_comments_count = :numComments,
    fetched_at = NOW()
WHERE id = :submissionId;
```

6. Handle errors:
   - Deleted post → set `scoring_status = 'failed'`, add note "Content deleted or not found"
   - Private subreddit → set `scoring_status = 'failed'`, add note "Content in private subreddit"
   - Rate limited → throw error (BullMQ will retry with backoff)
   - Invalid URL → set `scoring_status = 'failed'`

### Definition of Done
- Given a valid Reddit post URL → fetches title, body, author, subreddit, upvotes, comments count
- Given a valid Reddit comment URL → fetches comment body, author, subreddit
- Deleted posts handled gracefully
- All fetched data stored in submissions table

---

## Task 3: LinkedIn Content Handler

### What To Do
LinkedIn API is restricted. Phase 1 uses advocate-pasted content with URL validation.

### Exact Steps

1. Create `server/src/services/linkedin.ts`
2. For LinkedIn submissions, Atlas already required `content` field in the submission body
3. The `content-fetch` worker for LinkedIn should:
   - Validate the URL is a real LinkedIn URL (`linkedin.com/feed/update/` or `linkedin.com/posts/`)
   - Copy `submitted_content` to `fetched_content`
   - Set `fetched_at = NOW()`
   - Set `fetched_author` from the advocate's `linkedin_profile_url` if available
4. Mark as ready for scoring

### Definition of Done
- LinkedIn submissions with pasted content flow through content-fetch without errors
- URL format validated
- Content stored in `fetched_content`

---

## Task 4: AI Scoring Pipeline

### What To Do
Score each submission across 5 dimensions using GPT-4o-mini. This is the core intelligence.

### Exact Steps

1. Create `server/src/services/aiScoring.ts`
2. Install: `npm install openai` in `server/`
3. Create OpenAI client in `server/src/lib/openai.ts`

4. **For each scoring dimension, create a prompt function.** Each prompt must:
   - Receive: submission content, campaign description, campaign keywords, platform
   - Return: `{ score: number (0-100), confidence: number (0-1), reasoning: string, flags: string[] }`
   - Use `response_format: { type: "json_object" }` for structured output

5. **Prompt Templates:**

**Content Quality** (score 0-100):
```
You are evaluating a social media {post/comment} on {reddit/linkedin} for content quality.

Content: "{fetched_content}"
Title (if post): "{fetched_title}"

Score this content from 0-100 on CONTENT QUALITY based on:
- Originality: Is this original thought or copied/templated text?
- Depth: Does it provide meaningful detail or just surface-level mention?
- Helpfulness: Would a reader find this genuinely useful?
- Grammar & Readability: Is it well-written?
- Effort: Did the author put real thought into this?

Return JSON: { "score": number, "confidence": number, "reasoning": string, "flags": string[] }

Score guidelines:
- 0-30: Low effort, templated, or spam-like content
- 31-60: Basic mention with minimal depth
- 61-80: Thoughtful content with genuine insight
- 81-100: Exceptional, detailed, truly helpful content
```

**Brand Relevance** (score 0-100):
```
You are evaluating how relevant a social media post is to a brand's campaign.

Content: "{fetched_content}"
Campaign Description: "{campaign.description}"
Brand Keywords: {campaign.keywords}
Campaign Guidelines: "{campaign.guidelines}"

Score from 0-100 on BRAND RELEVANCE based on:
- Does the content mention the brand/product naturally?
- Does it address topics related to the campaign?
- Does it include key themes the brand wants discussed?
- Would the brand be happy to be associated with this content?

Return JSON: { "score": number, "confidence": number, "reasoning": string, "flags": string[] }
```

**Authenticity** (score 0-100):
```
You are a content authenticity detector. Evaluate whether this social media content is a genuine organic mention or promotional/artificial content.

Content: "{fetched_content}"
Platform: {reddit/linkedin}
Author post history context: {total submissions by this advocate}

Score from 0-100 on AUTHENTICITY based on:
- Does this read like a genuine personal experience?
- Or does it read like a sponsored/promotional post?
- Is the tone natural for {platform}?
- Are there telltale signs of paid promotion (overly positive, no negatives, marketing language)?
- Does it feel like real word-of-mouth?

Return JSON: { "score": number, "confidence": number, "reasoning": string, "flags": string[] }

A genuine post might mention both pros AND cons. Promotional content is uniformly positive.
```

**Engagement Quality** (score 0-100):
```
You are evaluating the engagement quality of a social media {post/comment}.

Content: "{fetched_content}"
Platform: {platform}
Subreddit: "{fetched_subreddit}" (if Reddit)
Upvotes: {fetched_upvotes}
Comments: {fetched_comments_count}

Score from 0-100 on ENGAGEMENT QUALITY based on:
- Is this posted in a relevant community/context?
- Do the engagement numbers seem organic for this type of content?
- Would this content naturally generate discussion?
- Is this posted where the target audience would see it?

Return JSON: { "score": number, "confidence": number, "reasoning": string, "flags": string[] }
```

**Audience Relevance** (score 0-100):
```
You are evaluating whether a social media post reaches the right audience for a brand.

Content: "{fetched_content}"
Platform: {platform}
Subreddit: "{fetched_subreddit}" (if Reddit)
Campaign Description: "{campaign.description}"
Brand Industry: "{brand.industry}"

Score from 0-100 on AUDIENCE RELEVANCE based on:
- Is the subreddit/LinkedIn context relevant to the brand's industry?
- Would readers of this content be potential customers?
- Is this reaching a niche, targeted audience or a generic one?

Return JSON: { "score": number, "confidence": number, "reasoning": string, "flags": string[] }
```

6. **AI Scoring Worker (`aiScoringWorker.ts`)**:
   - Fetch submission + campaign + brand data
   - Run all 5 prompts **in parallel** (Promise.all) to minimize latency
   - Parse JSON responses
   - Calculate final score: `score_final = Σ(dimension_score × campaign_weight) - fraud_penalty`
   - Update submission:
```sql
UPDATE submissions SET
    score_content_quality = :cq,
    score_brand_relevance = :br,
    score_authenticity = :auth,
    score_engagement = :eng,
    score_audience_relevance = :ar,
    score_final = :final,
    score_reasoning = :combinedReasoning,
    scoring_status = 'scored'
WHERE id = :submissionId;
```
   - Add job to `fraud-detection` queue

7. **Error Handling**:
   - OpenAI timeout → retry (BullMQ handles)
   - Invalid JSON response → retry once, then fail with `scoring_status = 'failed'`
   - Token limit → truncate content to first 3000 chars

### Definition of Done
- Submission content scored across all 5 dimensions
- Final weighted score calculated using campaign weights
- Reasoning stored in plain English
- Scoring completes within 30 seconds avg
- All scores stored in submissions table

---

## Task 5: Fraud Detection Engine

### What To Do
Run 6 fraud checks on each submission. Classify risk level. Flag suspicious submissions.

### Exact Steps

1. Create `server/src/services/fraudDetection.ts`
2. Implement each check as an independent async function:

**Check 1: Duplicate URL** — `O(1)` DB lookup
```typescript
async function checkDuplicateURL(url: string, submissionId: string): Promise<FraudFlag | null> {
    // SELECT COUNT(*) FROM submissions WHERE submitted_url = url AND id != submissionId
    // If > 0 → return { type: 'duplicate_url', severity: 'high', detail: 'URL submitted before' }
}
```

**Check 2: Content Similarity** — Embedding-based
```typescript
async function checkContentSimilarity(submissionId: string, advocateId: string): Promise<FraudFlag | null> {
    // 1. Generate embedding for this submission's content using text-embedding-3-small
    // 2. Store embedding in submission_embeddings table
    // 3. Query: SELECT cosine similarity against ALL submission_embeddings for this advocate
    //    WHERE similarity > 0.92 → flag 'duplicate_content' severity 'high'
    // 4. Query: SELECT cosine similarity against ALL submission_embeddings for OTHER advocates in same campaign
    //    WHERE similarity > 0.88 → flag 'cross_user_duplicate' severity 'critical'
}
```
- Use pgvector `<=>` operator: `SELECT 1 - (embedding <=> :newEmbedding) as similarity`

**Check 3: Account Age**
```typescript
async function checkAccountAge(platform: string, author: string): Promise<FraudFlag | null> {
    // Reddit: Fetch user info from Reddit API, check account created_utc
    // LinkedIn: Skip (no API access in Phase 1)
    // If account < 30 days old → { type: 'new_account', severity: 'medium' }
}
```

**Check 4: Submission Velocity**
```typescript
async function checkSubmissionVelocity(advocateId: string): Promise<FraudFlag | null> {
    // SELECT COUNT(*) FROM submissions WHERE advocate_id = advocateId AND created_at > NOW() - INTERVAL '1 hour'
    // If > 5 → { type: 'high_velocity', severity: 'medium' }
}
```

**Check 5: Engagement Anomaly**
```typescript
async function checkEngagementAnomaly(upvotes: number, comments: number, subreddit: string): Promise<FraudFlag | null> {
    // If upvotes > 500 but comments < 5 → suspicious (bought upvotes)
    // If comments/upvotes ratio > 10 → suspicious (bot comments)
    // If post is < 1 hour old but has > 100 upvotes → suspicious
    // Flag: { type: 'engagement_anomaly', severity: 'medium', detail: 'specific anomaly' }
}
```

**Check 6: Cross-User Coordination**
```typescript
async function checkCrossUserPatterns(embedding: number[], campaignId: string, advocateId: string): Promise<FraudFlag | null> {
    // Find submissions from OTHER advocates in same campaign with similarity > 0.88
    // If found → { type: 'coordinated_content', severity: 'critical' }
}
```

3. **Fraud Detection Worker (`fraudDetectionWorker.ts`)**:
   - Run all 6 checks in parallel
   - Collect all flags
   - Classify risk level:
     - No flags → `fraud_risk_level = 'none'`
     - Only low severity flags → `fraud_risk_level = 'low'`
     - Any medium severity flag → `fraud_risk_level = 'medium'`
     - Any high/critical flag → `fraud_risk_level = 'high'`
   - Store flags in `submissions.fraud_flags`
   - Create `fraud_logs` entries for each flag
   - Update `advocate_profiles.fraud_flags` count

4. **Auto-Decision Logic** (inside fraud worker, after fraud analysis):
```typescript
const finalScore = submission.score_final;
const threshold = campaign.min_score_threshold;

if (fraudRiskLevel === 'high') {
    // Auto-reject
    await updateSubmission(submissionId, { review_status: 'rejected', review_notes: 'Auto-rejected: high fraud risk' });
} else if (fraudRiskLevel === 'medium') {
    // Flag for admin
    await updateSubmission(submissionId, { review_status: 'flagged_for_review' });
} else if (finalScore >= threshold) {
    // Auto-approve → trigger reward
    await updateSubmission(submissionId, { review_status: 'approved' });
    await rewardQueue.add('process', { submissionId, campaignId, advocateId, finalScore });
} else {
    // Below threshold → reject
    await updateSubmission(submissionId, { review_status: 'rejected', review_notes: 'Score below campaign threshold' });
}
```

### Definition of Done
- All 6 fraud checks implemented and running
- Embedding similarity working with pgvector
- Risk classification logic correct
- Auto-approve/reject/flag decisions made correctly
- Fraud logs created for each flag
- Flagged submissions appear in admin review queue

---

## Task 6: Reward Processing Worker

### What To Do
When a submission is approved (auto or admin), assign the correct coupon code.

### Exact Steps

1. Create `rewardWorker.ts`
2. Worker receives: `{ submissionId, campaignId, advocateId, finalScore }`
3. Call `couponService.assignCoupon()` (already built by Atlas)
4. If coupon assigned successfully:
   - Update `submissions.reward_issued = true`, `submissions.coupon_code_id`
5. If no coupon available:
   - Log warning
   - Don't block the approval, but mark `reward_issued = false`
6. Trigger `trust-score-update` queue job

### Definition of Done
- Approved submission gets correct coupon tier based on score
- Coupon code marked as assigned
- Trust score update triggered

---

## Task 7: Trust Score Calculator

### What To Do
Recalculate advocate's trust score after each submission resolution.

### Exact Steps

1. Create `server/src/services/trustScore.ts`
2. Implement the formula:

```typescript
async function calculateTrustScore(advocateId: string): Promise<number> {
    // 1. Fetch ALL approved submissions for this advocate
    const submissions = await getApprovedSubmissions(advocateId);

    if (submissions.length === 0) return 50.00; // Default starting score

    // 2. avg_authenticity (40% weight)
    const avgAuthenticity = average(submissions.map(s => s.score_authenticity));

    // 3. fraud_penalty (20% weight)
    const fraudFlags = await getFraudFlagCount(advocateId);
    const fraudPenalty = Math.min(fraudFlags * 15, 100); // Each flag costs 15 points, max 100
    const fraudScore = 100 - fraudPenalty;

    // 4. engagement_consistency (20% weight)
    const scores = submissions.map(s => s.score_final);
    const stdDev = standardDeviation(scores);
    const consistencyScore = Math.max(0, 100 - (stdDev * 2)); // Lower stddev = higher score

    // 5. volume_factor (10% weight)
    const volumeScore = Math.min((submissions.length / 20) * 100, 100); // Caps at 20 submissions

    // 6. recent_trend (10% weight)
    const recentAvg = average(submissions.slice(-5).map(s => s.score_final));
    const overallAvg = average(scores);
    const trendBonus = recentAvg > overallAvg ? Math.min((recentAvg - overallAvg) * 2, 100) : 0;

    // 7. Weighted composite
    const trustScore = (
        avgAuthenticity * 0.40 +
        fraudScore * 0.20 +
        consistencyScore * 0.20 +
        volumeScore * 0.10 +
        trendBonus * 0.10
    );

    return Math.round(trustScore * 100) / 100; // 2 decimal places
}
```

3. **Trust Score Worker (`trustScoreWorker.ts`)**:
   - Calculate new trust score
   - Fetch current score from `advocate_profiles`
   - Insert record into `trust_score_history` (old score, new score, reason)
   - Update `advocate_profiles.trust_score`
   - Update `advocate_profiles.total_submissions` and `approved_submissions` counts

### Definition of Done
- Trust score recalculated after every submission resolution
- History tracked in `trust_score_history`
- Score visible in advocate_profiles
- Formula handles edge cases: 0 submissions, all failures, all perfect

---

## Task 8: Pipeline Integration Test

### What To Do
Run the complete pipeline end-to-end and verify everything works.

### Test Scenarios

1. **Happy path**: Submit valid Reddit URL → fetch content → score 75 → no fraud → auto-approve → 25% coupon assigned → trust score updated
2. **Below threshold**: Submit weak content → score 45 → auto-reject → no coupon → trust score updated (downward)
3. **Fraud flag**: Submit duplicate content → similarity > 0.92 → flagged_for_review → appears in admin queue
4. **High fraud**: Submit exact duplicate URL → auto-reject
5. **LinkedIn**: Submit with pasted content → scores correctly
6. **No coupons left**: All codes assigned → submission approved but no coupon → warning logged

### Definition of Done
- All 6 test scenarios pass
- Pipeline completes within 60 seconds avg
- All database state correct after pipeline

---

## Handoff to Agent 3 (Prism)

When Sentinel is complete, Agent 3 receives:
1. ✅ Full scoring pipeline running asynchronously
2. ✅ Submissions automatically scored, fraud-checked, and decided
3. ✅ Coupons assigned on approval
4. ✅ Trust scores updating
5. ✅ Admin review queue populated with flagged submissions
6. ✅ All score data available via existing API endpoints

Agent 3 will: build the frontend UI that displays all this data in dashboards.
