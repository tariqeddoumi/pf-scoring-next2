export type ClientStatus = "Actif" | "Archivé";
export type ProjectStatus = "draft" | "validated" | "archived";

export type ClientRow = {
  id: string;
  name: string;
  radical?: string | null;
  segment?: string | null;
  status: ClientStatus;
  notes?: string | null;
  created_at?: string;
};

export type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  project_code?: string | null;

  city?: string | null;

  // Selon ta DB tu peux avoir l’un ou l’autre (ou renommer)
  type?: string | null;
  project_type?: string | null;

  status: ProjectStatus;

  notes?: string | null;

  total_cost?: number | null;
  financing_amount?: number | null;

  created_at?: string;
};

export type LoanStatus = "draft" | "validated" | "archived";

export type LoanRow = {
  id: string;
  project_id: string;
  facility_type?: string | null;
  amount?: number | null;
  currency?: string | null;
  tenor_months?: number | null;
  rate?: number | null;
  status?: LoanStatus | null;
  notes?: string | null;
  created_at?: string;
};
