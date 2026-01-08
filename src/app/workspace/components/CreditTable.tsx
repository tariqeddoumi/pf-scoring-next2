"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import CreditFormModal from "./CreditFormModal";
import type { LoanRow, ProjectRow } from "../types";

const LOANS_TABLE = "loans";

function fmtMoney(v: number | null | undefined, ccy?: string) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v) + (ccy ? ` ${ccy}` : "");
  } catch {
    return `${v}${ccy ? ` ${ccy}` : ""}`;
  }
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v) + " %";
  } catch {
    return `${v} %`;
  }
}

type Props = { project: ProjectRow };

export default function CreditTable({ project }: Props) {
  const [rows, setRows] = React.useState<LoanRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [q, setQ] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LoanRow | null>(null);

  const fetchLoans = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: e } = await supabase
      .from(LOANS_TABLE)
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (e) setError(e.message);
    setRows((data as LoanRow[]) ?? []);
    setLoading(false);
  }, [project.id]);

  React.useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        (r.facility_type ?? "").toLowerCase().includes(s) ||
        (r.currency ?? "").toLowerCase().includes(s) ||
        (r.status ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(r: LoanRow) {
    setEditing(r);
    setOpen(true);
  }

  async function remove(r: LoanRow) {
    if (!confirm("Supprimer ce crédit ?")) return;
    const { error: e } = await supabase.from(LOANS_TABLE).delete().eq("id", r.id);
    if (e) {
      setError(e.message);
      return;
    }
    await fetchLoans();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Crédits</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openNew}>+ Nouveau</Button>
          <Button size="sm" variant="outline" onClick={fetchLoans}>Rafraîchir</Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (type, devise, statut)…"
            />
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {loading ? "Chargement…" : `${filtered.length} / ${rows.length}`}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
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
                    <TableCell>{fmtMoney(l.amount, l.currency ?? undefined)}</TableCell>
                    <TableCell>{l.currency ?? "—"}</TableCell>
                    <TableCell>{l.tenor_months != null ? `${l.tenor_months} m` : "—"}</TableCell>
                    <TableCell>{fmtPct(l.pricing)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.status === "validated"
                            ? "default"
                            : l.status === "draft"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                          Modifier
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(l)}>
                          Supprimer
                        </Button>
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
        </div>
      </CardContent>
    </Card>
  );
}
