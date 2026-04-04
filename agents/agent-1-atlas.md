# Agent 1: Atlas — Foundation Engineer

> **Timeline:** Week 1–2 | **Depends On:** Nothing (first agent) | **Outputs Feed:** Agent 2 (Sentinel)

---

## Mission

Build the complete project scaffolding, database layer, authentication system, and API skeleton. When you're done, users can sign up, brands can create campaigns with coupon tiers, and advocates can submit URLs. No scoring yet — just data persistence.

---

## Technical Stack

- **Frontend:** React 18 + Vite + TypeScript + React Router v6
- **Backend:** Node.js 20 + Express.js + TypeScript
- **Database:** Supabase (PostgreSQL)
- **State:** Zustand
- **Validation:** Zod
- **HTTP Client:** Axios

---

## Task 1: Project Scaffolding

### What To Do
Create a monorepo at `c:\Users\LENOVO\Desktop\WORD OF WOW\` with this structure:

```
word-of-wow/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── pages/           # Route pages
│   │   ├── stores/          # Zustand stores
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities (axios instance, supabase client)
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── routes/          # Express route files
│   │   ├── middleware/      # Auth, roleGuard, rateLimiter, validation, errorHandler
│   │   ├── services/        # Business logic
│   │   ├── jobs/            # BullMQ job definitions (stubs for Agent 2)
│   │   ├── lib/             # Supabase client, OpenAI client stubs
│   │   ├── types/           # TypeScript types
│   │   └── index.ts         # Express app entry
│   ├── tsconfig.json
│   └── package.json
├── shared/                  # Shared TypeScript types
│   └── types.ts
├── supabase/
│   └── migrations/          # SQL migration files
├── .env.example
├── .gitignore
└── package.json             # Root workspace config
```

### Exact Steps
1. Run `npm init -y` at root, set up npm workspaces for `client`, `server`, `shared`
2. Inside `client/`: run `npx -y create-vite@latest ./ -- --template react-ts` (non-interactive)
3. Install client deps: `react-router-dom`, `zustand`, `axios`, `@supabase/supabase-js`
4. Inside `server/`: `npm init -y`, install `express`, `cors`, `helmet`, `express-rate-limit`, `zod`, `@supabase/supabase-js`, `bullmq`, `dotenv`, `typescript`, `ts-node`, `@types/express`, `@types/cors`
5. Create `tsconfig.json` for server with `"target": "ES2022"`, `"module": "commonjs"`, `"strict": true`
6. Create `.env.example`:

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (Agent 2 will use)
OPENAI_API_KEY=

# Reddit (Agent 2 will use)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

# Redis (Agent 2 will use)
REDIS_URL=

# Server
PORT=3001
NODE_ENV=development

# Frontend
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3001/api
```

7. Create `.gitignore` covering `node_modules`, `.env`, `dist`, etc.

### Definition of Done
- `npm install` works at root
- `npm run dev` starts Vite dev server on `:5173`
- `npm run dev:server` starts Express on `:3001` with a health check at `GET /api/health` returning `{ status: "ok" }`

---

## Task 2: Database Schema

### What To Do
Create ALL tables in Supabase. Execute these SQL migrations in order.

### Migration 1: Core Tables

