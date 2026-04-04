# Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+
- npm 9+
- A Supabase project with the schema applied
- An Upstash Redis instance
- An OpenAI API key

### Setup

1. **Clone the repo** and install dependencies:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Create `.env`** in the project root (see `.env.example`).

3. **Apply database schema** via the Supabase dashboard SQL editor using the migration files in `supabase/`.

4. **Start dev servers:**
   ```bash
   # Terminal 1
   cd server && npm run dev     # → http://localhost:3001

   # Terminal 2
   cd client && npm run dev     # → http://localhost:5173
   ```

5. **Verify:** Visit http://localhost:3001/api/health to confirm DB + Redis connectivity.

---

## Environment Variables

### Server (`.env` at project root)

| Variable                     | Required | Description                          |
|------------------------------|----------|--------------------------------------|
| `SUPABASE_URL`               | ✅       | Supabase project URL                 |
| `SUPABASE_ANON_KEY`          | ✅       | Supabase anon/public key             |
| `SUPABASE_SERVICE_ROLE_KEY`  | ✅       | Supabase service role key            |
| `REDIS_URL`                  | ✅       | Upstash Redis connection URL         |
| `OPENAI_API_KEY`             | ✅       | OpenAI API key for scoring           |
| `FRONTEND_URL`               |          | Allowed CORS origin (production)     |
| `PORT`                       |          | Server port (default: 3001)          |
| `NODE_ENV`                   |          | `production` for prod mode           |
| `LOG_LEVEL`                  |          | Pino log level (default: `debug`)    |

### Client (`client/.env` or `client/.env.local`)

| Variable                | Required | Description                |
|-------------------------|----------|----------------------------|
| `VITE_SUPABASE_URL`     | ✅       | Same as server             |
| `VITE_SUPABASE_ANON_KEY`| ✅       | Same as server             |
| `VITE_API_URL`          | ✅       | Backend API base URL       |

---

## Production Deployment

### Frontend → Vercel

1. Connect your GitHub repo to Vercel.
2. Set root directory: `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
6. Deploy.

### Backend → Railway (or Render)

1. Connect your GitHub repo.
2. Set root directory: `server`
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Add ALL env vars from the table above.
6. Set up health check: `GET /api/health`
7. Deploy.

### Post-Deployment Checklist

- [ ] Set `FRONTEND_URL` on the server to your Vercel production URL
- [ ] Set `VITE_API_URL` on Vercel to your Railway production URL
- [ ] Set `NODE_ENV=production` on the server
- [ ] Test health check endpoint
- [ ] Create an admin account (manually set role in Supabase profiles table)
- [ ] Run through the full user journey on production

---

## Troubleshooting

| Issue                              | Solution                                              |
|------------------------------------|-------------------------------------------------------|
| CORS errors in browser             | Check `FRONTEND_URL` env var matches your frontend URL |
| 401 on all requests                | Verify `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` |
| Submissions stuck on "processing"  | Check Redis connection: `REDIS_URL` + health check    |
| AI scoring not working             | Verify `OPENAI_API_KEY` is valid and has credits      |
| Health check returns 503           | Database not connected — check Supabase URL/keys      |
