"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CLIENTS_TABLE = "clients";

import type { ClientRow, ProjectRow, LoanRow } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;

  client: ClientRow | null;          // null = création
  forceCreate?: boolean;             // duplication -> création forcée

  onSaved: () => Promise<void> | void;
};

export default function ClientFormModal({
  open,
  onOpenChange,
  client,
  forceCreate,
  onSaved,
}: Props) {
  const isEdit = !!client?.id && !forceCreate;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [radical, setRadical] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState<ClientRow["status"]>("active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    if (client) {
      setName(client.name ?? "");
      setRadical(client.radical ?? "");
      setSegment(client.segment ?? "");
      setStatus(client.status ?? "active");
      setNotes(client.notes ?? "");
    } else {
      setName("");
      setRadical("");
      setSegment("");
      setStatus("active");
      setNotes("");
    }
  }, [open, client]);

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const save = async () => {
    if (!canSave) {
      alert("Nom client obligatoire.");
      return;
    }

    setSaving(true);

    const payload: Partial<ClientRow> = {
      name: name.trim(),
      radical: radical.trim() ? radical.trim() : null,
      segment: segment.trim() ? segment.trim() : null,
      status,
      notes: notes.trim() ? notes.trim() : null,
    };

    let error: any = null;

    if (isEdit && client?.id) {
      const { error: e } = await supabase.from(CLIENTS_TABLE).update(payload).eq("id", client.id);
      error = e;
    } else {
      const { error: e } = await supabase.from(CLIENTS_TABLE).insert(payload);
      error = e;
    }

    setSaving(false);

    if (error) {
      alert("Erreur enregistrement client : " + error.message);
      return;
    }

    await onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center justify-between gap-2">
            <span>{isEdit ? "Modifier client" : forceCreate ? "Dupliquer client" : "Nouveau client"}</span>
            <Badge className="text-[10px] px-2 py-0">{isEdit ? "EDIT" : "CREATE"}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3 text-xs">
          <div className="col-span-6">
            <div className="mb-1 font-medium">Nom</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Raison sociale" />
          </div>

          <div className="col-span-3">
            <div className="mb-1 font-medium">Statut</div>
            <select
              className="border rounded px-2 py-2 w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientRow["status"])}
            >
              <option value="active">Actif</option>
              <option value="archived">Archivé</option>
            </select>
          </div>

          <div className="col-span-3">
            <div className="mb-1 font-medium">Segment</div>
            <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="PME / GE / ..." />
          </div>

          <div className="col-span-6">
            <div className="mb-1 font-medium">Radical</div>
            <Input value={radical} onChange={(e) => setRadical(e.target.value)} placeholder="Ex: CLT1234" />
          </div>

          <div className="col-span-12">
            <div className="mb-1 font-medium">Notes</div>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Infos relation, remarques RM..." />
          </div>

          <div className="col-span-12 flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !canSave}>
              {saving ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
