"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  onCreated: () => Promise<void> | void;
};

export default function ClientFormModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [radical, setRadical] = useState("");
  const [segment, setSegment] = useState("");

  const save = async () => {
    if (!name.trim()) {
      alert("Nom du client obligatoire");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("clients").insert({
      name: name.trim(),
      radical: radical.trim() || null,
      segment: segment.trim() || null,
    });
    setSaving(false);

    if (error) {
      alert("Erreur création client : " + error.message);
      return;
    }

    setOpen(false);
    setName("");
    setRadical("");
    setSegment("");
    await onCreated();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Nouveau client
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Créer un client</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 font-medium">Nom</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Raison sociale" />
            </div>

            <div>
              <div className="mb-1 font-medium">Radical</div>
              <Input value={radical} onChange={(e) => setRadical(e.target.value)} placeholder="Ex : CLT1234" />
            </div>

            <div>
              <div className="mb-1 font-medium">Segment</div>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="PME / GE / ..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Enregistrement..." : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