```sql
-- Enable pgvector for Agent 2 (embedding similarity)
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('advocate', 'brand', 'admin')),
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    tier TEXT NOT NULL DEFAULT 'explorer' CHECK (tier IN ('explorer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advocate Profiles
CREATE TABLE advocate_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    reddit_username TEXT,
    linkedin_profile_url TEXT,
    trust_score NUMERIC(5,2) DEFAULT 50.00,
    total_submissions INTEGER DEFAULT 0,
    approved_submissions INTEGER DEFAULT 0,
    fraud_flags INTEGER DEFAULT 0,
    is_suspended BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Profiles
CREATE TABLE brand_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    website_url TEXT,
    industry TEXT,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brand_profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    guidelines TEXT,
    target_platforms TEXT[] NOT NULL DEFAULT '{reddit,linkedin}',
    campaign_type TEXT NOT NULL DEFAULT 'awareness'
        CHECK (campaign_type IN ('awareness', 'engagement', 'balanced')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    max_submissions INTEGER,
    min_score_threshold NUMERIC(5,2) DEFAULT 60.00,
    keywords TEXT[],
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    -- Scoring weight customization (must sum to 1.0)
    weight_content_quality NUMERIC(3,2) DEFAULT 0.20,
    weight_brand_relevance NUMERIC(3,2) DEFAULT 0.25,
    weight_authenticity NUMERIC(3,2) DEFAULT 0.25,
    weight_engagement NUMERIC(3,2) DEFAULT 0.15,
    weight_audience_relevance NUMERIC(3,2) DEFAULT 0.15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Discount Tiers (score-to-discount mapping per campaign)
CREATE TABLE coupon_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    min_score NUMERIC(5,2) NOT NULL,       -- e.g., 60.00
    max_score NUMERIC(5,2) NOT NULL,       -- e.g., 74.99
    discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Codes (pool uploaded by brand, assigned to advocates on approval)
CREATE TABLE coupon_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brand_profiles(id),
    tier_id UUID NOT NULL REFERENCES coupon_tiers(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_percent INTEGER NOT NULL,
    is_assigned BOOLEAN DEFAULT false,
    assigned_to UUID REFERENCES advocate_profiles(id),
    assigned_at TIMESTAMPTZ,
    submission_id UUID,                    -- linked after assignment
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    platform TEXT NOT NULL CHECK (platform IN ('reddit', 'linkedin')),
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment')),
    submitted_url TEXT NOT NULL,
    submitted_content TEXT,                -- LinkedIn: advocate pastes content here
    -- Fetched content snapshot (populated by Agent 2)
    fetched_content TEXT,
    fetched_title TEXT,
    fetched_author TEXT,
    fetched_subreddit TEXT,
    fetched_upvotes INTEGER,
    fetched_comments_count INTEGER,
    fetched_at TIMESTAMPTZ,
    -- Scoring (populated by Agent 2)
    score_content_quality NUMERIC(5,2),
    score_brand_relevance NUMERIC(5,2),
    score_authenticity NUMERIC(5,2),
    score_engagement NUMERIC(5,2),
    score_audience_relevance NUMERIC(5,2),
    score_fraud_penalty NUMERIC(5,2) DEFAULT 0,
    score_final NUMERIC(5,2),
    score_reasoning TEXT,
    scoring_status TEXT DEFAULT 'pending'
        CHECK (scoring_status IN ('pending', 'processing', 'scored', 'failed')),
    -- Review
    review_status TEXT DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected', 'flagged_for_review')),
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    -- Fraud
    fraud_risk_level TEXT DEFAULT 'none'
        CHECK (fraud_risk_level IN ('none', 'low', 'medium', 'high')),
    fraud_flags TEXT[],
    -- Reward
    reward_issued BOOLEAN DEFAULT false,
    coupon_code_id UUID REFERENCES coupon_codes(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Score History
CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    previous_score NUMERIC(5,2),
    new_score NUMERIC(5,2),
    change_reason TEXT NOT NULL,
    submission_id UUID REFERENCES submissions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud Logs
CREATE TABLE fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id),
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    fraud_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submission Embeddings (for Agent 2 similarity detection)
CREATE TABLE submission_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    advocate_id UUID NOT NULL REFERENCES advocate_profiles(id),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Actions Log
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 2: Indexes

```sql
CREATE INDEX idx_submissions_advocate ON submissions(advocate_id);
CREATE INDEX idx_submissions_campaign ON submissions(campaign_id);
CREATE INDEX idx_submissions_review_status ON submissions(review_status);
CREATE INDEX idx_submissions_scoring_status ON submissions(scoring_status);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_fraud_logs_submission ON fraud_logs(submission_id);
CREATE INDEX idx_fraud_logs_advocate ON fraud_logs(advocate_id);
CREATE INDEX idx_trust_history_advocate ON trust_score_history(advocate_id);
CREATE INDEX idx_coupon_codes_campaign ON coupon_codes(campaign_id);
CREATE INDEX idx_coupon_codes_tier ON coupon_codes(tier_id);
CREATE INDEX idx_coupon_codes_unassigned ON coupon_codes(campaign_id, tier_id) WHERE is_assigned = false;
CREATE INDEX idx_coupon_tiers_campaign ON coupon_tiers(campaign_id);
CREATE INDEX idx_submission_embeddings_advocate ON submission_embeddings(advocate_id);
```

### Migration 3: RLS Policies

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE advocate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_tiers ENABLE ROW LEVEL SECURITY;

-- Profiles: users read own, admins read all
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Advocates: read own, admins read all
CREATE POLICY advocate_select ON advocate_profiles FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Brands: read own, admins read all, advocates read brand name/logo for campaigns
CREATE POLICY brand_select ON brand_profiles FOR SELECT USING (true);
CREATE POLICY brand_update ON brand_profiles FOR UPDATE USING (auth.uid() = id);

-- Campaigns: active visible to all, brand manages own
CREATE POLICY campaigns_select ON campaigns FOR SELECT USING (
    status = 'active' OR
    brand_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY campaigns_insert ON campaigns FOR INSERT WITH CHECK (brand_id = auth.uid());
CREATE POLICY campaigns_update ON campaigns FOR UPDATE USING (
    brand_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Submissions: advocate sees own, brand sees their campaign's, admin sees all
CREATE POLICY submissions_select ON submissions FOR SELECT USING (
    advocate_id = auth.uid() OR
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = submissions.campaign_id AND campaigns.brand_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY submissions_insert ON submissions FOR INSERT WITH CHECK (advocate_id = auth.uid());

-- Coupon codes: advocate sees own assigned, brand sees campaign's, admin sees all
CREATE POLICY coupon_codes_select ON coupon_codes FOR SELECT USING (
    assigned_to = auth.uid() OR
    brand_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

### Definition of Done
- All tables exist in Supabase with correct columns and constraints
- Indexes created
- RLS policies active
- Test: insert a row into each table via Supabase dashboard, verify constraints work

---

## Task 3: Authentication System

### What To Do
Build complete auth flow using Supabase Auth.

### Backend (`server/src/routes/auth.ts`)

**`POST /api/auth/signup`**
- Body: `{ email, password, role, displayName, companyName? }`
- Validate with Zod: email format, password min 8 chars, role is 'advocate' or 'brand'
- Call `supabase.auth.admin.createUser({ email, password })`
- Insert into `profiles` table with role
- If advocate: insert into `advocate_profiles` (trust_score defaults to 50)
- If brand: insert into `brand_profiles` with companyName
- Return `{ user, session }`

**`POST /api/auth/login`**
- Body: `{ email, password }`
- Call `supabase.auth.signInWithPassword()`
- Return `{ user, session }` with role from profiles table

**`GET /api/auth/session`**
- Header: `Authorization: Bearer <jwt>`
- Verify JWT, return user profile with role

**`POST /api/auth/logout`**
- Invalidate session

### Middleware (`server/src/middleware/`)

**`authMiddleware.ts`**
```typescript
// Extract Bearer token from Authorization header
// Call supabase.auth.getUser(token)
// If invalid → 401 { error: "Unauthorized" }
// Fetch profile from profiles table
// Attach to req: req.user = { id, role, email, displayName }
// Call next()
```

**`roleGuard.ts`**
```typescript
// Factory function: roleGuard('admin') or roleGuard('brand', 'admin')
// Check req.user.role against allowed roles
// If not allowed → 403 { error: "Forbidden" }
```

**`rateLimiter.ts`**
- Use `express-rate-limit`: 100 requests/min per IP
- Submission-specific: 10 submissions/hour per user

**`errorHandler.ts`**
```typescript
// Global error handler: catch all, return { error: message, code: statusCode }
// In development: include stack trace
// In production: generic messages
```

**`validate.ts`**
```typescript
// Factory function: validate(zodSchema)
// Validates req.body against Zod schema
// If invalid → 400 with Zod error details
```

### Frontend Auth
- Create `lib/supabase.ts` — Supabase client init
- Create `lib/api.ts` — Axios instance with interceptor that adds `Authorization: Bearer <token>` header
- Create `stores/authStore.ts` — Zustand store: `user`, `session`, `login()`, `signup()`, `logout()`, `isLoading`
- Create `components/ProtectedRoute.tsx` — Redirects to `/auth/login` if no session, redirects by role after login

### Definition of Done
- Can sign up as advocate → profile + advocate_profiles rows created → redirected to `/advocate/dashboard`
- Can sign up as brand → profile + brand_profiles rows created → redirected to `/brand/dashboard`
- Can log in → JWT returned → subsequent API calls authenticated
- Protected routes reject unauthenticated users
- Role guard rejects wrong roles (advocate can't hit brand endpoints)

---

## Task 4: Campaign API

### Endpoints

**`POST /api/campaigns`** — Brand creates campaign
- Auth: brand only
- Body schema:
```typescript
{
  title: string,              // min 5 chars, max 200
  description: string,        // min 20 chars, max 2000
  guidelines: string,         // max 2000
  targetPlatforms: ('reddit' | 'linkedin')[],  // at least one
  campaignType: 'awareness' | 'engagement' | 'balanced',
  maxSubmissions?: number,    // min 1
  minScoreThreshold: number,  // default 60, min 40, max 95
  keywords: string[],         // 1-20 keywords
  startDate?: string,         // ISO date
  endDate?: string,           // must be after startDate
  weights: {
    contentQuality: number,   // 0.05-0.40
    brandRelevance: number,   // 0.05-0.40
    authenticity: number,     // min 0.20, max 0.40 (FLOOR ENFORCED)
    engagement: number,       // 0.05-0.30
    audienceRelevance: number // 0.05-0.30
  },
  couponTiers: [              // at least 1 tier required
    { minScore: number, maxScore: number, discountPercent: number }
  ]
}
```
- **CRITICAL VALIDATION**: Weights must sum to 1.0 (±0.01 tolerance). Authenticity weight ≥ 0.20.
- **CRITICAL VALIDATION**: Coupon tiers must not overlap. Each tier: `minScore < maxScore`, `discountPercent` between 1-100. Tiers should cover the range from `minScoreThreshold` to 100.
- **DEFAULT COUPON TIERS** (if brand doesn't customize):
  - Score 60–69 → 10% discount
  - Score 70–79 → 25% discount
  - Score 80–89 → 50% discount
  - Score 90–100 → 75% discount
- Insert campaign row + coupon_tiers rows in a transaction
- Return created campaign with tiers

**`GET /api/campaigns`** — List campaigns
- Query params: `status`, `platform`, `page`, `limit`
- Brand sees own campaigns; advocate sees active campaigns; admin sees all

**`GET /api/campaigns/:id`** — Campaign detail
- Include coupon_tiers
- Include submission count, approved count

**`PATCH /api/campaigns/:id`** — Update campaign
- Brand only, only if status is `draft` or `paused`
- Can update all fields including coupon_tiers

**`PATCH /api/campaigns/:id/status`** — Change status
- Allowed transitions: `draft→active`, `active→paused`, `paused→active`, `active→completed`, `paused→completed`
- Activating requires: at least 1 coupon tier with uploaded coupon codes

**`POST /api/campaigns/:id/coupons/upload`** — Brand uploads coupon codes
- Body: `{ tierId: UUID, codes: string[] }`
- Validate tierId belongs to this campaign
- Bulk insert into `coupon_codes` with `is_assigned = false`
- Return count inserted

**`GET /api/campaigns/:id/coupons`** — List coupon codes for campaign
- Brand/admin only
- Show total, assigned, available per tier

### Definition of Done
- Brand can create campaign with custom coupon tiers
- Default tiers applied when none specified
- Weights validated (sum to 1.0, authenticity ≥ 0.20)
- Brand can upload bulk coupon codes per tier
- Campaign can't go active without uploaded codes
- All CRUD operations work with proper auth

---

## Task 5: Submission API

### Endpoints

**`POST /api/submissions`** — Advocate submits URL
- Auth: advocate only
- Body:
```typescript
{
  campaignId: UUID,
  url: string,
  platform: 'reddit' | 'linkedin',
  contentType: 'post' | 'comment',
  content?: string              // Required for LinkedIn (advocate pastes content)
}
```
- Validations:
  - Campaign must be active
  - Campaign must include this platform in `target_platforms`
  - URL format valid (must contain `reddit.com` or `linkedin.com` based on platform)
  - No duplicate URL in this campaign (check `submitted_url`)
  - Advocate is not suspended
  - If LinkedIn: `content` field required (min 50 chars)
  - Rate limit: max 10 submissions per hour per advocate
  - If `max_submissions` set on campaign, check not exceeded
- Insert submission with `scoring_status = 'pending'`, `review_status = 'pending'`
- **Do NOT trigger scoring** — Agent 2 will build the queue trigger
- Return submission with ID

**`GET /api/submissions`** — List submissions
- Advocate: own submissions (with filters: campaignId, status, date range)
- Brand: submissions for own campaigns
- Admin: all submissions
- Include: score_final, review_status, scoring_status, platform, created_at
- Paginated: `page`, `limit`, `sortBy`, `sortOrder`

**`GET /api/submissions/:id`** — Submission detail
- Full score breakdown, fraud flags, review info
- If advocate: include assigned coupon code (if approved with reward)
- If brand/admin: include fraud details

### Definition of Done
- Advocate can submit Reddit URL to active campaign → row created
- Advocate can submit LinkedIn URL + pasted content → row created
- Duplicate URL rejected with clear error
- Submissions list with proper role-based filtering
- Detail view shows all fields

---

## Task 6: Admin API

### Endpoints

**`GET /api/admin/users`** — List all users
- Admin only
- Filters: role, is_active, is_suspended (advocates)
- Returns: id, displayName, email, role, trust_score (if advocate), joined date

**`PATCH /api/admin/users/:id/suspend`** — Suspend advocate
- Sets `advocate_profiles.is_suspended = true`
- Logs in `admin_actions`

**`PATCH /api/admin/users/:id/unsuspend`** — Unsuspend
- Sets `advocate_profiles.is_suspended = false`
- Logs in `admin_actions`

**`GET /api/admin/review-queue`** — Flagged submissions
- Returns submissions where `review_status = 'flagged_for_review'`
- Include: submission content, score breakdown, fraud_flags, advocate trust score
- Sorted by created_at ASC (oldest first)

**`POST /api/admin/review/:submissionId`** — Review decision
- Body: `{ decision: 'approved' | 'rejected', notes: string }`
- Updates `review_status`, `reviewed_by`, `review_notes`, `reviewed_at`
- If approved: triggers coupon assignment (find unassigned coupon matching score tier)
- Logs in `admin_actions`

**`GET /api/admin/actions`** — Audit log
- Paginated list of all admin actions

### Definition of Done
- Admin can list/filter users
- Admin can suspend/unsuspend advocates
- Admin can see flagged submissions queue
- Admin can approve/reject with notes
- Approved submissions get coupon assigned from correct tier
- All actions logged

---

## Task 7: Coupon Assignment Service

### What To Do
Create `server/src/services/couponService.ts` — the core logic for assigning coupons based on score.

```typescript
async function assignCoupon(submissionId: UUID, campaignId: UUID, advocateId: UUID, finalScore: number): Promise<CouponCode | null> {
    // 1. Find the coupon_tier where finalScore is between min_score and max_score
    // 2. Find an unassigned coupon_code in that tier (is_assigned = false)
    // 3. If no codes left → log warning, return null (notify admin)
    // 4. Mark coupon as assigned: set is_assigned=true, assigned_to, assigned_at, submission_id
    // 5. Update submission: set reward_issued=true, coupon_code_id
    // 6. Return the coupon details
}
```

- **IMPORTANT**: Use a database transaction with `SELECT ... FOR UPDATE` to prevent race conditions (two submissions claiming same coupon)
- If no matching tier for the score → no coupon issued (score below all tiers)
- If tier exists but no codes available → flag for brand to upload more

### Definition of Done
- Given a submission score of 75 and tiers (60-69→10%, 70-79→25%, 80-89→50%), the function correctly selects a 25% coupon
- Race condition safe — concurrent requests don't assign same code
- Returns null gracefully when no codes available

---

## Edge Cases to Handle Across All Tasks

| Scenario | Response |
|---|---|
| Advocate submits to own brand's campaign | Check `campaigns.brand_id !== req.user.id`, reject 403 |
| Campaign budget exhausted (max_submissions reached) | Reject 400 "Campaign full" |
| Weights don't sum to 1.0 | Reject 400 with specific error |
| Authenticity weight < 0.20 | Reject 400 "Authenticity weight must be at least 0.20" |
| Overlapping coupon tiers | Reject 400 "Coupon tiers must not overlap" |
| No coupon codes uploaded for tier | Block campaign activation |
| All coupon codes in tier assigned | Return warning, allow submission but flag |

---

## Handoff to Agent 2 (Sentinel)

When Atlas is complete, Agent 2 receives:
1. ✅ Working Supabase database with all tables
2. ✅ Auth system (signup/login/JWT/middleware)
3. ✅ Campaign CRUD with coupon tiers
4. ✅ Submission creation API (submissions saved with `scoring_status: 'pending'`)
5. ✅ Coupon assignment service ready to be called by scoring pipeline
6. ✅ Admin review endpoints ready

Agent 2 will: connect to submissions table, build the scoring pipeline, call `couponService.assignCoupon()` on approval, and update submission status fields.
