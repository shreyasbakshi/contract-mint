
# Contract Mint

Agentic SaaS that helps small Indian merchants (drop-shippers / small retailers, ≤50 employees)
generate supplier/vendor contracts and get renewal intelligence from supplier performance data —
reducing dependence on external legal teams and cutting turnaround time.

## Use cases
- **UC1 — Generation & revision:** merchant gives context → a draft supplier agreement is produced →
  merchant reviews via editor + typed/voice instructions → tracked, versioned **DOCX** output.
- **UC2 — Renewal intelligence:** alert ≥2 weeks before expiry → ingest supplier performance
  (CSV/Excel) → analyze (returns & quality, data-backed) → validate with merchant → highlight and
  redline the specific clauses to change.

## Design notes
- India jurisdiction (Indian Contract Act 1872, GST/INR, stamp duty, Arbitration Act 1996).
- Plain-language clauses (every clause has an "In plain words" gloss) + English/Marathi.
- **Multiple specialized agents** (drafting, revision, redline + monitor/analysis) orchestrated by code with human-in-the-loop gates — not an autonomous swarm that self-directs.
  See [docs/architecture.md](docs/architecture.md).

## Layout
```
backend/    FastAPI + Claude (Opus 4.8 / Sonnet 4.6) + clause library + DOCX gen
frontend/   Next.js app (runs on Replit for demo, lifts to Vercel)
docs/       clause-library.md, agent-contracts.md, architecture.md (design blueprints)
```

## Quick start (backend)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your ANTHROPIC_API_KEY (optional: offline fallback works without it)
uvicorn app.main:app --reload --port 8000
# open http://localhost:8000/docs
```

Without an API key the drafting falls back to deterministic template-fill so the app still runs;
with a key it uses Claude for richer drafting, revision, and (later) redline reasoning.
