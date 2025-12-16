"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ProjectRow, ProjectStatus, ClientRow } from "../types";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientRow;
  project: ProjectRow | null;
  onSaved: () => Promise<void> | void;
};

export default function ProjectFormModal({ open, onOpenChange, client, project, onSaved }: Props) {
  const isEdit = useMemo(() => !!project, [project]);

  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [city, setCity] = useState("");
  const [projectType, setProjectType] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("draft");
  const [notes, setNotes] = useState("");

  const [totalCost, setTotalCost] = useState<string>("");
  const [finAmount, setFinAmount] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (project) {
      setName(project.name ?? "");
      setProjectCode(project.project_code ?? "");
      setCity(project.city ?? "");
      setProjectType(project.project_type ?? "");
      setStatus(project.status ?? "draft");
      setNotes(project.notes ?? "");
      setTotalCost(project.total_cost != null ? String(project.total_cost) : "");
      setFinAmount(project.financing_amount != null ? String(project.financing_amount) : "");
    } else {
      setName("");
      setProjectCode("");
      setCity("");
      setProjectType("");
      setStatus("draft");
      setNotes("");
      setTotalCost("");
      setFinAmount("");
    }

    setError(null);
  }, [open, project]);

  async function save() {
    setSaving(true);
    setError(null);

    if (!name.trim()) {
      setSaving(false);
      setError("Le nom du projet est obligatoire.");
      return;
    }

    const payload: Partial<ProjectRow> = {
      client_id: client.id,
      name: name.trim(),
      project_code: projectCode.trim() || undefined,
      city: city.trim() || undefined,
      project_type: projectType.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      total_cost: totalCost.trim() ? Number(totalCost) : undefined,
      financing_amount: finAmount.trim() ? Number(finAmount) : undefined,
    };

    try {
      if (project) {
        const { error } = await supabase.from("projects").update(payload).eq("id", project.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert(payload);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier projet" : "Ajouter projet"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Client</Label>
            <Input value={`${client.radical ?? "—"} · ${client.name}`} disabled />
          </div>

          <div className="grid gap-1">
            <Label>Nom projet *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du projet" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Code projet</Label>
              <Input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="PRJ-001" />
            </div>
            <div className="grid gap-1">
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Casablanca" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Type projet</Label>
              <Input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="Energy / Infra / ..." />
            </div>

            <div className="grid gap-1">
              <Label>Statut</Label>
              <select className="h-9 rounded-md border px-2" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                <option value="draft">Draft</option>
                <option value="validated">Validated</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Coût total (MAD)</Label>
              <Input value={totalCost} onChange={(e) => setTotalCost(e.target.value)} placeholder="100000000" />
            </div>
            <div className="grid gap-1">
              <Label>Financement (MAD)</Label>
              <Input value={finAmount} onChange={(e) => setFinAmount(e.target.value)} placeholder="70000000" />
            </div>
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
