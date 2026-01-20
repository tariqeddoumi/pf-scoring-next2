"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { LoanRow, LoanStatus } from "../types";

const LOANS_TABLE = "loans";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  loan?: Partial<LoanRow> | null;
  onSaved?: () => void | Promise<void>;
};

function parseNumberFR(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export default function CreditFormModal({ open, onOpenChange, projectId, loan, onSaved }: Props) {
  const isEdit = Boolean(loan?.id);

  const [facilityType, setFacilityType] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("MAD");
  const [tenorMonths, setTenorMonths] = React.useState<string>("");
  const [rate, setRate] = React.useState<string>(""); // % (UI)
  const [status, setStatus] = React.useState<LoanStatus>("draft");
  const [notes, setNotes] = React.useState<string>("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    setError(null);

    setFacilityType(loan?.facility_type ?? "RC");
    setAmount(loan?.amount != null ? String(loan.amount) : "");
    setCurrency(loan?.currency ?? "MAD");
    setTenorMonths(loan?.tenor_months != null ? String(loan.tenor_months) : "");
    setRate(loan?.rate != null ? String(loan.rate) : "");
    setStatus((loan?.status as LoanStatus) ?? "draft");
    setNotes(loan?.notes ?? "");
  }, [open, loan]);

  async function save() {
    setSaving(true);
    setError(null);

    // validations minimales
    const ft = facilityType.trim();
    if (!ft) {
      setError("Le type de facilité est obligatoire.");
      setSaving(false);
      return;
    }

    const amountN = amount.trim() ? parseNumberFR(amount) : null;
    if (amount.trim() && amountN == null) {
      setError("Montant invalide.");
      setSaving(false);
      return;
    }

    const tenorN = tenorMonths.trim() ? parseNumberFR(tenorMonths) : null;
    const tenorInt = tenorN == null ? null : Math.round(tenorN);

    const rateN = rate.trim() ? parseNumberFR(rate) : null;
    if (rate.trim() && rateN == null) {
      setError("Taux / Pricing (%) invalide. Ex: 4,25 ou 4.25");
      setSaving(false);
      return;
    }

    const payload = {
      project_id: projectId,
      facility_type: ft,
      amount: amountN,
      currency: (currency || "MAD").trim(),
      tenor_months: tenorInt,
      // ✅ colonne DB
      rate: rateN,
      status,
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      if (isEdit && loan?.id) {
        const { error: e } = await supabase.from(LOANS_TABLE).update(payload).eq("id", loan.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from(LOANS_TABLE).insert(payload);
        if (e) throw e;
      }

      if (onSaved) await onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inattendue.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier crédit" : "Nouveau crédit"}</DialogTitle>
          <DialogDescription>Saisie tolérante aux formats FR/EN (ex: 4,25 ou 4.25).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Type de facilité *</label>
            <Input value={facilityType} onChange={(e) => setFacilityType(e.target.value)} placeholder="RC" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="grid gap-2 sm:col-span-1">
              <label className="text-sm font-medium">Montant</label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
            </div>

            <div className="grid gap-2 sm:col-span-1">
              <label className="text-sm font-medium">Devise</label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MAD" />
            </div>

            <div className="grid gap-2 sm:col-span-1">
              <label className="text-sm font-medium">Tenor (mois)</label>
              <Input value={tenorMonths} onChange={(e) => setTenorMonths(e.target.value)} placeholder="120" />
            </div>

            <div className="grid gap-2 sm:col-span-1">
              <label className="text-sm font-medium">Pricing (%)</label>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="4.25" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as LoanStatus)}
              >
                <option value="draft">draft</option>
                <option value="validated">validated</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground flex items-center">
              Tu peux “archiver” un crédit sans le supprimer (historique).
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes internes…" />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
