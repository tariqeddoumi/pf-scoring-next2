"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

type EvalRow = {
  id: string;
  version: number;
  status: "draft" | "validated" | "archived";
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
  answers: Json;
  results: Json;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evaluationId: string | null;
};

function extractDomainScores(results: Json): Record<string, number> {
  if (!results || typeof results !== "object" || Array.isArray(results)) return {};
  const ds = (results as Record<string, Json>)["domainScores"];
  if (!ds || typeof ds !== "object" || Array.isArray(ds)) return {};

  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(ds)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

export default function ScoringDetailDialog({
  open,
  onOpenChange,
  evaluationId,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [ev, setEv] = React.useState<EvalRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !evaluationId) return;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("scoring_evaluations")
        .select(
          "id,version,status,total_score,grade,pd,created_at,answers,results"
        )
        .eq("id", evaluationId)
        .single();

      if (error) {
        setError(error.message);
        setEv(null);
      } else {
        setEv(data as EvalRow);
      }

      setLoading(false);
    })();
  }, [open, evaluationId]);

  const domainScores = ev ? extractDomainScores(ev.results) : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Détail de l’évaluation</DialogTitle>
          <DialogDescription>
            Audit complet : scores par domaine + réponses.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : !ev ? (
          <div className="text-sm text-muted-foreground">
            Aucune évaluation sélectionnée.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">V{ev.version}</Badge>
              <Badge
                variant={ev.status === "validated" ? "default" : "secondary"}
              >
                {ev.status}
              </Badge>
              <Badge variant="secondary">
                Total {(ev.total_score * 100).toFixed(1)}%
              </Badge>
              <Badge variant="secondary">Grade {ev.grade ?? "—"}</Badge>
              <Badge variant="secondary">PD {ev.pd ?? "—"}</Badge>
            </div>

            {/* Domain scores */}
            <div className="rounded-md border p-3">
              <div className="font-medium mb-2">Scores par domaine</div>
              {Object.keys(domainScores).length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun.</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(domainScores).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="text-sm font-medium">{k}</div>
                      <div className="text-sm">
                        {(v * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Answers */}
            <div className="rounded-md border p-3">
              <div className="font-medium mb-2">Réponses (JSON)</div>
              <pre className="text-xs overflow-auto bg-muted p-2 rounded">
                {JSON.stringify(ev.answers, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
