"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ContractSummary } from "@/lib/api";
import RenewalPanel from "./RenewalPanel";
import PortfolioPanel from "./PortfolioPanel";

type Tab = "generate" | "renewal";
type RenewalMode = "single" | "portfolio";

export default function HomePage() {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [renewals, setRenewals] = useState<ContractSummary[]>([]);
  const [llm, setLlm] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("generate");
  const [renewalMode, setRenewalMode] = useState<RenewalMode>("single");

  const refresh = useCallback(async () => {
    try {
      const [list, due, health] = await Promise.all([
        api.listContracts(),
        api.renewals(14).catch(() => []),
        api.health().catch(() => null),
      ]);
      setContracts(list);
      setRenewals(due);
      setLlm(health ? health.llm_enabled : null);
    } catch (e: any) {
      setError(e.message || "Could not reach the backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <h1>Contracts and renewal intelligence, in one place.</h1>
        <p className="subtle">
          Draft an India-ready supplier agreement in plain language, then let supplier
          performance data tell you exactly which clauses to tighten at renewal — without
          a legal team for routine contracts.
        </p>
        <div className="kpis">
          <div className="kpi">
            <div className="v">{contracts.length}</div>
            <div className="k">contracts</div>
          </div>
          <div className="kpi">
            <div className="v" style={{ color: renewals.length ? "var(--warn)" : undefined }}>
              {renewals.length}
            </div>
            <div className="k">renewals ≤ 2 weeks</div>
          </div>
          <div className="kpi">
            <div className="v">{llm === null ? "—" : llm ? "Live" : "Offline"}</div>
            <div className="k">Claude</div>
          </div>
        </div>
      </section>

      {error && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="error">Backend error: {error}</div>
          <p className="subtle">Set <code>NEXT_PUBLIC_API_BASE</code> to your backend URL.</p>
        </div>
      )}

      {/* Earlier contracts banner */}
      <section className="contracts-banner">
        <div className="banner-head">
          <h2>Your contracts</h2>
          <span className="subtle">Pick up where you left off</span>
        </div>
        <div className="contract-strip">
          {loading ? (
            <div className="contract-card cc-empty">Loading…</div>
          ) : contracts.length === 0 ? (
            <div className="contract-card">
              <div className="cc-empty">
                No contracts yet.{" "}
                <Link href="/generate">Create your first one →</Link>
              </div>
            </div>
          ) : (
            contracts.map((c) => (
              <Link
                key={c.contract_id}
                href={`/contracts/${c.contract_id}`}
                className="contract-card"
              >
                <div className="cc-title">{c.title}</div>
                <div className="cc-meta">
                  {new Date(c.created_at).toLocaleDateString()}
                  {c.renewal_date ? ` · renews ${c.renewal_date}` : ""}
                </div>
                <div className="cc-foot">
                  <span className="pill">v{c.current_version}</span>
                  {c.days_to_renewal != null && c.days_to_renewal <= 14 && (
                    <span className="sev high">renews in {c.days_to_renewal}d</span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "generate"}
          className={`tab ${tab === "generate" ? "active" : ""}`}
          onClick={() => setTab("generate")}
        >
          <span className="tab-num">1</span>
          Generate &amp; manage
        </button>
        <button
          role="tab"
          aria-selected={tab === "renewal"}
          className={`tab ${tab === "renewal" ? "active" : ""}`}
          onClick={() => setTab("renewal")}
        >
          <span className="tab-num">2</span>
          Renewal intelligence
          {renewals.length > 0 && <span className="count">{renewals.length} due</span>}
        </button>
      </div>

      {/* Tab 1 — Generate / contracts */}
      {tab === "generate" && (
        <section className="section" role="tabpanel">
          <div className="section-head">
            <div>
              <h2>Generate &amp; manage contracts</h2>
              <div className="sub">Create a supplier agreement, review it, revise by text or voice.</div>
            </div>
            <span className="spacer" />
            <Link href="/generate" className="btn">+ New contract</Link>
          </div>

          {loading ? (
            <div className="empty">Loading…</div>
          ) : contracts.length === 0 ? (
            <div className="card empty">
              No contracts yet. <Link href="/generate">Create your first one →</Link>
            </div>
          ) : (
            contracts.map((c) => (
              <Link
                key={c.contract_id}
                href={`/contracts/${c.contract_id}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <div className="list-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div className="subtle">
                      {c.contract_id} · {new Date(c.created_at).toLocaleDateString()}
                      {c.renewal_date ? ` · renews ${c.renewal_date}` : ""}
                    </div>
                  </div>
                  <span className="pill">v{c.current_version}</span>
                </div>
              </Link>
            ))
          )}
        </section>
      )}

      {/* Tab 2 — Renewal intelligence */}
      {tab === "renewal" && (
        <section className="section" role="tabpanel">
          {renewals.length > 0 && (
            <div className="alert" style={{ marginBottom: 18 }}>
              <div className="alert-title">⏰ {renewals.length} contract(s) expiring within 2 weeks</div>
              {renewals.map((r) => (
                <div key={r.contract_id} className="subtle" style={{ marginTop: 4 }}>
                  <Link href={`/contracts/${r.contract_id}`}>{r.title}</Link> — renews{" "}
                  {r.renewal_date} ({r.days_to_renewal} days). Review supplier performance below
                  before renewing.
                </div>
              ))}
            </div>
          )}

          <div className="section-head">
            <div>
              <h2>Renewal intelligence from supplier performance</h2>
              <div className="sub">
                Score each supplier → get a renew / tighten / scrap call → act on it.
              </div>
            </div>
          </div>

          <div className="seg mode-toggle" role="tablist">
            <button
              className={renewalMode === "single" ? "active" : ""}
              onClick={() => setRenewalMode("single")}
            >
              Single supplier — deep analysis
            </button>
            <button
              className={renewalMode === "portfolio" ? "active" : ""}
              onClick={() => setRenewalMode("portfolio")}
            >
              Portfolio — all suppliers
            </button>
          </div>

          {renewalMode === "single" ? (
            <RenewalPanel contracts={contracts} onRedlined={refresh} />
          ) : (
            <PortfolioPanel />
          )}
        </section>
      )}
    </>
  );
}
