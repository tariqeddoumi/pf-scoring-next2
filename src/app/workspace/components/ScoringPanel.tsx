"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeScores, resolveGrade } from "@/lib/scoring";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ProjectRow } from "../types";
import ScoringDetailDialog from "./ScoringDetailDialog";

type AnswerValue = string | number;

type Answers = Record<
  number,
  {
    value?: AnswerValue;
    sub?: Record<number, { value?: AnswerValue }>;
  }
>;

type EvalRow = {
  id: string;
  version: number;
  status: "draft" | "validated" | "archived";
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
};

export default function ScoringPanel({ project }: { project: ProjectRow }) {
  const [answers, setAnswers] = React.useState<Answers>({});
  const [history, setHistory] = React.useState<EvalRow[]>([]);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const computed = React.useMemo(
    () => computeScores([], answers),
    [answers]
  );

  async function loadHistory() {
    const { data } = await supabase
      .from("scoring_evaluations")
      .select("id,version,status,total_score,grade,pd,created_at")
      .eq("project_id", project.id)
      .order("version", { ascending: false });

    setHistory((data ?? []) as EvalRow[]);
  }

  React.useEffect(() => {
    loadHistory();
  }, [project.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-3 flex flex-wrap gap-2">
          <Badge variant="secondary">
            Total {(computed.total * 100).toFixed(1)}%
          </Badge>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historique des évaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucune évaluation.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>V{ev.version}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ev.status === "validated"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {ev.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(ev.total_score * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>{ev.grade ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDetailId(ev.id);
                          setDetailOpen(true);
                        }}
                      >
                        Voir détail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ScoringDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        evaluationId={detailId}
      />
    </div>
  );
}
