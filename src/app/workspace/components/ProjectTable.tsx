"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ClientRow, ProjectRow } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import ProjectFormModal from "./ProjectFormModal";

type Props = {
  client: ClientRow;
  selectedProject: ProjectRow | null;
  onSelect: (p: ProjectRow) => void;
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erreur inattendue.";
}

export default function ProjectTable({ client, selectedProject, onSelect }: Props) {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, created_at, updated_at, client_id, name, project_code, project_type, city, total_cost, financing_amount, status, notes")
        .eq("client_id", client.id)
        .order("updated_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      setRows((data ?? []) as ProjectRow[]);
    } catch (e: unknown) {
      setError(errMsg(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((p) => {
      const s = `${p.name} ${p.project_code ?? ""} ${p.project_type ?? ""} ${p.city ?? ""}`.toLowerCase();
      return s.includes(needle);
    });
  }, [rows, q]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(p: ProjectRow) {
    setEditing(p);
    setOpen(true);
  }

  async function remove(p: ProjectRow) {
    if (!confirm(`Supprimer le projet "${p.name}" ?`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) setError(error.message);
    await fetchProjects();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Projets</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate}>+ Nouveau</Button>
            <Button size="sm" variant="outline" onClick={fetchProjects}>Rafraîchir</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, code, type, ville)..." />
          <div className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${filtered.length} / ${rows.length}`}
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projet</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((p) => {
                const isSel = selectedProject?.id === p.id;
                return (
                  <TableRow
                    key={p.id}
                    className={isSel ? "bg-muted/40" : ""}
                    onClick={() => onSelect(p)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.project_code ?? "—"}</TableCell>
                    <TableCell>{p.city ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "validated" ? "default" : p.status === "draft" ? "secondary" : "outline"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
                          Modifier
                        </Button>
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); remove(p); }}>
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Aucun projet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ProjectFormModal
          open={open}
          onOpenChange={setOpen}
          client={client}
          project={editing}
          onSaved={fetchProjects}
        />
      </CardContent>
    </Card>
  );
}
