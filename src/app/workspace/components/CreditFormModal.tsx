"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { LoanRow, LoanStatus } from "../types";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  projectId: string;
  loan: LoanRow | null;

  onSaved: () => Promise<void> | void;
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erreur inattendue.";
}

export default function CreditFormModal({ open, onOpenChange, projectId, loan, onSaved }: Props) {
  const isEdit = !!loan;
  const title = useMemo(() => (isEdit ? "Modifier crédit" : "Nouveau crédit"), [isEdit]);

  const [facilityType, setFacilityType] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MAD");
  const [tenorMonths, setTenorMonths] = useState("");
  const [pricing, setPricing] = useState("");
  const [status, setStatus] = useState<LoanStatus>("draft");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (loan) {
      setFacilityType(loan.facility_type ?? "");
      setAmount(loan.amount != null ? String(loan.amount) : "");
      setCurrency(loan.currency ?? "MAD");
      setTenorMonths(loan.tenor_months != null ? String(loan.tenor_months) : "");
      setPricing(loan.pricing != null ? String(loan.pricing) : "");
      setStatus(loan.status ?? "draft");
      setNotes(loan.notes ?? "");
    } else {
      setFacilityType("");
      setAmount("");
      setCurrency("MAD");
      setTenorMonths("");
      setPricing("");
      setStatus("draft");
      setNotes("");
    }

    setError(null);
  }, [open, loan]);

  async function save() {
    setError(null);

    if (!facilityType.trim()) {
      setError("Le type de facilité est obligatoire.");
      return;
    }

    const payload: Partial<LoanRow> = {
      project_id: projectId,
      facility_type: facilityType.trim(),
      amount: amount.trim() ? Number(amount) : undefined,
      currency: currency.trim() ? currency.trim() : undefined,
      tenor_months: tenorMonths.trim() ? Number(tenorMonths) : undefined,
      pricing: pricing.trim() ? Number(pricing) : undefined,
      status,
      notes: notes.trim() ? notes.trim() : undefined,
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (loan) {
        const { error } = await supabase.from("loans").update(payload).eq("id", loan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loans").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      onOpenChange(false);
      await onSaved();
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Type de facilité *</Label>
            <Input value={facilityType} onChange={(e) => setFacilityType(e.target.value)} placeholder="Ex: Term Loan, RC, LC..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="grid gap-2">
              <Label>Montant</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 10000000" />
            </div>
            <div className="grid gap-2">
              <Label>Devise</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MAD" />
            </div>
            <div className="grid gap-2">
              <Label>Tenor (mois)</Label>
              <Input value={tenorMonths} onChange={(e) => setTenorMonths(e.target.value)} placeholder="Ex: 120" />
            </div>
            <div className="grid gap-2">
              <Label>Pricing (%)</Label>
              <Input value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="Ex: 4.25" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="grid gap-2">
              <Label>Statut</Label>
              <select className="h-9 rounded-md border px-2 bg-background" value={status} onChange={(e) => setStatus(e.target.value as LoanStatus)}>
                <option value="draft">draft</option>
                <option value="validated">validated</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              Tu peux “archiver” un crédit sans le supprimer (historique).
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes internes…" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
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
