from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ── Shared enums ──────────────────────────────────────────────────────────────

class Language(str, Enum):
    en = "en"
    mr = "mr"  # Marathi


class RevisionSource(str, Enum):
    typed = "typed"
    voice = "voice"
    editor = "editor"


# ── Contract context (UC1 input) ──────────────────────────────────────────────

class Party(BaseModel):
    name: str = ""
    registered_office: str = ""
    gstin: Optional[str] = None
    pan: Optional[str] = None


class ContractContext(BaseModel):
    """What the merchant tells us about the deal they want papered."""

    # Roles per the dropshipping template: Supplier = stockholder/fulfiller,
    # Vendor = the dropship merchant.
    supplier: Party = Field(default_factory=Party)
    vendor: Party = Field(default_factory=Party)

    products: str = Field("", description="Free-text description / list of products covered")
    ship_window_hours: int = Field(48, description="Order fulfilment SLA in hours")
    payment_terms: str = Field("Net-30", description="e.g. Net-30, wallet deposit")
    return_days: int = Field(7, description="Customer return window in days")
    governing_city: str = Field("Mumbai", description="Arbitration seat / jurisdiction")
    governing_language: Language = Language.en
    languages: List[Language] = Field(default_factory=lambda: [Language.en])
    renewal_date: Optional[str] = Field(None, description="Contract renewal date, YYYY-MM-DD")
    extra_instructions: str = Field("", description="Anything else the merchant wants reflected")


# ── Clause + contract document model ──────────────────────────────────────────

class ClauseInstance(BaseModel):
    """A clause as it appears in a specific contract version."""

    clause_id: str
    title: str
    body: Dict[str, str] = Field(default_factory=dict)   # language -> text
    plain: Dict[str, str] = Field(default_factory=dict)  # language -> "in plain words"


class ClauseChange(BaseModel):
    """A tracked change to one clause between versions (UC1 revision / UC2 redline)."""

    clause_id: str
    old: str
    new: str
    rationale: str
    source: str = "revision"  # revision | redline


class ContractVersion(BaseModel):
    version: int
    clauses: List[ClauseInstance]
    changes: List[ClauseChange] = Field(default_factory=list)
    docx_uri: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = "system"


class Contract(BaseModel):
    contract_id: str
    tenant_id: str
    title: str
    context: ContractContext
    current_version: int = 0
    versions: List[ContractVersion] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def latest(self) -> Optional[ContractVersion]:
        return self.versions[-1] if self.versions else None


# ── API request/response shapes ───────────────────────────────────────────────

class GenerateRequest(BaseModel):
    title: str = "Supplier Agreement"
    context: ContractContext = Field(default_factory=ContractContext)


class ReviseRequest(BaseModel):
    instruction: str = Field(..., description="Natural-language revision, e.g. 'make the penalty stricter'")
    source: RevisionSource = RevisionSource.typed
    language: Language = Language.en


class ContractSummary(BaseModel):
    contract_id: str
    title: str
    current_version: int
    created_at: datetime
    renewal_date: Optional[str] = None
    days_to_renewal: Optional[int] = None


# ── UC2: performance analysis + redline ───────────────────────────────────────

class Severity(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Finding(BaseModel):
    id: str
    metric: str                       # e.g. "return_rate", "sales_trend"
    title: str                        # short human title
    observed: str                     # what we measured (display string)
    benchmark: str = ""               # peer/expected comparison (display string)
    severity: Severity = Severity.medium
    evidence: str = ""                # supporting detail
    maps_to_clauses: List[str] = Field(default_factory=list)
    suggested_action: str = ""        # plain-language redline suggestion


class PerfSummary(BaseModel):
    supplier_label: str
    rows: int
    columns_detected: List[str] = Field(default_factory=list)
    sales_current: Optional[float] = None
    sales_previous: Optional[float] = None
    return_rate_current: Optional[float] = None
    return_rate_previous: Optional[float] = None
    rollup_score: int = 0             # 0-100 derived health score


class VerdictKind(str, Enum):
    renew = "renew"       # score >= 75 — favorable
    tighten = "tighten"   # 50 <= score < 75 — salvage with stricter terms
    scrap = "scrap"       # score < 50 — recommend exit / non-renewal


class Verdict(BaseModel):
    """Score-driven recommendation for the supplier relationship at renewal."""

    kind: VerdictKind
    label: str                                  # "Renew", "Tighten", "Scrap"
    score: int                                  # 0-100 driving score
    headline: str                               # one-line recommendation
    rationale: str                              # why, in plain language
    recommended_term: str                       # e.g. "2-year term, auto-renew"
    recommended_actions: List[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    summary: PerfSummary
    verdict: Verdict
    findings: List[Finding]


# ── UC2: portfolio / bulk verdicts across many suppliers ──────────────────────

class PortfolioSupplier(BaseModel):
    supplier_id: str = ""
    name: str
    email: str = ""
    score: int                                  # 0-100 rating used for the verdict
    renewal_date: Optional[str] = None
    days_to_renewal: Optional[int] = None
    verdict: Verdict


class PortfolioResult(BaseModel):
    suppliers: List[PortfolioSupplier]
    counts: Dict[str, int] = Field(default_factory=dict)   # {renew, tighten, scrap}
    columns_detected: List[str] = Field(default_factory=list)


class RedlineRequest(BaseModel):
    findings: List[Finding] = Field(..., description="Merchant-confirmed findings")
    language: Language = Language.en
