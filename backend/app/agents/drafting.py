from __future__ import annotations

from typing import List

from ..clauses.library import build_default_clauses
from ..llm import get_llm
from ..models import ClauseInstance, ContractContext, Language
from .revision import apply_instruction

SYSTEM_TRANSLATE = (
    "You are a legal-aware translator for Indian small-business supplier contracts. "
    "Translate the given clause text and its plain-language gloss from English to Marathi. "
    "Keep defined terms (Supplier, Vendor, Customer) recognisable, keep it accurate and "
    "plain enough for a non-lawyer merchant, and do not add or drop obligations."
)

TRANSLATE_SCHEMA = {
    "type": "object",
    "properties": {
        "body_mr": {"type": "string"},
        "plain_mr": {"type": "string"},
    },
    "required": ["body_mr", "plain_mr"],
    "additionalProperties": False,
}


def _translate_to_marathi(clauses: List[ClauseInstance]) -> None:
    """Fill body['mr'] / plain['mr'] in place when Claude is available."""
    llm = get_llm()
    if not llm.enabled:
        return
    for clause in clauses:
        result = llm.complete_json(
            system=SYSTEM_TRANSLATE,
            user=(
                f"Clause title: {clause.title}\n\n"
                f"Clause text (English):\n{clause.body.get('en', '')}\n\n"
                f"Plain words (English):\n{clause.plain.get('en', '')}"
            ),
            schema=TRANSLATE_SCHEMA,
            max_tokens=2000,
        )
        if result:
            clause.body["mr"] = result["body_mr"]
            clause.plain["mr"] = result["plain_mr"]


def draft_contract(context: ContractContext):
    """UC1 first draft: deterministic clause set, then optional LLM refinement.

    Returns (clauses, changes). The deterministic backbone keeps the contract
    consistent and auditable; Claude is used for the open-ended parts (applying
    free-text instructions, Marathi translation).
    """
    clauses = build_default_clauses(context)
    changes = []

    if context.extra_instructions.strip():
        clauses, changes = apply_instruction(
            clauses, context.extra_instructions, language=Language.en
        )

    if Language.mr in context.languages:
        _translate_to_marathi(clauses)

    return clauses, changes
