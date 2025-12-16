"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClientRow, ProjectRow, LoanRow } from "../types";

const PROJECTS_TABLE = "projects";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;

  client: ClientRow;
  project: ProjectRow | null;
  forceCreate?: boolean;

  onSaved: () => Promise<void> | void;
};

export default function ProjectFormModal({
  open,
  onOpenChange,
  client,
  project,
  forceCreate,
  onSaved,
}: Props) {
  const isEdit = !!project?.id && !forceCreate;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<ProjectRow["status"]>("draft");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    if (project) {
      setName(project.name ?? "");
      setCity(project.city ?? "");
      setType(project.type ?? "");
      setStatus(project.status ?? "draft");
      setNotes(project.notes ?? "");
    } else {
      setName("");
      setCity("");
      setType("");
      setStatus("draft");
      setNotes("");
    }
  }, [open, project]);

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const save = async () => {
    if (!canSave) return alert("Nom projet obligatoire.");

    setSaving(true);

    const payload: Partial<ProjectRow> = {
      client_id: client.id as string,
      name: name.trim(),
      city: city.trim() ? city.trim() : null,
      type: type.trim() ? type.trim() : null,
      status,
      notes: notes.trim() ? notes.trim() : null,
    };

    let error: any = null;

    if (isEdit && project?.id) {
      const { error: e } = await supabase.from(PROJECTS_TABLE).update(payload).eq("id", project.id);
      error = e;
    } else {
      const { error: e } = await supabase.from(PROJECTS_TABLE).insert(payload);
      error = e;
    }

    setSaving(false);

    if (error) return alert("Erreur enregistrement projet : " + error.message);

    await onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center justify-between gap-2">
            <span>{isEdit ? "Modifier projet" : forceCreate ? "Dupliquer projet" : "Nouveau projet"}</span>
            <Badge className="text-[10px] px-2 py-0">Client: {(client.name || "").slice(0, 18)}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3 text-xs">
          <div className="col-span-6">
            <div className="mb-1 font-medium">Nom du projet</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Centrale solaire X" />
          </div>

          <div className="col-span-3">
            <div className="mb-1 font-medium">Statut</div>
            <select
              className="border rounded px-2 py-2 w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectRow["status"])}
            >
              <option value="active">Actif</option>
              <option value="archived">Archivé</option>
            </select>
          </div>

          <div className="col-span-3">
            <div className="mb-1 font-medium">Ville</div>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Casablanca…" />
          </div>

          <div className="col-span-6">
            <div className="mb-1 font-medium">Type</div>
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="PPP, Énergie, Immobilier…" />
          </div>

          <div className="col-span-12">
            <div className="mb-1 font-medium">Notes</div>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Résumé projet, risques, sponsors…" />
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
