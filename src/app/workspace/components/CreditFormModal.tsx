"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type Loan = {
  id?: number;
  facility_type: string;
  amount: number;
  currency: string;
  maturity_months?: number | null;
  margin_bps?: number | null;
  comments?: string | null;
};

type Props = {
  /** contrôlé depuis CreditTable */
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** identifiant projet (string ou number, selon ta table) */
  projectId: string;

  /** crédit en cours d’édition (null = création) */
  loan: Loan | null;

  /** callback appelé après insert/update réussi (pour recharger la liste) */
  onSaved: () => Promise<void> | void;
};

export default function CreditFormModal({
  open,
  onOpenChange,
  projectId,
  loan,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [facilityType, setFacilityType] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState("MAD");
  const [maturity, setMaturity] = useState<string>("");
  const [marginBps, setMarginBps] = useState<string>("");
  const [comments, setComments] = useState("");

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (loan) {
      setFacilityType(loan.facility_type || "");
      setAmount(loan.amount?.toString() ?? "");
      setCurrency(loan.currency || "MAD");
      setMaturity(loan.maturity_months?.toString() ?? "");
      setMarginBps(loan.margin_bps?.toString() ?? "");
      setComments(loan.comments || "");
    } else {
      setFacilityType("");
      setAmount("");
      setCurrency("MAD");
      setMaturity("");
      setMarginBps("");
      setComments("");
    }
  }, [loan, open]);

  const handleClose = () => {
    if (saving) return;
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!facilityType || !amount) {
      alert("Le type de facilité et le montant sont obligatoires.");
      return;
    }

    setSaving(true);

    const payload = {
      project_id: projectId,
      facility_type: facilityType,
      amount: Number(amount),
      currency,
      maturity_months: maturity ? Number(maturity) : null,
      margin_bps: marginBps ? Number(marginBps) : null,
      comments: comments || null,
    };

    let error;

    if (loan?.id) {
      const { error: updErr } = await supabase
        .from("project_loans") // ⚠️ adapte le nom de la table si nécessaire
        .update(payload)
        .eq("id", loan.id);
      error = updErr;
    } else {
      const { error: insErr } = await supabase
        .from("project_loans") // ⚠️ idem
        .insert(payload);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {loan ? "Modifier un crédit" : "Nouveau crédit / financement"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div>
            <div className="mb-1 font-medium">Type de facilité</div>
            <Input
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              placeholder="Ex : Crédit d'investissement, Spot, Avance sur marché..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <div className="mb-1 font-medium">Montant</div>
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Montant en devise"
              />
            </div>
            <div>
              <div className="mb-1 font-medium">Devise</div>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="MAD / EUR / USD..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 font-medium">Maturité (mois)</div>
              <Input
                type="number"
                min="0"
                value={maturity}
                onChange={(e) => setMaturity(e.target.value)}
                placeholder="Ex : 60"
              />
            </div>
            <div>
              <div className="mb-1 font-medium">Marge (bps)</div>
              <Input
                type="number"
                min="0"
                value={marginBps}
                onChange={(e) => setMarginBps(e.target.value)}
                placeholder="Ex : 250"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 font-medium">Commentaires / conditions spéciales</div>
            <Textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Garanties, sûretés, covenants, etc."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Enregistrement..." : loan ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
