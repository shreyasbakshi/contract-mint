from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import uc1, uc2
from .config import get_settings
from .seed import seed_demo_contract

app = FastAPI(
    title="Contract Mint API",
    version="0.1.0",
    description="Agentic contract generation + renewal intelligence for small Indian merchants.",
)


@app.on_event("startup")
def _seed() -> None:
    # Recreate the representative Acme demo contract so it survives restarts
    # (the store is in-memory). Idempotent — no-op once contracts exist.
    seed_demo_contract()

# Permissive CORS for the demo so the Next.js frontend (Replit/localhost) can call it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(uc1.router)
app.include_router(uc2.router)


@app.get("/health", tags=["meta"])
def health():
    s = get_settings()
    return {
        "status": "ok",
        "llm_enabled": s.llm_enabled,
        "models": {
            "reasoning": s.contract_mint_model_reasoning,
            "drafting": s.contract_mint_model_drafting,
        },
        "tenant": s.contract_mint_default_tenant,
    }
