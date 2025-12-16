"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ProjectRow, EvaluationRow } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  project: ProjectRow;
};

export default function ScoringPanel({ project }: Props) {
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EvaluationRow | null>(null);

  const [status, setStatus] = useState<EvaluationRow["status"]>("draft");
  const [totalScore, setTotalScore] = useState("");
  const [payload, setPayload] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  async function fetchEvals() {
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluations")
      .select("id, created_at, project_id, status, total_score, payload")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error) setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchEvals();
  }, [project.id]);

  const title = useMemo(() => `Évaluations — ${project.name}`, [project.name]);

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
    setPayload(e.payload ? JSON.stringify(e.payload, null, 2) : "{}");
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);

    let json: any = {};
    try {
      json = payload.trim() ? JSON.parse(payload) : {};
    } catch {
      setError("Payload JSON invalide.");
      return;
    }

    const toSave: Partial<EvaluationRow> = {
      project_id: project.id,
      status: status ?? "draft",
      total_score: totalScore.trim() ? Number(totalScore) : undefined,
      payload: json,
    };

    if (editing) {
      const { error } = await supabase.from("evaluations").update(toSave).eq("id", editing.id);
      if (error) return setError(error.message);
    } else {
      const { error } = await supabase.from("evaluations").insert(toSave);
      if (error) return setError(error.message);
    }

    setOpen(false);
    await fetchEvals();
  }

  async function remove(id: string) {
    await supabase.from("evaluations").delete().eq("id", id);
    await fetchEvals();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate}>
              + Nouvelle évaluation
            </Button>
            <Button size="sm" variant="outline" onClick={fetchEvals}>
              Rafraîchir
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground mb-2">
          {loading ? "Chargement…" : `${rows.length} évaluation(s)`}
        </div>

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.created_at ? new Date(e.created_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "validated" ? "default" : e.status === "draft" ? "secondary" : "outline"}>
                      {e.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{e.total_score ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(e.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Aucune évaluation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier évaluation" : "Nouvelle évaluation"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label>Statut</Label>
                  <select className="h-9 rounded-md border px-2" value={status ?? "draft"} onChange={(ev) => setStatus(ev.target.value as any)}>
                    <option value="draft">draft</option>
                    <option value="validated">validated</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <div className="grid gap-1 col-span-2">
                  <Label>Score total</Label>
                  <Input value={totalScore} onChange={(e) => setTotalScore(e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div className="grid gap-1">
                <Label>Payload (JSON)</Label>
                <Textarea className="font-mono text-xs min-h-[260px]" value={payload} onChange={(e) => setPayload(e.target.value)} />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={save}>Enregistrer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
