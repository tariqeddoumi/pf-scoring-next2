"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Client } from "./ClientSelector";
import type { Project } from "./ProjectList";

type Run = {
  id: string;
  total_score: number;
  grade: string;
  pd: number;
  decision: string | null;
  decision_notes: string | null;
  created_at: string;
};

type Props = {
  client: Client;
  project: Project;
  lastScore: { total_score: number; grade: string; pd: number } | null;
};

export default function SummaryPanel({ client, project, lastScore }: Props) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("scoring_runs")
      .select(
        "id, total_score, grade, pd, decision, decision_notes, created_at"
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setRuns(data as any);
      if (data.length > 0) {
        const latest = data[0] as Run;
        setDecision(latest.decision || "");
        setNotes(latest.decision_notes || "");
      } else {
        setDecision("");
        setNotes("");
      }
    }
  };

  useEffect(() => {
    load();
  }, [project.id]);

  const latest = runs[0] || null;

  const handleSaveDecision = async () => {
    if (!latest) {
      alert("Aucune évaluation enregistrée pour ce projet.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("scoring_runs")
        .update({
          decision: decision || null,
          decision_notes: notes || null,
        })
        .eq("id", latest.id);

      if (error) {
        alert("Erreur enregistrement décision : " + error.message);
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>Synthèse &amp; historique</CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Client : {client.name} • Projet : {project.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            Résumé du dernier scoring
          </p>
          {latest ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="bg-slate-50 text-slate-800 border-slate-200">
                Score : {(latest.total_score * 100).toFixed(1)}%
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Grade : {latest.grade}
              </Badge>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                PD : {latest.pd}
              </Badge>
              <span className="text-[11px] text-slate-500">
                Évalué le :{" "}
                {new Date(latest.created_at).toLocaleString()}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Aucun scoring enregistré pour l&apos;instant.
            </p>
          )}
          {lastScore && !latest && (
            <p className="text-xs text-slate-500">
              Dernier calcul mémoire :{" "}
              {(lastScore.total_score * 100).toFixed(1)}% — Grade{" "}
              {lastScore.grade} — PD {lastScore.pd}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-slate-800">
            Décision de crédit (PF)
          </p>
          <select
            className="border rounded-md px-2 py-1 text-sm w-full"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="">— Sélectionner une décision —</option>
            <option value="ACCORD">ACCORD</option>
            <option value="ACCORD_AVEC_RESERVES">
              ACCORD AVEC RÉSERVES
            </option>
            <option value="REFUS">REFUS</option>
            <option value="A_COMPLETER">DOSSIER À COMPLÉTER</option>
          </select>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-1">
              Commentaire analyste / comité
            </p>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Synthèse des forces/faiblesses, recommandation, conditions particulières..."
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveDecision} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer la décision"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-slate-800 text-sm">
            Historique des dernières évaluations
          </p>
          {runs.length === 0 ? (
            <p className="text-xs text-slate-500">
              Pas encore d&apos;historique.
            </p>
          ) : (
            <ul className="space-y-1 text-xs text-slate-600">
              {runs.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>
                    {new Date(r.created_at).toLocaleString()} — Score{" "}
                    {(r.total_score * 100).toFixed(1)}% • Grade {r.grade} • PD{" "}
                    {r.pd}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {r.decision || "Décision ?"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
