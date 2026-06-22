from __future__ import annotations

import os
from typing import List

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from ..agents.drafting import draft_contract
from ..agents.revision import apply_instruction
from ..config import get_settings
from ..docgen.docx_writer import render_docx
from ..models import (
    Contract,
    ContractSummary,
    ContractVersion,
    GenerateRequest,
    Language,
    ReviseRequest,
)
from ..store import store

router = APIRouter(prefix="/uc1", tags=["UC1 — Generation & Revision"])


def _tenant() -> str:
    return get_settings().contract_mint_default_tenant


def _new_version(contract: Contract, clauses, changes, created_by: str) -> ContractVersion:
    version = ContractVersion(
        version=contract.current_version + 1,
        clauses=clauses,
        changes=changes,
        created_by=created_by,
    )
    contract.versions.append(version)
    contract.current_version = version.version
    return version


@router.post("/contracts", response_model=Contract)
def generate(req: GenerateRequest) -> Contract:
    """Generate the first draft of a supplier agreement from merchant context."""
    contract = Contract(
        contract_id=store.new_id(),
        tenant_id=_tenant(),
        title=req.title,
        context=req.context,
    )
    clauses, changes = draft_contract(req.context)
    _new_version(contract, clauses, changes, created_by="drafting-agent")
    store.create(contract)
    return contract


@router.get("/contracts", response_model=List[ContractSummary])
def list_contracts() -> List[ContractSummary]:
    return [
        ContractSummary(
            contract_id=c.contract_id,
            title=c.title,
            current_version=c.current_version,
            created_at=c.created_at,
        )
        for c in store.list(_tenant())
    ]


@router.get("/contracts/{contract_id}", response_model=Contract)
def get_contract(contract_id: str) -> Contract:
    contract = store.get(_tenant(), contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    return contract


@router.post("/contracts/{contract_id}/revise", response_model=Contract)
def revise(contract_id: str, req: ReviseRequest) -> Contract:
    """Apply a typed/voice/editor revision instruction, producing a new tracked version."""
    contract = store.get(_tenant(), contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    latest = contract.latest()
    if not latest:
        raise HTTPException(400, "Contract has no version to revise")

    new_clauses, changes = apply_instruction(latest.clauses, req.instruction, req.language)
    if not changes:
        raise HTTPException(422, "Could not map that instruction to any clause")
    _new_version(contract, new_clauses, changes, created_by=f"revision-agent:{req.source.value}")
    store.save(contract)
    return contract


@router.get("/contracts/{contract_id}/document")
def download_document(
    contract_id: str,
    language: Language = Query(Language.en),
    version: int = Query(0, description="0 = latest"),
):
    """Render the contract version to DOCX and download it (merchant confirmation gate)."""
    contract = store.get(_tenant(), contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")

    target = contract.latest() if version == 0 else next(
        (v for v in contract.versions if v.version == version), None
    )
    if not target:
        raise HTTPException(404, "Version not found")

    path = render_docx(contract, target, language)
    target.docx_uri = path
    store.save(contract)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=os.path.basename(path),
    )
