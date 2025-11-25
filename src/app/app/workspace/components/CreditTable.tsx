"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CreditFormModal from "./CreditFormModal";

type Loan = {
  id: string;
  loan_type: string;
  amount: number;
  currency: string;
  maturity_months: number | null;
  status: string | null;
};

export default function CreditTable({ project }: { project: { id: string } }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });

    if (!error && data) setLoans(data as Loan[]);
  };

  useEffect(() => {
    fetchLoans();
  }, [project.id]);

  const handleSaved = async () => {
    setOpenModal(false);
    setEditingLoan(null);
    await fetchLoans();
  };

  const totalAmount = loans.reduce((sum, l) => sum + (l.amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Crédits &amp; conditions de financement</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingLoan(null);
            setOpenModal(true);
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
                <TableCell>{l.status ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingLoan(l);
                      setOpenModal(true);
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
                  colSpan={5}
                  className="text-xs text-muted-foreground"
                >
                  Aucune ligne de crédit pour ce projet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="text-sm text-right">
          Montant total des crédits :{" "}
          <span className="font-semibold">
            {totalAmount} {loans[0]?.currency || "MAD"}
          </span>
        </div>

        <CreditFormModal
          open={openModal}
          onOpenChange={setOpenModal}
          projectId={project.id}
          loan={editingLoan}
          onSaved={handleSaved}
        />
      </CardContent>
    </Card>
  );
}
