"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

type EvalRowLite = {
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
  evaluations: EvalRowLite[];
  defaultA: string | null;
  defaultB: string | null;
};

function asDomainScores(results: Json): Record<string, number> {
  if (!results || typeof results !== "object" || Array.isArray(results)) return {};
  const r = results as Record<string, Json>;
  const ds = r.domainScores;
  if (!ds || typeof ds !== "object" || Array.isArray(ds)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(ds as Record<string, Json>)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

export default function EvaluationCompareDialog({
  open,
  onOpenChange,
  evaluations,
  defaultA,
  defaultB,
}: Props) {
  const [aId, setAId] = React.useState<string>(defaultA ?? "");
  const [bId, setBId] = React.useState<string>(defaultB ?? "");

  React.useEffect(() => {
    setAId(defaultA ?? "");
    setBId(defaultB ?? "");
  }, [defaultA, defaultB]);

  const evA = React.useMemo(
    () => evaluations.find((e) => e.id === aId) ?? null,
    [evaluations, aId]
  );
  const evB = React.useMemo(
    () => evaluations.find((e) => e.id === bId) ?? null,
    [evaluations, bId]
  );

  const rows = React.useMemo(() => {
    if (!evA || !evB) return [];
    const da = asDomainScores(evA.results);
    const db = asDomainScores(evB.results);
    const keys = Array.from(new Set([...Object.keys(da), ...Object.keys(db)])).sort();
    return keys.map((k) => ({
      key: k,
      label: k,
      a: da[k] ?? 0,
      b: db[k] ?? 0,
    }));
  }, [evA, evB]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparaison 2 évaluations (A/B)</DialogTitle>
          <DialogDescription>
            Compare les scores par domaine + le total. (Les détails critères viendront ensuite.)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-medium">Évaluation A</div>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={aId}
              onChange={(e) => setAId(e.target.value)}
            >
              <option value="">— choisir —</option>
              {evaluations.map((e) => (
                <option key={e.id} value={e.id}>
                  V{e.version} · {e.status} · {(e.total_score * 100).toFixed(1)}%
                </option>
              ))}
            </select>
            {evA && (
              <div className="text-xs text-muted-foreground">
                Grade: {evA.grade ?? "—"} · PD: {evA.pd ?? "—"} ·{" "}
                {new Date(evA.created_at).toLocaleString()}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Évaluation B</div>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={bId}
              onChange={(e) => setBId(e.target.value)}
            >
              <option value="">— choisir —</option>
              {evaluations.map((e) => (
                <option key={e.id} value={e.id}>
                  V{e.version} · {e.status} · {(e.total_score * 100).toFixed(1)}%
                </option>
              ))}
            </select>
            {evB && (
              <div className="text-xs text-muted-foreground">
                Grade: {evB.grade ?? "—"} · PD: {evB.pd ?? "—"} ·{" "}
                {new Date(evB.created_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden mt-2">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 w-[40%]">Domaine</th>
                <th className="text-left p-3 w-[20%]">A</th>
                <th className="text-left p-3 w-[20%]">B</th>
                <th className="text-left p-3 w-[20%]">Δ (B-A)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="p-3 font-medium">{r.label}</td>
                  <td className="p-3">{(r.a * 100).toFixed(1)}%</td>
                  <td className="p-3">{(r.b * 100).toFixed(1)}%</td>
                  <td className="p-3">{((r.b - r.a) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="border-t">
                  <td className="p-3 text-muted-foreground" colSpan={4}>
                    Sélectionne A et B pour comparer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
