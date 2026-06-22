# Contract Mint — Architecture

## Stack
- **Frontend:** Next.js (React, TypeScript). Runs on Replit for the demo; lifts to
  Vercel for production. Fresh design (HTML prototype is only a UC2 flow reference).
- **Backend:** Python + FastAPI. Hosts the agent orchestrator + Claude API calls.
- **DB:** Postgres, multi-tenant via `tenant_id` on every table (single-tenant demo).
- **Storage:** object storage (S3-compatible) for DOCX + version history.
- **Scheduler:** cron/queue for the Renewal Monitor.
- **Models:** Opus 4.8 for reasoning-heavy agents (analysis, redline); Sonnet 4.6 for
  high-volume steps (drafting, applying edits). Exact IDs confirmed against API ref.

## Repo layout (proposed)
```
contract-mint/
  docs/                     # clause-library, agent-contracts, architecture (this)
  frontend/                 # Next.js app
    app/
      uc1-generate/         # context form -> draft -> editor -> versioned DOCX
      uc2-renewals/         # alert dashboard -> upload perf -> validate -> redline
    components/
    lib/
  backend/
    app/
      agents/               # orchestrator, drafting, revision, renewal_monitor,
                            #   performance_analysis, redline
      contracts/            # pydantic models = the typed agent envelopes
      ingestion/            # format-sniffing, CSV/Excel reader, contract parser
      clauses/              # India clause library (from docs/clause-library.md)
      docgen/               # DOCX generation + versioning
      db/                   # models, migrations (multi-tenant)
      api/                  # FastAPI routes
    tests/
```

## Data model (core tables, all carry tenant_id)
- `tenants`
- `suppliers` (name, email, PAN/GSTIN, renewal_date)
- `performance_metrics` (supplier_id, metric, value, period) — schema flexes to the
  merchant's actual CSV/Excel columns; rollup score derived, not stored as input
- `contracts` (supplier_id, status, current_version)
- `contract_versions` (contract_id, version, clauses JSON, docx_uri, created_by)
- `clause_changes` (version_id, clause_id, old, new, rationale, source)
- `gate_feedback` (trace_id, clause_id, decision, edited_text) — self-learning store

## Human-in-the-loop gates (first-class)
1. UC1: merchant confirm before finalizing/printing a version.
2. UC2: merchant validates `findings` before redlining.
3. UC2: merchant accepts/rejects/edits each `redline_result` proposal.
Every gate decision is written to `gate_feedback` to train future agent behavior.

## Build phases
- **Phase 0:** scaffold + schema + agent contracts + ingestion (no pending uploads needed).
- **Phase 1:** UC1 end-to-end (generate → editor → versioned DOCX).
- **Phase 2:** UC2 (monitor → analysis → validate → redline) — needs the perf spreadsheet.
- **Phase 3:** demo polish.
```
