# Agent 4: Guardian — Integration & QA Engineer

> **Timeline:** Week 7–8 | **Depends On:** All previous agents | **Outputs:** Production-ready system

---

## Mission

Connect everything end-to-end, run comprehensive tests, harden security, optimize performance, and deploy to production. When you're done, Word of Wow is live and ready for its first brand campaign.

---

## Prerequisites

- ✅ Full database + auth + APIs (Agent 1)
- ✅ AI scoring pipeline + fraud detection + trust scoring (Agent 2)
- ✅ Complete frontend UI (Agent 3)

---

## Task 1: End-to-End Integration Verification

### Critical User Journeys to Test

**Journey 1: Advocate Signup → Submit → Score → Coupon**
1. Sign up as advocate (email/password)
2. Browse campaigns page loads with active campaigns
3. Click a campaign → see details + coupon tier info
4. Submit a real Reddit URL
5. Wait for scoring (poll until `scoring_status = 'scored'`)
6. Verify: 5 scores populated, final score calculated, reasoning present
7. If auto-approved: verify coupon code assigned from correct tier
8. Verify: trust score updated in advocate_profiles
9. Check rewards page: coupon card appears with code + discount %

**Journey 2: Brand Signup → Create Campaign → Monitor**
1. Sign up as brand
2. Navigate to Create Campaign wizard
3. Fill all 7 steps including custom coupon tiers
4. Upload 10 coupon codes per tier via paste
5. Launch campaign
6. Dashboard shows campaign stats
7. After advocate submissions come in: verify totals update
8. Check coupon inventory shows assigned/remaining counts

**Journey 3: Admin Review Flow**
1. Login as admin
2. Navigate to Review Queue
3. Verify flagged submissions appear
4. Click a submission → see content, scores, fraud flags
5. Approve with notes → verify submission status updated
6. Verify coupon assigned to advocate after approval
7. Reject another submission → verify no coupon assigned
8. Check admin action log records both actions

**Journey 4: Fraud Detection**
1. As advocate, submit a URL that was already submitted → verify rejection
2. Submit near-duplicate content → verify flagging (similarity check)
3. Submit 6+ times in 1 hour → verify velocity flag
4. Verify flagged submissions appear in admin review queue

**Journey 5: LinkedIn Submission**
1. Submit LinkedIn URL with pasted content
2. Verify content stored and scored
3. Verify coupon assignment works same as Reddit

### Fix every broken connection you find. Track all bugs and their fixes.

### Definition of Done
- All 5 journeys pass without errors
- No console errors in browser
- No uncaught exceptions in server logs

---

## Task 2: Security Audit

### Check EVERY item below:

