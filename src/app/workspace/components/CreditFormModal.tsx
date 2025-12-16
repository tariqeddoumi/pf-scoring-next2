"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { LoanRow, LoanStatus } from "../types";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  loan: LoanRow | null;
  onSaved: () => Promise<void> | void;
};

export default function CreditFormModal({ open, onOpenChange, projectId, loan, onSaved }: Props) {
  const isEdit = useMemo(() => !!loan, [loan]);

  const [facilityType, setFacilityType] = useState("");
  const [currency, setCurrency] = useState("MAD");
  const [amount, setAmount] = useState("");
  const [tenorMonths, setTenorMonths] = useState("");
  const [rate, setRate] = useState("");
  const [status, setStatus] = useState<LoanStatus>("draft");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (loan) {
      setFacilityType(loan.facility_type ?? "");
      setCurrency(loan.currency ?? "MAD");
      setAmount(loan.amount != null ? String(loan.amount) : "");
      setTenorMonths(loan.tenor_months != null ? String(loan.tenor_months) : "");
      setRate(loan.rate != null ? String(loan.rate) : "");
      setStatus(loan.status ?? "draft");
      setNotes(loan.notes ?? "");
    } else {
      setFacilityType("");
      setCurrency("MAD");
      setAmount("");
      setTenorMonths("");
      setRate("");
      setStatus("draft");
      setNotes("");
    }
    setError(null);
  }, [open, loan]);

  async function save() {
    setSaving(true);
    setError(null);

    if (!facilityType.trim()) {
      setSaving(false);
      setError("Le type de facilité est obligatoire.");
      return;
    }

    const payload: Partial<LoanRow> = {
      project_id: projectId,
      facility_type: facilityType.trim(),
      currency: currency.trim() || "MAD",
      amount: amount.trim() ? Number(amount) : undefined,
      tenor_months: tenorMonths.trim() ? Number(tenorMonths) : undefined,
      rate: rate.trim() ? Number(rate) : undefined,
      status,
      notes: notes.trim() || undefined,
    };

    try {
      if (loan) {
        const { error } = await supabase.from("loans").update(payload).eq("id", loan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loans").insert(payload);
        if (error) throw error;
      }
      await onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier crédit" : "Ajouter crédit"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Facility type *</Label>
            <Input value={facilityType} onChange={(e) => setFacilityType(e.target.value)} placeholder="Term Loan / Revolving / LC / ..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Montant</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="70000000" />
            </div>
            <div className="grid gap-1">
              <Label>Devise</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MAD" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1">
              <Label>Tenor (mois)</Label>
              <Input value={tenorMonths} onChange={(e) => setTenorMonths(e.target.value)} placeholder="120" />
            </div>
            <div className="grid gap-1">
              <Label>Taux (%)</Label>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="4.25" />
            </div>
            <div className="grid gap-1">
              <Label>Statut</Label>
              <select className="h-9 rounded-md border px-2" value={status} onChange={(e) => setStatus(e.target.value as LoanStatus)}>
                <option value="draft">draft</option>
                <option value="validated">validated</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Commentaires…" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
