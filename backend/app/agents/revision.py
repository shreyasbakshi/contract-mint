from __future__ import annotations

import copy
from typing import List, Tuple

from ..llm import get_llm
from ..models import ClauseChange, ClauseInstance, Language

SYSTEM_REVISE = (
    "You revise an Indian small-business dropshipping supplier contract for a non-lawyer "
    "merchant. You are given the current clauses (each with an id, title and plain-English "
    "body) and a revision instruction. Decide which existing clause(s) the instruction "
    "affects and rewrite ONLY those, keeping the same plain, everyday language and Indian-law "
    "framing (Indian Contract Act 1872, GST, Arbitration Act 1996). Never invent obligations "
    "the instruction did not ask for. Return the changed clauses only."
)

REVISE_SCHEMA = {
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

# Keyword hints used only by the offline fallback to pick the most relevant clause.
_OFFLINE_HINTS = {
    "penalt": "fulfilment_sla",
    "delay": "fulfilment_sla",
    "ship": "fulfilment_sla",
    "track": "fulfilment_sla",
    "return": "returns_warranties",
    "refund": "returns_warranties",
    "restock": "returns_warranties",
    "price": "pricing_payments",
    "payment": "pricing_payments",
    "gst": "pricing_payments",
    "quality": "quality",
    "defect": "quality",
    "stock": "inventory_feeds",
    "oversell": "inventory_feeds",
    "inventory": "inventory_feeds",
    "lost": "damaged_lost_goods",
    "damage": "damaged_lost_goods",
    "arbitrat": "dispute_resolution",
    "dispute": "dispute_resolution",
    "deliver": "delivery",
}


def _offline_target(instruction: str, clauses: List[ClauseInstance]) -> str:
    text = instruction.lower()
    for hint, clause_id in _OFFLINE_HINTS.items():
        if hint in text and any(c.clause_id == clause_id for c in clauses):
            return clause_id
    return clauses[0].clause_id if clauses else ""


def apply_instruction(
    clauses: List[ClauseInstance],
    instruction: str,
    language: Language = Language.en,
) -> Tuple[List[ClauseInstance], List[ClauseChange]]:
    """Apply a natural-language revision. Returns (new_clauses, tracked_changes)."""
    lang = language.value
    new_clauses = copy.deepcopy(clauses)
    by_id = {c.clause_id: c for c in new_clauses}
    changes: List[ClauseChange] = []

    llm = get_llm()
    if llm.enabled:
        catalogue = "\n\n".join(
            f"[{c.clause_id}] {c.title}\n{c.body.get('en', '')}" for c in clauses
        )
        result = llm.complete_json(
            system=SYSTEM_REVISE,
            user=f"Current clauses:\n\n{catalogue}\n\nRevision instruction:\n{instruction}",
            schema=REVISE_SCHEMA,
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
                changes.append(
                    ClauseChange(
                        clause_id=clause.clause_id,
                        old=old,
                        new=ch["new_body"].strip(),
                        rationale=ch["rationale"].strip(),
                        source="revision",
                    )
                )
            return new_clauses, changes

    # Offline fallback: attach the instruction to the most relevant clause as an
    # explicit addendum so the change is visible and tracked.
    target_id = _offline_target(instruction, new_clauses)
    clause = by_id.get(target_id)
    if clause:
        old = clause.body.get(lang, clause.body.get("en", ""))
        addendum = f" Additional agreed term: {instruction.strip()}"
        clause.body[lang] = (old + addendum).strip()
        changes.append(
            ClauseChange(
                clause_id=clause.clause_id,
                old=old,
                new=clause.body[lang],
                rationale="Applied merchant instruction verbatim (offline mode — no LLM key).",
                source="revision",
            )
        )
    return new_clauses, changes
