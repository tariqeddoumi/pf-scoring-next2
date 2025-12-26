// src/app/workspace/types.ts

export type ClientStatus = "Actif" | "Archivé";
export type ProjectStatus = "draft" | "validated" | "archived";
export type EvaluationStatus = "draft" | "validated" | "archived";
export type LoanStatus = "draft" | "validated" | "archived";

export type ClientRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;

  name: string;
  radical?: string | null;
  segment?: string | null;
  status: ClientStatus;
  notes?: string | null;
};

export type ProjectRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;

  client_id: string;

  name: string;
  project_code?: string | null;      // ✅ utilisé dans SummaryPanel + page badges
  project_type?: string | null;      // ✅ utilisé dans SummaryPanel
  city?: string | null;

  total_cost?: number | null;
  financing_amount?: number | null;

  status: ProjectStatus;
  notes?: string | null;
};

export type LoanRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;

  project_id: string;

  facility_type: string;             // ✅ requis
  amount?: number | null;
  currency?: string | null;
  tenor_months?: number | null;
  pricing?: number | null;

  status: LoanStatus;
  notes?: string | null;
};

export type EvaluationRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;

  project_id: string;
  status: EvaluationStatus;

  total_score?: number | null;
  payload?: unknown | null;          // ✅ pas de any
};
