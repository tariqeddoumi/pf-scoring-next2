"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClientRow, ProjectRow } from "../types";

type Props = {
  client: ClientRow | null;
  project: ProjectRow | null;
};

export default function SummaryPanel({ client, project }: Props) {
  if (!client || !project) {
    return (
      <div className="text-sm text-slate-600">
        Sélectionnez un client et un projet pour afficher la synthèse.
      </div>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          📊 Synthèse décisionnelle
          <Badge variant="secondary">V5</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
        {/* Identité */}
        <div className="space-y-1">
          <div><strong>Client :</strong> {client.name} ({client.radical})</div>
          <div><strong>Segment :</strong> {client.segment ?? "—"}</div>
        </div>

        <div className="space-y-1">
          <div><strong>Projet :</strong> {project.name}</div>
          <div><strong>Type :</strong> {project.type ?? "—"}</div>
        </div>

        {/* Décision */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <strong>Score :</strong>
            <Badge className="bg-emerald-600 text-white">A</Badge>
          </div>
          <div><strong>Statut :</strong> Draft</div>
        </div>

        {/* Chiffres */}
        <div className="space-y-1">
          <div><strong>Coût total :</strong> {project.total_cost ?? "—"}</div>
          <div><strong>Financement :</strong> {project.financing_amount ?? "—"}</div>
        </div>
      </CardContent>
    </Card>
  );
}
