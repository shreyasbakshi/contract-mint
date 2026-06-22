# Running Contract Mint on Replit

Contract Mint has two parts that run as **two separate Repls**: a Python backend
(FastAPI) and a Node frontend (Next.js). This keeps each one simple and independently
deployable — and avoids the single-Repl quirks that made Lovable hard to adapt.

## 1. Backend Repl (Python)
1. Create a Repl → "Import from GitHub" (or upload the `backend/` folder).
2. In **Secrets** (lock icon), add `ANTHROPIC_API_KEY` = your key.
   *(Optional — without it the app runs in offline template mode.)*
3. Replit reads `backend/.replit`; press **Run**. It installs `requirements.txt`
   and starts `uvicorn` on the public URL.
4. Note the backend's public URL, e.g. `https://contract-mint-backend.<you>.repl.co`.
   Visit `/docs` to confirm the API is live.

## 2. Frontend Repl (Node)
1. Create a second Repl from the `frontend/` folder.
2. In **Secrets**, add `NEXT_PUBLIC_API_BASE` = the backend URL from step 1.4.
3. Press **Run**. Replit installs and starts `next dev` on its public URL.
4. Open the frontend URL — you should see the dashboard.

## Notes
- **Voice input** (the 🎤 button) uses the browser Web Speech API — works in Chrome,
  needs HTTPS (Replit URLs are HTTPS, so it works there).
- **Marathi** renders on screen always; the downloaded DOCX needs a Devanagari font
  (Nirmala UI / Noto Sans Devanagari) installed on the machine that opens it.
- The demo store is **in-memory** — restarting the backend Repl clears contracts.
  Swap `app/store.py` for Postgres (e.g. Replit's DB or Neon) for persistence.
- To deploy: use Replit **Deployments** on each Repl (configs already in `.replit`).

## Local dev (not Replit)
```bash
# terminal 1 — backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --port 8000

# terminal 2 — frontend
cd frontend && npm install
NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run dev
# open http://localhost:3000
```
