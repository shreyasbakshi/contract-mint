# Contract Mint — Clause Library (India, Dropshipping Supplier–Vendor Agreement)

> Source: UC1 template (clauses 1–9, 23) + merchant-specified key clauses.
> Jurisdiction: India. Roles per template — **Supplier** = stockholder/fulfiller,
> **Vendor** = dropship merchant, **Customer** = Vendor's end buyer.

Each clause has: a stable `clause_id` (used everywhere — versions, redlines, agent
messages), the default body, the variables to fill, and — critically — the
**UC2 performance signal** that can trigger a redline of that clause.

## Drafting principle — plain language for non-lawyer merchants
Every clause is written so a merchant with **no legal background** understands it.
Each clause is generated in two parts:
1. **Clause text** — short sentences, everyday words, no Latin/legalese. Defined terms
   stay capitalised (Supplier, Vendor, Customer) but the wording is conversational.
2. **"In plain words"** — a one-line gloss under each clause explaining what it means
   and who is responsible, in everyday English (shown in the editor; can be hidden in
   the final print version).

## Multilingual support (English + Marathi)
Contracts can be generated/edited in **English** or **Marathi** (more languages later).
- Each clause has language-keyed text + plain-words gloss: `body.en`, `body.mr`,
  `plain.en`, `plain.mr`. `clause_id` stays language-independent (so versions,
  redlines, and agent messages work identically across languages).
- **Authoring flow:** clauses are authored/maintained in English; Marathi is produced
  by the Drafting/Revision agent (legal-aware, plain-language translation) and is
  editable by the merchant. Variables (names, INR amounts, dates) are shared, not
  re-translated.
- **Rendering:** Marathi is Devanagari — DOCX generation must embed a Unicode
  Devanagari font (e.g., Noto Sans Devanagari / Nirmala UI) so it prints correctly.
- **Governing-language clause (important):** a bilingual contract needs to state which
  language prevails if the two versions differ. **Default: English is the governing
  language; Marathi is provided for understanding/convenience.** Added as a standard
  clause `governing_language`. (Flip to Marathi-governing per merchant if required.)
- UC2 redline proposals are shown in the merchant's chosen language; the underlying
  `clause_id` mapping is unchanged.

## Data availability legend (UC2)
Based on the merchant's actual performance file (item-level **sales & returns**
analytics), signals are tagged:
- **✓ data-backed now** — measurable from the current spreadsheet → UC2 can auto-flag.
- **◑ not yet measurable** — clause stays in the contract for completeness, but UC2
  flags it only once delivery/logistics data is added later.

---

## Section A — Carried over from template

| clause_id | Title | Key variables | UC2 signal that flags it |
|-----------|-------|---------------|--------------------------|
| `parties` | Parties & Recitals | supplier/vendor names, registered offices, date | — |
| `definitions` | Definitions | website URL | — |
| `interpretation` | Interpretation | — | — |
| `basis_of_purchase` | Basis of Purchase | order-rejection window (3 business days) | order acceptance delays |
| `images_advertising` | Images & Advertising | — | — |
| `price_fees` | Price, Fees & Charges | price-list validity period | unilateral price changes |
| `payment` | Payment | invoice cycle, payment days | late-payment / disputes |
| `delivery` | Delivery | delivery window | ◑ on-time %, avg delay days |
| `quality` | Quality | QC procedures | ✓ **RTM units/$, returns driven by defects** |
| `returns` | Returned Products | return-day windows | ✓ **return rate (Return $ %)** |
| `dispute_resolution` | Dispute Resolution | governing law, arbitration seat | — |
| `governing_language` | Governing Language | which language prevails (default English) | — |

## Section B — Merchant-specified key clauses (new)

| clause_id | Title | Default terms | UC2 signal that flags it |
|-----------|-------|---------------|--------------------------|
| `fulfilment_sla` | Order Fulfilment & SLA | Supplier ships within **24–48h** and uploads tracking numbers | ◑ ship-time SLA breach %, missing tracking % |
| `pricing_payments` | Pricing & Payments | wholesale cost, dropship fees, payment method (wallet deposit / **Net-30**) | ✓ **sales trend (Sales $ Var), Order Amt** |
| `returns_warranties` | Returns & Warranties | who handles returns, return shipping cost, restocking fees | ✓ **return rate, return-vs-peer-benchmark (ASRT/PG GAP)** |
| `inventory_feeds` | Inventory Feeds | stock synced via **daily CSV / EDI** to prevent overselling | ◑ oversell incidents, stockout rate, feed staleness |
| `damaged_lost_goods` | Damaged or Lost Goods | financial responsibility for in-transit loss/damage | ◑ lost-in-transit %, damaged-on-arrival % |

---

## India localization (applies across clauses)

- Governing framework: **Indian Contract Act, 1872**.
- Currency **INR**; **GST** handling + party **PAN/GSTIN** captured in `parties`.
- **Stamp duty**: `parties`/execution block flags state-specific stamping requirement.
- Dispute resolution seat under **Arbitration & Conciliation Act, 1996**; default seat = merchant's city.
- Every generated document carries an **"assistive tool — not legal advice"** notice + merchant attestation at the print/confirm gate.

## Key UC2 worked example (returns/quality — data-backed)
The merchant's file shows `Return $ %` and how it compares to the **peer-group
benchmark** (`Return $ % Variance ... (bps)`, `Returns $ GAP (ASRT/PG)`). If the
Performance Analysis Agent finds a supplier's return rate is materially **worse than
its peer group**, plus elevated **RTM** (returns-to-merchant) units/$, the Redline
Agent proposes, in plain language:
- `returns_warranties` — shift **return shipping + restocking cost** to the Supplier
  when returns exceed the agreed benchmark; add a **return-rate cap** with a credit/
  rebate if breached.
- `quality` — tighten **inspection/quality obligations** and add a remediation
  milestone when defect-driven returns rise.
- `pricing_payments` / renewal term — if sales are declining (`Sales $ Var` negative),
  shorten the renewal term or renegotiate fees.

> Future (◑, once delivery data is added): make delivery **time of the essence** and
> add ship-time penalties in `fulfilment_sla` / `delivery`.
