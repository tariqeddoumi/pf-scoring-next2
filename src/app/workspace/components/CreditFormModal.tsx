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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type LoanStatus = "draft" | "validated" | "archived" | string;

export type LoanRow = {
  id: string;
  project_id: string;

  facility_type: string | null; // ton UI utilise "Type de facilité"
  loan_type: string | null; // si tu l'utilises encore, sinon laisse null
  amount: number;
  currency: string;
  tenor_months: number | null;
  maturity_months: number | null;
  grace_period_months: number | null;

  rate: number | null; // ✅ colonne en base (au lieu de pricing)
  status: LoanStatus | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  mode?: "create" | "edit";
  initial?: Partial<LoanRow> | null;
  onSaved?: () => void;
};

function parseNumberFR(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  // accepte 4,25 et 4.25
  const normalized = s.replace(/\s+/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(input: string): number | null {
  const n = parseNumberFR(input);
  if (n === null) return null;
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : null;
}

export default function CreditFormModal({
  open,
  onOpenChange,
  projectId,
  mode = "create",
  initial = null,
  onSaved,
}: Props) {
  const isEdit = mode === "edit" && !!initial?.id;

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Champs UI
  const [facilityType, setFacilityType] = React.useState<string>(initial?.facility_type ?? "RC");
  const [amount, setAmount] = React.useState<string>(
    initial?.amount != null ? String(initial.amount) : ""
  );
  const [currency, setCurrency] = React.useState<string>(initial?.currency ?? "MAD");
  const [tenorMonths, setTenorMonths] = React.useState<string>(
    initial?.tenor_months != null ? String(initial.tenor_months) : ""
  );

  // UI label "Pricing (%)" mais en base => rate
  const [rate, setRate] = React.useState<string>(initial?.rate != null ? String(initial.rate) : "");

  const [status, setStatus] = React.useState<LoanStatus>(initial?.status ?? "draft");
  const [notes, setNotes] = React.useState<string>(initial?.notes ?? "");

  React.useEffect(() => {
    if (!open) return;
    // à l’ouverture, resync avec initial
    setError(null);
    setFacilityType(initial?.facility_type ?? "RC");
    setAmount(initial?.amount != null ? String(initial.amount) : "");
    setCurrency(initial?.currency ?? "MAD");
    setTenorMonths(initial?.tenor_months != null ? String(initial.tenor_months) : "");
    setRate(initial?.rate != null ? String(initial.rate) : "");
    setStatus(initial?.status ?? "draft");
    setNotes(initial?.notes ?? "");
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const amt = parseNumberFR(amount);
      if (amt === null) throw new Error("Montant invalide.");

      const tenor = toIntOrNull(tenorMonths);

      // rate = % (ex: 4.25)
      const parsedRate = parseNumberFR(rate);

      const payload = {
        project_id: projectId,
        facility_type: facilityType?.trim() || null,
        currency: (currency?.trim() || "MAD").toUpperCase(),
        amount: amt,

        tenor_months: tenor,
        rate: parsedRate, // ✅ IMPORTANT : colonne `rate`

        status: status ?? null,
        notes: notes?.trim() || null,

        // si tu n’utilises plus loan_type, tu peux supprimer ces 2 lignes
        loan_type: null as string | null,
      };

      if (isEdit && initial?.id) {
        const { error: upErr } = await supabase.from("loans").update(payload).eq("id", initial.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("loans").insert(payload);
        if (insErr) throw insErr;
      }

      onSaved?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erreur inconnue lors de l’enregistrement.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{isEdit ? "Modifier crédit" : "Nouveau crédit"}</DialogTitle>
            <Badge variant="secondary">{isEdit ? "Modification" : "Création"}</Badge>
          </div>
          <DialogDescription>
            Saisie tolérante aux formats FR/EN (ex: <strong>4,25</strong> ou <strong>4.25</strong>).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type de facilité *</Label>
            <Input value={facilityType} onChange={(e) => setFacilityType(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Montant *</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
            </div>

            <div className="space-y-2">
              <Label>Devise</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MAD" />
            </div>

            <div className="space-y-2">
              <Label>Tenor (mois) *</Label>
              <Input
                value={tenorMonths}
                onChange={(e) => setTenorMonths(e.target.value)}
                placeholder="120"
              />
            </div>

            <div className="space-y-2">
              <Label>Pricing (%)</Label>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="4.25" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Statut</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={status ?? ""}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">draft</option>
                <option value="validated">validated</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div className="text-sm text-muted-foreground flex items-center">
              Tu peux “archiver” un crédit sans le supprimer (historique).
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes internes..." />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
