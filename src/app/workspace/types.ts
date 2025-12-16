// src/app/workspace/types.ts

export type ClientStatus = "active" | "archived";
export type ProjectStatus = "draft" | "validated" | "archived";

export type ClientRow = {
  id: string;
  name: string;
  radical: string | null;
  segment: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  city: string | null;
  type: string | null;      // ✅ AJOUT
  status: ProjectStatus;
  notes: string | null;     // ✅ AJOUT
  project_code?: string | null;
  total_cost?: number | null;
  financing_amount?: number | null;
  created_at?: string;
  updated_at?: string;
};
