from __future__ import annotations

import copy
from typing import List, Tuple

from ..llm import get_llm
from ..models import ClauseChange, ClauseInstance, Finding, Language

SYSTEM_REDLINE = (
    "You are tightening an Indian dropshipping supplier contract based on confirmed supplier "
    "performance problems. You are given the relevant clauses and a set of findings, each with a "
    "suggested action and the clauses it maps to. Rewrite ONLY the mapped clauses to address the "
    "findings, in plain everyday language a non-lawyer merchant understands, keeping Indian-law "
    "framing. Make the supplier accountable proportionate to the finding — do not over-reach."
)

REDLINE_SCHEMA = {
    "type": "object",
    "properties": {
        "changes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "clause_id": {"type": "string"},
                    "new_body": {"type": "string"},
                    "new_plain": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": ["clause_id", "new_body", "new_plain", "rationale"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["changes"],
    "additionalProperties": False,
}


def propose_redlines(
    clauses: List[ClauseInstance],
    findings: List[Finding],
    language: Language = Language.en,
) -> Tuple[List[ClauseInstance], List[ClauseChange]]:
    """Turn confirmed findings into tracked clause redlines."""
    lang = language.value
    new_clauses = copy.deepcopy(clauses)
    by_id = {c.clause_id: c for c in new_clauses}
    changes: List[ClauseChange] = []

    # Which clauses are in scope (mapped by any finding and present in the contract).
    target_ids = []
    for f in findings:
        for cid in f.maps_to_clauses:
            if cid in by_id and cid not in target_ids:
                target_ids.append(cid)
    if not target_ids:
        return new_clauses, changes

    llm = get_llm()
    if llm.enabled:
        catalogue = "\n\n".join(
            f"[{cid}] {by_id[cid].title}\n{by_id[cid].body.get('en', '')}" for cid in target_ids
        )
        findings_text = "\n".join(
            f"- {f.title} ({f.severity.value}): {f.observed}. "
            f"Suggested: {f.suggested_action} [clauses: {', '.join(f.maps_to_clauses)}]"
            for f in findings
        )
        result = llm.complete_json(
            system=SYSTEM_REDLINE,
            user=f"Clauses in scope:\n\n{catalogue}\n\nConfirmed findings:\n{findings_text}",
            schema=REDLINE_SCHEMA,
            reasoning=True,
            max_tokens=4000,
        )
        if result and result.get("changes"):
            for ch in result["changes"]:
                clause = by_id.get(ch["clause_id"])
                if not clause:
                    continue
                old = clause.body.get(lang, clause.body.get("en", ""))
                clause.body[lang] = ch["new_body"].strip()
                clause.plain[lang] = ch["new_plain"].strip()
                changes.append(ClauseChange(
                    clause_id=clause.clause_id,
                    old=old,
                    new=ch["new_body"].strip(),
                    rationale=ch["rationale"].strip(),
                    source="redline",
                ))
            return new_clauses, changes

    # Offline fallback: append each finding's suggested action to its mapped clauses.
    applied = set()
    for f in findings:
        for cid in f.maps_to_clauses:
            clause = by_id.get(cid)
            if not clause:
                continue
            key = (cid, f.id)
            if key in applied:
                continue
            applied.add(key)
            old = clause.body.get(lang, clause.body.get("en", ""))
            clause.body[lang] = (old + " " + f.suggested_action).strip()
            changes.append(ClauseChange(
                clause_id=cid,
                old=old,
                new=clause.body[lang],
                rationale=f"Redline from finding '{f.title}' ({f.severity.value}): {f.observed}",
                source="redline",
            ))
    return new_clauses, changes
