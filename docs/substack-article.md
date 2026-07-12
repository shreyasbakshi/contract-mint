# Giving India's small merchants a legal team that fits in a browser tab

*How I built Contract Mint — an AI that drafts supplier contracts and knows when to renegotiate them — with a team of agents I kept on a short leash.*

> **TL;DR** — India's small merchants sign supplier contracts blind and miss renewal windows worth real money. Contract Mint drafts those contracts in plain, India-law-aware language, and at renewal it reads the supplier's *actual performance data* to propose evidence-backed clause changes before you re-sign. The surprising part isn't the AI — it's how little autonomy I gave it. Here's why "less autonomous" is the right call when people are about to sign their name.

---

## The problem nobody sends you an invoice for

If you run a small shop in India — a drop-shipper, a 20-person retailer — you sign supplier agreements constantly. And you sign them blind.

A lawyer costs more than the deal is worth. So you use a template a cousin sent on WhatsApp, or you sign whatever the supplier's PDF says. Then, months later, the supplier ships late, returns pile up, quality slips — and you discover your contract has no teeth. No penalty clause. No "time is of the essence." Nothing you can point to.

Worse: the contract quietly renews. You had a two-week window to renegotiate from a position of strength — right when you had a year of the supplier's performance data in hand — and you missed it, because nobody was watching the calendar.

That's the gap **Contract Mint** fills. Two jobs:

1. **Generate** a supplier contract from plain inputs — in language a non-lawyer actually understands, framed for Indian law (Contract Act 1872, GST, the Arbitration Act).
2. **Renew intelligently** — watch for expiries, read the supplier's real performance data, and propose *specific clause changes* backed by evidence before you re-sign.

## The temptation: an autonomous swarm

Contract Mint *is* a multi-agent system. There's a **Drafting Agent**, a **Revision Agent**, a **Redline Agent**, plus a Renewal Monitor and a Performance Analysis step. Each is a specialist with one narrow job.

What I deliberately *didn't* build is the fashionable version: a swarm of **autonomous** agents that message each other, decide their own next steps, and "figure it out" in free text — a Drafting Agent chatting to an Orchestrator Agent chatting to a Redline Agent, unsupervised. And the reason is the most useful thing in this whole post.

**Contracts are a legal-liability product.** When an AI writes a clause that ends up in a signed agreement, "the agents decided to" is not an acceptable answer. You need to know *which step produced which words, and why.* Agents improvising and negotiating amongst themselves in free text are the opposite of that.

So Contract Mint keeps its agents on rails: **multiple specialized agents, but orchestrated by plain code — not by each other — with humans in the loop at every gate.**

## What it actually looks like

The agents don't talk to each other and nothing decides its own control flow. There's no message bus and no *autonomous* orchestrator — the API routes are the orchestrator, calling each agent in a fixed, auditable sequence. Each agent is a specialized function with its own prompt and output schema; everything around them is deterministic code.

```
  Merchant → Next.js (Vercel) → FastAPI routes → tools
                                        │
              ┌─────────────────────────┼─────────────────────────┐
        deterministic              3 specialized agents      deterministic
        clause templates    drafting · revision · redline    performance analysis
                                        │
                          ┌─────────────┴─────────────┐
                          │   one LLM wrapper          │
                          │   Opus 4.8  → reasoning    │
                          │   Sonnet 5  → drafting      │
                          │   no key    → offline mode  │
                          └────────────────────────────┘
```

*(For Substack: upload [`docs/images/architecture-simple.png`](images/architecture-simple.png) here — a plain-English block diagram showing the agents grouped by use case, with a human approving every step. Use the more technical [`agent-architecture.png`](images/agent-architecture.png) only if your audience is engineers.)*

Three design choices do all the heavy lifting:

**1. Deterministic backbone, LLM only for the open-ended parts.**
Every contract starts as a fixed, template-built set of clauses filled from your inputs. The *structure* is never hallucinated. Claude is used only where judgment is genuinely needed — applying a free-text instruction ("make the delivery penalty stricter"), translating to Marathi, or turning performance breaches into proportionate redlines. The skeleton is auditable; only the muscle is generative.

**2. Structured output, not free text.**
Every model call returns JSON against a fixed schema — a changed clause, its plain-language gloss, and a rationale. No prompt-scraping, no "hope it parses." That rationale field matters: it's the paper trail.

**3. Human gates are structural, not suggestions.**
In the renewal flow, the system analyzes the supplier's data and produces *findings*. It cannot touch your contract with them. Only after you tick the findings you agree with does the redline endpoint accept them. The gate is enforced by the shape of the API, not by asking the model nicely.

And every edit is tracked — old text, new text, reason, source — so a contract is a version history, never a silent overwrite.

## The renewal part is the real magic

Anyone can generate a document. The interesting use case is the second one.

Contract Mint ingests a supplier's actual performance spreadsheet — messy, real-world data with ₹ signs, Indian lakh grouping, peer benchmarks — and computes where the supplier is failing: return rates above the peer benchmark, quality gaps, sales decline. It rolls those into a health score.

Then it maps each failure to the *specific clause* that should change, and proposes the edit in plain words. Supplier defaulting on delivery? Add "time is of the essence," penalties, and return-cost accountability. It even flags clauses it *can't* yet judge ("delivery SLA — not yet measurable, no logistics data") instead of bluffing.

You walk into the renewal with a redline that's already written and already justified by the data.

## The un-sexy engineering that makes it real

- **Graceful offline mode.** No API key? Every LLM call falls back to deterministic logic. The product runs, demos, and ships without depending on a model being reachable. The model makes it *better*, not *possible*.
- **It runs where the code should run.** The Next.js frontend and Clerk auth live on Vercel (serverless, auto-deploy on push). The stateful FastAPI backend lives on a persistent host — because a serverless function that forgets your contract between requests is worse than useless. Matching each part to the right runtime is half the battle.
- **Built for India from clause one.** English + Marathi, Indian statutes, GST and INR, plain-language glosses so a merchant — not a lawyer — is the reader.

## The lesson I'd bottle

The industry keeps reaching for more autonomy. Building something people can *trust with a signature* pushed me the other way: **less autonomy, more structure.**

Ground the model in deterministic scaffolding. Make it emit typed, explainable output. Put a human at every irreversible step. Let it degrade gracefully. What you lose in "wow, it's fully autonomous" you gain in something a small business owner actually needs: a system whose every decision you can see, question, and undo.

Sometimes the smartest agent is the one you kept on a short leash.

---

*Contract Mint is an early-stage project. If you build for SMBs, work in legal tech, or just care about pragmatic AI — I'd love to hear how you'd push it further.*
