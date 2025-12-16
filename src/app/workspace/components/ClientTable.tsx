"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ClientRow, ClientStatus } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import ClientFormModal from "./ClientFormModal";

type Props = {
  selectedClient: ClientRow | null;
  onSelect: (c: ClientRow) => void;
};

export default function ClientTable({ selectedClient, onSelect }: Props) {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  async function fetchClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id, created_at, name, radical, segment, status, notes")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error) setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((c) =>
      [c.name, c.radical, c.segment, c.status, c.notes].filter(Boolean).join(" ").toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function archiveClient(id: string) {
    await supabase.from("clients").update({ status: "Archivé" satisfies ClientStatus }).eq("id", id);
    await fetchClients();
  }

  async function unarchiveClient(id: string) {
    await supabase.from("clients").update({ status: "Actif" satisfies ClientStatus }).eq("id", id);
    await fetchClients();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Clients</CardTitle>
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
            <Button size="sm" variant="outline" onClick={fetchClients}>
              Rafraîchir
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground mb-2">
          {loading ? "Chargement…" : `${filtered.length} client(s)`}
        </div>

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Radical</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((c) => {
                const isSelected = selectedClient?.id === c.id;
                return (
                  <TableRow
                    key={c.id}
                    className={isSelected ? "bg-muted/50" : ""}
                    onClick={() => onSelect(c)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell className="font-mono text-xs">{c.radical ?? "—"}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.segment ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "Actif" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(c);
                            setOpen(true);
                          }}
                        >
                          Modifier
                        </Button>

                        {c.status === "Actif" ? (
                          <Button size="sm" variant="secondary" onClick={() => archiveClient(c.id)}>
                            Archiver
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => unarchiveClient(c.id)}>
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
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ClientFormModal
          open={open}
          onOpenChange={setOpen}
          client={editing}
          onSaved={fetchClients}
        />
      </CardContent>
    </Card>
  );
}
