"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ClientRow } from "../types";

type Props = {
  selectedClient: ClientRow | null;
  onSelect: (c: ClientRow) => void;
  onEdit?: (c: ClientRow) => void;
};

const CLIENTS_TABLE = "clients";

export default function ClientTable({ selectedClient, onSelect, onEdit }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<ClientRow[]>([]);

  const fetchClients = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as ClientRow[]);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((c) => {
      const blob = [
        c.name ?? "",
        c.radical ?? "",
        c.segment ?? "",
        c.notes ?? "",
        c.status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Clients</div>
          <Badge variant="secondary">{filtered.length}</Badge>
          {loading ? (
            <Badge variant="secondary">Chargement…</Badge>
          ) : (
            <Badge variant="outline">OK</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, radical, segment)…"
            className="w-[320px] max-w-full"
          />
          <Button variant="outline" size="sm" onClick={() => void fetchClients()}>
            Rafraîchir
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <span className="font-medium">Erreur : </span>
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Aucun client.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedClient?.id === c.id;
                return (
                  <TableRow
                    key={c.id}
                    className={isSelected ? "bg-muted/40" : ""}
                  >
                    <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                    <TableCell>{c.radical ?? "—"}</TableCell>
                    <TableCell>{c.segment ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "Archivé" ? "secondary" : "default"}>
                        {c.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => onSelect(c)}>
                        Sélection
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onEdit?.(c)}
                        disabled={!onEdit}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
