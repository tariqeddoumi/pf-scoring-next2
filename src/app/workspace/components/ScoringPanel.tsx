"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ProjectRow, EvaluationRow, EvaluationStatus } from "../types";

import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  project: ProjectRow;
};

export default function ScoringPanel({ project }: Props) {
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EvaluationRow | null>(null);

  const [status, setStatus] = useState<EvaluationStatus>("draft");
  const [totalScore, setTotalScore] = useState<string>("");
  const [payload, setPayload] = useState<string>("{}");
  const [error, setError] = useState<string | null>(null);

  const fetchEvals = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("evaluations")
      .select("id, created_at, project_id, status, total_score, payload")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRows(data);
    }

    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    fetchEvals();
  }, [fetchEvals]);

  const title = useMemo(
    () => `Évaluations — ${project.name}`,
    [project.name]
  );

  function openCreate() {
    setEditing(null);
    setStatus("draft");
    setTotalScore("");
    setPayload("{}");
    setError(null);
    setOpen(true);
  }

  function openEdit(e: EvaluationRow) {
    setEditing(e);
    setStatus(e.status ?? "draft");
    setTotalScore(e.total_score != null ? String(e.total_score) : "");
    setPayload(JSON.stringify(e.payload ?? {}, null, 2));
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);

    let json: unknown;
    try {
      json = JSON.parse(payload || "{}");
    } catch {
      setError("Payload JSON invalide");
      return;
    }

    const toSave: Partial<EvaluationRow> = {
      project_id: project.id,
      status,
      total_score: totalScore ? Number(totalScore) : undefined,
      payload: json,
    };

    const query = editing
      ? supabase.from("evaluations").update(toSave).eq("id", editing.id)
      : supabase.from("evaluations").insert(toSave);

    const { error } = await query;
    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    fetchEvals();
  }

  async function remove(id: string) {
    await supabase.from("evaluations").delete().eq("id", id);
    fetchEvals();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">{title}</CardTitle>
          <Button size="sm" onClick={openCreate}>+ Nouvelle</Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading && <div className="text-sm">Chargement…</div>}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Score</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{new Date(e.created_at!).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge>{e.status}</Badge>
                </TableCell>
                <TableCell>{e.total_score ?? "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(e.id)}>
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Modifier évaluation" : "Nouvelle évaluation"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <Label>Statut</Label>
              <select
                className="h-9 border rounded px-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as EvaluationStatus)}
              >
                <option value="draft">draft</option>
                <option value="validated">validated</option>
                <option value="archived">archived</option>
              </select>

              <Label>Score</Label>
              <Input value={totalScore} onChange={(e) => setTotalScore(e.target.value)} />

              <Label>Payload JSON</Label>
              <Textarea
                className="font-mono text-xs min-h-[200px]"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
              />

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={save}>Enregistrer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
