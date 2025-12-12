"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onCreated: () => Promise<void>;
};

export default function ClientFormModal({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [form, setForm] = useState({
    name: "",
    radical: "",
    segment: "",
  });

  const save = async () => {
    if (!form.name.trim()) return;

    await supabase.from("clients").insert({
      name: form.name,
      radical: form.radical || null,
      segment: form.segment || null,
    });

    await onCreated();
    setForm({ name: "", radical: "", segment: "" });
    setOpen(false);
  };

  return (
    <>
      <button
        className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
        onClick={() => setOpen(true)}
      >
        + Nouveau client
      </button>

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <Input
              placeholder="Nom du client"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              placeholder="Radical client (ABC1234)"
              value={form.radical}
              onChange={(e) => setForm({ ...form, radical: e.target.value })}
            />

            <Input
              placeholder="Segment (PME, GE, TPE...)"
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}
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
    </>
  );
}
