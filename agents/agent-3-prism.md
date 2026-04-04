# Agent 3: Prism — Interface Engineer

> **Timeline:** Week 5–7 | **Depends On:** Agent 1 (Atlas) + Agent 2 (Sentinel) | **Outputs Feed:** Agent 4 (Guardian)

---

## Mission

Build every page and component of the Word of Wow frontend. When you're done, advocates can browse campaigns and see scores, brands can create campaigns and monitor mentions, and admins can review flagged submissions — all through a polished, responsive UI.

---

## Prerequisites

- ✅ React + Vite project scaffolded (Agent 1)
- ✅ Auth system with Supabase (Agent 1)
- ✅ All API endpoints working (Agent 1 + Agent 2)
- ✅ Scoring pipeline running (Agent 2)

---

## Design System Requirements

**Color Palette:**
- Primary: `#6C5CE7` (vibrant purple)
- Secondary: `#00D2D3` (teal accent)
- Success: `#00B894`
- Warning: `#FDCB6E`
- Danger: `#E17055`
- Background: `#0F0F1A` (dark mode primary)
- Surface: `#1A1A2E`
- Text: `#FFFFFF` (primary), `#A0A0B0` (secondary)

**Typography:** Inter (Google Fonts) — weights 400, 500, 600, 700

**Design Language:** Dark mode, glassmorphism cards (backdrop-blur + subtle borders), smooth micro-animations on all interactive elements, gradient accents.

---

## Task 1: Design System & Shared Components

### Components to Build

1. **`AppShell.tsx`** — Main layout wrapper
   - Sidebar nav (collapsible on mobile)
   - Top header with user avatar + role badge
   - Main content area
   - Different nav items per role:
     - Advocate: Dashboard, Campaigns, My Submissions, Rewards
     - Brand: Dashboard, My Campaigns, Create Campaign, Advocates
     - Admin: Dashboard, Review Queue, Submissions, Users, Campaigns

2. **`Card.tsx`** — Glassmorphism card with variants (default, highlighted, warning)

3. **`StatCard.tsx`** — Metric display card
   - Large number + label + trend indicator (↑↓→ with color)
   - Example: "Trust Score: 73.5 ↑ +2.3"

4. **`ScoreBar.tsx`** — Horizontal bar showing score 0-100
   - Color gradient: red (0-40) → yellow (40-70) → green (70-100)
   - Label + score number

5. **`ScoreBreakdown.tsx`** — Show all 5 scoring dimensions
   - 5 horizontal ScoreBars stacked vertically
   - Labels: Content Quality, Brand Relevance, Authenticity, Engagement, Audience
   - Final weighted score prominently displayed

6. **`StatusBadge.tsx`** — Pill-shaped badge for statuses
   - pending (gray), processing (blue pulse animation), approved (green), rejected (red), flagged (orange)

7. **`DataTable.tsx`** — Reusable sortable/filterable table
   - Pagination controls
   - Column sorting
   - Row click handler
   - Empty state
   - Loading skeleton state

8. **`Modal.tsx`** — Overlay modal for confirmations, details

9. **`EmptyState.tsx`** — Illustrated empty state with CTA button
   - "No submissions yet — browse campaigns to get started!"

10. **`LoadingSkeleton.tsx`** — Shimmer loading placeholders

11. **`TrustScoreCircle.tsx`** — Circular progress indicator
    - SVG circle with animated stroke-dashoffset
    - Score number in center
    - Color: green (>70), yellow (50-70), red (<50)

12. **`CouponCard.tsx`** — Display earned coupon
    - Discount percentage large
    - Coupon code with copy-to-clipboard button
    - Campaign name
    - Expiry date

### Definition of Done
- All components render correctly in isolation
- Dark mode styling applied
- Transitions/animations smooth (use CSS transitions, 200-300ms)
- Responsive: works on 768px+ width

---

## Task 2: Auth Pages

### Pages to Build

**`/auth/login`** — `LoginPage.tsx`
- Email + password fields
- "Sign in with Google" button (Supabase OAuth)
- Link to signup
- Form validation (email format, password required)
- Error display (wrong credentials)
- On success: redirect by role

