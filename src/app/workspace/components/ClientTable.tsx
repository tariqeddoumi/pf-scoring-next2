"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ClientRow } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import ClientFormModal from "./ClientFormModal";

type Props = {
  selectedClient: ClientRow | null;
  onSelect: (client: ClientRow) => void;
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erreur inattendue.";
}

export default function ClientTable({ selectedClient, onSelect }: Props) {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, created_at, updated_at, name, radical, segment, status, notes")
        .order("updated_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      setRows((data ?? []) as ClientRow[]);
    } catch (e: unknown) {
      setError(errMsg(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Le plugin eslint "react-hooks/set-state-in-effect" est très strict.
    // On autorise explicitement l’appel de fetch initial ici.
    fetchClients();
  }, [fetchClients]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((c) => {
      const s = `${c.name} ${c.radical ?? ""} ${c.segment ?? ""}`.toLowerCase();
      return s.includes(needle);
    });
  }, [rows, q]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(c: ClientRow) {
    setEditing(c);
    setOpen(true);
  }

  async function remove(c: ClientRow) {
    if (!confirm(`Supprimer le client "${c.name}" ?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) setError(error.message);
    await fetchClients();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Clients</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate}>+ Nouveau</Button>
            <Button size="sm" variant="outline" onClick={fetchClients}>Rafraîchir</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, radical, segment)..." />
          <div className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${filtered.length} / ${rows.length}`}
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <div className="rounded-md border overflow-auto">
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
              {filtered.map((c) => {
                const isSel = selectedClient?.id === c.id;
                return (
                  <TableRow
                    key={c.id}
                    className={isSel ? "bg-muted/40" : ""}
                    onClick={() => onSelect(c)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.radical ?? "—"}</TableCell>
                    <TableCell>{c.segment ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "Actif" ? "default" : "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                          Modifier
                        </Button>
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); remove(c); }}>
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
                    Aucun client.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ClientFormModal
          open={open}
          onOpenChange={setOpen}
          mode={editing ? "edit" : "create"}
          client={editing}
          onSaved={fetchClients}
        />
      </CardContent>
    </Card>
  );
}
