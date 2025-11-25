"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Project = { id: string; name: string };

type Dimension = {
  id: string;
  code: string;
  label: string;
  weight: number;
};

type Criterion = {
  id: string;
  code: string;
  label: string;
  weight: number;
};

export default function ScoringPanel({ project }: { project: Project }) {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [criteriaByDim, setCriteriaByDim] = useState<Record<string, Criterion[]>>(
    {}
  );
  const [activeDim, setActiveDim] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadModel = async () => {
      const { data: dims } = await supabase
        .from("scoring_dimensions")
        .select("id, code, label, weight")
        .order("sort_order");

      if (!dims) return;

      setDimensions(dims as Dimension[]);
      if (dims.length > 0) setActiveDim((dims[0] as any).id);

      const { data: crits } = await supabase
        .from("scoring_criteria")
        .select("id, dimension_id, code, label, weight")
        .order("sort_order");

      const byDim: Record<string, Criterion[]> = {};
      (crits || []).forEach((c: any) => {
        if (!byDim[c.dimension_id]) byDim[c.dimension_id] = [];
        byDim[c.dimension_id].push({
          id: c.id,
          code: c.code,
          label: c.label,
          weight: c.weight,
        });
      });
      setCriteriaByDim(byDim);
    };

    loadModel();
  }, []);

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <div>
          <CardTitle>Scoring du projet</CardTitle>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Score global : --</Badge>
          <Button size="sm" variant="outline">
            Nouvelle évaluation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {dimensions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun modèle de scoring chargé.
          </p>
        ) : (
          <Tabs
            value={activeDim}
            onValueChange={setActiveDim}
            className="space-y-4"
          >
            <TabsList>
              {dimensions.map((d) => (
                <TabsTrigger key={d.id} value={d.id}>
                  {d.label} ({d.weight}%)
                </TabsTrigger>
              ))}
            </TabsList>

            {dimensions.map((d) => (
              <TabsContent key={d.id} value={d.id}>
                <div className="space-y-2">
                  {(criteriaByDim[d.id] || []).map((c) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-2 items-center border rounded-md p-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{c.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.code} • poids {c.weight}%
                        </div>
                      </div>
                      <input
                        className="border rounded px-2 py-1 text-sm"
                        placeholder="Valeur / niveau"
                      />
                      <div className="text-center text-xs">
                        Score : <span className="font-semibold">--</span>
                      </div>
                      <div className="text-center text-xs">
                        Pondéré : <span className="font-semibold">--</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
