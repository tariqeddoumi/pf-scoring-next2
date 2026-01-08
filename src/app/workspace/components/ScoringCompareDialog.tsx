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

export type CompareRow = {
  key: string;
  label: string;
  a: string;
  b: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  rows: CompareRow[];
};

export default function ScoringCompareDialog({
  open,
  onOpenChange,
  title = "Comparaison de 2 évaluations",
  description = "A/B — détail des écarts sur les critères.",
  rows,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 w-[35%]">Critère</th>
                <th className="text-left p-3 w-[30%]">Évaluation A</th>
                <th className="text-left p-3 w-[30%]">Évaluation B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="p-3 font-medium">{r.label}</td>
                  <td className="p-3">{r.a}</td>
                  <td className="p-3">{r.b}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="border-t">
                  <td className="p-3 text-muted-foreground" colSpan={3}>
                    Aucune donnée à comparer.
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
