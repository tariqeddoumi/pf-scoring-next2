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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import type { LoanRow } from "../types";

const LOANS_TABLE = "loans";

/**
 * Parse robuste des nombres :
 * - "4,25" -> 4.25
 * - "1 234 567,89" -> 1234567.89
 * - "1,234,567.89" -> 1234567.89
 */
function parseLocalizedNumber(raw: string): number | null {
  const s0 = (raw ?? "").toString().trim();
  if (!s0) return null;

  // Retire espaces & séparateurs "visuels"
  let s = s0.replace(/\s/g, "").replace(/\u00A0/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // cas "1,234,567.89" => on retire les virgules (milliers)
    // cas "1.234.567,89" => on retire les points (milliers) puis virgule -> point
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastDot > lastComma) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(/\./g, "").replace(",", ".");
    }
  } else if (hasComma && !hasDot) {
    // cas FR : virgule décimale
    s = s.replace(",", ".");
  }

  // Retire tout sauf chiffres, -, .
  s = s.replace(/[^0-9.-]/g, "");

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseIntSafe(raw: string): number | null {
  const n = parseLocalizedNumber(raw);
  if (n === null) return null;
  const i = Math.trunc(n);
  if (!Number.isFinite(i)) return null;
  return i;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  loan: LoanRow | null;
  onSaved: () => Promise<void> | void;
};

export default function CreditFormModal({
  open,
  onOpenChange,
  projectId,
  loan,
  onSaved,
}: Props) {
  const isEdit = Boolean(loan?.id);

  const [facilityType, setFacilityType] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("MAD");
  const [tenorMonths, setTenorMonths] = React.useState("");
  const [pricing, setPricing] = React.useState("");
  const [status, setStatus] = React.useState<LoanRow["status"]>("draft");
  const [notes, setNotes] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    if (loan && isEdit) {
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
  }, [open, loan, isEdit]);

  function validate(): { amount: number; tenor: number; pricing: number | null } | null {
    setError(null);

    if (!facilityType.trim()) {
      setError("Type de facilité obligatoire.");
      return null;
    }

    const a = parseLocalizedNumber(amount);
    if (a === null || a <= 0) {
      setError("Montant invalide. Exemple : 1000000 ou 1 000 000 ou 1 000 000,50");
      return null;
    }

    const t = parseIntSafe(tenorMonths);
    if (t === null || t <= 0) {
      setError("Tenor invalide (en mois). Exemple : 120");
      return null;
    }

    const p = pricing.trim() ? parseLocalizedNumber(pricing) : null;
    if (pricing.trim() && (p === null || p < 0)) {
      setError("Pricing invalide. Exemple : 4,25 ou 4.25");
      return null;
    }

    return { amount: a, tenor: t, pricing: p };
  }

  async function save() {
    const parsed = validate();
    if (!parsed) return;

    setSaving(true);
    setError(null);

    try {
      const payload: Partial<LoanRow> = {
        project_id: projectId,
        facility_type: facilityType.trim(),
        amount: parsed.amount,
        currency: currency.trim() || "MAD",
        tenor_months: parsed.tenor,
        pricing: parsed.pricing ?? null,
        status,
        notes: notes?.trim() ? notes.trim() : null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && loan?.id) {
        const { error: e } = await supabase
          .from(LOANS_TABLE)
          .update(payload)
          .eq("id", loan.id);

        if (e) throw e;
      } else {
        const { error: e } = await supabase.from(LOANS_TABLE).insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (e) throw e;
      }

      await onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      // 👉 montre enfin la vraie raison (RLS / colonne manquante / NaN / etc.)
      const msg =
        e?.message ||
        e?.error_description ||
        "Erreur inattendue lors de l’enregistrement.";
      const details = e?.details ? ` (${e.details})` : "";
      setError(`${msg}${details}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{isEdit ? "Modifier le crédit" : "Nouveau crédit"}</DialogTitle>
            <Badge variant={isEdit ? "secondary" : "default"}>
              {isEdit ? "Modification" : "Création"}
            </Badge>
          </div>
          <DialogDescription>
            Saisie tolérante aux formats FR/EN (ex: <b>4,25</b> ou <b>4.25</b>).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Type de facilité *</Label>
            <Input
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              placeholder="Ex: RC / RCF / LT / Bridge…"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label>Montant *</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 1 000 000,50"
                inputMode="decimal"
              />
            </div>

            <div className="grid gap-2">
              <Label>Devise</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="MAD"
              />
            </div>

            <div className="grid gap-2">
              <Label>Tenor (mois) *</Label>
              <Input
                value={tenorMonths}
                onChange={(e) => setTenorMonths(e.target.value)}
                placeholder="Ex: 120"
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label>Pricing (%)</Label>
              <Input
                value={pricing}
                onChange={(e) => setPricing(e.target.value)}
                placeholder="Ex: 4,25"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Statut</Label>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as LoanRow["status"])}
              >
                <option value="draft">draft</option>
                <option value="validated">validated</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div className="text-sm text-muted-foreground flex items-end">
              Tu peux “archiver” un crédit sans le supprimer (historique).
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes..."
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
