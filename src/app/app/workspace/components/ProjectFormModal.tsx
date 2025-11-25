"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Project = {
  id: string;
  project_code: string;
  name: string;
  project_type?: string | null;
  city?: string | null;
  total_cost?: number | null;
  status?: string | null;
};

type ProjectFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  project: Project | null;
  onSaved: () => void;
};

export default function ProjectFormModal({
  open,
  onOpenChange,
  clientId,
  project,
  onSaved,
}: ProjectFormModalProps) {
  const isEdit = !!project;

  const [form, setForm] = useState({
    project_code: "",
    name: "",
    project_type: "",
    city: "",
    total_cost: "",
    status: "EN_ETUDE",
  });

  useEffect(() => {
    if (project) {
      setForm({
        project_code: project.project_code || "",
        name: project.name || "",
        project_type: project.project_type || "",
        city: project.city || "",
        total_cost: project.total_cost?.toString() || "",
        status: project.status || "EN_ETUDE",
      });
    } else {
      setForm({
        project_code: "",
        name: "",
        project_type: "",
        city: "",
        total_cost: "",
        status: "EN_ETUDE",
      });
    }
  }, [project]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.project_code) return;

    if (isEdit && project) {
      await supabase
        .from("projects")
        .update({
          project_code: form.project_code,
          name: form.name,
          project_type: form.project_type || null,
          city: form.city || null,
          total_cost: form.total_cost ? Number(form.total_cost) : null,
          status: form.status,
        })
        .eq("id", project.id);
    } else {
      await supabase.from("projects").insert({
        client_id: clientId,
        project_code: form.project_code,
        name: form.name,
        project_type: form.project_type || null,
        city: form.city || null,
        total_cost: form.total_cost ? Number(form.total_cost) : null,
        status: form.status,
      });
    }

    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le projet" : "Nouveau projet"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Code projet</Label>
            <Input
              value={form.project_code}
              onChange={(e) => handleChange("project_code", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Nom du projet</Label>
            <Input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Type de projet</Label>
            <Input
              value={form.project_type}
              onChange={(e) => handleChange("project_type", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Ville</Label>
            <Input
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Coût total</Label>
            <Input
              type="number"
              value={form.total_cost}
              onChange={(e) => handleChange("total_cost", e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
