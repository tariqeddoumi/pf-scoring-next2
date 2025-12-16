"use client";

import type { ClientRow, ProjectRow } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  client: ClientRow;
  project: ProjectRow;
};

function fmtMoney(v?: number) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(v);
  } catch {
    return `${v} MAD`;
  }
}

export default function SummaryPanel({ client, project }: Props) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Synthèse</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="py-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Client</div>
            <div className="font-medium">{client.name}</div>
            <div className="text-sm text-muted-foreground">
              Radical: {client.radical ?? "—"} • Segment: {client.segment ?? "—"} • Statut: {client.status}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Projet</div>
            <div className="font-medium">{project.name}</div>
            <div className="text-sm text-muted-foreground">
              Code: {project.project_code ?? "—"} • Ville: {project.city ?? "—"} • Type: {project.project_type ?? "—"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Chiffres</div>
            <div className="text-sm">Coût total: <span className="font-medium">{fmtMoney(project.total_cost)}</span></div>
            <div className="text-sm">Financement: <span className="font-medium">{fmtMoney(project.financing_amount)}</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