**Authentication**
- [ ] Unauthenticated requests to protected routes → 401
- [ ] Wrong role accessing route → 403 (advocate can't hit `/api/admin/*`)
- [ ] Expired JWT → 401 (not 500)
- [ ] Malformed JWT → 401

**Authorization (RLS)**
- [ ] Advocate A cannot see Advocate B's submissions via Supabase client
- [ ] Brand A cannot see Brand B's campaigns via Supabase client
- [ ] Advocate cannot access brand endpoints
- [ ] Brand cannot access admin endpoints

**Input Validation**
- [ ] SQL injection attempt in search/filter params → blocked by parameterized queries
- [ ] XSS in submission content → HTML escaped on display
- [ ] Oversized request body (>1MB) → 413 error
- [ ] Invalid UUID in URL params → 400 not 500

**Rate Limiting**
- [ ] 101st request in 1 minute → 429 error
- [ ] 11th submission in 1 hour → 429 error

**Headers**
- [ ] CORS: only frontend domain allowed (not `*` in production)
- [ ] Helmet.js security headers present
- [ ] No `X-Powered-By` header

**Secrets**
- [ ] No API keys in client-side code
- [ ] `.env` in `.gitignore`
- [ ] Error responses don't leak stack traces in production mode

### Actions
1. Install `helmet` in server and add to middleware: `app.use(helmet())`
2. Configure CORS: `app.use(cors({ origin: process.env.FRONTEND_URL }))`
3. Add request body size limit: `app.use(express.json({ limit: '1mb' }))`
4. Run `npm audit` and fix any high/critical vulnerabilities
5. Verify all Zod schemas reject unexpected fields

### Definition of Done
- All checklist items pass
- Security headers present in responses
- No information leakage in error messages

---

## Task 3: Performance Optimization

### Backend
1. **Database queries**: Check for N+1 queries in list endpoints. Use JOINs or batch queries.
2. **Response caching**: Add 5-minute Redis cache on:
   - `GET /api/campaigns` (active campaign listing)
   - `GET /api/campaigns/:id` (campaign detail, invalidate on update)
3. **Scoring pipeline**: Ensure total time < 60 seconds avg. If slower:
   - Reduce prompt lengths
   - Ensure all 5 AI calls run in parallel
4. **Database indexes**: Check slow queries via Supabase dashboard, add missing indexes

### Frontend
1. **Code splitting**: Add `React.lazy()` for route-level code splitting:
```typescript
const AdvocateDashboard = React.lazy(() => import('./pages/advocate/Dashboard'));
```
2. **Bundle analysis**: Run `npx vite-bundle-visualizer`, identify large dependencies
3. **Image optimization**: Compress brand logos, use WebP format
4. **API deduplication**: Ensure Zustand stores don't re-fetch data that's already loaded

### Definition of Done
- API responses < 200ms (excluding AI scoring which is async)
- Frontend initial load < 3 seconds
- No N+1 queries
- Bundle size < 500KB gzipped

---

## Task 4: Deployment

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set build command: `cd client && npm run build`
3. Set output directory: `client/dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (Railway backend URL)
5. Deploy → get production URL

### Backend → Railway (or Render)
1. Connect GitHub repo
2. Set root directory: `server`
3. Set start command: `npm run start`
4. Add ALL environment variables from `.env.example`
5. Set up health check: `GET /api/health`
6. Deploy → get production URL

### Post-Deployment
1. Update CORS to allow Vercel production URL
2. Update `VITE_API_URL` in Vercel to point to Railway URL
3. Run all 5 E2E journeys on production
4. Create production admin account

### CI/CD (GitHub Actions)

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint --workspace=client --workspace=server
      - run: npm run typecheck --workspace=client --workspace=server
      - run: npm test --workspace=server
```

### Definition of Done
- Frontend live on Vercel
- Backend live on Railway
- Health check endpoint responding
- All E2E journeys pass on production
- CI pipeline runs on PR

---

## Task 5: Monitoring & Error Tracking

### Sentry Integration
1. Install `@sentry/react` in client, `@sentry/node` in server
2. Initialize with production DSN
3. Configure: capture unhandled exceptions + unhandled promise rejections
4. Add user context to events (userId, role)
5. Set sample rate: 1.0 for errors, 0.1 for transactions

### Health & Alerting
1. Create `GET /api/health` endpoint returning:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-02-25T00:00:00Z"
}
```
2. Set up UptimeRobot monitor on health endpoint (5-min interval)
3. Add structured logging with `pino` logger:
   - Request ID on every log line
   - Log: API requests, scoring pipeline steps, errors

### Definition of Done
- Sentry capturing errors in both frontend and backend
- Health check endpoint working
- Uptime monitoring active
- Structured logs with request tracing

---

## Task 6: Documentation

### Create These Files

**`docs/API.md`** — Every endpoint documented:
- Method + path
- Auth requirements
- Request body schema
- Response schema
- Example request/response
- Error codes

**`docs/DEPLOYMENT.md`** — How to:
- Set up local development environment
- Configure environment variables
- Deploy to Vercel + Railway
- Run database migrations
- Troubleshoot common issues

**`docs/ADMIN_GUIDE.md`** — For admin users:
- How to review flagged submissions
- How to suspend/unsuspend users
- How to monitor queue health
- Understanding fraud flags

**`README.md`** — Project overview:
- What Word of Wow is
- Tech stack
- Quick start guide
- Environment variables list

### Definition of Done
- All 4 docs written with accurate, current information
- README has working quick-start instructions
- API docs match actual endpoints

---

## Final Launch Checklist

Before declaring Phase 1 complete:

- [ ] All 5 E2E user journeys pass on production
- [ ] Security audit checklist all green
- [ ] Performance targets met
- [ ] Sentry receiving test errors
- [ ] UptimeRobot monitoring active
- [ ] CI pipeline running on GitHub
- [ ] Documentation complete
- [ ] Production admin account created
- [ ] At least 1 test campaign live with coupon codes
- [ ] Founder has completed UAT on staging
- [ ] Privacy policy / ToS page exists (even placeholder)

---

## Founder Actions Required for Agent 4

| # | Item | When |
|---|---|---|
| 1 | Provide domain name | Before deployment |
| 2 | Create Vercel account & grant access | Before deployment |
| 3 | Create Railway account & grant access | Before deployment |
| 4 | Full UAT testing on staging | After deployment |
| 5 | Approve go-live | After UAT passes |
| 6 | Provide privacy policy / ToS content | Before go-live |
| 7 | Create first real brand campaign | After go-live |
