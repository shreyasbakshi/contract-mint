"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ContractContext, Language } from "@/lib/api";

const DEFAULT: ContractContext = {
  supplier: { name: "", registered_office: "", gstin: "" },
  vendor: { name: "", registered_office: "", gstin: "" },
  products: "",
  ship_window_hours: 48,
  payment_terms: "Net-30",
  return_days: 7,
  governing_city: "Mumbai",
  governing_language: "en",
  languages: ["en"],
  renewal_date: "",
  extra_instructions: "",
};

export default function GeneratePage() {
  const router = useRouter();
  const [title, setTitle] = useState("Supplier Agreement");
  const [ctx, setCtx] = useState<ContractContext>(DEFAULT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSupplier(k: string, v: string) {
    setCtx({ ...ctx, supplier: { ...ctx.supplier, [k]: v } });
  }
  function setVendor(k: string, v: string) {
    setCtx({ ...ctx, vendor: { ...ctx.vendor, [k]: v } });
  }
  function toggleMarathi(on: boolean) {
    setCtx({ ...ctx, languages: on ? ["en", "mr"] : ["en"] });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const contract = await api.generate(title, ctx);
      router.push(`/contracts/${contract.contract_id}`);
    } catch (e: any) {
      setError(e.message || "Generation failed");
      setBusy(false);
    }
  }

  return (
    <>
      <h1>New supplier contract</h1>
      <p className="subtle">
        Tell us about the deal. We&apos;ll draft a full India-ready agreement you can
        review and revise.
      </p>

      <div className="card">
        <label>Contract title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Supplier (ships the goods)</h2>
        <div className="grid2">
          <div>
            <label>Name</label>
            <input value={ctx.supplier.name} onChange={(e) => setSupplier("name", e.target.value)} />
          </div>
          <div>
            <label>Registered office (city)</label>
            <input value={ctx.supplier.registered_office} onChange={(e) => setSupplier("registered_office", e.target.value)} />
          </div>
          <div>
            <label>GSTIN</label>
            <input value={ctx.supplier.gstin || ""} onChange={(e) => setSupplier("gstin", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Vendor — you (take the orders)</h2>
        <div className="grid2">
          <div>
            <label>Name</label>
            <input value={ctx.vendor.name} onChange={(e) => setVendor("name", e.target.value)} />
          </div>
          <div>
            <label>Registered office (city)</label>
            <input value={ctx.vendor.registered_office} onChange={(e) => setVendor("registered_office", e.target.value)} />
          </div>
          <div>
            <label>GSTIN</label>
            <input value={ctx.vendor.gstin || ""} onChange={(e) => setVendor("gstin", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Deal terms</h2>
        <label>Products covered</label>
        <textarea value={ctx.products} onChange={(e) => setCtx({ ...ctx, products: e.target.value })} placeholder="e.g. Bathroom fittings and fixtures" />
        <div className="grid2">
          <div>
            <label>Ship within (hours)</label>
            <input type="number" value={ctx.ship_window_hours} onChange={(e) => setCtx({ ...ctx, ship_window_hours: Number(e.target.value) })} />
          </div>
          <div>
            <label>Payment terms</label>
            <input value={ctx.payment_terms} onChange={(e) => setCtx({ ...ctx, payment_terms: e.target.value })} />
          </div>
          <div>
            <label>Customer return window (days)</label>
            <input type="number" value={ctx.return_days} onChange={(e) => setCtx({ ...ctx, return_days: Number(e.target.value) })} />
          </div>
          <div>
            <label>Arbitration seat / city</label>
            <input value={ctx.governing_city} onChange={(e) => setCtx({ ...ctx, governing_city: e.target.value })} />
          </div>
          <div>
            <label>Renewal date (for expiry alerts)</label>
            <input type="date" value={ctx.renewal_date || ""} onChange={(e) => setCtx({ ...ctx, renewal_date: e.target.value })} />
          </div>
        </div>

        <div className="grid2">
          <div>
            <label>Governing language (prevails on conflict)</label>
            <select value={ctx.governing_language} onChange={(e) => setCtx({ ...ctx, governing_language: e.target.value as Language })}>
              <option value="en">English</option>
              <option value="mr">Marathi</option>
            </select>
          </div>
          <div>
            <label>Also produce Marathi version?</label>
            <select value={ctx.languages.includes("mr") ? "yes" : "no"} onChange={(e) => toggleMarathi(e.target.value === "yes")}>
              <option value="no">English only</option>
              <option value="yes">English + Marathi</option>
            </select>
          </div>
        </div>

        <label>Anything else to reflect? (optional)</label>
        <textarea value={ctx.extra_instructions} onChange={(e) => setCtx({ ...ctx, extra_instructions: e.target.value })} placeholder="e.g. Supplier must give 30 days notice before any price change" />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="toolbar" style={{ marginTop: 18 }}>
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? "Drafting…" : "Generate draft"}
        </button>
        <span className="notice">Generated documents are assistive, not legal advice.</span>
      </div>
    </>
  );
}
