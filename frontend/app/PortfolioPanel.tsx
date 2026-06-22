"use client";

import { useRef, useState } from "react";
import { PortfolioResult, PortfolioSupplier, VerdictKind, api } from "@/lib/api";

function ratingColor(score: number) {
  if (score >= 75) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "#ff6b6b";
}

function toCsv(rows: PortfolioSupplier[]): string {
  const header = [
    "supplier_id",
    "name",
    "email",
    "score",
    "verdict",
    "recommended_term",
    "renewal_date",
    "days_to_renewal",
    "headline",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.supplier_id,
      r.name,
      r.email,
      r.score,
      r.verdict.kind,
      r.verdict.recommended_term,
      r.renewal_date ?? "",
      r.days_to_renewal ?? "",
      r.verdict.headline,
    ]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export default function PortfolioPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.analyzePortfolio(f));
    } catch (err: any) {
      setError(err.message || "Could not analyze roster");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!result) return;
    const blob = new Blob([toCsv(result.suppliers)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "supplier-verdicts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = result?.counts ?? { renew: 0, tighten: 0, scrap: 0 };

  return (
    <div className="card">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={onPick}
      />

      <strong>Bulk roster — verdict for every supplier at once</strong>
      <p className="subtle" style={{ marginTop: 4 }}>
        Upload a supplier roster and get a renew / tighten / scrap call for each. Columns used:{" "}
        <code>supplier_id, name, email, renewal_date, performance_score (0–100)</code> — only{" "}
        <code>name</code> and <code>performance_score</code> are required.
      </p>
      <div className="dropzone" style={{ marginTop: 12 }} onClick={() => fileRef.current?.click()}>
        {fileName ? `📄 ${fileName} — click to replace` : "Click to upload supplier roster (CSV or Excel)"}
      </div>

      {busy && <p className="subtle" style={{ marginTop: 10 }}>Scoring suppliers…</p>}
      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="pcounts" style={{ marginTop: 18 }}>
            <div className="pcount renew">
              <div className="pc-v">{counts.renew}</div>
              <div className="pc-k">✅ Renew</div>
            </div>
            <div className="pcount tighten">
              <div className="pc-v">{counts.tighten}</div>
              <div className="pc-k">✍️ Tighten</div>
            </div>
            <div className="pcount scrap">
              <div className="pc-v">{counts.scrap}</div>
              <div className="pc-k">⛔ Scrap</div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span className="subtle">
              {result.suppliers.length} supplier(s) · sorted worst-first
            </span>
            <button className="btn secondary" onClick={exportCsv}>⬇ Export verdicts (CSV)</button>
          </div>

          <div className="ptable-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Rating</th>
                  <th>Verdict</th>
                  <th>Recommended term</th>
                  <th>Renewal</th>
                </tr>
              </thead>
              <tbody>
                {result.suppliers.map((s, i) => (
                  <tr key={s.supplier_id || s.name + i}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      {s.email && <div className="subtle" style={{ fontSize: 11 }}>{s.email}</div>}
                    </td>
                    <td>
                      <span className="rating" style={{ color: ratingColor(s.score) }}>
                        {s.score}
                        <span className="rating-bar">
                          <span style={{ width: `${s.score}%`, background: ratingColor(s.score) }} />
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={`pverdict ${s.verdict.kind}`}>{s.verdict.label}</span>
                    </td>
                    <td className="subtle">{s.verdict.recommended_term}</td>
                    <td className="subtle">
                      {s.renewal_date ?? "—"}
                      {s.days_to_renewal != null && (
                        <div style={{ fontSize: 11 }}>
                          {s.days_to_renewal < 0
                            ? `${Math.abs(s.days_to_renewal)}d overdue`
                            : `in ${s.days_to_renewal}d`}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