**`/auth/signup`** — `SignupPage.tsx`
- Step 1: Choose role (Advocate / Brand) — two large selectable cards
- Step 2 (Advocate): Display name, email, password, Reddit username (optional), LinkedIn URL (optional)
- Step 2 (Brand): Company name, display name, email, password, website, industry dropdown
- Form validation with live feedback
- On success: redirect to respective dashboard

**`/auth/callback`** — `OAuthCallbackPage.tsx`
- Handle Supabase OAuth redirect
- Show loading spinner
- Redirect to dashboard

### Routing (`App.tsx`)
```typescript
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/auth/login" element={<LoginPage />} />
  <Route path="/auth/signup" element={<SignupPage />} />
  <Route path="/auth/callback" element={<OAuthCallbackPage />} />

  <Route element={<ProtectedRoute allowedRoles={['advocate']} />}>
    <Route path="/advocate/*" element={<AdvocateDashboardLayout />}>
      <Route path="dashboard" element={<AdvocateDashboard />} />
      <Route path="campaigns" element={<CampaignBrowser />} />
      <Route path="campaigns/:id" element={<CampaignDetail />} />
      <Route path="submit/:campaignId" element={<SubmitPage />} />
      <Route path="submissions" element={<MySubmissions />} />
      <Route path="submissions/:id" element={<SubmissionDetail />} />
      <Route path="rewards" element={<RewardsPage />} />
    </Route>
  </Route>

  <Route element={<ProtectedRoute allowedRoles={['brand']} />}>
    <Route path="/brand/*" element={<BrandDashboardLayout />}>
      <Route path="dashboard" element={<BrandDashboard />} />
      <Route path="campaigns" element={<MyCampaigns />} />
      <Route path="campaigns/new" element={<CreateCampaign />} />
      <Route path="campaigns/:id" element={<CampaignManage />} />
      <Route path="advocates" element={<AdvocatePool />} />
    </Route>
  </Route>

  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
    <Route path="/admin/*" element={<AdminDashboardLayout />}>
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="review" element={<ReviewQueue />} />
      <Route path="submissions" element={<AllSubmissions />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="campaigns" element={<CampaignOversight />} />
    </Route>
  </Route>
</Routes>
```

### Definition of Done
- Can sign up as advocate → lands on advocate dashboard
- Can sign up as brand → lands on brand dashboard
- Google OAuth works
- Protected routes redirect unauthenticated users

---

## Task 3: Advocate Pages

### `AdvocateDashboard.tsx`

**Layout:** Grid of stat cards + recent activity

| Section | Data Source | Display |
|---|---|---|
| Trust Score | `advocate_profiles.trust_score` | `TrustScoreCircle` component, large |
| Total Submissions | `advocate_profiles.total_submissions` | `StatCard` |
| Approved | `advocate_profiles.approved_submissions` | `StatCard` with green accent |
| Pending | Count from API | `StatCard` with blue accent |
| Coupons Earned | Count assigned coupons | `StatCard` with purple accent |
| Recent Submissions | Last 5 from API | Mini table: campaign, date, status badge, score |
| Quick Actions | — | "Browse Campaigns" + "View Rewards" buttons |

### `CampaignBrowser.tsx`
- Grid of campaign cards (3 columns desktop, 1 mobile)
- Each card: brand logo (or initial avatar), campaign title, platform badges (Reddit/LinkedIn), reward info ("Earn up to 75% discount!"), deadline countdown
- Filters: platform toggle, sort by (newest, ending soon, highest reward)
- Search bar for campaign/brand name
- Clicking card → `/advocate/campaigns/:id`

### `CampaignDetail.tsx` (Advocate View)
- Campaign banner with brand info
- Full description + guidelines
- Keywords displayed as tags
- Reward tiers table: score range → discount %
- Submission stats: how many submitted, how many spots left
- **"Submit Your Post" button** → `/advocate/submit/:campaignId`

