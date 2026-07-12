# The smartest AI agent is the one you keep on a short leash

*Building Contract Mint taught me that trust beats autonomy — especially when someone's about to sign their name.*

---

If you run a small shop in India, you sign supplier agreements constantly — and you sign them blind. A lawyer costs more than the deal is worth, so you use a template a cousin sent on WhatsApp. Months later the supplier ships late, returns pile up, and you discover your contract has no teeth. Then it quietly renews, and you miss the two-week window to renegotiate — right when a year of the supplier's performance data was sitting in your inbox.

That's the gap **Contract Mint** fills. It does two things: **generate** a supplier contract in plain, Indian-law-aware language, and **renew intelligently** — read the supplier's real performance data and propose specific, evidence-backed clause changes before you re-sign.

## Why I didn't build a swarm of agents

The fashionable approach in 2026 is a dozen autonomous agents messaging each other and "figuring it out." I went the opposite way, and that choice is the whole point.

**Contracts are a legal-liability product.** When an AI writes a clause that ends up in a signed agreement, "the model decided to" is not an acceptable answer. You need to know which step produced which words, and why. So Contract Mint is deliberately boring: **a single agent plus tools, orchestrated by plain code, with a human at every gate.**

Three choices carry it:

**1. Deterministic backbone, LLM only for the open-ended parts.** Every contract starts as a fixed, template-built set of clauses filled from your inputs — the structure is never hallucinated. Claude is used only where judgment is needed: applying a free-text instruction, translating to Marathi, turning breaches into proportionate redlines. The skeleton is auditable; only the muscle is generative.

**2. Structured output, not free text.** Every model call returns JSON against a fixed schema — a changed clause, its plain-language gloss, and a rationale. That rationale field is the paper trail.

**3. Gates are structural, not suggestions.** At renewal, the system produces *findings* from the supplier's data but can't touch your contract with them. Only after you tick the findings you agree with does the redline step accept them — enforced by the shape of the API, not by asking the model nicely. And every edit is tracked: old text, new text, reason. A contract is a version history, never a silent overwrite.

## The renewal part is the real magic

Anyone can generate a document. The interesting job is the second one. Contract Mint ingests a supplier's messy performance spreadsheet — ₹ signs, lakh grouping, peer benchmarks — and finds where they're failing: return rates above benchmark, quality gaps, declining sales. It maps each failure to the *specific clause* that should change and writes the edit in plain words. Supplier defaulting on delivery? Add "time is of the essence," penalties, return-cost accountability. It even flags what it *can't* yet judge instead of bluffing. You walk into the renewal with a redline already written and already justified by data.

## The lesson

The industry keeps reaching for more autonomy. Building something people can *trust with a signature* pushed me the other way: **less autonomy, more structure.** Ground the model in deterministic scaffolding, make it emit typed and explainable output, put a human at every irreversible step, and let it degrade gracefully (Contract Mint runs fully even with no API key). What you lose in "wow, it's autonomous," you gain in something a business owner actually needs: a system whose every decision you can see, question, and undo.

Sometimes the smartest agent is the one you kept on a short leash.

---

*Contract Mint is an early-stage project. If you build for SMBs, work in legal tech, or care about pragmatic AI, I'd love to hear how you'd push it further.*
