"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import CreditFormModal , {Loan} from "./CreditFormModal";
import type { ClientRow, ProjectRow, LoanRow } from "../types";

const LOANS_TABLE = "project_loans"; // <-- change to "loans" if needed

type Props = {
  project: ProjectRow;
};

function fmtMoney(amount: number, ccy: string) {
  const a = Number(amount || 0);
  const cur = (ccy || "MAD").toUpperCase();
  return `${a.toLocaleString("fr-MA")} ${cur}`;
}

export default function CreditTable({ project }: Props) {
  const [rows, setRows] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [onlyValidated, setOnlyValidated] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(LOANS_TABLE)
      .select(
        "id, project_id, facility_type, amount, currency, maturity_months, margin_bps, rate_percent, status, comments, created_at, updated_at"
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Erreur chargement crédits : " + error.message);
      return;
    }
    setRows((data || []) as Loan[]);
  };

  useEffect(() => {
    load();
  }, [project.id]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => (onlyValidated ? r.status === "validated" : true))
      .filter((r) => {
        if (!term) return true;
        const hay = [
          r.facility_type,
          r.currency,
          r.status,
          r.comments || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
  }, [rows, q, onlyValidated]);

  const totals = useMemo(() => {
    const byCcy: Record<string, number> = {};
    for (const r of filtered) {
      const c = (r.currency || "MAD").toUpperCase();
      byCcy[c] = (byCcy[c] || 0) + Number(r.amount || 0);
    }
    return byCcy;
  }, [filtered]);

  const openNew = () => {
    setEditing(null);
    setForceCreate(false);
    setOpen(true);
  };

  const openEdit = (r: Loan) => {
    setEditing(r);
    setForceCreate(false);
    setOpen(true);
  };

  const openDuplicate = (r: Loan) => {
    setEditing(r);
    setForceCreate(true); // force création
    setOpen(true);
  };

  const del = async (r: Loan) => {
    if (!r.id) return;
    if (!confirm("Supprimer ce crédit ?")) return;

    const { error } = await supabase.from(LOANS_TABLE).delete().eq("id", r.id);
    if (error) {
      alert("Erreur suppression : " + error.message);
      return;
    }
    load();
  };

  const quickToggleValidate = async (r: Loan) => {
    if (!r.id) return;
    const next = r.status === "validated" ? "draft" : "validated";
    const { error } = await supabase
      .from(LOANS_TABLE)
      .update({ status: next })
      .eq("id", r.id);

    if (error) {
      alert("Erreur MAJ statut : " + error.message);
      return;
    }
    load();
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span>2. Crédits / Financements</span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openNew}>
              + Ajouter
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {/* Toolbar ultra compacte */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-[260px]"
            placeholder="Rechercher (type, devise, statut, commentaire)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => setOnlyValidated((v) => !v)}
          >
            {onlyValidated ? "Voir tout" : "Validés"}
          </Button>

          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "..." : "Rafraîchir"}
          </Button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge className="text-[10px] px-2 py-0">
              Lignes: {filtered.length}
            </Badge>
            {Object.keys(totals).map((ccy) => (
              <Badge key={ccy} className="text-[10px] px-2 py-0">
                Total {ccy}: {totals[ccy].toLocaleString("fr-MA")}
              </Badge>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facilité</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Maturité</TableHead>
                <TableHead>Marge</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[11px]">
                    Chargement…
                  </TableCell>
                </TableRow>
              )}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[11px] text-slate-500">
                    Aucun crédit. Clique sur “+ Ajouter”.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-[12px]">{r.facility_type}</div>
                      {r.comments ? (
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {r.comments}
                        </div>
                      ) : null}
                    </TableCell>

                    <TableCell className="font-semibold">
                      {fmtMoney(Number(r.amount || 0), r.currency)}
                    </TableCell>

                    <TableCell>
                      {r.maturity_months != null ? `${r.maturity_months} m` : "—"}
                    </TableCell>

                    <TableCell>
                      {r.margin_bps != null ? `${r.margin_bps} bps` : "—"}
                    </TableCell>

                    <TableCell>
                      {r.rate_percent != null ? `${Number(r.rate_percent).toFixed(2)}%` : "—"}
                    </TableCell>

                    <TableCell>
                      <Badge className="text-[10px] px-2 py-0">
                        {r.status === "validated"
                          ? "Validé"
                          : r.status === "cancelled"
                          ? "Annulé"
                          : "Brouillon"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          Ouvrir
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openDuplicate(r)}>
                          Dupliquer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => quickToggleValidate(r)}>
                          {r.status === "validated" ? "Dévalider" : "Valider"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => del(r)}>
                          Suppr.
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal création/édition/duplication */}
        <CreditFormModal
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditing(null);
              setForceCreate(false);
            }
          }}
          projectId={String(project.id)}
          loan={editing}
          forceCreate={forceCreate}
          onSaved={async () => {
            await load();
          }}
        />
      </CardContent>
    </Card>
  );
}
