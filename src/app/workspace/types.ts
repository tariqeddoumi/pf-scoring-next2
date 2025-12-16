// src/app/workspace/types.ts

export type ClientStatus = "Actif" | "Archivé";
export type ProjectStatus = "draft" | "validated" | "archived"; // garde ça simple pour l'instant
export type LoanStatus = "draft" | "validated" | "archived";

export type ClientRow = {
  id: string;
  created_at?: string;

  name: string;
  radical?: string;   // en DB: nullable -> on garde optional
  segment?: string;
  status: ClientStatus;

  notes?: string;
};

export type ProjectRow = {
  id: string;
  created_at?: string;

  client_id: string;

  name: string;
  project_code?: string;

  city?: string;

  // IMPORTANT: on standardise sur project_type (pas "type")
  project_type?: string;

  status: ProjectStatus;
  notes?: string;

  // si tu as ces champs en base ils s’afficheront, sinon ignore
  total_cost?: number;
  financing_amount?: number;
};

export type LoanRow = {
  id: string;
  created_at?: string;

  project_id: string;

  facility_type?: string;
  currency?: string;
  amount?: number;
  tenor_months?: number;
  rate?: number;
  status?: LoanStatus;
  notes?: string;
};

export type EvaluationRow = {
  id: string;
  created_at?: string;

  project_id: string;

  status?: "draft" | "validated" | "archived";
  total_score?: number;

  // structure libre (JSON) pour dimensions / réponses
  payload?: any;
};
