# Word of Wow

> Turn authentic word-of-mouth into rewards.

Word of Wow is a platform connecting **brands** with **advocates** who genuinely love their products. Advocates share authentic posts on Reddit and LinkedIn, our AI scores them for quality and authenticity, and high-scoring posts earn discount coupon rewards.

## Tech Stack

| Layer      | Technology                              |
|------------|----------------------------------------|
| Frontend   | React 19 + Vite + TypeScript           |
| Backend    | Express.js + TypeScript                |
| Database   | Supabase (PostgreSQL + Auth + RLS)     |
| Queue      | BullMQ + Redis (Upstash)               |
| AI         | OpenAI GPT-4o for scoring              |
| Charts     | Recharts                               |
| Icons      | Lucide React                           |
| CI/CD      | GitHub Actions                         |

## Architecture

```
client/          → React frontend (Vite)
server/          → Express API server
  src/
    routes/      → API route handlers
    middleware/  → Auth, rate limiting, validation
    services/    → Business logic (scoring, coupons)
    jobs/        → BullMQ workers (content fetch, scoring, fraud, rewards)
    lib/         → Supabase, OpenAI, Redis, logger
supabase/        → Database migrations
docs/            → Documentation
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm 9+
- Supabase project (with schema applied)
- Upstash Redis instance
- OpenAI API key

### 1. Clone & install

```bash
git clone <repo-url>
cd word-of-wow

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure environment

Create `.env` in the project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# OpenAI
OPENAI_API_KEY=sk-proj-xxx

# Frontend (for CORS in production)
FRONTEND_URL=http://localhost:5173

# Client env vars (in client/.env or client/.env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```

### 3. Run development servers

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/api/health

## User Roles

| Role     | Can Do                                                    |
|----------|----------------------------------------------------------|
| Advocate | Browse campaigns, submit posts, earn coupons             |
| Brand    | Create campaigns, upload coupons, monitor submissions    |
| Admin    | Review flagged submissions, suspend users, oversee all   |

## Documentation

- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)

## License

Proprietary — All rights reserved.
