from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List

from ..models import ClauseInstance, ContractContext


@dataclass(frozen=True)
class ClauseDef:
    """A clause template. `body`/`plain` are callables so they can interpolate context."""

    clause_id: str
    title: str
    body_en: Callable[[ContractContext], str]
    plain_en: str  # plain-language gloss (English); Marathi produced by the agent

    def render(self, ctx: ContractContext) -> ClauseInstance:
        return ClauseInstance(
            clause_id=self.clause_id,
            title=self.title,
            body={"en": self.body_en(ctx).strip()},
            plain={"en": self.plain_en.strip()},
        )


def _supplier(ctx: ContractContext) -> str:
    return ctx.supplier.name or "the Supplier"


def _vendor(ctx: ContractContext) -> str:
    return ctx.vendor.name or "the Vendor"


# Ordered clause library. Roles: Supplier = stockholder/fulfiller, Vendor = dropship
# merchant, Customer = the Vendor's end buyer. India-localised, plain language.
CLAUSE_DEFS: List[ClauseDef] = [
    ClauseDef(
        "parties",
        "Parties and Background",
        lambda c: (
            f"This Agreement is made between {_supplier(c)} (the \"Supplier\"), "
            f"registered at {c.supplier.registered_office or '[address]'} "
            f"(GSTIN {c.supplier.gstin or '[GSTIN]'}), and {_vendor(c)} (the \"Vendor\"), "
            f"registered at {c.vendor.registered_office or '[address]'} "
            f"(GSTIN {c.vendor.gstin or '[GSTIN]'}). The Vendor sells the Supplier's products "
            f"to its customers and passes orders to the Supplier, who fulfils them directly. "
            f"This Agreement is governed by the Indian Contract Act, 1872. The parties will pay "
            f"any stamp duty required in their State."
        ),
        "Who the two businesses are. You (the Vendor) take the orders; the Supplier ships them.",
    ),
    ClauseDef(
        "definitions",
        "Definitions",
        lambda c: (
            "\"Order\" means a customer purchase order passed to the Supplier. "
            "\"Products\" means the goods listed in the Annexure. "
            "\"Customer\" means the Vendor's end buyer. "
            "\"Business Day\" means any day other than a Saturday, Sunday or public holiday in India."
        ),
        "Plain meanings of the key words used in the contract.",
    ),
    ClauseDef(
        "fulfilment_sla",
        "Order Fulfilment and Service Levels",
        lambda c: (
            f"The Supplier will ship each Order and upload a valid tracking number within "
            f"{c.ship_window_hours} hours of receiving it. If the Supplier repeatedly misses this "
            f"window, the Vendor may require a service-credit and, on continued default, end this "
            f"Agreement on notice."
        ),
        f"The Supplier must ship within the agreed hours and give a tracking number. "
        f"Miss it repeatedly and there are penalties.",
    ),
    ClauseDef(
        "pricing_payments",
        "Pricing and Payments",
        lambda c: (
            f"The Supplier will give the Vendor a price list of wholesale costs and any dropship "
            f"fees. Prices are exclusive of GST, which the Vendor pays on a valid tax invoice. "
            f"Payment terms are {c.payment_terms}. No price increase takes effect without the "
            f"Vendor's prior written agreement."
        ),
        "What you pay the Supplier, when you pay, and that prices can't go up without your say-so. "
        "GST is added on top.",
    ),
    ClauseDef(
        "delivery",
        "Delivery",
        lambda c: (
            "The Products will be delivered to the address on the Order. The Products must be "
            "properly packed to reach the Customer undamaged. Time for delivery is important to "
            "this Agreement."
        ),
        "Goods go to the customer's address, well packed, on time.",
    ),
    ClauseDef(
        "quality",
        "Quality and Inspection",
        lambda c: (
            "All Products must be new and of satisfactory quality. The Supplier will maintain "
            "quality-control checks and pass on the benefit of any manufacturer warranty to the "
            "Customer. Where defect-driven returns rise, the Supplier will agree a remediation plan."
        ),
        "Goods must be new and good quality. If too many come back faulty, the Supplier has to fix "
        "the problem.",
    ),
    ClauseDef(
        "returns_warranties",
        "Returns and Warranties",
        lambda c: (
            f"The Supplier will provide a {c.return_days}-day return and refund policy for undamaged "
            f"goods and for damaged or defective goods. The Supplier bears return shipping and any "
            f"restocking cost where the return is due to the Supplier's fault (including late "
            f"delivery). Where the return rate materially exceeds the agreed benchmark, the parties "
            f"will review accountability for return costs."
        ),
        "Who handles customer returns and who pays for them. If returns are the Supplier's fault, "
        "the Supplier pays.",
    ),
    ClauseDef(
        "inventory_feeds",
        "Inventory Feeds",
        lambda c: (
            "The Supplier will keep the Vendor's stock levels in sync through a daily CSV or EDI "
            "feed so the Vendor does not sell out-of-stock items. The Supplier is responsible for "
            "oversell caused by a stale or missing feed."
        ),
        "The Supplier keeps your stock counts up to date daily so you don't sell things that are "
        "out of stock.",
    ),
    ClauseDef(
        "damaged_lost_goods",
        "Damaged or Lost Goods",
        lambda c: (
            "The Supplier bears the cost of Products lost in transit or arriving damaged, and will "
            "re-ship or refund the Customer. Returns and refunds a Customer chooses because of the "
            "Supplier's delay are the Supplier's responsibility."
        ),
        "If a parcel is lost or arrives broken, the Supplier covers it — including refunds caused "
        "by late delivery.",
    ),
    ClauseDef(
        "payment",
        "Invoicing and Unpaid Sums",
        lambda c: (
            f"The Supplier may invoice the Vendor for fulfilled Orders. The Vendor will pay cleared "
            f"funds within the {c.payment_terms} terms. Sums unpaid after the due date carry interest "
            f"at the rate allowed under applicable Indian law."
        ),
        "When invoices are raised and paid, and that late payment can attract interest.",
    ),
    ClauseDef(
        "images_advertising",
        "Images and Advertising",
        lambda c: (
            "The Supplier will provide product images for the Vendor's website. The Vendor will not "
            "make claims about the Products beyond the Supplier's approved product information."
        ),
        "You can use the Supplier's product photos, but don't over-claim about the products.",
    ),
    ClauseDef(
        "dispute_resolution",
        "Dispute Resolution",
        lambda c: (
            f"The parties will first try to resolve any dispute amicably. Failing that, the dispute "
            f"will be referred to arbitration under the Arbitration and Conciliation Act, 1996, "
            f"seated at {c.governing_city}, India. The courts at {c.governing_city} have jurisdiction."
        ),
        "If there's a disagreement, you talk it out first; if that fails, it goes to arbitration "
        "in the city named above.",
    ),
    ClauseDef(
        "governing_language",
        "Governing Language",
        lambda c: (
            f"This Agreement may be issued in English and Marathi. If there is any difference between "
            f"the versions, the {c.governing_language.value.upper()} version prevails."
        ),
        "If the English and Marathi versions ever disagree, the one named here is the official one.",
    ),
]


CLAUSE_INDEX: Dict[str, ClauseDef] = {c.clause_id: c for c in CLAUSE_DEFS}


def build_default_clauses(ctx: ContractContext) -> List[ClauseInstance]:
    """Deterministic template-fill of the full clause set from the merchant's context."""
    return [c.render(ctx) for c in CLAUSE_DEFS]
