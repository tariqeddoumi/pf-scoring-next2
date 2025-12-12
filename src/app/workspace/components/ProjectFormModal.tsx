"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Client, Project } from "../page";

type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  client: Client;
  onCreated: () => Promise<void>;
};

export default function ProjectFormModal({
  open,
  onOpenChange,
  client,
  onCreated,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [form, setForm] = useState({
    name: "",
    city: "",
    type: "",
  });

  const save = async () => {
    if (!form.name.trim()) return;

    await supabase.from("projects").insert({
      client_id: client.id,
      name: form.name,
      city: form.city || null,
      type: form.type || null,
    });

    await onCreated();
    setForm({ name: "", city: "", type: "" });
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <Input
            placeholder="Nom du projet"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            placeholder="Ville"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />

          <Input
            placeholder="Type (ex : Énergie, PPP...)"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />

          <button
            className="w-full bg-blue-600 mt-2 text-white p-2 rounded"
            onClick={save}
          >
            Enregistrer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
