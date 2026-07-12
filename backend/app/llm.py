from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .config import get_settings


class LLM:
    """Thin wrapper over the Anthropic SDK.

    - Reasoning-heavy work (analysis, redline) -> Opus 4.8.
    - High-volume work (drafting, applying edits) -> Sonnet 5.
    Falls back to `enabled=False` when no API key is configured, so the rest of
    the app can run offline with deterministic template logic.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        if self.settings.llm_enabled:
            from anthropic import Anthropic  # imported lazily so offline mode needs no key

            self._client = Anthropic(api_key=self.settings.anthropic_api_key)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def complete_json(
        self,
        *,
        system: str,
        user: str,
        schema: Dict[str, Any],
        reasoning: bool = False,
        max_tokens: int = 8000,
    ) -> Optional[Dict[str, Any]]:
        """Run a structured-output call and return parsed JSON, or None when offline."""
        if not self.enabled:
            return None

        model = (
            self.settings.contract_mint_model_reasoning
            if reasoning
            else self.settings.contract_mint_model_drafting
        )
        # Stream to stay well under HTTP timeouts on larger drafting outputs.
        with self._client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system,
            output_config={"format": {"type": "json_schema", "schema": schema}},
            messages=[{"role": "user", "content": user}],
        ) as stream:
            message = stream.get_final_message()

        text = next((b.text for b in message.content if b.type == "text"), None)
        if not text:
            return None
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None


_llm: Optional[LLM] = None


def get_llm() -> LLM:
    global _llm
    if _llm is None:
        _llm = LLM()
    return _llm
