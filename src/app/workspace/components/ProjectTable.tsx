"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ClientRow, ProjectRow, ProjectStatus } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import ProjectFormModal from "./ProjectFormModal";

type Props = {
  client: ClientRow;
  selectedProject: ProjectRow | null;
  onSelect: (p: ProjectRow) => void;
};

export default function ProjectTable({ client, selectedProject, onSelect }: Props) {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);

  async function fetchProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("id, created_at, client_id, name, project_code, city, project_type, status, notes, total_cost, financing_amount")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error) setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, [client.id]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) =>
      [p.name, p.project_code, p.city, p.project_type, p.status, p.notes].filter(Boolean).join(" ").toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function setStatus(id: string, status: ProjectStatus) {
    await supabase.from("projects").update({ status }).eq("id", id);
    await fetchProjects();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Projets — <span className="text-muted-foreground">{client.name}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input className="h-9 w-[280px]" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              + Nouveau
            </Button>
            <Button size="sm" variant="outline" onClick={fetchProjects}>
              Rafraîchir
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground mb-2">
          {loading ? "Chargement…" : `${filtered.length} projet(s)`}
        </div>

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((p) => {
                const isSelected = selectedProject?.id === p.id;
                return (
                  <TableRow
                    key={p.id}
                    className={isSelected ? "bg-muted/50" : ""}
                    onClick={() => onSelect(p)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell className="font-mono text-xs">{p.project_code ?? "—"}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.city ?? "—"}</TableCell>
                    <TableCell>{p.project_type ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "validated" ? "default" : p.status === "draft" ? "secondary" : "outline"}>
                        {p.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                        >
                          Modifier
                        </Button>

                        {p.status !== "archived" ? (
                          <Button size="sm" variant="secondary" onClick={() => setStatus(p.id, "archived")}>
                            Archiver
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setStatus(p.id, "draft")}>
                            Réactiver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Aucun résultat.
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
