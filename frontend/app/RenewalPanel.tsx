"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnalysisResult, ContractSummary, Finding, api } from "@/lib/api";

function scoreColor(score: number) {
  if (score >= 75) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "#ff6b6b";
}

function verdictIcon(kind: "renew" | "tighten" | "scrap") {
  return kind === "renew" ? "✅" : kind === "tighten" ? "✍️" : "⛔";
}

function fmtMoney(v?: number | null) {
  if (v == null) return "—";
  return "₹" + Math.round(v).toLocaleString("en-IN");
}

export default function RenewalPanel({
  contracts,
  onRedlined,
}: {
  contracts: ContractSummary[];
  onRedlined: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [label, setLabel] = useState("Uploaded supplier");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  async function runAnalyze(file: File) {
    setBusy(true);
    setError(null);
    setDoneMsg(null);
    try {
      const res = await api.analyzePerformance(file, label);
      setAnalysis(res);
      setSelected(new Set(res.findings.map((f) => f.id)));
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    runAnalyze(f);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function applyRedline() {
    if (!analysis || !target) return;
    const chosen = analysis.findings.filter((f) => selected.has(f.id));
    if (chosen.length === 0) {
      setError("Select at least one finding to apply.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.redline(target, chosen, "en");
      setDoneMsg(
        `Applied ${chosen.length} finding(s) — ${updated.title} is now v${updated.current_version}.`,
      );
      onRedlined();
    } catch (e: any) {
      setError(e.message || "Redline failed");
    } finally {
      setBusy(false);
    }
  }

  const s = analysis?.summary;

  return (
    <div className="card">
      {/* Upload */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={onPick}
      />
      <div className="grid2">
        <div>
          <label>Supplier label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label>Performance file (CSV or Excel)</label>
          <div className="dropzone" onClick={() => fileRef.current?.click()}>
            {fileName ? `📄 ${fileName} — click to replace` : "Click to upload supplier performance (returns/sales)"}
          </div>
        </div>
      </div>
      {busy && !analysis && <p className="subtle">Analyzing…</p>}
      {error && <div className="error">{error}</div>}

      {/* Results */}
      {s && (
        <>
          <div className="row" style={{ marginTop: 18, alignItems: "center", gap: 18 }}>
            <div
              className="score-ring"
              style={
                {
                  ["--score" as any]: s.rollup_score,
                  ["--ring-color" as any]: scoreColor(s.rollup_score),
                } as React.CSSProperties
              }
            >
              <div className="inner">{s.rollup_score}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{s.supplier_label}</div>
              <div style={{ color: scoreColor(s.rollup_score), fontWeight: 600, fontSize: 13 }}>
                Supplier rating {s.rollup_score}/100
              </div>
              <div className="subtle">
                {s.rows.toLocaleString()} rows · sales {fmtMoney(s.sales_current)} (prev {fmtMoney(s.sales_previous)}) ·
                return rate {s.return_rate_current != null ? (s.return_rate_current * 100).toFixed(2) + "%" : "—"}
              </div>
            </div>
          </div>

          {/* Score-driven verdict: renew / tighten / scrap */}
          {analysis!.verdict && (
            <div className={`verdict ${analysis!.verdict.kind}`}>
              <div className="verdict-top">
                <span className="verdict-chip">
                  {verdictIcon(analysis!.verdict.kind)} {analysis!.verdict.label}
                </span>
                <span className="verdict-headline">{analysis!.verdict.headline}</span>
                <span className="verdict-term">{analysis!.verdict.recommended_term}</span>
              </div>
              <div className="verdict-rationale">{analysis!.verdict.rationale}</div>
              <ul className="verdict-actions">
                {analysis!.verdict.recommended_actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 15 }}>
            {analysis!.verdict?.kind === "scrap"
              ? "Evidence behind the exit recommendation"
              : "Findings — confirm what to act on"}
          </h3>
          {analysis!.findings.length === 0 && (
            <p className="subtle">No material issues detected. Supplier looks healthy.</p>
          )}
          {analysis!.findings.map((f: Finding) => (
            <div key={f.id} className="finding">
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={() => toggle(f.id)}
              />
              <div style={{ flex: 1 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="f-title">{f.title}</span>
                  <span className={`sev ${f.severity}`}>{f.severity}</span>
                </div>
                <div className="f-obs">{f.observed}</div>
                {f.evidence && <div className="subtle" style={{ fontSize: 12 }}>{f.evidence}</div>}
                <div className="f-action">→ {f.suggested_action}</div>
                <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>
                  affects: {f.maps_to_clauses.join(", ")}
                </div>
              </div>
            </div>
          ))}

          {/* Apply to a contract (gated) */}
          {analysis!.findings.length > 0 && (
            <div className="card" style={{ marginTop: 16, background: "rgba(79,124,255,0.06)" }}>
              <strong>
                {analysis!.verdict?.kind === "scrap"
                  ? "Bridge only if you must"
                  : "Validate & apply"}
              </strong>
              <p className="subtle" style={{ marginTop: 4 }}>
                {analysis!.verdict?.kind === "scrap"
                  ? "Recommendation is to exit. If you need to bridge to a replacement, you can still apply these as stop-gap redlines to a contract — but plan the non-renewal."
                  : "You confirmed these findings. Choose the contract to redline — this creates a new tracked version highlighting the changed clauses."}
              </p>
              <div className="row">
                <select
                  style={{ width: "auto", minWidth: 240 }}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">Select a contract…</option>
                  {contracts.map((c) => (
                    <option key={c.contract_id} value={c.contract_id}>
                      {c.title} (v{c.current_version})
                    </option>
                  ))}
                </select>
                <button className="btn" onClick={applyRedline} disabled={busy || !target}>
                  {busy ? "Applying…" : "Apply redline"}
                </button>
              </div>
              {contracts.length === 0 && (
                <p className="notice" style={{ marginTop: 8 }}>
                  No contracts yet — generate one above first.
                </p>
              )}
              {doneMsg && (
                <p style={{ color: "var(--good)", marginTop: 10 }}>
                  ✓ {doneMsg}{" "}
                  {target && <Link href={`/contracts/${target}`}>Open contract →</Link>}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
