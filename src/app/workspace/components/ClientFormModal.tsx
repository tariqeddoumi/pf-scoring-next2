// src/app/workspace/components/ClientFormModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { supabase } from "@/lib/supabaseClient";
import type { ClientRow, ClientStatus } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  client: ClientRow | null;        // null => création
  forceCreate?: boolean;           // si tu veux forcer le mode création
  onSaved: () => Promise<void> | void;
};

export default function ClientFormModal({
  open,
  onOpenChange,
  client,
  forceCreate,
  onSaved,
}: Props) {
  const isEdit = useMemo(() => !!client && !forceCreate, [client, forceCreate]);

  const [name, setName] = useState("");
  const [radical, setRadical] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState<ClientStatus>("Actif"); // ✅ aligné
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (client && isEdit) {
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
  }, [open, client, isEdit]);

  async function save() {
    setSaving(true);
    setError(null);

    const payload: Partial<ClientRow> = {
      name: name.trim(),
      radical: radical.trim() || undefined,
      segment: segment.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
    };

    if (!payload.name) {
      setSaving(false);
      setError("Le nom client est obligatoire.");
      return;
    }

    try {
      if (isEdit && client) {
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }

      await onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier client" : "Ajouter un client"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Société ABC" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Radical</Label>
              <Input value={radical} onChange={(e) => setRadical(e.target.value)} placeholder="1234567" />
            </div>
            <div className="grid gap-1">
              <Label>Segment</Label>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="PME / GE / ..." />
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Statut</Label>
            <select
              className="h-9 rounded-md border px-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
            >
              <option value="Actif">Actif</option>
              <option value="Archivé">Archivé</option>
            </select>
          </div>

          <div className="grid gap-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Commentaires…" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
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
