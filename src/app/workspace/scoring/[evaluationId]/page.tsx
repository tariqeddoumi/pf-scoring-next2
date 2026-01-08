"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

type EvalRow = {
  id: string;
  set_id: string;
  version: number;
  status: "draft" | "validated" | "archived";
  answers: Json;
  results: Json;
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
  validated_at: string | null;
};

type AnswerValue = string | number | null;
type Answers = Record<number, { value?: AnswerValue; sub?: Record<number, { value?: AnswerValue }> }>;

function asObj(v: Json): Record<string, Json> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, Json>;
}

function pickDomainScores(results: Json): Record<string, number> {
  const r = asObj(results);
  const ds = r ? asObj(r.domainScores ?? null) : null;
  if (!ds) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(ds)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

/**
 * On essaye de lire un "detail" si tu le stockes dans results.detail (optionnel).
 * Sinon on affichera juste answers brutes.
 */
type DetailNode = {
  code: string;
  weight?: number;
  chosen?: { label: string; score?: number; optionId?: number } | null;
  numeric?: number | null;
  text?: string | null;
  sub?: DetailNode[];
};

function pickDetail(results: Json): Record<string, DetailNode[]> | null {
  const r = asObj(results);
  const detail = r ? asObj(r.detail ?? null) : null;
  if (!detail) return null;

  const out: Record<string, DetailNode[]> = {};
  for (const [domCode, nodes] of Object.entries(detail)) {
    if (!Array.isArray(nodes)) continue;
    out[domCode] = nodes as unknown as DetailNode[];
  }
  return out;
}

export default function EvaluationDetailPage({
  params,
}: {
  params: { evaluationId: string };
}) {
  const evaluationId = params.evaluationId;

  const [loading, setLoading] = React.useState(true);
  const [ev, setEv] = React.useState<EvalRow | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("scoring_evaluations")
        .select("id,set_id,version,status,answers,results,total_score,grade,pd,created_at,validated_at")
        .eq("id", evaluationId)
        .single();

      if (error) {
        setErr(error.message);
        setEv(null);
      } else {
        setEv(data as EvalRow);
      }

      setLoading(false);
    })();
  }, [evaluationId]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  if (err) return <div className="p-6 text-sm text-red-600">Erreur: {err}</div>;
  if (!ev) return <div className="p-6 text-sm text-muted-foreground">Évaluation introuvable.</div>;

  const domainScores = pickDomainScores(ev.results);
  const detail = pickDetail(ev.results);
  const answers = (ev.answers && typeof ev.answers === "object" && !Array.isArray(ev.answers))
    ? (ev.answers as unknown as Answers)
    : {};

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-2xl font-semibold">Détail d’évaluation</div>
          <div className="text-sm text-muted-foreground">
            V{ev.version} · {ev.status} · {new Date(ev.created_at).toLocaleString()}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            Retour
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-3 flex flex-wrap gap-2">
          <Badge variant="secondary">Total: {(Number(ev.total_score) * 100).toFixed(1)}%</Badge>
          <Badge variant="secondary">Grade: {ev.grade ?? "—"}</Badge>
          <Badge variant="secondary">PD: {ev.pd ?? "—"}</Badge>
          {ev.validated_at ? (
            <Badge>Validé: {new Date(ev.validated_at).toLocaleString()}</Badge>
          ) : (
            <Badge variant="secondary">Non validé</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scores par domaine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.keys(domainScores).length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun score domaine disponible.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(domainScores)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-md border p-3">
                    <div className="font-medium">{k}</div>
                    <div className="text-sm">{(v * 100).toFixed(1)}%</div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Détail critères / sous-critères</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail ? (
            Object.entries(detail)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dom, nodes]) => (
                <div key={dom} className="space-y-2">
                  <div className="font-semibold">{dom}</div>
                  <div className="space-y-2">
                    {nodes.map((n, idx) => (
                      <DetailBlock key={`${dom}-${idx}`} node={n} />
                    ))}
                  </div>
                </div>
              ))
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                (Mode “fallback”) Le détail n’est pas stocké dans <code>results.detail</code>. J’affiche les réponses brutes.
              </div>
              <pre className="text-xs rounded-md border p-3 overflow-auto bg-muted/20">
                {JSON.stringify(answers, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailBlock({ node }: { node: DetailNode }) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{node.code}</div>
        <div className="text-xs text-muted-foreground">
          {node.weight !== undefined ? `w ${node.weight}` : ""}
        </div>
      </div>

      {node.chosen ? (
        <div className="text-sm">
          <span className="text-muted-foreground">Choix:</span>{" "}
          <span className="font-medium">{node.chosen.label}</span>
          {typeof node.chosen.score === "number" ? (
            <span className="text-muted-foreground"> · score {node.chosen.score}</span>
          ) : null}
        </div>
      ) : null}

      {typeof node.numeric === "number" ? (
        <div className="text-sm">
          <span className="text-muted-foreground">Valeur:</span>{" "}
          <span className="font-medium">{node.numeric}</span>
        </div>
      ) : null}

      {node.text ? (
        <div className="text-sm">
          <span className="text-muted-foreground">Texte:</span>{" "}
          <span className="font-medium">{node.text}</span>
        </div>
      ) : null}

      {node.sub?.length ? (
        <div className="pl-3 border-l space-y-2">
          {node.sub.map((s, i) => (
            <DetailBlock key={`${node.code}-sub-${i}`} node={s} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

