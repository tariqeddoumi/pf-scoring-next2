"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { LoanRow } from "../types";

const LOANS_TABLE = "loans";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  loan?: Partial<LoanRow> | null;
  onSaved?: () => void;
};

function parseNumberFR(v: string): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function CreditFormModal({ open, onOpenChange, projectId, loan, onSaved }: Props) {
  const isEdit = Boolean(loan?.id);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [facilityType, setFacilityType] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("MAD");
  const [tenorMonths, setTenorMonths] = React.useState<string>("");
  const [pricingPct, setPricingPct] = React.useState<string>(""); // UI
  const [status, setStatus] = React.useState<LoanRow["status"]>("draft");
  const [notes, setNotes] = React.useState<string>("");

  // init/reset when opening
  React.useEffect(() => {
    if (!open) return;

    setError(null);
    setFacilityType(loan?.facility_type ?? "");
    setAmount(loan?.amount != null ? String(loan.amount) : "");
    setCurrency(loan?.currency ?? "MAD");
    setTenorMonths(loan?.tenor_months != null ? String(loan.tenor_months) : "");
    setPricingPct(loan?.pricing != null ? String(loan.pricing) : "");
    setStatus((loan?.status as LoanRow["status"]) ?? "draft");
    setNotes(loan?.notes ?? "");
  }, [open, loan]);

  async function onSubmit() {
    setSaving(true);
    setError(null);

    try {
      if (!facilityType.trim()) {
        setError("Le type de facilité est obligatoire.");
        setSaving(false);
        return;
      }

      const amountNum = parseNumberFR(amount);
      const tenorNum = parseNumberFR(tenorMonths);
      const rateNum = parseNumberFR(pricingPct);

      // Payload DB (⚠️ DB = rate, et loan_type requis)
      const payload = {
        project_id: projectId,

        facility_type: facilityType.trim(),

        // ✅ IMPORTANT: ta table a loan_type NOT NULL => on le renseigne
        loan_type: facilityType.trim(),

        amount: amountNum,
        currency: (currency || "MAD").trim(),

        tenor_months: tenorNum != null ? Math.trunc(tenorNum) : null,

        // ✅ IMPORTANT: colonne DB = rate
        rate: rateNum,

        status,
        notes: notes?.trim() ? notes.trim() : null,
      };

      if (isEdit && loan?.id) {
        const { error: e } = await supabase.from(LOANS_TABLE).update(payload).eq("id", loan.id);
        if (e) {
          setError(e.message || "Erreur lors de la mise à jour.");
          setSaving(false);
          return;
        }
      } else {
        const { error: e } = await supabase.from(LOANS_TABLE).insert(payload);
        if (e) {
          // ✅ on affiche le message réel de Postgres/Supabase
          setError(e.message || "Erreur lors de la création.");
          setSaving(false);
          return;
        }
      }

      onOpenChange(false);
      onSaved?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Erreur inattendue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier crédit" : "Nouveau crédit"}</DialogTitle>
          <DialogDescription>Saisie tolérante FR/EN (ex: 4,25 ou 4.25).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Type de facilité *</Label>
            <Input value={facilityType} onChange={(e) => setFacilityType(e.target.value)} placeholder="RC, LT, ..." />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label>Montant</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000000" />
            </div>

            <div className="grid gap-2">
              <Label>Devise</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MAD" />
            </div>

            <div className="grid gap-2">
              <Label>Tenor (mois)</Label>
              <Input value={tenorMonths} onChange={(e) => setTenorMonths(e.target.value)} placeholder="120" />
            </div>

            <div className="grid gap-2">
              <Label>Pricing (%)</Label>
              <Input value={pricingPct} onChange={(e) => setPricingPct(e.target.value)} placeholder="4,25" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LoanRow["status"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="validated">validated</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground pt-7">
              Tu peux “archiver” un crédit sans le supprimer (historique).
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes internes..." />
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
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
