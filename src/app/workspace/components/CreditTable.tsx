"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import CreditFormModal from "./CreditFormModal";
import type { Project } from "./ProjectList";

type Loan = {
  id: string;
  loan_type: string;
  amount: number;
  currency: string;
  maturity_months: number | null;
  grace_period_months: number | null;
  status: string | null;
};

type Props = {
  project: Project;
};

export default function CreditTable({ project }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });

    if (!error && data) setLoans(data as Loan[]);
  };

  useEffect(() => {
    load();
  }, [project.id]);

  const handleSaved = async () => {
    setOpen(false);
    setEditing(null);
    await load();
  };

  const totalAmount = loans.reduce((sum, l) => sum + (l.amount || 0), 0);

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Crédits &amp; financements du projet</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Ajouter une ligne de crédit
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Maturité (mois)</TableHead>
              <TableHead>Différé (mois)</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.loan_type}</TableCell>
                <TableCell>
                  {l.amount} {l.currency}
                </TableCell>
                <TableCell>{l.maturity_months ?? "-"}</TableCell>
                <TableCell>{l.grace_period_months ?? "-"}</TableCell>
                <TableCell>{l.status ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(l);
                      setOpen(true);
                    }}
                  >
                    Modifier
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {loans.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-xs text-slate-500"
                >
                  Aucune ligne de crédit enregistrée pour ce projet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="text-sm text-right text-slate-700">
          Montant total :{" "}
          <span className="font-semibold">
            {totalAmount} {loans[0]?.currency || "MAD"}
          </span>
        </div>

        <CreditFormModal
          open={open}
          onOpenChange={setOpen}
          projectId={project.id}
          loan={editing}
          onSaved={handleSaved}
        />
      </CardContent>
    </Card>
  );
}
