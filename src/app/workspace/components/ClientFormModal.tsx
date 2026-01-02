"use client";

import * as React from "react";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ClientRow } from "../types";

type ClientStatus = ClientRow["status"]; // ex: "Actif" | "Archivé"

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRow | null;            // null => création
  onSaved: (saved: ClientRow) => void; // callback après save
};

const CLIENTS_TABLE = "clients";

export default function ClientFormModal({ open, onOpenChange, client, onSaved }: Props) {
  const isEdit = Boolean(client?.id);

  const [name, setName] = React.useState("");
  const [radical, setRadical] = React.useState("");
  const [segment, setSegment] = React.useState("");
  const [status, setStatus] = React.useState<ClientStatus>("Actif" as ClientStatus);
  const [notes, setNotes] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    // Reset / hydrate
    setError(null);

    if (client) {
      setName(client.name ?? "");
      setRadical(client.radical ?? "");
      setSegment(client.segment ?? "");
      setStatus((client.status ?? "Actif") as ClientStatus);
      setNotes(client.notes ?? "");
    } else {
      setName("");
      setRadical("");
      setSegment("");
      setStatus("Actif" as ClientStatus);
      setNotes("");
    }
  }, [open, client]);

  async function save() {
    setError(null);

    const cleanName = name.trim();
    const cleanRadical = radical.trim();

    if (!cleanName) return setError("Le nom du client est obligatoire.");
    if (!cleanRadical) return setError("Le radical est obligatoire.");

    setSaving(true);
    try {
      if (isEdit && client?.id) {
        const { data, error: e } = await supabase
          .from(CLIENTS_TABLE)
          .update({
            name: cleanName,
            radical: cleanRadical,
            segment: segment.trim() || null,
            status,
            notes: notes.trim() || null,
          })
          .eq("id", client.id)
          .select("*")
          .single();

        if (e) throw e;
        onSaved(data as ClientRow);
        onOpenChange(false);
        return;
      }

      // Create
      const { data, error: e } = await supabase
        .from(CLIENTS_TABLE)
        .insert({
          name: cleanName,
          radical: cleanRadical,
          segment: segment.trim() || null,
          status,
          notes: notes.trim() || null,
        })
        .select("*")
        .single();

      if (e) throw e;

      onSaved(data as ClientRow);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Erreur inconnue";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Modifier un client" : "Nouveau client"}
            <Badge variant={isEdit ? "secondary" : "default"}>{isEdit ? "Édition" : "Création"}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ligne 1 */}
          <div className="grid gap-2">
            <Label htmlFor="client-name">Nom *</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Société XYZ"
              autoFocus
            />
          </div>

          {/* Ligne 2 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="client-radical">Radical *</Label>
              <Input
                id="client-radical"
                value={radical}
                onChange={(e) => setRadical(e.target.value)}
                placeholder="Ex: 1234567"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client-segment">Segment</Label>
              <Input
                id="client-segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="PME / GE / TPE ..."
              />
            </div>
          </div>

          {/* Statut */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="client-status">Statut</Label>
              <select
                id="client-status"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
              >
                <option value="Actif">Actif</option>
                <option value="Archivé">Archivé</option>
              </select>
            </div>

            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                Astuce : utilise <strong>“Archivé”</strong> plutôt que supprimer si tu veux garder l’historique.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes…"
              rows={4}
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
