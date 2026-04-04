# API Reference

Base URL: `http://localhost:3001/api`

All protected endpoints require `Authorization: Bearer <supabase-jwt>` header.

---

## Health

### `GET /api/health`
**Auth:** None

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-15T00:00:00.000Z",
  "uptime": "3600s",
  "database": "connected",
  "redis": "connected"
}
```

---

## Auth

### `POST /api/auth/signup`
**Auth:** None

| Field         | Type   | Required | Notes                         |
|---------------|--------|----------|-------------------------------|
| email         | string | ✅       | Valid email                   |
| password      | string | ✅       | Min 8 characters              |
| role          | string | ✅       | `advocate` or `brand`         |
| displayName   | string | ✅       | Display name                  |
| companyName   | string | Brand only | Required for brand role     |

**Response:** `201` — `{ data: { user, session } }`

### `POST /api/auth/login`
**Auth:** None

| Field    | Type   | Required |
|----------|--------|----------|
| email    | string | ✅       |
| password | string | ✅       |

**Response:** `200` — `{ data: { user, session } }`

### `GET /api/auth/me`
**Auth:** Required

**Response:** `200` — `{ data: { id, email, role, displayName, ... } }`

---

## Campaigns

### `GET /api/campaigns`
**Auth:** Required  
**Roles:** All (advocates see only active, brands see own, admin sees all)

| Query Param | Type   | Notes                        |
|-------------|--------|------------------------------|
| status      | string | Filter by status             |
| platform    | string | Filter by platform           |
| page        | number | Default: 1                   |
| limit       | number | Default: 20                  |

**Response:** `200` — `{ data: Campaign[], total, page, limit, totalPages }`

### `GET /api/campaigns/:id`
**Auth:** Required

**Response:** `200` — `{ data: { ...campaign, coupon_tiers, submission_count, approved_count } }`

### `POST /api/campaigns`
**Auth:** Required  
**Roles:** Brand only

| Field            | Type     | Required | Notes                           |
|------------------|----------|----------|---------------------------------|
| title            | string   | ✅       | 5–200 chars                     |
| description      | string   | ✅       | 20–2000 chars                   |
| guidelines       | string   |          | Max 2000 chars                  |
| targetPlatforms  | string[] | ✅       | `['reddit']`, `['linkedin']`, or both |
| campaignType     | string   | ✅       | `awareness`, `engagement`, `balanced` |
| keywords         | string[] | ✅       | 1–20 keywords                   |
| maxSubmissions   | number   |          | Optional cap                    |
| minScoreThreshold| number   |          | 40–95, default 60               |
| startDate        | string   |          | ISO datetime                    |
| endDate          | string   |          | ISO datetime, must be after start |
| weights          | object   |          | 5 weights summing to 1.0        |
| couponTiers      | array    |          | `[{ minScore, maxScore, discountPercent }]` |

**Response:** `201` — `{ data: { ...campaign, coupon_tiers } }`

### `PATCH /api/campaigns/:id`
**Auth:** Required  
**Roles:** Brand (own only), Admin

Same fields as POST, all optional. Only draft/paused campaigns can be edited.

### `PATCH /api/campaigns/:id/status`
**Auth:** Required  
**Roles:** Brand (own only), Admin

| Field  | Type   | Required | Notes                              |
|--------|--------|----------|------------------------------------|
| status | string | ✅       | `active`, `paused`, or `completed` |

Transitions: draft→active, active→paused/completed, paused→active/completed.  
Activating requires coupon codes uploaded.

### `POST /api/campaigns/:id/coupons/upload`
**Auth:** Required  
**Roles:** Brand (own only), Admin

| Field  | Type     | Required |
|--------|----------|----------|
| tierId | string   | ✅       |
| codes  | string[] | ✅       |

**Response:** `201` — `{ data: { count, tierId, discountPercent } }`

### `GET /api/campaigns/:id/coupons`
**Auth:** Required  
**Roles:** Brand (own only), Admin

**Response:** `200` — `{ data: [{ ...tier, total_codes, assigned_codes, available_codes }] }`

---

## Submissions

### `POST /api/submissions`
**Auth:** Required  
**Roles:** Advocate only  
**Rate Limit:** 10 per hour

| Field      | Type   | Required | Notes                             |
|------------|--------|----------|-----------------------------------|
| campaignId | string | ✅       | UUID                              |
| url        | string | ✅       | Must match platform domain        |
| platform   | string | ✅       | `reddit` or `linkedin`            |
| contentType| string | ✅       | `post` or `comment`               |
| content    | string | ✅       | Min 20 characters                 |

**Response:** `201` — `{ data: submission }`  
Triggers async pipeline: content fetch → AI scoring → fraud check → reward.

### `GET /api/submissions/my`
**Auth:** Required  
**Roles:** Advocate only

| Query Param | Type   | Notes                      |
|-------------|--------|----------------------------|
| status      | string | Filter by review_status    |
| page        | number | Default: 1                 |
| limit       | number | Default: 20                |

### `GET /api/submissions/:id`
**Auth:** Required

**Response:** `200` — Full submission with all scores, fraud flags, coupon data.

### `GET /api/submissions/my/rewards`
**Auth:** Required  
**Roles:** Advocate only

**Response:** `200` — `{ data: [{ code, discount_percent, campaign_title, ... }] }`

---

## Admin

All admin endpoints require `admin` role.

### `GET /api/admin/users`
| Query Param  | Notes                       |
|--------------|-----------------------------|
| role         | `advocate` or `brand`       |
| is_active    | `true` or `false`           |
| is_suspended | `true` or `false`           |

### `PATCH /api/admin/users/:id/suspend`
Suspends an advocate. Logs action.

### `PATCH /api/admin/users/:id/unsuspend`
Unsuspends an advocate. Logs action.

### `GET /api/admin/review-queue`
Returns submissions with `review_status = 'flagged_for_review'`.

### `POST /api/admin/review/:submissionId`
| Field    | Type   | Required |
|----------|--------|----------|
| decision | string | ✅       | `approved` or `rejected` |
| notes    | string | ✅       | Min 1 character          |

If approved + scored: assigns coupon automatically.

### `GET /api/admin/actions`
Returns paginated admin action log.

### `GET /api/admin/queues`
Returns BullMQ queue stats (active, waiting, completed, failed counts).

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Human-readable message",
  "code": 400
}
```

| Code | Meaning               |
|------|-----------------------|
| 400  | Bad request / validation error |
| 401  | Not authenticated     |
| 403  | Forbidden (wrong role) |
| 404  | Not found             |
| 413  | Request body too large |
| 429  | Rate limited          |
| 500  | Internal server error |
