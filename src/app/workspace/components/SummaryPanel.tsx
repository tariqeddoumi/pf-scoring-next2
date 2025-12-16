"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ClientRow, ProjectRow } from "../types";

type Props = {
  client: ClientRow | null;
  project: ProjectRow | null;
  onClearClient?: () => void;
  onClearProject?: () => void;
};

function fmtMoney(v?: number | null) {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(v);
  } catch {
    return `${v} MAD`;
  }
}

export default function SummaryPanel({ client, project, onClearClient, onClearProject }: Props) {
  return (
    <Card className="border bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <CardHeader className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Synthèse rapide</CardTitle>

          <div className="flex items-center gap-2">
            <Badge variant={client ? "default" : "secondary"}>
              Client: {client?.radical ?? "—"}
            </Badge>
            <Badge variant={project ? "default" : "secondary"}>
              Projet: {project?.project_code ?? project?.id?.slice(0, 8) ?? "—"}
            </Badge>

            {client && (
              <Button size="sm" variant="outline" onClick={onClearClient}>
                Reset client
              </Button>
            )}
            {project && (
              <Button size="sm" variant="outline" onClick={onClearProject}>
                Reset projet
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="py-3">
        <div className="grid gap-3 md:grid-cols-3">
          {/* Bloc client */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Client</div>
            <div className="font-medium">{client?.name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              Segment: {client?.segment ?? "—"} • Statut: {client?.status ?? "—"}
            </div>
          </div>

          {/* Bloc projet */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Projet</div>
            <div className="font-medium">{project?.name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              Ville: {project?.city ?? "—"} • Type: {project?.type ?? project?.project_type ?? "—"}
            </div>
          </div>

          {/* Chiffres */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Chiffres</div>
            <div className="text-sm">
              Coût total: <span className="font-medium">{fmtMoney(project?.total_cost)}</span>
            </div>
            <div className="text-sm">
              Financement: <span className="font-medium">{fmtMoney(project?.financing_amount)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
