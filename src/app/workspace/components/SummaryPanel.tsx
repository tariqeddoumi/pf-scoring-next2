// src/app/workspace/components/SummaryPanel.tsx
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

import type { ClientRow, ProjectRow } from "../types";

type Props = {
  client: ClientRow | null;
  project: ProjectRow | null;
};

function formatMoney(amount: number | null | undefined, currency?: string | null) {
  const v = typeof amount === "number" ? amount : 0;
  const c = currency ?? "MAD";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    // currency non standard -> fallback
    return `${v.toLocaleString("fr-FR")} ${c}`;
  }
}

export default function SummaryPanel({ client, project }: Props) {
  if (!client && !project) {
    return (
      <div className="text-sm text-muted-foreground">
        Sélectionnez un client et un projet pour afficher la synthèse.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Client */}
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Client</div>
          {client ? (
            <Badge variant={client.status === "Actif" ? "default" : "secondary"}>
              {client.status}
            </Badge>
          ) : null}
        </div>

        <div className="mt-2 text-sm">
          <div className="font-medium">{client?.name ?? "—"}</div>
          <div className="text-muted-foreground">
            Radical: {client?.radical ?? "—"} • Segment: {client?.segment ?? "—"}
          </div>
        </div>
      </div>

      {/* Projet */}
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Projet</div>
          {project ? <Badge variant="secondary">{project.status}</Badge> : null}
        </div>

        <div className="mt-2 text-sm space-y-1">
          <div className="font-medium">{project?.name ?? "—"}</div>
          <div className="text-muted-foreground">
            Code: {project?.project_code ?? "—"} • Ville: {project?.city ?? "—"} • Type:{" "}
            {project?.project_type ?? "—"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Coût total</div>
            <div className="text-sm font-semibold">
              {formatMoney(project?.total_cost ?? null, project?.currency)}
            </div>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Financement</div>
            <div className="text-sm font-semibold">
              {formatMoney(project?.financing_amount ?? null, project?.currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
