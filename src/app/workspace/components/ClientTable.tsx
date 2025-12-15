"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import ClientFormModal, { ClientRow } from "./ClientFormModal";

const CLIENTS_TABLE = "clients";

type Props = {
  selectedClient: ClientRow | null;
  onSelect: (c: ClientRow) => void;
};

export default function ClientTable({ selectedClient, onSelect }: Props) {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .select("id,name,radical,segment,status,notes,created_at,updated_at")
      .order("updated_at", { ascending: false });

    setLoading(false);
    if (error) {
      alert("Erreur chargement clients : " + error.message);
      return;
    }
    setRows((data || []) as ClientRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => (onlyActive ? r.status !== "archived" : true))
      .filter((r) => {
        if (!term) return true;
        const hay = [r.name, r.radical || "", r.segment || "", r.status || "", r.notes || ""].join(" ").toLowerCase();
        return hay.includes(term);
      });
  }, [rows, q, onlyActive]);

  const stats = useMemo(() => {
    const active = filtered.filter((r) => r.status !== "archived").length;
    const archived = filtered.filter((r) => r.status === "archived").length;
    return { total: filtered.length, active, archived };
  }, [filtered]);

  const openNew = () => {
    setEditing(null);
    setForceCreate(false);
    setOpen(true);
  };

  const openEdit = (r: ClientRow) => {
    setEditing(r);
    setForceCreate(false);
    setOpen(true);
  };

  const openDuplicate = (r: ClientRow) => {
    setEditing(r);
    setForceCreate(true);
    setOpen(true);
  };

  const toggleArchive = async (r: ClientRow) => {
    if (!r.id) return;
    const next = r.status === "archived" ? "active" : "archived";
    const { error } = await supabase.from(CLIENTS_TABLE).update({ status: next }).eq("id", r.id);
    if (error) return alert("Erreur MAJ statut : " + error.message);
    await load();
  };

  const del = async (r: ClientRow) => {
    if (!r.id) return;
    if (!confirm("Supprimer ce client ? (Supprime aussi ses projets si FK cascade)")) return;
    const { error } = await supabase.from(CLIENTS_TABLE).delete().eq("id", r.id);
    if (error) return alert("Erreur suppression : " + error.message);
    await load();
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span>1. Client</span>
          <Button size="sm" onClick={openNew}>+ Ajouter</Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {/* Toolbar ultra compacte */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-[280px]"
            placeholder="Recherche (nom, radical, segment, notes)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={() => setOnlyActive((v) => !v)}>
            {onlyActive ? "Actifs" : "Tous"}
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "..." : "Rafraîchir"}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Badge className="text-[10px] px-2 py-0">Total: {stats.total}</Badge>
            <Badge className="text-[10px] px-2 py-0">Actifs: {stats.active}</Badge>
            <Badge className="text-[10px] px-2 py-0">Archivés: {stats.archived}</Badge>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Radical</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[11px]">Chargement…</TableCell>
                </TableRow>
              )}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[11px] text-slate-500">
                    Aucun client. Clique sur “+ Ajouter”.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filtered.map((r) => {
                  const active = selectedClient?.id === r.id;
                  return (
                    <TableRow key={r.id} className={active ? "bg-slate-50" : ""}>
                      <TableCell>
                        <div className="font-medium text-[12px]">{r.name}</div>
                        {r.notes ? <div className="text-[11px] text-slate-500 line-clamp-1">{r.notes}</div> : null}
                      </TableCell>
                      <TableCell>{r.radical ?? "—"}</TableCell>
                      <TableCell>{r.segment ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className="text-[10px] px-2 py-0">{r.status === "archived" ? "Archivé" : "Actif"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onSelect(r)}>
                            Sélection
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                            Ouvrir
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDuplicate(r)}>
                            Dupliquer
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleArchive(r)}>
                            {r.status === "archived" ? "Désarch." : "Archiver"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => del(r)}>
                            Suppr.
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <ClientFormModal
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditing(null);
              setForceCreate(false);
            }
          }}
          client={editing}
          forceCreate={forceCreate}
          onSaved={load}
        />
      </CardContent>
    </Card>
  );
}
