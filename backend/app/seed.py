from __future__ import annotations

from datetime import date, datetime, timedelta

from .agents.drafting import draft_contract
from .agents.redline import propose_redlines
from .config import get_settings
from .models import (
    Contract,
    ContractContext,
    ContractVersion,
    Finding,
    Language,
    Party,
    Severity,
)
from .store import store

# Stable id so links to the demo contract stay valid across restarts.
ACME_CONTRACT_ID = "acmedemo0001"


def _acme_context() -> ContractContext:
    return ContractContext(
        supplier=Party(
            name="Acme Supplies Pvt. Ltd.",
            registered_office="Plot 14, MIDC, Andheri East, Mumbai 400093",
            gstin="27ABCDE1234F1Z5",
            pan="ABCDE1234F",
        ),
        vendor=Party(
            name="Demo Merchant (Dropship)",
            registered_office="Shop 3, Linking Road, Bandra West, Mumbai 400050",
            gstin="27FGHIJ5678K1Z2",
            pan="FGHIJ5678K",
        ),
        products="Home & kitchen accessories (dropshipped)",
        ship_window_hours=48,
        payment_terms="Net-30",
        return_days=7,
        governing_city="Mumbai",
        governing_language=Language.en,
        languages=[Language.en],
        # ~13 days out so it surfaces in the 2-week renewal alert — representative WIP.
        renewal_date=(date.today() + timedelta(days=13)).isoformat(),
        extra_instructions="",
    )


def seed_demo_contract() -> None:
    """Recreate the representative 'Acme Supplier Agreement' (v2) if the store is empty.

    Built through the real drafting + redline path so it mirrors a genuine work-in-progress
    contract. Idempotent: skips if the tenant already has contracts.
    """
    tenant = get_settings().contract_mint_default_tenant
    if store.list(tenant):
        return

    context = _acme_context()
    contract = Contract(
        contract_id=ACME_CONTRACT_ID,
        tenant_id=tenant,
        title="Acme Supplier Agreement",
        context=context,
    )

    # v1 — initial draft
    clauses, changes = draft_contract(context)
    contract.versions.append(ContractVersion(
        version=1, clauses=clauses, changes=changes, created_by="drafting-agent",
        created_at=datetime.utcnow() - timedelta(days=2),
    ))
    contract.current_version = 1

    # v2 — a tracked redline from a representative returns finding (work in progress)
    finding = Finding(
        id="return_rate",
        metric="return_rate",
        title="High customer return rate",
        observed="5.10% of sales returned (up 0.80 pts vs previous period)",
        benchmark="target ≤ 4%",
        severity=Severity.medium,
        evidence="Returns indicate quality/fulfilment issues to push back on the Supplier.",
        maps_to_clauses=["returns_warranties", "quality"],
        suggested_action=(
            "Add a return-rate cap and shift return shipping plus restocking cost to the "
            "Supplier when returns exceed the agreed benchmark, and tighten the Supplier's "
            "quality-inspection obligation."
        ),
    )
    new_clauses, redline_changes = propose_redlines(clauses, [finding], Language.en)
    if redline_changes:
        contract.versions.append(ContractVersion(
            version=2, clauses=new_clauses, changes=redline_changes, created_by="redline-agent",
            created_at=datetime.utcnow() - timedelta(days=1),
        ))
        contract.current_version = 2

    store.create(contract)
