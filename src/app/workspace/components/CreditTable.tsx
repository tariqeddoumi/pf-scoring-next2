"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { LoanRow, ProjectRow } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import CreditFormModal from "./CreditFormModal";

type Props = {
  project: ProjectRow;
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erreur inattendue.";
}

export default function CreditTable({ project }: Props) {
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoanRow | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("loans")
        .select("id, created_at, updated_at, project_id, facility_type, amount, currency, tenor_months, pricing, status, notes")
        .eq("project_id", project.id)
        .order("updated_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      setRows((data ?? []) as LoanRow[]);
    } catch (e: unknown) {
      setError(errMsg(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((l) => {
      const s = `${l.facility_type} ${l.currency ?? ""} ${l.status}`.toLowerCase();
      return s.includes(needle);
    });
  }, [rows, q]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(l: LoanRow) {
    setEditing(l);
    setOpen(true);
  }

  async function remove(l: LoanRow) {
    if (!confirm(`Supprimer le crédit "${l.facility_type}" ?`)) return;
    const { error } = await supabase.from("loans").delete().eq("id", l.id);
    if (error) setError(error.message);
    await fetchLoans();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Crédits</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate}>+ Nouveau</Button>
            <Button size="sm" variant="outline" onClick={fetchLoans}>Rafraîchir</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (type, devise, statut)..." />
          <div className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${filtered.length} / ${rows.length}`}
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facilité</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead>Tenor</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.facility_type}</TableCell>
                  <TableCell>{l.amount ?? "—"}</TableCell>
                  <TableCell>{l.currency ?? "—"}</TableCell>
                  <TableCell>{l.tenor_months ?? "—"}</TableCell>
                  <TableCell>{l.pricing ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "validated" ? "default" : l.status === "draft" ? "secondary" : "outline"}>
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(l)}>Modifier</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(l)}>Supprimer</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Aucun crédit.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <CreditFormModal
          open={open}
          onOpenChange={setOpen}
          projectId={project.id}
          loan={editing}
          onSaved={fetchLoans}
        />
      </CardContent>
    </Card>
  );
}
