"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { LoanRow, ProjectRow, LoanStatus } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import CreditFormModal from "./CreditFormModal";

type Props = {
  project: ProjectRow;
};

export default function CreditTable({ project }: Props) {
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoanRow | null>(null);

  async function fetchLoans() {
    setLoading(true);
    const { data, error } = await supabase
      .from("loans")
      .select("id, created_at, project_id, facility_type, currency, amount, tenor_months, rate, status, notes")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error) setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchLoans();
  }, [project.id]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((l) =>
      [l.facility_type, l.currency, l.status, l.notes].filter(Boolean).join(" ").toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function setStatus(id: string, status: LoanStatus) {
    await supabase.from("loans").update({ status }).eq("id", id);
    await fetchLoans();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Crédits — <span className="text-muted-foreground">{project.name}</span>
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
            <Button size="sm" variant="outline" onClick={fetchLoans}>
              Rafraîchir
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground mb-2">
          {loading ? "Chargement…" : `${filtered.length} crédit(s)`}
        </div>

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead>Tenor</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.facility_type ?? "—"}</TableCell>
                  <TableCell>{l.amount ?? "—"}</TableCell>
                  <TableCell>{l.currency ?? "—"}</TableCell>
                  <TableCell>{l.tenor_months ?? "—"}</TableCell>
                  <TableCell>{l.rate ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "validated" ? "default" : l.status === "draft" ? "secondary" : "outline"}>
                      {l.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(l);
                          setOpen(true);
                        }}
                      >
                        Modifier
                      </Button>

                      {l.status !== "archived" ? (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(l.id, "archived")}>
                          Archiver
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(l.id, "draft")}>
                          Réactiver
                        </Button>
                      )}
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
