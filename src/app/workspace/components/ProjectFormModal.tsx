"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ProjectRow, ProjectStatus, ClientRow } from "../types";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  client: ClientRow;
  project: ProjectRow | null;

  onSaved: () => Promise<void> | void;
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erreur inattendue.";
}

export default function ProjectFormModal({ open, onOpenChange, client, project, onSaved }: Props) {
  const isEdit = !!project;
  const title = useMemo(() => (isEdit ? "Modifier projet" : "Nouveau projet"), [isEdit]);

  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [projectType, setProjectType] = useState("");
  const [city, setCity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [financingAmount, setFinancingAmount] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("draft");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (project) {
      setName(project.name ?? "");
      setProjectCode(project.project_code ?? "");
      setProjectType(project.project_type ?? "");
      setCity(project.city ?? "");
      setTotalCost(project.total_cost != null ? String(project.total_cost) : "");
      setFinancingAmount(project.financing_amount != null ? String(project.financing_amount) : "");
      setStatus(project.status ?? "draft");
      setNotes(project.notes ?? "");
    } else {
      setName("");
      setProjectCode("");
      setProjectType("");
      setCity("");
      setTotalCost("");
      setFinancingAmount("");
      setStatus("draft");
      setNotes("");
    }

    setError(null);
  }, [open, project]);

  async function save() {
    setError(null);

    if (!name.trim()) {
      setError("Le nom du projet est obligatoire.");
      return;
    }

    const payload: Partial<ProjectRow> = {
      client_id: client.id,
      name: name.trim(),
      project_code: projectCode.trim() ? projectCode.trim() : undefined,
      project_type: projectType.trim() ? projectType.trim() : undefined,
      city: city.trim() ? city.trim() : undefined,
      total_cost: totalCost.trim() ? Number(totalCost) : undefined,
      financing_amount: financingAmount.trim() ? Number(financingAmount) : undefined,
      status,
      notes: notes.trim() ? notes.trim() : undefined,
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (project) {
        const { error } = await supabase.from("projects").update(payload).eq("id", project.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert({
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Centrale solaire X" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Code projet</Label>
              <Input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="Ex: RADICAL0001" />
            </div>
            <div className="grid gap-2">
              <Label>Type projet</Label>
              <Input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="Ex: Hôtel / PV / ..."/>
            </div>
            <div className="grid gap-2">
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Casablanca" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Coût total</Label>
              <Input value={totalCost} onChange={(e) => setTotalCost(e.target.value)} placeholder="MAD" />
            </div>
            <div className="grid gap-2">
              <Label>Montant financement</Label>
              <Input value={financingAmount} onChange={(e) => setFinancingAmount(e.target.value)} placeholder="MAD" />
            </div>
            <div className="grid gap-2">
              <Label>Statut</Label>
              <select className="h-9 rounded-md border px-2 bg-background" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                <option value="draft">draft</option>
                <option value="validated">validated</option>
                <option value="archived">archived</option>
              </select>
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
