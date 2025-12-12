"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CreditFormModal from "./CreditFormModal";
import type { Project } from "../page";

export type Loan = {
  id: string;
  project_id: string;
  facility_type: string;
  amount: number;
  maturity_months: number;
  rate: number;
};

type Props = {
  project: Project;
};

export default function CreditTable({ project }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);

  const fetchLoans = async () => {
    const { data } = await supabase
      .from("loans")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    setLoans((data || []) as Loan[]);
  };

  useEffect(() => {
    fetchLoans();
  }, [project.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crédits du projet</CardTitle>
      </CardHeader>

      <CardContent>
        <button
          className="px-3 py-1 rounded bg-slate-200 text-xs mb-2"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          + Ajouter un crédit
        </button>

        <table className="w-full text-xs border">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="p-1 border">Type</th>
              <th className="p-1 border">Montant</th>
              <th className="p-1 border">Maturité</th>
              <th className="p-1 border">Taux</th>
              <th className="p-1 border"></th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id}>
                <td className="border p-1">{loan.facility_type}</td>
                <td className="border p-1">{loan.amount.toLocaleString()}</td>
                <td className="border p-1">{loan.maturity_months} mois</td>
                <td className="border p-1">{loan.rate}%</td>
                <td className="border p-1">
                  <button
                    className="text-blue-600 underline"
                    onClick={() => {
                      setEditing(loan);
                      setOpen(true);
                    }}
                  >
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <CreditFormModal
          open={open}
          onOpenChange={setOpen}
          projectId={project.id}
          loan={editing}
          onSaved={fetchLoans}
        />
      </CardContent>
    </Card>
  );
}
