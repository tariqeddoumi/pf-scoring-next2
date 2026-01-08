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
  client_id: string;

  project_code: string | null;
  name: string | null;
  city: string | null;
  project_type: string | null;

  // ✅ AJOUT
  notes?: string | null;

  currency?: string | null;
  total_cost: number | null;
  financing_amount: number | null;

  status: "draft" | "validated" | "archived";
  created_at?: string | null;
  updated_at?: string | null;
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

export type ScoringOption = {
  id: string;
  label: string;
  score: number;
};

export type ScoringCriterion = {
  id: string;
  label: string;
  weight?: number; // optionnel
  options: ScoringOption[];
};

export type ScoringDomain = {
  id: string;
  label: string;
  weight?: number; // optionnel
  criteria: ScoringCriterion[];
};

export type ScoringTemplate = {
  version: string; // ex: "v1.0"
  domains: ScoringDomain[];
};

export type ScoreAnswer = {
  domainId: string;
  criterionId: string;
  optionId: string;
  score: number;
};

export type ScoreDetails = {
  templateVersion: string;
  answers: ScoreAnswer[];
};
