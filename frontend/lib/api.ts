// API client for the Contract Mint backend.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export type Language = "en" | "mr";

export interface Party {
  name: string;
  registered_office: string;
  gstin?: string | null;
  pan?: string | null;
}

export interface ContractContext {
  supplier: Party;
  vendor: Party;
  products: string;
  ship_window_hours: number;
  payment_terms: string;
  return_days: number;
  governing_city: string;
  governing_language: Language;
  languages: Language[];
  renewal_date?: string | null;
  extra_instructions: string;
}

export type Severity = "high" | "medium" | "low";

export interface Finding {
  id: string;
  metric: string;
  title: string;
  observed: string;
  benchmark: string;
  severity: Severity;
  evidence: string;
  maps_to_clauses: string[];
  suggested_action: string;
}

export interface PerfSummary {
  supplier_label: string;
  rows: number;
  columns_detected: string[];
  sales_current?: number | null;
  sales_previous?: number | null;
  return_rate_current?: number | null;
  return_rate_previous?: number | null;
  rollup_score: number;
}

export type VerdictKind = "renew" | "tighten" | "scrap";

export interface Verdict {
  kind: VerdictKind;
  label: string;
  score: number;
  headline: string;
  rationale: string;
  recommended_term: string;
  recommended_actions: string[];
}

export interface AnalysisResult {
  summary: PerfSummary;
  verdict: Verdict;
  findings: Finding[];
}

export interface PortfolioSupplier {
  supplier_id: string;
  name: string;
  email: string;
  score: number;
  renewal_date?: string | null;
  days_to_renewal?: number | null;
  verdict: Verdict;
}

export interface PortfolioResult {
  suppliers: PortfolioSupplier[];
  counts: Record<VerdictKind, number>;
  columns_detected: string[];
}

export interface ClauseInstance {
  clause_id: string;
  title: string;
  body: Record<string, string>;
  plain: Record<string, string>;
}

export interface ClauseChange {
  clause_id: string;
  old: string;
  new: string;
  rationale: string;
  source: string;
}

export interface ContractVersion {
  version: number;
  clauses: ClauseInstance[];
  changes: ClauseChange[];
  docx_uri?: string | null;
  created_at: string;
  created_by: string;
}

export interface Contract {
  contract_id: string;
  tenant_id: string;
  title: string;
  context: ContractContext;
  current_version: number;
  versions: ContractVersion[];
  created_at: string;
}

export interface ContractSummary {
  contract_id: string;
  title: string;
  current_version: number;
  created_at: string;
  renewal_date?: string | null;
  days_to_renewal?: number | null;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async health() {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    return jsonOrThrow<{ status: string; llm_enabled: boolean }>(res);
  },

  async listContracts() {
    const res = await fetch(`${API_BASE}/uc1/contracts`, { cache: "no-store" });
    return jsonOrThrow<ContractSummary[]>(res);
  },

  async getContract(id: string) {
    const res = await fetch(`${API_BASE}/uc1/contracts/${id}`, {
      cache: "no-store",
    });
    return jsonOrThrow<Contract>(res);
  },

  async generate(title: string, context: ContractContext) {
    const res = await fetch(`${API_BASE}/uc1/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, context }),
    });
    return jsonOrThrow<Contract>(res);
  },

  async revise(
    id: string,
    instruction: string,
    source: "typed" | "voice" | "editor",
    language: Language,
  ) {
    const res = await fetch(`${API_BASE}/uc1/contracts/${id}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction, source, language }),
    });
    return jsonOrThrow<Contract>(res);
  },

  documentUrl(id: string, language: Language, version = 0) {
    return `${API_BASE}/uc1/contracts/${id}/document?language=${language}&version=${version}`;
  },

  // ── UC2 ──────────────────────────────────────────────────────────────────
  async renewals(withinDays = 14) {
    const res = await fetch(`${API_BASE}/uc2/renewals?within_days=${withinDays}`, {
      cache: "no-store",
    });
    return jsonOrThrow<ContractSummary[]>(res);
  },

  async analyzePerformance(file: File, supplierLabel: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("supplier_label", supplierLabel);
    const res = await fetch(`${API_BASE}/uc2/analyze`, { method: "POST", body: form });
    return jsonOrThrow<AnalysisResult>(res);
  },

  async analyzePortfolio(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/uc2/portfolio`, { method: "POST", body: form });
    return jsonOrThrow<PortfolioResult>(res);
  },

  async redline(id: string, findings: Finding[], language: Language) {
    const res = await fetch(`${API_BASE}/uc2/contracts/${id}/redline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findings, language }),
    });
    return jsonOrThrow<Contract>(res);
  },
};
