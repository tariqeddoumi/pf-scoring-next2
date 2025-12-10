"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  loan: Loan | null;
  onSaved: () => void;
};

export default function CreditFormModal({
  open,
  onOpenChange,
  projectId,
  loan,
  onSaved,
}: Props) {
  const isEdit = !!loan;

  const [form, setForm] = useState({
    loan_type: "",
    amount: "",
    currency: "MAD",
    maturity_months: "",
    grace_period_months: "",
    status: "PROPOSE",
  });

  useEffect(() => {
    if (loan) {
      setForm({
        loan_type: loan.loan_type || "",
        amount: loan.amount?.toString() || "",
        currency: loan.currency || "MAD",
        maturity_months: loan.maturity_months?.toString() || "",
        grace_period_months: loan.grace_period_months?.toString() || "",
        status: loan.status || "PROPOSE",
      });
    } else {
      setForm({
        loan_type: "",
        amount: "",
        currency: "MAD",
        maturity_months: "",
        grace_period_months: "",
        status: "PROPOSE",
      });
    }
  }, [loan]);

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.loan_type || !form.amount) {
      alert("Type de crédit et montant obligatoires.");
      return;
    }

    if (isEdit && loan) {
      const { error } = await supabase
        .from("loans")
        .update({
          loan_type: form.loan_type,
          amount: Number(form.amount),
          currency: form.currency,
          maturity_months: form.maturity_months
            ? Number(form.maturity_months)
            : null,
          grace_period_months: form.grace_period_months
            ? Number(form.grace_period_months)
            : null,
          status: form.status,
        })
        .eq("id", loan.id);

      if (error) {
        alert("Erreur mise à jour crédit : " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("loans").insert({
        project_id: projectId,
        loan_type: form.loan_type,
        amount: Number(form.amount),
        currency: form.currency,
        maturity_months: form.maturity_months
          ? Number(form.maturity_months)
          : null,
        grace_period_months: form.grace_period_months
          ? Number(form.grace_period_months)
          : null,
        status: form.status,
      });

      if (error) {
        alert("Erreur création crédit : " + error.message);
        return;
      }
    }

    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Modifier la ligne de crédit"
              : "Nouvelle ligne de crédit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Type de crédit</Label>
            <Input
              value={form.loan_type}
              onChange={(e) => handleChange("loan_type", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Montant</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Devise</Label>
            <Input
              value={form.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Maturité (mois)</Label>
            <Input
              type="number"
              value={form.maturity_months}
              onChange={(e) =>
                handleChange("maturity_months", e.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Différé (mois)</Label>
            <Input
              type="number"
              value={form.grace_period_months}
              onChange={(e) =>
                handleChange("grace_period_months", e.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Statut</Label>
            <Input
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
