export type ClientStatus = "active" | "archived";

export type ClientRow = {
  id: string;
  radical: string;
  name: string;
  segment?: string | null;
  status: ClientStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  project_type?: string | null;
  city?: string | null;
  total_cost?: number | null;
  financing_amount?: number | null;
  status?: "draft" | "validated" | "archived" | null;
  created_at?: string;
  updated_at?: string;
};
