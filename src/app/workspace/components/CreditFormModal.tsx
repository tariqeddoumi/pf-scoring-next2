"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  onCreated: () => void;
};

export default function ClientFormModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [radical, setRadical] = useState("");
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");

  const handleSave = async () => {
    if (!radical || !name) {
      alert("Radical et nom sont obligatoires.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("clients").insert({
      radical,
      name,
      segment: segment || null,
    });
    setSaving(false);
    if (error) {
      alert("Erreur création client : " + error.message);
      return;
    }
    setOpen(false);
    setRadical("");
    setName("");
    setSegment("");
    onCreated();
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        + Nouveau client
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-[380px] p-4 space-y-3 border">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">Créer un client</h2>
          <button
            className="text-xs text-slate-500"
            onClick={() => setOpen(false)}
          >
            Fermer
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <div className="mb-1 font-medium">Radical client</div>
            <Input
              value={radical}
              onChange={(e) => setRadical(e.target.value)}
              placeholder="Radical (ex : CLT1234)"
            />
          </div>
          <div>
            <div className="mb-1 font-medium">Nom du client</div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Raison sociale"
            />
          </div>
          <div>
            <div className="mb-1 font-medium">Segment</div>
            <Input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="TPE / PME / GE / Project Finance..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Enregistrement..." : "Créer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
