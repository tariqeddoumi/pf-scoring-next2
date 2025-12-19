"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ClientRow } from "../types";

type ClientStatus = "Actif" | "Archivé";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** si null => création */
  client: ClientRow | null;

  /** callback après save pour recharger la liste */
  onSaved?: () => void;
};

const CLIENTS_TABLE = "clients";

export default function ClientFormModal({
  open,
  onOpenChange,
  client,
  onSaved,
}: Props) {
  const isEdit = !!client?.id;

  const [name, setName] = React.useState("");
  const [radical, setRadical] = React.useState("");
  const [segment, setSegment] = React.useState("");
  const [status, setStatus] = React.useState<ClientStatus>("Actif");
  const [notes, setNotes] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    setError(null);

    if (client) {
      setName(client.name ?? "");
      setRadical(client.radical ?? "");
      setSegment(client.segment ?? "");
      setStatus((client.status as ClientStatus) ?? "Actif");
      setNotes(client.notes ?? "");
    } else {
      setName("");
      setRadical("");
      setSegment("");
      setStatus("Actif");
      setNotes("");
    }
  }, [open, client]);

  const canSave = name.trim().length >= 2;

  async function handleSave() {
    setError(null);

    if (!canSave) {
      setError("Le nom est obligatoire (min 2 caractères).");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<ClientRow> = {
        name: name.trim(),
        radical: radical.trim() || "",
        segment: segment.trim() || "",
        status,
        notes: notes.trim() || "",
      };

      if (isEdit && client?.id) {
        const { error: e } = await supabase
          .from(CLIENTS_TABLE)
          .update(payload)
          .eq("id", client.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from(CLIENTS_TABLE).insert(payload);
        if (e) throw e;
      }

      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b bg-muted/30 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEdit ? "Modifier le client" : "Ajouter un client"}
            </DialogTitle>
            <DialogDescription>
              Renseigne les informations puis enregistre.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body scrollable */}
        <div className="px-6 py-5 max-h-[70vh] overflow-auto">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <span className="font-medium">Erreur :</span> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Société XYZ"
              />
              <div className="text-xs text-muted-foreground">
                Minimum 2 caractères.
              </div>
            </div>

            {/* Radical */}
            <div className="space-y-2">
              <Label htmlFor="radical">Radical</Label>
              <Input
                id="radical"
                value={radical}
                onChange={(e) => setRadical(e.target.value)}
                placeholder="Ex: 1234567"
              />
            </div>

            {/* Segment */}
            <div className="space-y-2">
              <Label htmlFor="segment">Segment</Label>
              <Input
                id="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="Ex: PME / GE / ..."
              />
            </div>

            {/* Statut */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ClientStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actif">Actif</SelectItem>
                  <SelectItem value="Archivé">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Commentaires / informations complémentaires..."
                className="min-h-[110px]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/20 px-6 py-4">
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !canSave}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
