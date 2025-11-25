"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Project = { id: string; name: string };

export default function SummaryPanel({ project }: { project: Project }) {
  // TODO : charger le dernier scoring_run + decision_notes pour ce projet
  return (
    <Card>
      <CardHeader>
        <CardTitle>Synthèse &amp; Décision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium mb-1">Projet</p>
          <p className="text-muted-foreground">{project.name}</p>
        </div>

        <div>
          <p className="font-medium mb-1">Récapitulatif du scoring</p>
          <p className="text-muted-foreground">
            Score global : -- • Grade : -- • Résumé à compléter...
          </p>
        </div>

        <div>
          <p className="font-medium mb-1">Synthèse analyste</p>
          <Textarea placeholder="Résumé qualitatif du risque et des points clés pour la décision..." />
        </div>

        <div>
          <p className="font-medium mb-1">Décision proposée</p>
          <Textarea placeholder="Accord / Accord avec réserves / Refus + conditions..." />
        </div>

        <div className="flex justify-end">
          <Button>Enregistrer la décision</Button>
        </div>
      </CardContent>
    </Card>
  );
}
