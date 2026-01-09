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
  evaluationIdA: string | null;
  evaluationIdB: string | null;
};

function asObj(v: Json): Record<string, Json> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, Json>;
}

function pickDomainScores(results: Json): Record<string, number> {
  const r = asObj(results);
  const ds = r ? asObj(r.domainScores ?? null) : null;
  if (!ds) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(ds)) if (typeof v === "number") out[k] = v;
  return out;
}

async function fetchEval(id: string): Promise<{ data: EvalRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("scoring_evaluations")
    .select("id,version,status,total_score,grade,pd,created_at,answers,results")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as EvalRow, error: null };
}

function pct(v: number | null | undefined) {
  if (typeof v !== "number") return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export default function ScoringCompareDialog({
  open,
  onOpenChange,
  evaluationIdA,
  evaluationIdB,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [a, setA] = React.useState<EvalRow | null>(null);
  const [b, setB] = React.useState<EvalRow | null>(null);

  React.useEffect(() => {
    if (!open) return;

    // si A/B manquants => on affiche un message, sans fetch
    if (!evaluationIdA || !evaluationIdB) {
      setA(null);
      setB(null);
      setErr(null);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setErr(null);

      const [ra, rb] = await Promise.all([fetchEval(evaluationIdA), fetchEval(evaluationIdB)]);

      if (ra.error || rb.error) {
        setErr(ra.error ?? rb.error ?? "Erreur inconnue");
        setA(ra.data);
        setB(rb.data);
      } else {
        setA(ra.data);
        setB(rb.data);
      }

      setLoading(false);
    })();
  }, [open, evaluationIdA, evaluationIdB]);

  const aDomains = React.useMemo(() => (a ? pickDomainScores(a.results) : {}), [a]);
  const bDomains = React.useMemo(() => (b ? pickDomainScores(b.results) : {}), [b]);

  const allKeys = React.useMemo(() => {
    const s = new Set<string>([...Object.keys(aDomains), ...Object.keys(bDomains)]);
    return Array.from(s).sort((x, y) => x.localeCompare(y));
  }, [aDomains, bDomains]);

  const diffTotal = React.useMemo(() => {
    if (!a || !b) return null;
    return b.total_score - a.total_score;
  }, [a, b]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Comparaison 2 évaluations (A/B)</DialogTitle>
          <DialogDescription>
            Compare les scores globaux et par domaine. (Le détail complet des réponses peut rester sur “Voir détail”.)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : err ? (
          <div className="text-sm text-red-600">Erreur: {err}</div>
        ) : !evaluationIdA || !evaluationIdB ? (
          <div className="text-sm text-muted-foreground">
            Sélectionne deux évaluations (A et B) à comparer.
          </div>
        ) : !a || !b ? (
          <div className="text-sm text-muted-foreground">Impossible de charger A/B.</div>
        ) : (
          <div className="space-y-4">
            {/* Bandeau A/B */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary">A · V{a.version}</Badge>
                  <Badge variant={a.status === "validated" ? "default" : "secondary"}>{a.status}</Badge>
                  <Badge variant="secondary">Total {pct(a.total_score)}</Badge>
                  <Badge variant="secondary">Grade {a.grade ?? "—"}</Badge>
                  <Badge variant="secondary">PD {a.pd ?? "—"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary">B · V{b.version}</Badge>
                  <Badge variant={b.status === "validated" ? "default" : "secondary"}>{b.status}</Badge>
                  <Badge variant="secondary">Total {pct(b.total_score)}</Badge>
                  <Badge variant="secondary">Grade {b.grade ?? "—"}</Badge>
                  <Badge variant="secondary">PD {b.pd ?? "—"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(b.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Diff global */}
            <div className="rounded-lg border p-3 flex items-center justify-between">
              <div className="font-medium">Δ Total (B − A)</div>
              <div className="text-sm">
                {diffTotal == null ? "—" : `${(diffTotal * 100).toFixed(1)}%`}
              </div>
            </div>

            {/* Tableau domaines */}
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-3">Comparaison par domaine</div>

              {allKeys.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun score domaine disponible.</div>
              ) : (
                <div className="grid gap-2">
                  {allKeys.map((k) => {
                    const av = aDomains[k] ?? 0;
                    const bv = bDomains[k] ?? 0;
                    const dv = bv - av;

                    return (
                      <div
                        key={k}
                        className="grid items-center gap-2 rounded-md border px-3 py-2 md:grid-cols-[140px_1fr_1fr_1fr]"
                      >
                        <div className="text-sm font-medium">{k}</div>
                        <div className="text-sm">A: {pct(av)}</div>
                        <div className="text-sm">B: {pct(bv)}</div>
                        <div className="text-sm">Δ: {(dv * 100).toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>

          <Button
            variant="secondary"
            disabled={!evaluationIdA}
            onClick={() => {
              if (!evaluationIdA) return;
              window.open(`/workspace/scoring/${evaluationIdA}`, "_blank");
            }}
          >
            Ouvrir A
          </Button>

          <Button
            variant="secondary"
            disabled={!evaluationIdB}
            onClick={() => {
              if (!evaluationIdB) return;
              window.open(`/workspace/scoring/${evaluationIdB}`, "_blank");
            }}
          >
            Ouvrir B
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