### `SubmitPage.tsx`
- Platform selector (Reddit / LinkedIn buttons)
- URL input field with validation + auto-detect platform from URL
- If LinkedIn selected: large textarea for pasting content (with char count, min 50)
- Content type: Post / Comment radio buttons
- Campaign rules reminder sidebar
- "Submit" button → Shows confirmation modal → API call
- After submit: redirect to submission detail with "Scoring in progress..." animation

### `SubmissionDetail.tsx`
- If `scoring_status === 'pending' || 'processing'`:
  - Animated loading state: "AI is analyzing your submission..."
  - Poll API every 5 seconds until scored
- If `scoring_status === 'scored'`:
  - **Score Results**: `ScoreBreakdown` component (5 bars + final score)
  - **AI Reasoning**: Expandable text block with AI's explanation
  - **Status**: `StatusBadge` (approved/rejected/flagged)
  - **Reward**: If approved, show `CouponCard` with discount code
  - **Fraud Status**: Simple text — "No issues detected" or "Under review"

### `MySubmissions.tsx`
- `DataTable` with columns: Campaign, Platform, Date, Score, Status
- Filters: status, platform, date range
- Click row → submission detail

### `RewardsPage.tsx`
- Section 1: "Your Coupon Codes" — grid of `CouponCard` components
- Each card shows: discount %, coupon code (with copy button), campaign name, expiry
- Filter: active / used / expired
- Empty state: "Complete campaign submissions to earn discount coupons!"

### Definition of Done
- Complete advocate journey works: browse → view campaign → submit → see score → view coupon
- All data from API displayed correctly
- Loading/empty/error states handled
- Responsive on tablet+

---

## Task 4: Brand Pages

### `BrandDashboard.tsx`

**Layout:** Hero metrics row + charts + campaign list

| Section | Data | Display |
|---|---|---|
| Total Mentions | Sum of all submissions across all campaigns | Big number `StatCard` with gradient background |
| Mentions This Week | Submissions in last 7 days | `StatCard` with trend ↑↓ |
| Avg Score | Average score_final across campaigns | `StatCard` |
| Active Campaigns | Count of active campaigns | `StatCard` |
| Mentions Over Time | Weekly mention counts | Line chart (use Recharts library) |
| Platform Breakdown | Reddit vs LinkedIn split | Donut chart |
| Top Advocates | Top 5 by score for brand's campaigns | Mini leaderboard table |
| Campaign Performance | Cards per campaign: submissions, avg score, budget used | Scrollable row |

### `CreateCampaign.tsx` — Multi-Step Wizard

**Step 1: Basics**
- Title (text input)
- Description (textarea, rich text optional)
- Campaign type dropdown (Awareness / Engagement / Balanced)

**Step 2: Platform & Guidelines**
- Platform checkboxes: Reddit ☑ LinkedIn ☑
- Guidelines textarea: "What should advocates mention?"
- Keywords input: tag-style input (type + enter to add chips)

**Step 3: Coupon Reward Setup**
- **Default tiers pre-populated** (brand can modify):

| Score Range | Discount % |
|---|---|
| 60 – 69 | 10% |
| 70 – 79 | 25% |
| 80 – 89 | 50% |
| 90 – 100 | 75% |

- Brand can: add tiers, remove tiers, adjust ranges + percentages
- Validation: no overlapping ranges, percentages 1-100
- Visual preview: colored bar showing score-to-discount mapping

**Step 4: Coupon Code Upload**
- For EACH tier, show upload area:
  - "25% Discount Tier (Score 70-79): Upload coupon codes"
  - Textarea: paste codes, one per line
  - Or CSV upload button
  - Show count: "47 codes uploaded"
- Minimum: at least 1 code per tier before campaign can go active

