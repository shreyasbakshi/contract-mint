"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Contract, Language } from "@/lib/api";

export default function ContractPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("en");
  const [versionNo, setVersionNo] = useState<number>(0); // 0 = latest
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const c = await api.getContract(id);
      setContract(c);
      setVersionNo(c.current_version);
    } catch (e: any) {
      setError(e.message || "Could not load contract");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const version = useMemo(() => {
    if (!contract) return null;
    return (
      contract.versions.find((v) => v.version === versionNo) ||
      contract.versions[contract.versions.length - 1] ||
      null
    );
  }, [contract, versionNo]);

  const changedIds = useMemo(
    () => new Set((version?.changes || []).map((c) => c.clause_id)),
    [version],
  );

  async function applyRevision(source: "typed" | "voice") {
    if (!instruction.trim() || !contract) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.revise(contract.contract_id, instruction, source, lang);
      setContract(updated);
      setVersionNo(updated.current_version);
      setInstruction("");
    } catch (e: any) {
      setError(e.message || "Revision failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Voice input via the browser Web Speech API ──────────────────────────────
  function toggleMic() {
    const SR =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      setError("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = lang === "mr" ? "mr-IN" : "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInstruction((finalText + interim).trim());
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    setRecording(true);
    rec.start();
  }

  if (error && !contract)
    return (
      <>
        <p><Link href="/">← All contracts</Link></p>
        <div className="error">{error}</div>
      </>
    );
  if (!contract || !version) return <div className="empty">Loading…</div>;

  const hasMarathi = version.clauses.some((c) => c.body["mr"]);

  return (
    <>
      <p><Link href="/">← All contracts</Link></p>
      <h1>{contract.title}</h1>
      <p className="subtle">
        {contract.contract_id} · {contract.context.supplier.name || "Supplier"} ↔{" "}
        {contract.context.vendor.name || "Vendor"} · seat: {contract.context.governing_city}
      </p>

      <div className="toolbar">
        <div className="seg">
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
          <button
            className={lang === "mr" ? "active" : ""}
            onClick={() => setLang("mr")}
            disabled={!hasMarathi}
            title={hasMarathi ? "" : "No Marathi version on this contract"}
          >
            मराठी
          </button>
        </div>

        <label style={{ margin: 0 }}>Version</label>
        <select
          style={{ width: "auto" }}
          value={versionNo}
          onChange={(e) => setVersionNo(Number(e.target.value))}
        >
          {contract.versions.map((v) => (
            <option key={v.version} value={v.version}>
              v{v.version} {v.version === contract.current_version ? "(latest)" : ""}
            </option>
          ))}
        </select>

        <span className="spacer" />
        <a className="btn secondary" href={api.documentUrl(contract.contract_id, lang, version.version)}>
          ⬇ Download DOCX
        </a>
      </div>

      {version.changes.length > 0 && (
        <div className="card" style={{ borderColor: "var(--accent-soft)" }}>
          <strong>What changed in v{version.version}</strong>
          {version.changes.map((ch, i) => (
            <div key={i} className="subtle" style={{ marginTop: 6 }}>
              <span className="badge">{ch.clause_id}</span> {ch.rationale}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {version.clauses.map((c, i) => {
          const body = c.body[lang] || c.body["en"] || "";
          const plain = c.plain[lang] || c.plain["en"] || "";
          const changed = changedIds.has(c.clause_id);
          return (
            <div key={c.clause_id} className={`clause ${changed ? "changed" : ""}`}>
              <h3>
                <span className="num">{i + 1}. </span>
                {c.title}
                {changed && <span className="badge">revised</span>}
              </h3>
              <div className="body">{body}</div>
              {plain && <div className="plain">In plain words: {plain}</div>}
            </div>
          );
        })}
      </div>

      <h2>Revise this contract</h2>
      <div className="card">
        <p className="subtle" style={{ marginTop: 0 }}>
          Describe the change in plain language — type it, or use the mic. Example:
          &ldquo;make the late-delivery penalty stricter&rdquo; or &ldquo;shift restocking cost to the supplier&rdquo;.
        </p>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Type your revision instruction…"
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className={`btn mic ${recording ? "recording" : "secondary"}`}
            onClick={toggleMic}
          >
            {recording ? "● Listening… (tap to stop)" : "🎤 Speak instruction"}
          </button>
          <button className="btn" onClick={() => applyRevision("typed")} disabled={busy || !instruction.trim()}>
            {busy ? "Revising…" : "Apply revision"}
          </button>
          <span className="spacer" />
          <span className="notice">Each revision creates a new version. Assistive, not legal advice.</span>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    </>
  );
}
