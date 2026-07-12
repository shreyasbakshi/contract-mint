# Contract Mint — Agent & Data Contracts

> **Scope note (accuracy):** This document describes what is *built today*. The MVP is
> deliberately lean — it is **not** a six-agent message-passing system. It is a small set
> of typed functions called directly by FastAPI routes, with **three** of them touching
> the LLM. The fully-decoupled, envelope-based multi-agent design is a **future target**
> and is called out as such at the bottom of this file. Keep this doc honest: if the code
> and the doc disagree, fix the doc.

## What actually exists

There is **no separate orchestrator process** and **no inter-agent message bus**. The
FastAPI route handlers in [`api/uc1.py`](../backend/app/api/uc1.py) and
[`api/uc2.py`](../backend/app/api/uc2.py) are the orchestrator: they call plain functions
and persist versions via [`store.py`](../backend/app/store.py).

### LLM-touching units (3)
- `drafting` — [`agents/drafting.py`](../backend/app/agents/drafting.py). **Hybrid:** a
  deterministic clause backbone (`build_default_clauses`) plus *optional* Claude refinement
  for free-text instructions and Marathi translation. The deterministic core keeps output
  consistent and auditable; Claude handles the open-ended parts.
- `revision` — [`agents/revision.py`](../backend/app/agents/revision.py). Natural-language /
  voice / typed edit instruction → tracked clause changes (never a silent overwrite).
- `redline` — [`agents/redline.py`](../backend/app/agents/redline.py). Confirmed breach
  findings → tracked clause redlines with rationale.

All three degrade gracefully: if the LLM is disabled/unavailable they fall back to
deterministic behaviour (`llm.enabled` guards + offline targets).

### Deterministic units (not LLM "agents")
- **Renewal monitor** — a date filter (`_days_to`, `within_days`) in
  [`api/uc2.py`](../backend/app/api/uc2.py). Lists contracts expiring within N days.
- **Performance analysis** — spreadsheet ingestion + breach detection in
  [`ingestion/perf.py`](../backend/app/ingestion/perf.py). Pure computation over the
  supplier performance data; no model call.

## Human-in-the-loop gating (as built)

Gating is enforced by **API shape**, not by an orchestrator pausing a workflow: the client
reviews `performance_analysis` findings, then explicitly calls the redline endpoint with
only the **confirmed** breaches. Nothing is applied to a live contract until that call.

## Endpoint contracts

### UC1 — generation & revision
`POST /uc1/contracts` — generate a first draft.
```json
{ "context": { "supplier": {...}, "vendor": {...}, "products": [...],
  "sla_hours": 48, "payment_terms": "net-30", "jurisdiction": "IN",
  "extra_instructions": "", "languages": ["en", "mr"] } }
```
Returns a `Contract` with `version: 1`, clause-indexed:
```json
{ "contract_id": "uuid", "version": 1,
  "clauses": [ { "clause_id": "delivery", "title": "...", "body": {"en": "...", "mr": "..."} } ] }
```

`POST /uc1/contracts/{id}/revise` — tracked revision (never silent overwrite).
```json
{ "instruction": "make the delivery penalty stricter", "source": "voice|typed" }
```
Returns the contract at a new version; each change carries `{ clause_id, old, new, rationale }`.

### UC2 — renewal intelligence
`GET /uc2/renewals?within_days=14` — contracts expiring within the window.

`POST /uc2/analyze` — upload performance data → breach findings (client reviews before redline).
```json
{ "supplier_id": "uuid",
  "breaches": [
    { "metric": "on_time_pct", "observed": 0.71, "threshold": 0.95,
      "severity": "high", "evidence": "missed 9 of 31 orders",
      "maps_to_clauses": ["delivery", "fulfilment_sla"] } ],
  "rollup_score": 58 }
```

`POST /uc2/contracts/{id}/redline` — confirmed findings → tracked redline proposals.
```json
{ "contract_id": "uuid", "proposals": [
   { "clause_id": "delivery", "old": "...", "new": "...",
     "rationale": "supplier on-time 71% vs 95% SLA" } ] }
```

---

## Future target: decoupled multi-agent design (NOT built)

If/when the workflow needs independent scheduling, retries, or audit replay, the plan is to
introduce a real orchestrator and a typed message envelope so steps stop calling each other
directly. **None of this exists in code today** — it is recorded here as intent only.

```json
{
  "msg_id": "uuid",
  "tenant_id": "uuid",
  "trace_id": "uuid",          // ties one workflow run together
  "from_agent": "performance_analysis",
  "to_agent": "orchestrator",
  "type": "findings",
  "requires_gate": true,        // orchestrator pauses for merchant confirm
  "payload": { ... },
  "created_at": "ISO-8601"
}
```

Adopt this only when a concrete need (scheduling / retry / replay) justifies the extra
moving parts — not before.