**Step 5: Scoring Weights**
- 5 sliders with labels + current value displayed
- Authenticity slider has a RED minimum marker at 0.20 (can't go below)
- Live total displayed: "Total: 1.00 ✅" or "Total: 0.85 ❌ (must equal 1.00)"
- Preset buttons: "Awareness Focus", "Engagement Focus", "Balanced" that auto-set sliders

**Step 6: Budget & Timeline**
- Max submissions (optional, number input)
- Start date (date picker, default: today)
- End date (date picker)
- Min score threshold slider (default 60, range 40-95)

**Step 7: Review & Launch**
- Summary of all settings
- "Save as Draft" and "Launch Campaign" buttons
- Launch validates: all tiers have codes, weights sum to 1.0

### `CampaignManage.tsx` (Brand's view of individual campaign)
- Campaign details + edit button (if draft/paused)
- Status controls: Pause / Resume / Complete
- **Submissions Tab**: DataTable of all submissions with scores, status, advocate name
- **Coupons Tab**: Per-tier breakdown — total codes / assigned / remaining
- **Analytics Tab**: Score distribution histogram, approval rate, mentions timeline

### `MyCampaigns.tsx`
- DataTable: title, status, platform, submissions count, avg score, created date
- Filter by status
- "Create New Campaign" CTA button

### `AdvocatePool.tsx`
- Table of advocates who've submitted to brand's campaigns
- Columns: name, trust score, total submissions (to this brand), avg score, fraud flags
- Sort by trust score

### Definition of Done
- Brand can create campaign with custom coupon tiers + upload codes
- Dashboard shows real-time mention counts and charts
- Campaign management (edit/pause/resume) works
- Coupon inventory visible per tier

---

## Task 5: Admin Pages

### `AdminDashboard.tsx`
- StatCards: Total users, total submissions, pending reviews, active campaigns
- Quick links to review queue and user management

### `ReviewQueue.tsx`
- Table of `flagged_for_review` submissions, sorted by oldest first
- Each row shows: advocate name, campaign, platform, score, fraud flags count, submitted date
- Click row → expand inline OR open modal:
  - Full content preview (fetched content)
  - `ScoreBreakdown` component
  - Fraud flags list with explanations (from `fraud_logs`)
  - Advocate info: trust score, past submissions count, past fraud flags
  - **Action buttons**: "Approve" (green), "Reject" (red)
  - Required: notes textarea before approve/reject
- After action: row disappears from queue, next item slides up

### `AllSubmissions.tsx`
- DataTable of ALL submissions across all campaigns
- Filters: status (all/pending/approved/rejected/flagged), platform, score range, date range
- Columns: advocate, campaign, platform, score, status, fraud risk, date
- Click → full submission detail

### `UserManagement.tsx`
- Two tabs: Advocates | Brands
- Advocates tab: name, email, trust score, submissions, fraud flags, suspended badge
  - Actions: Suspend / Unsuspend toggle
  - Click → user detail modal
- Brands tab: company name, email, campaigns count, total submissions

### `CampaignOversight.tsx`
- DataTable of all campaigns (all brands)
- Columns: brand, title, status, submissions, avg score, created
- Admin can pause any campaign

### Definition of Done
- Admin can see and action the review queue
- Approve/reject updates submission status + triggers reward (if approved)
- User suspension works
- All tables filterable and sortable

---

## Task 6: Landing Page

### `LandingPage.tsx`

**Structure:**
1. **Hero**: Bold headline + subheadline + "Get Started" / "For Brands" CTAs
   - Animated gradient background
   - Example: "Turn Authentic Word-of-Mouth Into Rewards"
2. **How It Works**: 3-step visual (Post → Score → Earn)
3. **For Brands section**: Key benefits (authentic mentions, fraud protection, scoring)
4. **For Advocates section**: Key benefits (earn rewards, build trust, no ads)
5. **Footer**: Links, copyright

### Definition of Done
- Visually stunning landing page
- Clear CTAs leading to signup
- Responsive
- Fast load (<3s)

---

## Charts Library

Install `recharts` for all data visualizations:
- Line charts (mentions over time)
- Bar charts (score distribution)
- Donut/pie charts (platform breakdown)
- Radar chart (score dimensions — optional)

---

## Handoff to Agent 4 (Guardian)

When Prism is complete, Agent 4 receives:
1. ✅ Complete frontend with all pages and components
2. ✅ Connected to all API endpoints
3. ✅ Auth flow working end-to-end
4. ✅ All dashboards displaying real data

Agent 4 will: run E2E tests, security audit, performance optimization, and deploy.
