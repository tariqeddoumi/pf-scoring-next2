"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientRow, ProjectRow } from "../types";

type Props = {
  client: ClientRow | null;
  project: ProjectRow | null;
};

function fmtMoney(v: number | null | undefined, ccy = "MAD") {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${v} ${ccy}`;
  }
}

export default function SummaryPanel({ client, project }: Props) {
  return (
    <Card className="border bg-card">
      <CardHeader>
        <CardTitle>Synthèse</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {!client && !project ? (
          <div className="text-muted-foreground">
            Sélectionnez un client et un projet pour afficher la synthèse.
          </div>
        ) : null}

        {client ? (
          <div className="space-y-1">
            <div className="font-medium">Client</div>
            <div>{client.name ?? "—"}</div>
            <div className="text-muted-foreground">
              Radical: {client.radical ?? "—"} • Segment: {client.segment ?? "—"} • Statut:{" "}
              {client.status ?? "—"}
            </div>
          </div>
        ) : null}

        {project ? (
          <div className="space-y-1">
            <div className="font-medium">Projet</div>
            <div>{project.name ?? "—"}</div>
            <div className="text-muted-foreground">
              Code: {project.project_code ?? "—"} • Ville: {project.city ?? "—"} • Type:{" "}
              {project.type ?? "—"} • Statut: {project.status ?? "—"}
            </div>

            <div className="pt-2">
              <div className="font-medium">Chiffres</div>
              <div>Coût total: {fmtMoney(project.total_cost, project.currency ?? "MAD")}</div>
              <div>
                Financement: {fmtMoney(project.financing_amount, project.currency ?? "MAD")}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
