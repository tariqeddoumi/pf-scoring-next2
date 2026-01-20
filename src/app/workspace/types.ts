// src/app/workspace/types.ts

export type ClientStatus = "Actif" | "Archivé";
export type ProjectStatus = "draft" | "validated" | "archived";
export type EvaluationStatus = "draft" | "validated" | "archived";
export type LoanStatus = "draft" | "validated" | "archived";

export type ClientRow = {
  id: string;
  created_at?: string;
  updated_at?: string;

  name: string;
  radical?: string;
  segment?: string;
  status: ClientStatus;
  notes?: string;
};

export type ProjectRow = {
  id: string;
  client_id: string;

  project_code: string | null;
  name: string | null;
  city: string | null;
  project_type: string | null;

  notes?: string;

  currency?: string | null;
  total_cost: number | null;
  financing_amount: number | null;

  status: "draft" | "validated" | "archived";
  created_at?: string;
  updated_at?: string;
};

export type LoanRow = {
  id: string;
  created_at?: string;
  updated_at?: string;

  project_id: string;

  facility_type: string; // requis
  amount?: number | null;
  currency?: string | null;
  tenor_months?: number | null;

  // ✅ colonne réelle dans la base: loans.rate
  rate?: number | null;

  status: LoanStatus;
  notes?: string | null;
};

export type EvaluationRow = {
  id: string;
  created_at?: string;
  updated_at?: string;

  project_id: string;
  status: EvaluationStatus;

  total_score?: number | null;
  payload?: unknown | null;
};

export type ScoringOption = {
  id: string;
  label: string;
  score: number;
};

export type ScoringCriterion = {
  id: string;
  label: string;
  weight?: number;
  options: ScoringOption[];
};

export type ScoringDomain = {
  id: string;
  label: string;
  weight?: number;
  criteria: ScoringCriterion[];
};

export type ScoringTemplate = {
  version: string;
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
