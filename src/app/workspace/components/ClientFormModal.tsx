"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ClientRow, ClientStatus } from "../types";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ClientFormMode = "create" | "edit";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: ClientFormMode;
  client: ClientRow | null;

  onSaved: () => Promise<void> | void;
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erreur inattendue.";
}

export default function ClientFormModal({ open, onOpenChange, mode, client, onSaved }: Props) {
  const title = useMemo(() => (mode === "create" ? "Nouveau client" : "Modifier client"), [mode]);

  const [name, setName] = useState("");
  const [radical, setRadical] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState<ClientStatus>("Actif");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && client) {
      setName(client.name ?? "");
      setRadical(client.radical ?? "");
      setSegment(client.segment ?? "");
      setStatus(client.status ?? "Actif");
      setNotes(client.notes ?? "");
    } else {
      setName("");
      setRadical("");
      setSegment("");
      setStatus("Actif");
      setNotes("");
    }
    setError(null);
  }, [open, mode, client]);

  async function save() {
    setError(null);

    if (!name.trim()) {
      setError("Le nom du client est obligatoire.");
      return;
    }

    const payload: Partial<ClientRow> = {
      name: name.trim(),
      radical: radical.trim() ? radical.trim() : undefined,
      segment: segment.trim() ? segment.trim() : undefined,
      status,
      notes: notes.trim() ? notes.trim() : undefined,
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (mode === "edit" && client) {
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      onOpenChange(false);
      await onSaved();
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Société ABC" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Radical</Label>
              <Input value={radical} onChange={(e) => setRadical(e.target.value)} placeholder="Ex: 1234567" />
            </div>
            <div className="grid gap-2">
              <Label>Segment</Label>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex: Corporate / PME" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="grid gap-2">
              <Label>Statut</Label>
              <select
                className="h-9 rounded-md border px-2 bg-background"
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
              >
                <option value="Actif">Actif</option>
                <option value="Archivé">Archivé</option>
              </select>
            </div>

            <div className="text-sm text-muted-foreground">
              Astuce : utilise “Archivé” plutôt que supprimer si tu veux garder l’historique.
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes internes…" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
