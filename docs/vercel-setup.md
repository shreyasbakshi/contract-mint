# Deploying the Contract Mint frontend on Vercel

Vercel hosts the **Next.js frontend** only. The **FastAPI backend is stateful**
(in-memory store) and does **not** belong on Vercel's serverless runtime — host it on a
persistent process (Replit / Render / Railway / Fly.io) and point the frontend at its URL.
See [architecture.md](architecture.md) for why.

This is a monorepo (`frontend/` + `backend/`), so the key step is telling Vercel the
project root is `frontend/`.

## 1. Import the repo
1. https://vercel.com/new → **Import** the `shreyasbakshi/contract-mint` GitHub repo.
2. **Root Directory:** click **Edit** and set it to **`frontend`**. *(Critical — without
   this Vercel builds from the repo root and fails.)*
3. Framework Preset should auto-detect **Next.js** (also pinned in `frontend/vercel.json`).
   Leave Build Command / Output as defaults.

## 2. Environment variables (add BEFORE the first deploy)
In the import screen (or Project → Settings → Environment Variables) add:

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` / `pk_test_...` | from dashboard.clerk.com |
| `CLERK_SECRET_KEY` | `sk_live_...` / `sk_test_...` | **secret** — mark as sensitive |
| `NEXT_PUBLIC_API_BASE` | `https://<your-backend-host>` | the deployed FastAPI URL |

⚠️ `NEXT_PUBLIC_*` vars are **inlined at build time**. If you change `NEXT_PUBLIC_API_BASE`
later, you must **redeploy** for it to take effect.

## 3. Deploy
Click **Deploy**. Every push to `main` on GitHub then auto-deploys (preview deploys for
other branches). This replaces the manual "pull in Replit" step — pushes go live on Vercel
automatically.

## 4. Clerk production setup
- For a real domain, add your Vercel domain in the Clerk dashboard (Domains) and use the
  `pk_live_` / `sk_live_` keys. `pk_test_` keys work on preview/`*.vercel.app` URLs.

## Backend (not on Vercel)
Deploy `backend/` to a persistent host and set `NEXT_PUBLIC_API_BASE` to its URL. For real
persistence, swap the in-memory `app/store.py` for Postgres (Neon/Supabase). Until the
backend is reachable, the frontend loads and login works, but UC1/UC2 API calls will fail.
