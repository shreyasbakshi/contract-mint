# Contract Mint — Agent Message Contracts

Agents never exchange free text. They pass **typed JSON envelopes**, which makes the
pipeline debuggable, auditable (important for the legal-liability angle), and easy to
gate for human-in-the-loop review.

## Common envelope
```json
{
  "msg_id": "uuid",
  "tenant_id": "uuid",
  "trace_id": "uuid",          // ties one workflow run together
  "from_agent": "performance_analysis",
  "to_agent": "orchestrator",
  "type": "findings",          // see message types below
  "requires_gate": true,        // if true, orchestrator pauses for merchant confirm
  "payload": { ... },
  "created_at": "ISO-8601"
}
```

## Agents
- `orchestrator` — owns workflow state, routing, and the human-in-the-loop gates.
- `drafting` (UC1) — context → first-draft contract (clause-indexed).
- `revision` (UC1) — merchant edits / NL / voice instructions → tracked revision.
- `renewal_monitor` (UC2, scheduled) — finds contracts expiring ≤ 2 weeks.
- `performance_analysis` (UC2) — perf data → breach findings with evidence.
- `redline` (UC2) — confirmed findings → clause-level proposed changes.

## Message types & payloads

### draft_request → drafting
```json
{ "context": { "supplier": {...}, "vendor": {...}, "products": [...],
  "sla_hours": 48, "payment_terms": "net-30", "jurisdiction": "IN" } }
```

### draft_result ← drafting
```json
{ "contract_id": "uuid", "version": 1,
  "clauses": [ { "clause_id": "delivery", "body": "...", "variables": {...} } ] }
```

### revision_request → revision
```json
{ "contract_id": "uuid", "base_version": 3,
  "instruction": "make the delivery penalty stricter",
  "source": "voice|typed", "editor_diff": null }
```

### revision_result ← revision  (tracked, never silent overwrite)
```json
{ "contract_id": "uuid", "new_version": 4,
  "changes": [ { "clause_id": "delivery", "old": "...", "new": "...",
                 "rationale": "..." } ] }
```

### expiry_alert ← renewal_monitor
```json
{ "contract_id": "uuid", "supplier_id": "uuid",
  "renewal_date": "2026-07-05", "days_left": 13 }
```

### findings ← performance_analysis   (requires_gate: true)
```json
{ "supplier_id": "uuid",
  "breaches": [
    { "metric": "on_time_pct", "observed": 0.71, "threshold": 0.95,
      "severity": "high", "evidence": "missed 9 of 31 orders",
      "maps_to_clauses": ["delivery", "fulfilment_sla"] }
  ],
  "rollup_score": 58 }
```

### redline_request → redline   (only confirmed breaches)
```json
{ "contract_id": "uuid", "confirmed_breaches": [ ... ] }
```

### redline_result ← redline   (requires_gate: true)
```json
{ "contract_id": "uuid", "proposals": [
   { "clause_id": "delivery", "old": "...", "new": "...",
     "rationale": "supplier on-time 71% vs 95% SLA",
     "rule_explanation": "score 58 (<60) -> tighten penalties" } ] }
```

### gate_decision ← merchant (captured as self-learning feedback)
```json
{ "trace_id": "uuid", "clause_id": "delivery",
  "decision": "accept|reject|edit", "edited_text": null, "comment": "..." }
```
