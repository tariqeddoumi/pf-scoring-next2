"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import CreditFormModal, { Loan } from "./CreditFormModal";
import type { Project } from "../page";

type Props = {
  project: Project;
  onCreditsChanged?: () => void;
};

// On enrichit Loan avec un id obligatoire pour ce composant
type DbLoan = Loan & { id: number };

export default function CreditTable({ project, onCreditsChanged }: Props) {
  const [loans, setLoans] = useState<DbLoan[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DbLoan | null>(null);

  const loadLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_loans") // ⚠️ adapte le nom si ta table s'appelle autrement
      .select(
        "id, facility_type, amount, currency, maturity_months, margin_bps, comments"
      )
      .eq("project_id", project.id)
      .order("id", { ascending: true });

    setLoading(false);

    if (error) {
      console.error(error);
      return;
    }
    setLoans((data || []) as DbLoan[]);
  };

  useEffect(() => {
    loadLoans();
  }, [project.id]);

  const handleNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (loan: DbLoan) => {
    setEditing(loan);
    setOpen(true);
  };

  const handleSaved = async () => {
    await loadLoans();
    onCreditsChanged?.();
  };

  const handleDelete = async (loan: DbLoan) => {
    if (!confirm("Supprimer ce crédit ?")) return;

    const { error } = await supabase
      .from("project_loans") // ⚠️ même remarque : adapte si besoin
      .delete()
      .eq("id", loan.id);

    if (error) {
      alert("Erreur suppression : " + error.message);
      return;
    }

    await loadLoans();
    onCreditsChanged?.();
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium">Crédits & financements du projet</div>
        <Button size="sm" onClick={handleNew}>
          + Ajouter un crédit
        </Button>
      </div>

      <CardContent className="p-0">
        {loading && (
          <p className="text-[11px] text-slate-500">Chargement des crédits…</p>
        )}

        {!loading && loans.length === 0 && (
          <p className="text-[11px] text-slate-500">
            Aucun crédit enregistré pour ce projet.
          </p>
        )}

        {!loading && loans.length > 0 && (
          <Table className="mt-2">
            <TableHeader>
              <TableRow>
                <TableHead>Type de facilité</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead>Maturité (mois)</TableHead>
                <TableHead>Marge (bps)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.facility_type}</TableCell>
                  <TableCell>{loan.amount?.toLocaleString("fr-MA")}</TableCell>
                  <TableCell>{loan.currency}</TableCell>
                  <TableCell>
                    {loan.maturity_months != null ? loan.maturity_months : "-"}
                  </TableCell>
                  <TableCell>
                    {loan.margin_bps != null ? loan.margin_bps : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(loan)}
                      >
                        Éditer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(loan)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CreditFormModal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        projectId={String(project.id)}
        loan={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
