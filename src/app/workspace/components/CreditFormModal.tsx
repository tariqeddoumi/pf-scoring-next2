"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LOANS_TABLE = "project_loans"; // <-- change to "loans" if needed

export type Loan = {
  id?: string;
  project_id: string;
  facility_type: string;
  amount: number;
  currency: string;
  maturity_months: number | null;
  margin_bps: number | null;
  rate_percent: number | null;
  status: "draft" | "validated" | "cancelled";
  comments: string | null;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;

  /** null = création */
  loan: Loan | null;

  /** callback après save réussi */
  onSaved: () => Promise<void> | void;

  /** optionnel : mode duplication (pré-remplit mais force création) */
  forceCreate?: boolean;
};

const DEFAULT_CURRENCY = "MAD";

function toNumberOrNull(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function CreditFormModal({
  open,
  onOpenChange,
  projectId,
  loan,
  onSaved,
  forceCreate,
}: Props) {
  const isEdit = !!loan?.id && !forceCreate;

  const [saving, setSaving] = useState(false);

  const [facilityType, setFacilityType] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [maturity, setMaturity] = useState<string>("");
  const [marginBps, setMarginBps] = useState<string>("");
  const [ratePercent, setRatePercent] = useState<string>("");
  const [status, setStatus] = useState<Loan["status"]>("draft");
  const [comments, setComments] = useState<string>("");

  // pré-remplissage
  useEffect(() => {
    if (!open) return;

    if (loan) {
      setFacilityType(loan.facility_type ?? "");
      setAmount(
        loan.amount != null && Number.isFinite(Number(loan.amount))
          ? String(loan.amount)
          : ""
      );
      setCurrency(loan.currency || DEFAULT_CURRENCY);
      setMaturity(loan.maturity_months != null ? String(loan.maturity_months) : "");
      setMarginBps(loan.margin_bps != null ? String(loan.margin_bps) : "");
      setRatePercent(loan.rate_percent != null ? String(loan.rate_percent) : "");
      setStatus(loan.status || "draft");
      setComments(loan.comments || "");
    } else {
      setFacilityType("");
      setAmount("");
      setCurrency(DEFAULT_CURRENCY);
      setMaturity("");
      setMarginBps("");
      setRatePercent("");
      setStatus("draft");
      setComments("");
    }
  }, [open, loan]);

  const amountNum = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const canSave = useMemo(() => {
    return facilityType.trim().length > 0 && amountNum > 0 && currency.trim().length > 0;
  }, [facilityType, amountNum, currency]);

  const close = () => {
    if (saving) return;
    onOpenChange(false);
  };

  const save = async () => {
    if (!canSave) {
      alert("Type de facilité + montant + devise sont obligatoires.");
      return;
    }

    setSaving(true);

    const payload: Partial<Loan> = {
      project_id: projectId,
      facility_type: facilityType.trim(),
      amount: Number(amount),
      currency: currency.trim().toUpperCase(),
      maturity_months: maturity.trim() ? Number(maturity) : null,
      margin_bps: marginBps.trim() ? Number(marginBps) : null,
      rate_percent: ratePercent.trim() ? Number(ratePercent) : null,
      status,
      comments: comments.trim() ? comments.trim() : null,
    };

    let error: any = null;

    if (isEdit && loan?.id) {
      const { error: updErr } = await supabase
        .from(LOANS_TABLE)
        .update(payload)
        .eq("id", loan.id);
      error = updErr;
    } else {
      // création (incluant duplication)
      const { error: insErr } = await supabase.from(LOANS_TABLE).insert(payload);
      error = insErr;
    }

    setSaving(false);

    if (error) {
      alert("Erreur enregistrement crédit : " + error.message);
      return;
    }

    await onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center justify-between gap-2">
            <span>
              {isEdit ? "Modifier un crédit" : forceCreate ? "Dupliquer un crédit" : "Nouveau crédit"}
            </span>
            <Badge className="text-[10px] px-2 py-0">
              Projet: {projectId.slice(0, 8)}…
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3 text-xs">
          <div className="col-span-6">
            <div className="mb-1 font-medium">Type de facilité</div>
            <Input
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              placeholder="Crédit inv., Spot, Avance sur marché…"
            />
          </div>

          <div className="col-span-3">
            <div className="mb-1 font-medium">Statut</div>
            <select
              className="border rounded px-2 py-2 w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as Loan["status"])}
            >
              <option value="draft">Brouillon</option>
              <option value="validated">Validé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div className="col-span-3">
            <div className="mb-1 font-medium">Devise</div>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="MAD"
            />
          </div>

          <div className="col-span-4">
            <div className="mb-1 font-medium">Montant</div>
            <Input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
            <div className="text-[11px] text-slate-500 mt-1">
              Contrôle: montant &gt; 0
            </div>
          </div>

          <div className="col-span-4">
            <div className="mb-1 font-medium">Maturité (mois)</div>
            <Input
              type="number"
              min="0"
              value={maturity}
              onChange={(e) => setMaturity(e.target.value)}
              placeholder="Ex: 60"
            />
          </div>

          <div className="col-span-4">
            <div className="mb-1 font-medium">Marge (bps)</div>
            <Input
              type="number"
              min="0"
              value={marginBps}
              onChange={(e) => setMarginBps(e.target.value)}
              placeholder="Ex: 250"
            />
          </div>

          <div className="col-span-4">
            <div className="mb-1 font-medium">Taux (%)</div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
              placeholder="Ex: 6.25"
            />
          </div>

          <div className="col-span-8">
            <div className="mb-1 font-medium">Commentaires / conditions</div>
            <Textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Garanties, covenants, conditions spéciales…"
            />
          </div>

          <div className="col-span-12 flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={close} disabled={saving}>
              Annuler
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !canSave}>
              {saving ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </div>

        {/* petite zone “diagnostic compact” */}
        <div className="mt-2 text-[11px] text-slate-500">
          <span className="font-semibold">Calcul rapide:</span>{" "}
          Montant={amountNum.toLocaleString("fr-MA")} {currency.toUpperCase()} •
          Maturité={toNumberOrNull(maturity) ?? "—"} mois •
          Marge={toNumberOrNull(marginBps) ?? "—"} bps •
          Taux={toNumberOrNull(ratePercent) ?? "—"}%
        </div>
      </DialogContent>
    </Dialog>
  );
}
