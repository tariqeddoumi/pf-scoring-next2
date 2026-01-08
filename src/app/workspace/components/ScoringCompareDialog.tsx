"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EvalRow = {
  id: string;
  version: number;
  status: "draft" | "validated" | "archived";
  total_score: number;
  grade: string | null;
  pd: number | null;
  results: any; // { domainScores: {D1:0.1,...}, total:... }
};

export default function EvaluationCompareDialog({
  open,
  onOpenChange,
  evaluations,
  defaultA,
  defaultB,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  evaluations: EvalRow[];
  defaultA: string | null;
  defaultB: string | null;
}) {
  const [a, setA] = React.useState<string>(defaultA ?? "");
  const [b, setB] = React.useState<string>(defaultB ?? "");
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setA(defaultA ?? "");
    setB(defaultB ?? "");
    setData(null);
  }, [open, defaultA, defaultB]);

  async function runCompare() {
    if (!a || !b) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("fn_scoring_eval_compare", { p_eval_a: a, p_eval_b: b });
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    setData(data);
  }

  const evA = evaluations.find(x => x.id === a);
  const evB = evaluations.find(x => x.id === b);

  const dsA = (data?.A?.domainScores ?? {}) as Record<string, number>;
  const dsB = (data?.B?.domainScores ?? {}) as Record<string, number>;
  const allKeys = Array.from(new Set([...Object.keys(dsA), ...Object.keys(dsB)])).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparaison 2 évaluations (A/B)</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3 sm:items-end">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Évaluation A</div>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={a} onChange={(e) => setA(e.target.value)}>
                <option value="">—</option>
                {evaluations.map(ev => (
                  <option key={ev.id} value={ev.id}>V{ev.version} · {ev.status}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Évaluation B</div>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={b} onChange={(e) => setB(e.target.value)}>
                <option value="">—</option>
                {evaluations.map(ev => (
                  <option key={ev.id} value={ev.id}>V{ev.version} · {ev.status}</option>
                ))}
              </select>
            </div>

            <Button onClick={runCompare} disabled={!a || !b || loading}>
              {loading ? "Comparaison..." : "Comparer"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {evA && (
              <Badge variant="secondary">
                A: V{evA.version} · {(Number(evA.total_score) * 100).toFixed(1)}% · {evA.grade ?? "—"}
              </Badge>
            )}
            {evB && (
              <Badge variant="secondary">
                B: V{evB.version} · {(Number(evB.total_score) * 100).toFixed(1)}% · {evB.grade ?? "—"}
              </Badge>
            )}
          </div>

          {data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>B</TableHead>
                  <TableHead>Δ (B-A)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allKeys.map(k => {
                  const va = Number(dsA[k] ?? 0);
                  const vb = Number(dsB[k] ?? 0);
                  const diff = vb - va;
                  return (
                    <TableRow key={k}>
                      <TableCell className="font-medium">{k}</TableCell>
                      <TableCell>{(va * 100).toFixed(1)}%</TableCell>
                      <TableCell>{(vb * 100).toFixed(1)}%</TableCell>
                      <TableCell className={diff >= 0 ? "text-green-600" : "text-red-600"}>
                        {(diff * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!data && (
            <div className="text-sm text-muted-foreground">
              Choisis A et B puis clique “Comparer”.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
