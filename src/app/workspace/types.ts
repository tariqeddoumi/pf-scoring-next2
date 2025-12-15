export type ClientRow = {
  id: string;
  name: string;
  radical: string;
  segment: string | null;
  status: "Actif" | "Archivé";
  notes?: string | null;
  created_at?: string;
};

export type ProjectRow = {
  id: string;
  client_id: string;
  project_code: string;
  name: string;
  city: string | null;
  project_type: string | null;
  total_cost: number | null;
  financing_amount: number | null;
  currency: string | null;
  status: "Actif" | "Archivé";
  created_at?: string;
};
