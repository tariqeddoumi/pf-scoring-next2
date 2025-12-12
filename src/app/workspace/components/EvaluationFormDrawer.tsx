"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Project } from "../page";
import type { Evaluation } from "./ScoringPanel";

type Dimension = {
  id: number;
  code: string;
  label: string;
  weight: number;
  order_idx: number;
};

type Criterion = {
  id: number;
  dimension_id: number;
  code: string;
  label: string;
  weight: number;
  order_idx: number;
};

type Subcriterion = {
  id: number;
  criterion_id: number;
  code: string;
  label: string;
  weight: number;
  order_idx: number;
};

type OptionRow = {
  id: number;
  owner_kind: string;
  owner_id: number;
  value_code: string;
  value_label: string;
  score: number;
  order_idx: number;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project: Project;
  evaluation: Evaluation | null; // null = nouvelle éval
  onSaved: () => Promise<void> | void;
};

export default function EvaluationFormDrawer({
  open,
  onOpenChange,
  project,
  evaluation,
  onSaved,
}: Props) {
  const [loadingModel, setLoadingModel] = useState(true);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [subcrit, setSubcrit] = useState<Subcriterion[]>([]);
  const [optsByOwner, setOptsByOwner] = useState<Record<number, OptionRow[]>>(
    {}
  );

  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<"draft" | "validated">("draft");

  // réponses : clé = code du sous-critère, valeur = value_code sélectionné
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Chargement du modèle de scoring
  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoadingModel(true);
      const [d, c, s, o] = await Promise.all([
        supabase
          .from("scoring_dimensions_v5")
          .select("*")
          .eq("active", true)
          .order("order_idx"),
        supabase
          .from("scoring_criteria_v5")
          .select("*")
          .eq("active", true)
          .order("order_idx"),
        supabase
          .from("scoring_subcriteria_v5")
          .select("*")
          .eq("active", true)
          .order("order_idx"),
        supabase
          .from("scoring_options_v5")
          .select("*")
          .eq("active", true)
          .order("order_idx"),
      ]);

      setDimensions((d.data || []) as Dimension[]);
      setCriteria((c.data || []) as Criterion[]);
      setSubcrit((s.data || []) as Subcriterion[]);

      const map: Record<number, OptionRow[]> = {};
      (o.data || []).forEach((row: any) => {
        if (row.owner_kind === "subcriterion") {
          (map[row.owner_id] ||= []).push(row as OptionRow);
        }
      });
      setOptsByOwner(map);
      setLoadingModel(false);
    })();
  }, [open]);

  // Pré-remplir pour édition
  useEffect(() => {
    if (evaluation) {
      setLabel(evaluation.label || "");
      setStatus(evaluation.status);
      const a = (evaluation.answers || {}) as Record<string, string>;
      setAnswers(a);
    } else {
      setLabel("");
      setStatus("draft");
      setAnswers({});
    }
  }, [evaluation, open]);

  const grouped = useMemo(() => {
    const critByDim: Record<number, Criterion[]> = {};
    criteria.forEach((c) => {
      (critByDim[c.dimension_id] ||= []).push(c);
    });

    const subByCrit: Record<number, Subcriterion[]> = {};
    subcrit.forEach((s) => {
      (subByCrit[s.criterion_id] ||= []).push(s);
    });

    return { critByDim, subByCrit };
  }, [criteria, subcrit]);

  const onSelect = (code: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [code]: val }));
  };

  const handleSave = async () => {
    // Appel de la fonction de calcul
    const { data: scoreRows, error } = await supabase.rpc(
      "compute_pf_score_v5",
      {
        p_project_id: project.id,
        p_answers: answers,
      }
    );
    if (error) {
      alert("Erreur calcul : " + error.message);
      return;
    }

    let totalScore = 0;
    let grade = "N/A";
    let pd: number | null = null;
    if (scoreRows && scoreRows.length) {
      const last = scoreRows[scoreRows.length - 1];
      totalScore = Number(last.total_score ?? 0);
      grade = last.grade ?? "N/A";
      pd = last.pd ?? null;
    }

    const payload = {
      project_id: project.id,
      label: label || null,
      status,
      total_score: totalScore,
      grade,
      pd,
      answers,
      breakdown: scoreRows,
    };

    let dbError;
    if (evaluation && evaluation.id) {
      const { error: updErr } = await supabase
        .from("project_evaluations_v5")
        .update(payload)
        .eq("id", evaluation.id);
      dbError = updErr;
    } else {
      const { error: insErr } = await supabase
        .from("project_evaluations_v5")
        .insert(payload);
      dbError = insErr;
    }

    if (dbError) {
      alert("Erreur enregistrement : " + dbError.message);
      return;
    }

    await onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {evaluation && evaluation.id
              ? "Modifier une évaluation"
              : "Nouvelle évaluation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          {/* En-tête évaluation */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="mb-1 font-medium">Libellé</div>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex : Scoring initial, Revue annuelle 2026..."
              />
            </div>
            <div>
              <div className="mb-1 font-medium">Statut</div>
              <select
                className="border rounded px-2 py-1 w-full"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "draft" | "validated")
                }
              >
                <option value="draft">Brouillon</option>
                <option value="validated">Validée</option>
              </select>
            </div>
            <div className="text-[11px] text-slate-500 flex items-end">
              Projet : <span className="font-semibold ml-1">{project.name}</span>
            </div>
          </div>

          <hr className="my-2" />

          {/* Corps du questionnaire */}
          {loadingModel ? (
            <div className="text-[11px] text-slate-500">Chargement du modèle de scoring…</div>
          ) : (
            <div className="space-y-3">
              {dimensions.map((d) => (
                <div key={d.id} className="border rounded-md p-2 bg-slate-50">
                  <div className="font-semibold mb-1">
                    {d.label}{" "}
                    <span className="text-[11px] text-slate-500">
                      (poids {d.weight})
                    </span>
                  </div>

                  {(grouped.critByDim[d.id] || []).map((c) => (
                    <div key={c.id} className="border rounded p-2 mb-2 bg-white">
                      <div className="font-medium text-[12px] mb-1">
                        {c.label}{" "}
                        <span className="text-[11px] text-slate-500">
                          (poids {c.weight})
                        </span>
                      </div>

                      {(grouped.subByCrit[c.id] || []).map((s) => {
                        const options = optsByOwner[s.id] || [];
                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 py-1"
                          >
                            <div className="w-1/2 text-[12px]">
                              {s.label}{" "}
                              <span className="text-[11px] text-slate-400">
                                (poids {s.weight})
                              </span>
                            </div>
                            <select
                              className="border rounded px-2 py-1 flex-1 text-[12px]"
                              value={answers[s.code] || ""}
                              onChange={(e) =>
                                onSelect(s.code, e.target.value)
                              }
                            >
                              <option value="">— sélectionner —</option>
                              {options.map((o) => (
                                <option
                                  key={o.id}
                                  value={o.value_code}
                                >
                                  {o.value_code} — {o.value_label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="px-3 py-1 rounded border text-xs"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </button>
            <button
              className="px-3 py-1 rounded bg-green-600 text-white text-xs"
              onClick={handleSave}
            >
              Enregistrer & recalculer
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
