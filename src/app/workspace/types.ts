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

  notes?: string | null;

  currency?: string | null;
  total_cost: number | null;
  financing_amount: number | null;

  status: ProjectStatus;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LoanRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;

  project_id: string;

  // Base: loans.loan_type (NOT NULL)
  loan_type: string;

  // Base: facility_type existe mais nullable -> optionnel
  facility_type?: string | null;

  amount: number;
  currency: string;

  // Base: maturity_months / tenor_months / grace_period_months existent (nullable)
  maturity_months?: number | null;
  tenor_months?: number | null;
  grace_period_months?: number | null;

  // ✅ FIX: Base = rate (pricing n’existe pas)
  rate?: number | null;

  status?: LoanStatus | null;
  notes?: string | null;
};

export type EvaluationRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;

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
