"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import type { ProjectRow } from "../types";

export type Evaluation = {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  status: "draft" | "validated";
  label: string | null;
  total_score: number | null;
  grade: string | null;
  pd: number | null;
  answers: any;
  breakdown: any;
};

type Props = {
  project: ProjectRow;
};

export default function ScoringPanel({ project }: Props) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);

  const [openDrawer, setOpenDrawer] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);

  const loadEvaluations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_evaluations_v5")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setEvaluations((data || []) as Evaluation[]);
  };

  useEffect(() => {
    loadEvaluations();
  }, [project.id]);

  const lastEval = evaluations[0] || null;

  const handleNewEvaluation = () => {
    setEditingEval(null);
    setOpenDrawer(true);
  };

  const handleEdit = (ev: Evaluation) => {
    setEditingEval(ev);
    setOpenDrawer(true);
  };

  const handleDuplicate = (ev: Evaluation) => {
    // on ouvre le drawer avec les mêmes réponses mais sans id
    setEditingEval({
      ...ev,
      id: "",
      status: "draft",
      label: (ev.label || "Copie") + " (copie)",
    });
    setOpenDrawer(true);
  };

  const handleDelete = async (ev: Evaluation) => {
    if (!confirm("Supprimer cette évaluation ?")) return;
    const { error } = await supabase
      .from("project_evaluations_v5")
      .delete()
      .eq("id", ev.id);
    if (error) {
      alert("Erreur suppression : " + error.message);
      return;
    }
    loadEvaluations();
  };

  const handleValidate = async (ev: Evaluation) => {
    const { error } = await supabase
      .from("project_evaluations_v5")
      .update({ status: "validated" })
      .eq("id", ev.id);
    if (error) {
      alert("Erreur validation : " + error.message);
      return;
    }
    loadEvaluations();
  };

  const handleSaved = async () => {
    await loadEvaluations();
    setOpenDrawer(false);
    setEditingEval(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex justify-between items-center">
          <span>3. Scoring Project Finance V5</span>
          <Button size="sm" onClick={handleNewEvaluation}>
            + Nouvelle évaluation
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 text-xs">
        {/* Résumé synthétique */}
        {lastEval ? (
          <div className="p-3 rounded-md bg-slate-50 border flex justify-between items-center">
            <div>
              <div className="text-[11px] text-slate-500">
                Dernière évaluation ({lastEval.status === "validated"
                  ? "validée"
                  : "brouillon"}
                ) :
              </div>
              <div className="font-semibold">
                Score : {lastEval.total_score?.toFixed(3) ?? "N/A"} • Grade :{" "}
                {lastEval.grade ?? "N/A"} • PD :{" "}
                {lastEval.pd != null ? lastEval.pd.toFixed(4) : "N/A"}
              </div>
              {lastEval.label && (
                <div className="text-[11px] text-slate-500">
                  Libellé : {lastEval.label}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">
            Aucune évaluation pour ce projet. Cliquez sur “Nouvelle évaluation”.
          </div>
        )}

        {/* Tableau des évaluations */}
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>PD</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[11px]">
                    Chargement…
                  </TableCell>
                </TableRow>
              )}
              {!loading && evaluations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[11px]">
                    Aucune évaluation.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                evaluations.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      {new Date(ev.created_at).toLocaleString("fr-MA")}
                    </TableCell>
                    <TableCell>{ev.label || "-"}</TableCell>
                    <TableCell>
                      {ev.total_score != null
                        ? ev.total_score.toFixed(3)
                        : "N/A"}
                    </TableCell>
                    <TableCell>{ev.grade ?? "N/A"}</TableCell>
                    <TableCell>
                      {ev.pd != null ? ev.pd.toFixed(4) : "N/A"}
                    </TableCell>
                    <TableCell>
                      {ev.status === "validated" ? "Validée" : "Brouillon"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ev)}
                        >
                          Ouvrir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(ev)}
                        >
                          Dupliquer
                        </Button>
                        {ev.status !== "validated" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleValidate(ev)}
                          >
                            Valider
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(ev)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Drawer / panneau pour créer / modifier une évaluation */}
        
      </CardContent>
    </Card>
  );
}
