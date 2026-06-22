from __future__ import annotations

from datetime import date, datetime
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..agents.redline import propose_redlines
from ..config import get_settings
from ..ingestion.perf import analyze, analyze_portfolio, load_rows
from ..models import (
    AnalysisResult,
    Contract,
    ContractSummary,
    ContractVersion,
    PortfolioResult,
    RedlineRequest,
)
from ..store import store

router = APIRouter(prefix="/uc2", tags=["UC2 — Renewal Intelligence"])


def _tenant() -> str:
    return get_settings().contract_mint_default_tenant


def _days_to(renewal: str) -> int:
    try:
        d = datetime.strptime(renewal, "%Y-%m-%d").date()
        return (d - date.today()).days
    except (ValueError, TypeError):
        return 10 ** 6


@router.get("/renewals", response_model=List[ContractSummary])
def renewals(within_days: int = 14) -> List[ContractSummary]:
    """Contracts expiring within `within_days` (default 2 weeks) — the renewal alert."""
    out: List[ContractSummary] = []
    for c in store.list(_tenant()):
        rd = c.context.renewal_date
        if not rd:
            continue
        days = _days_to(rd)
        if days <= within_days:
            out.append(ContractSummary(
                contract_id=c.contract_id,
                title=c.title,
                current_version=c.current_version,
                created_at=c.created_at,
                renewal_date=rd,
                days_to_renewal=days,
            ))
    out.sort(key=lambda s: s.days_to_renewal if s.days_to_renewal is not None else 10 ** 6)
    return out


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_performance(
    file: UploadFile = File(...),
    supplier_label: str = Form("Uploaded supplier"),
) -> AnalysisResult:
    """Ingest a CSV/Excel performance file and analyze returns & quality (data-backed)."""
    content = await file.read()
    try:
        rows, headers = load_rows(file.filename or "upload", content)
    except Exception as e:  # noqa: BLE001 - surface parse errors to the merchant
        raise HTTPException(400, f"Could not read file: {e}")
    if not rows:
        raise HTTPException(400, "No data rows found in the file")
    return analyze(rows, headers, supplier_label)


@router.post("/portfolio", response_model=PortfolioResult)
async def analyze_portfolio_roster(file: UploadFile = File(...)) -> PortfolioResult:
    """Ingest a supplier roster (name + performance_score per row) → verdict per supplier."""
    content = await file.read()
    try:
        rows, headers = load_rows(file.filename or "upload", content)
    except Exception as e:  # noqa: BLE001 - surface parse errors to the merchant
        raise HTTPException(400, f"Could not read file: {e}")
    if not rows:
        raise HTTPException(400, "No supplier rows found in the file")
    result = analyze_portfolio(rows, headers)
    if not result.suppliers:
        raise HTTPException(
            422,
            "No performance scores found. Include a 'performance_score' (0-100) column per supplier.",
        )
    return result


@router.post("/contracts/{contract_id}/redline", response_model=Contract)
def redline(contract_id: str, req: RedlineRequest) -> Contract:
    """Apply confirmed findings as a gated, tracked redline -> new contract version."""
    contract = store.get(_tenant(), contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    latest = contract.latest()
    if not latest:
        raise HTTPException(400, "Contract has no version to redline")
    if not req.findings:
        raise HTTPException(422, "No confirmed findings provided")

    new_clauses, changes = propose_redlines(latest.clauses, req.findings, req.language)
    if not changes:
        raise HTTPException(422, "Findings did not map to any clause in this contract")

    version = ContractVersion(
        version=contract.current_version + 1,
        clauses=new_clauses,
        changes=changes,
        created_by="redline-agent",
    )
    contract.versions.append(version)
    contract.current_version = version.version
    store.save(contract)
    return contract
