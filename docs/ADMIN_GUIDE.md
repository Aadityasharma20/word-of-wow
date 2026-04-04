# Admin Guide

This guide is for users with the **admin** role on Word of Wow.

---

## Accessing the Admin Panel

1. Log in at `/auth/login` with your admin credentials.
2. You'll be redirected to `/admin/dashboard`.

> **Note:** Admin accounts must be created manually by setting `role = 'admin'` in the `profiles` table via the Supabase dashboard.

---

## Dashboard

The admin dashboard shows 4 key metrics:
- **Total Users** — all registered advocates + brands
- **Total Submissions** — all submissions across campaigns
- **Pending Reviews** — submissions flagged for manual review
- **Active Campaigns** — currently running campaigns

Quick-action cards link to each management section.

---

## Reviewing Flagged Submissions

Navigate to **Review Queue** (`/admin/review`).

### What gets flagged?

Submissions are automatically flagged when the fraud detection engine detects:
- **Duplicate URL** — same URL submitted before
- **Content similarity** — content too similar to a previous submission
- **Velocity abuse** — too many submissions in a short time
- **Low trust score** — advocate's trust score is below threshold
- **New account** — account created very recently
- **Pattern mismatch** — content doesn't match campaign keywords

### Review process

1. Click a flagged submission to open the detail modal.
2. Review the **content preview**, **AI score breakdown** (5 dimensions), and **fraud flags**.
3. Add **review notes** (required).
4. Choose **Approve** or **Reject**.

**If approved:** A coupon code is automatically assigned to the advocate based on their score tier.  
**If rejected:** No coupon is assigned. The advocate is notified.

All review decisions are logged in the admin actions log.

---

## Managing Users

Navigate to **Users** (`/admin/users`).

### Tabs
- **Advocates** — shows trust score, submission count, fraud flags
- **Brands** — shows company name, campaign count

### Suspending an advocate

1. Find the advocate in the table.
2. Click **Suspend**.
3. Confirm in the modal.

Suspended advocates cannot submit new posts. Their existing submissions are unaffected.

To **unsuspend**, click the Unsuspend button on a suspended user.

---

## Campaign Oversight

Navigate to **Campaigns** (`/admin/campaigns`).

View all campaigns across all brands. You can:
- See submission counts and average scores
- **Pause** active campaigns that violate policies

---

## Monitoring Queue Health

Navigate to **Queues** via `GET /api/admin/queues`.

This returns BullMQ queue stats:
- `waiting` — jobs waiting to be processed
- `active` — jobs currently being processed
- `completed` — successfully processed jobs
- `failed` — jobs that encountered errors

If `failed` count is growing, check server logs for errors.

---

## Understanding Fraud Flags

| Flag               | What it means                                        | Severity |
|--------------------|------------------------------------------------------|----------|
| `duplicate_url`    | This URL was submitted before                        | High     |
| `similar_content`  | Content is very similar to another submission        | High     |
| `velocity_abuse`   | Too many submissions in a short period               | Medium   |
| `low_trust_score`  | Advocate's trust score is below threshold            | Medium   |
| `new_account`      | Account was created very recently                    | Low      |
| `pattern_mismatch` | Content doesn't match campaign keywords              | Low      |
